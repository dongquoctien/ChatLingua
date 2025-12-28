import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const submitGrammarReviewTool: Tool = {
  name: 'submit_grammar_review',
  description: `Submit a grammar review result with quality rating using SM2 spaced repetition algorithm.

Similar to vocabulary reviews, this tool processes grammar point reviews and calculates
the next review date based on the SM2 algorithm.

=== QUALITY RATINGS ===

For typical 4-button UI:
- **again** (quality 1): Wrong answer, reset to learning
- **hard** (quality 2): Correct but difficult
- **good** (quality 3): Correct with normal effort
- **easy** (quality 5): Perfect, instant recall

Raw quality scale (0-5):
- 0: Complete blackout, no memory
- 1: Wrong answer
- 2: Wrong but seemed familiar
- 3: Correct with difficulty
- 4: Correct with hesitation
- 5: Perfect, instant recall

=== RESPONSE ===

Returns:
- nextReviewAt: When to review next
- newInterval: Days until next review
- newEaseFactor: Updated ease factor
- newStatus: new/learning/reviewing/mastered
- intervalText: Human-readable interval (e.g., "3 days", "1 week")

=== EXAMPLE ===

{
  "grammarPointId": 123,
  "rating": "good",
  "timeSpentSeconds": 15
}`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional, uses authenticated user)',
      },
      grammarPointId: {
        type: 'number',
        description: 'Grammar point ID to review',
      },
      quality: {
        type: 'number',
        description: 'Quality rating (0-5)',
        minimum: 0,
        maximum: 5,
      },
      rating: {
        type: 'string',
        enum: ['again', 'hard', 'good', 'easy'],
        description: 'Rating button (alternative to quality)',
      },
      timeSpentSeconds: {
        type: 'number',
        description: 'Time spent on this review in seconds',
      },
      reviewType: {
        type: 'string',
        enum: ['flashcard', 'quiz', 'exercise'],
        description: 'Type of review (default: flashcard)',
      },
    },
    required: ['grammarPointId'],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  grammarPointId: z.number(),
  quality: z.number().min(0).max(5).optional(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).optional(),
  timeSpentSeconds: z.number().optional().default(0),
  reviewType: z.enum(['flashcard', 'quiz', 'exercise']).optional().default('flashcard'),
}).refine(
  (data) => data.quality !== undefined || data.rating !== undefined,
  { message: 'Either quality or rating must be provided' }
);

interface GrammarPointRow extends RowDataPacket {
  id: number;
  user_id: number;
  ease_factor: number;
  review_interval: number;
  repetition_count: number;
  lapse_count: number;
  review_status: 'new' | 'learning' | 'reviewing' | 'mastered';
}

// Convert button rating to quality number
function buttonToQuality(rating: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (rating) {
    case 'again': return 1;
    case 'hard': return 2;
    case 'good': return 3;
    case 'easy': return 5;
  }
}

// SM2 Algorithm implementation
function calculateSM2(
  quality: number,
  currentEF: number,
  currentInterval: number,
  repetitionCount: number
): {
  newEF: number;
  newInterval: number;
  newRepetitions: number;
  newStatus: 'new' | 'learning' | 'reviewing' | 'mastered';
} {
  // Calculate new ease factor
  let newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, Math.min(2.5, newEF)); // Clamp between 1.3 and 2.5

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed review - reset to learning
    newInterval = 0;
    newRepetitions = 0;
  } else {
    newRepetitions = repetitionCount + 1;

    if (repetitionCount === 0) {
      newInterval = 1;
    } else if (repetitionCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEF);
    }

    // Bonus for easy
    if (quality === 5) {
      newInterval = Math.round(newInterval * 1.3);
    }
  }

  // Determine status
  let newStatus: 'new' | 'learning' | 'reviewing' | 'mastered';
  if (newRepetitions === 0) {
    newStatus = 'learning';
  } else if (newInterval < 7) {
    newStatus = 'learning';
  } else if (newInterval < 30) {
    newStatus = 'reviewing';
  } else {
    newStatus = 'mastered';
  }

  return { newEF, newInterval, newRepetitions, newStatus };
}

// Format interval for human reading
function formatInterval(days: number): string {
  if (days === 0) return 'Now';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 14) return '1 week';
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  if (days < 60) return '1 month';
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`;
}

export async function submitGrammarReview(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  nextReviewAt: string;
  newInterval: number;
  newEaseFactor: number;
  newStatus: string;
  intervalText: string;
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Determine quality from rating or direct quality value
  const quality = input.rating ? buttonToQuality(input.rating) : input.quality!;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Get current grammar point data
    const [rows] = await connection.execute<GrammarPointRow[]>(
      `SELECT id, user_id, ease_factor, review_interval, repetition_count, lapse_count, review_status
       FROM grammar_points WHERE id = ? AND user_id = ?`,
      [input.grammarPointId, effectiveUserId]
    );

    if (rows.length === 0) {
      throw new Error(`Grammar point ${input.grammarPointId} not found for user ${effectiveUserId}`);
    }

    const grammarPoint = rows[0];
    const currentEF = Number(grammarPoint.ease_factor) || 2.5;
    const currentInterval = grammarPoint.review_interval || 0;
    const currentReps = grammarPoint.repetition_count || 0;

    // Calculate new SM2 values
    const { newEF, newInterval, newRepetitions, newStatus } = calculateSM2(
      quality,
      currentEF,
      currentInterval,
      currentReps
    );

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    // Update lapse count if failed
    const newLapseCount = quality < 3
      ? (grammarPoint.lapse_count || 0) + 1
      : grammarPoint.lapse_count || 0;

    // Update grammar point
    await connection.execute(
      `UPDATE grammar_points SET
         ease_factor = ?,
         review_interval = ?,
         repetition_count = ?,
         lapse_count = ?,
         review_status = ?,
         next_review_at = ?
       WHERE id = ?`,
      [newEF, newInterval, newRepetitions, newLapseCount, newStatus, nextReviewAt, input.grammarPointId]
    );

    // Record the review in grammar_reviews
    await connection.execute(
      `INSERT INTO grammar_reviews (
         user_id, grammar_point_id, quality,
         ease_factor_before, ease_factor_after,
         interval_before, interval_after
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        effectiveUserId,
        input.grammarPointId,
        quality,
        currentEF,
        newEF,
        currentInterval,
        newInterval,
      ]
    );

    // Mark as completed in daily queue if present
    const today = new Date().toISOString().split('T')[0];
    await connection.execute(
      `UPDATE daily_grammar_queue
       SET is_completed = TRUE
       WHERE user_id = ? AND grammar_point_id = ? AND queue_date = ?`,
      [effectiveUserId, input.grammarPointId, today]
    );

    await connection.commit();
    connection.release();

    return {
      success: true,
      nextReviewAt: nextReviewAt.toISOString(),
      newInterval,
      newEaseFactor: newEF,
      newStatus,
      intervalText: formatInterval(newInterval),
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}
