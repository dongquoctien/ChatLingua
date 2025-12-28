import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getGrammarListTool: Tool = {
  name: 'get_grammar_list',
  description: `Retrieve user's grammar points with optional filters.

Returns grammar points extracted from conversations, with their SM2 spaced repetition
status and review information.

=== FILTERS ===

- **category**: Filter by grammar category (e.g., "verb tenses", "articles", "prepositions")
- **status**: Filter by review status:
  - "new": Never reviewed
  - "learning": Early stage, short intervals
  - "reviewing": Active review cycle
  - "mastered": Long intervals, well-known

=== RETURNED DATA ===

Each grammar point includes:
- Grammar rule and explanation
- Examples (Vietnamese and English)
- Category
- SM2 fields: nextReviewAt, reviewInterval, easeFactor, reviewStatus
- Mastery percentage

=== EXAMPLE USAGE ===

Get all grammar points:
{"userId": 1}

Get grammar points needing review:
{"status": "learning"}

Get verb tense grammar:
{"category": "verb tenses"}`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional, uses authenticated user)',
      },
      category: {
        type: 'string',
        description: 'Filter by grammar category',
      },
      status: {
        type: 'string',
        enum: ['new', 'learning', 'reviewing', 'mastered'],
        description: 'Filter by review status',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of items to return (default: 50)',
      },
      includeExamples: {
        type: 'boolean',
        description: 'Include example sentences (default: true)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  category: z.string().optional(),
  status: z.enum(['new', 'learning', 'reviewing', 'mastered']).optional(),
  limit: z.number().optional().default(50),
  includeExamples: z.boolean().optional().default(true),
});

interface GrammarPointRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  grammar_rule: string;
  explanation: string;
  example_en: string;
  example_vi: string;
  category: string;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: 'new' | 'learning' | 'reviewing' | 'mastered';
  created_at: Date;
}

export async function getGrammarList(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  grammarPoints: {
    id: number;
    conversationId: number;
    grammarRule: string;
    explanation: string;
    exampleEn?: string;
    exampleVi?: string;
    category: string;
    nextReviewAt: string | null;
    reviewInterval: number;
    easeFactor: number;
    repetitionCount: number;
    reviewStatus: string;
    masteryPercentage: number;
    createdAt: string;
  }[];
  totalCount: number;
  filters: {
    category?: string;
    status?: string;
  };
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const connection = await db.getConnection();

  try {
    // Build WHERE clause
    const conditions: string[] = ['user_id = ?'];
    const params: unknown[] = [effectiveUserId];

    if (input.category) {
      conditions.push('category = ?');
      params.push(input.category);
    }

    if (input.status) {
      conditions.push('review_status = ?');
      params.push(input.status);
    }

    const whereClause = conditions.join(' AND ');

    // Get count
    const [countResult] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM grammar_points WHERE ${whereClause}`,
      params
    );
    const totalCount = Number(countResult[0].total);

    // Select fields based on includeExamples flag
    const selectFields = input.includeExamples
      ? '*'
      : 'id, conversation_id, grammar_rule, explanation, category, next_review_at, review_interval, ease_factor, repetition_count, lapse_count, review_status, created_at';

    // Get grammar points
    const [rows] = await connection.execute<GrammarPointRow[]>(
      `SELECT ${selectFields} FROM grammar_points
       WHERE ${whereClause}
       ORDER BY
         CASE review_status
           WHEN 'new' THEN 1
           WHEN 'learning' THEN 2
           WHEN 'reviewing' THEN 3
           WHEN 'mastered' THEN 4
         END,
         next_review_at ASC NULLS FIRST,
         created_at DESC
       LIMIT ?`,
      [...params, input.limit]
    );

    connection.release();

    // Calculate mastery percentage based on SM2 fields
    const grammarPoints = rows.map(row => {
      // Mastery: based on review status and repetition count
      let masteryPercentage = 0;
      switch (row.review_status) {
        case 'new':
          masteryPercentage = 0;
          break;
        case 'learning':
          masteryPercentage = Math.min(25, row.repetition_count * 5);
          break;
        case 'reviewing':
          masteryPercentage = 25 + Math.min(50, row.repetition_count * 5);
          break;
        case 'mastered':
          masteryPercentage = 75 + Math.min(25, row.repetition_count * 2);
          break;
      }

      const result: {
        id: number;
        conversationId: number;
        grammarRule: string;
        explanation: string;
        exampleEn?: string;
        exampleVi?: string;
        category: string;
        nextReviewAt: string | null;
        reviewInterval: number;
        easeFactor: number;
        repetitionCount: number;
        reviewStatus: string;
        masteryPercentage: number;
        createdAt: string;
      } = {
        id: row.id,
        conversationId: row.conversation_id,
        grammarRule: row.grammar_rule,
        explanation: row.explanation,
        category: row.category || 'general',
        nextReviewAt: row.next_review_at ? row.next_review_at.toISOString() : null,
        reviewInterval: row.review_interval || 0,
        easeFactor: Number(row.ease_factor) || 2.5,
        repetitionCount: row.repetition_count || 0,
        reviewStatus: row.review_status || 'new',
        masteryPercentage,
        createdAt: row.created_at.toISOString(),
      };

      if (input.includeExamples) {
        result.exampleEn = row.example_en;
        result.exampleVi = row.example_vi;
      }

      return result;
    });

    return {
      grammarPoints,
      totalCount,
      filters: {
        category: input.category,
        status: input.status,
      },
    };
  } catch (error) {
    connection.release();
    throw error;
  }
}
