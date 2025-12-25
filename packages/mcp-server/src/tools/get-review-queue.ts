import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getReviewQueueTool: Tool = {
  name: 'get_review_queue',
  description: `Get user's daily vocabulary review queue based on Spaced Repetition (SM2 algorithm).

Returns vocabulary items that are due for review today, including:
- Overdue items (past their review date)
- Due items (scheduled for today)
- New items (not yet reviewed, limited by daily goal)

Use this to show the user what they need to review today.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional if authenticated via MCP_USERNAME)',
      },
      limit: {
        type: 'number',
        description: 'Maximum items to return (default: 50)',
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include already completed items for today (default: false)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  includeCompleted: z.boolean().optional().default(false),
});

interface QueueRow extends RowDataPacket {
  id: number;
  vocabulary_id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  part_of_speech: string;
  difficulty_level: string;
  cefr_level: string | null;
  definitions: string | null;
  review_status: 'new' | 'learning' | 'reviewing' | 'mastered';
  ease_factor: number;
  review_interval: number;
  next_review_at: Date | null;
  priority: 'overdue' | 'due' | 'new';
  is_completed: boolean;
}

interface QueueStatsRow extends RowDataPacket {
  due: number;
  overdue: number;
  new_count: number;
  completed: number;
  total: number;
}

interface ReviewQueueItem {
  vocabularyId: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  partOfSpeech: string;
  difficultyLevel: string;
  cefrLevel: string | null;
  definitions: unknown;
  reviewStatus: string;
  easeFactor: number;
  reviewInterval: number;
  nextReviewAt: Date | null;
  priority: string;
  isCompleted: boolean;
}

interface QueueStats {
  due: number;
  overdue: number;
  new: number;
  completed: number;
  total: number;
}

export async function getReviewQueue(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  queue: ReviewQueueItem[];
  stats: QueueStats;
  message: string;
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const today = new Date().toISOString().split('T')[0];

  // Build daily queue if not exists for today
  await buildDailyQueueIfNeeded(db, effectiveUserId, today);

  // Get queue stats
  const statsRows = await db.query<QueueStatsRow[]>(
    `SELECT
       SUM(CASE WHEN priority = 'due' AND is_completed = FALSE THEN 1 ELSE 0 END) as due,
       SUM(CASE WHEN priority = 'overdue' AND is_completed = FALSE THEN 1 ELSE 0 END) as overdue,
       SUM(CASE WHEN priority = 'new' AND is_completed = FALSE THEN 1 ELSE 0 END) as new_count,
       SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed,
       COUNT(*) as total
     FROM daily_review_queue
     WHERE user_id = ? AND queue_date = ?`,
    [effectiveUserId, today]
  );

  const statsRow = statsRows[0];
  const stats: QueueStats = {
    due: Number(statsRow.due) || 0,
    overdue: Number(statsRow.overdue) || 0,
    new: Number(statsRow.new_count) || 0,
    completed: Number(statsRow.completed) || 0,
    total: Number(statsRow.total) || 0,
  };

  // Get queue items
  const completedCondition = input.includeCompleted ? '' : 'AND q.is_completed = FALSE';

  const rows = await db.query<QueueRow[]>(
    `SELECT v.id as vocabulary_id, v.english_word, v.vietnamese_word, v.phonetic,
            v.pronunciation_uk, v.pronunciation_us, v.part_of_speech, v.difficulty_level,
            v.cefr_level, v.definitions, v.review_status, v.ease_factor, v.review_interval,
            v.next_review_at, q.priority, q.is_completed
     FROM daily_review_queue q
     JOIN vocabulary v ON q.vocabulary_id = v.id
     WHERE q.user_id = ? AND q.queue_date = ? ${completedCondition}
     ORDER BY FIELD(q.priority, 'overdue', 'due', 'new'), q.queue_order ASC
     LIMIT ?`,
    [effectiveUserId, today, input.limit]
  );

  // Parse JSON safely
  const parseJson = <T>(value: unknown): T | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  };

  const queue: ReviewQueueItem[] = rows.map((row) => ({
    vocabularyId: row.vocabulary_id,
    englishWord: row.english_word,
    vietnameseWord: row.vietnamese_word,
    phonetic: row.phonetic,
    pronunciationUk: row.pronunciation_uk,
    pronunciationUs: row.pronunciation_us,
    partOfSpeech: row.part_of_speech,
    difficultyLevel: row.difficulty_level,
    cefrLevel: row.cefr_level,
    definitions: parseJson(row.definitions),
    reviewStatus: row.review_status,
    easeFactor: Number(row.ease_factor),
    reviewInterval: row.review_interval,
    nextReviewAt: row.next_review_at,
    priority: row.priority,
    isCompleted: row.is_completed,
  }));

  const remaining = stats.due + stats.overdue + stats.new;
  const message = remaining > 0
    ? `You have ${remaining} items to review today (${stats.overdue} overdue, ${stats.due} due, ${stats.new} new).`
    : `Great job! You've completed all ${stats.completed} reviews for today.`;

  return {
    success: true,
    queue,
    stats,
    message,
  };
}

// Build daily queue if not already built for today
async function buildDailyQueueIfNeeded(
  db: DatabaseConnection,
  userId: number,
  today: string
): Promise<void> {
  // Check if queue exists for today
  const existingRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM daily_review_queue WHERE user_id = ? AND queue_date = ?`,
    [userId, today]
  );

  if (Number(existingRows[0].count) > 0) {
    return; // Queue already built
  }

  // Get user's learning goals
  const goalsRows = await db.query<RowDataPacket[]>(
    `SELECT daily_new_words, daily_reviews FROM user_learning_goals WHERE user_id = ?`,
    [userId]
  );

  const dailyNewWords = goalsRows.length > 0 ? Number(goalsRows[0].daily_new_words) : 5;
  const dailyReviews = goalsRows.length > 0 ? Number(goalsRows[0].daily_reviews) : 20;

  // Insert overdue items (past next_review_at)
  await db.execute(
    `INSERT INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
     SELECT ?, id, ?, 'overdue', ROW_NUMBER() OVER (ORDER BY next_review_at ASC)
     FROM vocabulary
     WHERE user_id = ? AND review_status != 'new' AND next_review_at < ?
     ON DUPLICATE KEY UPDATE priority = 'overdue'`,
    [userId, today, userId, today]
  );

  // Insert due items (next_review_at = today)
  await db.execute(
    `INSERT INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
     SELECT ?, id, ?, 'due', ROW_NUMBER() OVER (ORDER BY next_review_at ASC)
     FROM vocabulary
     WHERE user_id = ? AND review_status != 'new' AND DATE(next_review_at) = ?
     ON DUPLICATE KEY UPDATE priority = 'due'`,
    [userId, today, userId, today]
  );

  // Count how many review items we have
  const reviewCountRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM daily_review_queue WHERE user_id = ? AND queue_date = ?`,
    [userId, today]
  );
  const reviewCount = Number(reviewCountRows[0].count);

  // Add new words if we have room
  const newWordsToAdd = Math.min(dailyNewWords, Math.max(0, dailyReviews - reviewCount));

  if (newWordsToAdd > 0) {
    await db.execute(
      `INSERT INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'new', ROW_NUMBER() OVER (ORDER BY created_at ASC)
       FROM vocabulary
       WHERE user_id = ? AND review_status = 'new'
       ORDER BY created_at ASC
       LIMIT ?
       ON DUPLICATE KEY UPDATE priority = 'new'`,
      [userId, today, userId, newWordsToAdd]
    );
  }
}
