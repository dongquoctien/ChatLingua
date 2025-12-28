import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const getGrammarReviewQueueTool: Tool = {
  name: 'get_grammar_review_queue',
  description: `Get user's daily grammar review queue based on Spaced Repetition (SM2 algorithm).

Returns grammar points that are due for review today, including:
- **Overdue items**: Past their scheduled review date
- **Due items**: Scheduled for today
- **New items**: Grammar points not yet reviewed (limited by daily goal)

The queue is automatically built/refreshed if needed.

=== QUEUE STRUCTURE ===

Items are returned in priority order:
1. Overdue (highest priority)
2. Due today
3. New items (up to daily limit)

Each item includes:
- Grammar rule and explanation
- Example sentences
- Category
- Priority level
- Review status
- Ease factor and interval

=== EXAMPLE USAGE ===

Get today's queue:
{"userId": 1}

Include completed items:
{"includeCompleted": true}

Limit results:
{"limit": 20}`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional, uses authenticated user)',
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include already completed items for today (default: false)',
      },
      limit: {
        type: 'number',
        description: 'Maximum items to return (default: 50)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  includeCompleted: z.boolean().optional().default(false),
  limit: z.number().optional().default(50),
});

interface QueueItemRow extends RowDataPacket {
  queue_id: number;
  grammar_point_id: number;
  priority: 'overdue' | 'due' | 'new';
  is_completed: boolean;
  grammar_rule: string;
  explanation: string;
  example_en: string;
  example_vi: string;
  category: string;
  review_status: 'new' | 'learning' | 'reviewing' | 'mastered';
  ease_factor: number;
  review_interval: number;
  next_review_at: Date | null;
}

interface GoalsRow extends RowDataPacket {
  daily_new_rules: number;
  daily_reviews: number;
}

export async function getGrammarReviewQueue(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  queue: {
    queueId: number;
    grammarPointId: number;
    priority: string;
    isCompleted: boolean;
    grammarRule: string;
    explanation: string;
    exampleEn: string;
    exampleVi: string;
    category: string;
    reviewStatus: string;
    easeFactor: number;
    reviewInterval: number;
  }[];
  summary: {
    totalItems: number;
    overdueCount: number;
    dueCount: number;
    newCount: number;
    completedCount: number;
  };
  goals: {
    dailyNewRules: number;
    dailyReviews: number;
  };
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;
  const today = new Date().toISOString().split('T')[0];

  const connection = await db.getConnection();

  try {
    // Check if queue exists for today, if not build it
    const [queueCheck] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM daily_grammar_queue WHERE user_id = ? AND queue_date = ?`,
      [effectiveUserId, today]
    );

    if (Number(queueCheck[0].count) === 0) {
      // Build the queue for today
      await buildDailyQueue(connection, effectiveUserId, today);
    }

    // Get user's learning goals
    const [goalsRows] = await connection.execute<GoalsRow[]>(
      `SELECT daily_new_rules, daily_reviews FROM user_learning_goals WHERE user_id = ?`,
      [effectiveUserId]
    );

    const goals = goalsRows.length > 0
      ? { dailyNewRules: goalsRows[0].daily_new_rules || 5, dailyReviews: goalsRows[0].daily_reviews || 20 }
      : { dailyNewRules: 5, dailyReviews: 20 };

    // Build WHERE clause
    const conditions = ['dgq.user_id = ?', 'dgq.queue_date = ?'];
    const params: unknown[] = [effectiveUserId, today];

    if (!input.includeCompleted) {
      conditions.push('dgq.is_completed = FALSE');
    }

    const whereClause = conditions.join(' AND ');

    // Get queue items with grammar point details
    const [rows] = await connection.execute<QueueItemRow[]>(
      `SELECT
         dgq.id as queue_id,
         dgq.grammar_point_id,
         dgq.priority,
         dgq.is_completed,
         gp.grammar_rule,
         gp.explanation,
         gp.example_en,
         gp.example_vi,
         gp.category,
         gp.review_status,
         gp.ease_factor,
         gp.review_interval,
         gp.next_review_at
       FROM daily_grammar_queue dgq
       JOIN grammar_points gp ON dgq.grammar_point_id = gp.id
       WHERE ${whereClause}
       ORDER BY
         CASE dgq.priority
           WHEN 'overdue' THEN 1
           WHEN 'due' THEN 2
           WHEN 'new' THEN 3
         END,
         gp.next_review_at ASC
       LIMIT ?`,
      [...params, input.limit]
    );

    // Get summary counts
    const [summaryRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN priority = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
         SUM(CASE WHEN priority = 'due' THEN 1 ELSE 0 END) as due_count,
         SUM(CASE WHEN priority = 'new' THEN 1 ELSE 0 END) as new_count,
         SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed_count
       FROM daily_grammar_queue
       WHERE user_id = ? AND queue_date = ?`,
      [effectiveUserId, today]
    );

    connection.release();

    const summary = {
      totalItems: Number(summaryRows[0].total),
      overdueCount: Number(summaryRows[0].overdue_count),
      dueCount: Number(summaryRows[0].due_count),
      newCount: Number(summaryRows[0].new_count),
      completedCount: Number(summaryRows[0].completed_count),
    };

    const queue = rows.map(row => ({
      queueId: row.queue_id,
      grammarPointId: row.grammar_point_id,
      priority: row.priority,
      isCompleted: !!row.is_completed,
      grammarRule: row.grammar_rule,
      explanation: row.explanation,
      exampleEn: row.example_en,
      exampleVi: row.example_vi,
      category: row.category || 'general',
      reviewStatus: row.review_status || 'new',
      easeFactor: Number(row.ease_factor) || 2.5,
      reviewInterval: row.review_interval || 0,
    }));

    return { queue, summary, goals };
  } catch (error) {
    connection.release();
    throw error;
  }
}

// Helper function to build daily queue
async function buildDailyQueue(
  connection: any,
  userId: number,
  date: string
): Promise<void> {
  // Get user's learning goals for limits
  const [goalsRows] = await connection.execute(
    `SELECT daily_new_rules, daily_reviews FROM user_learning_goals WHERE user_id = ?`,
    [userId]
  ) as [GoalsRow[], unknown];

  const dailyNewLimit = goalsRows.length > 0 ? goalsRows[0].daily_new_rules || 5 : 5;
  const dailyReviewLimit = goalsRows.length > 0 ? goalsRows[0].daily_reviews || 20 : 20;

  // 1. Add overdue items (past their review date)
  await connection.execute(
    `INSERT INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority)
     SELECT ?, id, ?, 'overdue'
     FROM grammar_points
     WHERE user_id = ?
       AND review_status IN ('learning', 'reviewing')
       AND next_review_at < ?
       AND id NOT IN (SELECT grammar_point_id FROM daily_grammar_queue WHERE user_id = ? AND queue_date = ?)`,
    [userId, date, userId, date, userId, date]
  );

  // 2. Add due items (scheduled for today)
  await connection.execute(
    `INSERT INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority)
     SELECT ?, id, ?, 'due'
     FROM grammar_points
     WHERE user_id = ?
       AND review_status IN ('learning', 'reviewing')
       AND DATE(next_review_at) = ?
       AND id NOT IN (SELECT grammar_point_id FROM daily_grammar_queue WHERE user_id = ? AND queue_date = ?)
     LIMIT ?`,
    [userId, date, userId, date, userId, date, dailyReviewLimit]
  );

  // 3. Add new items (never reviewed, up to daily limit)
  await connection.execute(
    `INSERT INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority)
     SELECT ?, id, ?, 'new'
     FROM grammar_points
     WHERE user_id = ?
       AND review_status = 'new'
       AND id NOT IN (SELECT grammar_point_id FROM daily_grammar_queue WHERE user_id = ? AND queue_date = ?)
     ORDER BY created_at ASC
     LIMIT ?`,
    [userId, date, userId, userId, date, dailyNewLimit]
  );
}
