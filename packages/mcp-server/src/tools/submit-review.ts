import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';
import { shouldWriteToV3, logDualWrite } from '../helpers/dual-write.js';

export const submitReviewTool: Tool = {
  name: 'submit_review',
  description: `Submit vocabulary review result with quality rating using SM2 spaced repetition algorithm.

Quality ratings (0-5):
- 0: Complete blackout, no memory
- 1: Wrong answer (Again)
- 2: Wrong but seemed easy to recall (Hard)
- 3: Correct with difficulty (Good)
- 4: Correct with hesitation
- 5: Perfect, instant recall (Easy)

For typical 4-button UI: Again=1, Hard=2, Good=3, Easy=5

Returns the calculated next review date and interval.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional if authenticated via MCP_USERNAME)',
      },
      vocabularyId: {
        type: 'number',
        description: 'Vocabulary item ID to review',
      },
      quality: {
        type: 'number',
        description: 'Quality rating (0-5)',
        minimum: 0,
        maximum: 5,
      },
      reviewType: {
        type: 'string',
        enum: ['flashcard', 'quiz', 'exercise'],
        description: 'Type of review (default: flashcard)',
      },
      direction: {
        type: 'string',
        enum: ['vi_to_en', 'en_to_vi'],
        description: 'Review direction (default: vi_to_en)',
      },
      timeSpentSeconds: {
        type: 'number',
        description: 'Time spent on this review in seconds',
      },
    },
    required: ['vocabularyId', 'quality'],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  vocabularyId: z.number(),
  quality: z.number().min(0).max(5),
  reviewType: z.enum(['flashcard', 'quiz', 'exercise']).optional().default('flashcard'),
  direction: z.enum(['vi_to_en', 'en_to_vi']).optional().default('vi_to_en'),
  timeSpentSeconds: z.number().min(0).optional().default(0),
});

type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

interface SM2Result {
  nextReviewAt: Date;
  newInterval: number;
  newEaseFactor: number;
  newRepetitionCount: number;
  newLapseCount: number;
  newStatus: ReviewStatus;
}

interface VocabularyRow extends RowDataPacket {
  id: number;
  user_id: number;
  english_word: string;
  vietnamese_word: string;
  part_of_speech: string;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: ReviewStatus;
}

interface ReviewStreakRow extends RowDataPacket {
  current_streak: number;
  longest_streak: number;
  last_review_date: Date | null;
  streak_start_date: Date | null;
  total_review_days: number;
}

/**
 * SM2 Algorithm Implementation
 * Calculates next review date and updates learning parameters
 */
function calculateSM2(
  quality: number,
  currentInterval: number,
  currentEaseFactor: number,
  repetitionCount: number,
  lapseCount: number
): SM2Result {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));

  let newInterval: number;
  let newEaseFactor: number;
  let newRepetitionCount: number;
  let newLapseCount = lapseCount;
  let newStatus: ReviewStatus;

  if (quality < 3) {
    // Failed review - reset to learning phase
    newRepetitionCount = 0;
    newInterval = 1; // Review again tomorrow
    newLapseCount = lapseCount + 1;
    newStatus = 'learning';

    // Reduce ease factor on failure (but not below 1.3)
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
  } else {
    // Successful review
    if (repetitionCount === 0) {
      newInterval = 1;
    } else if (repetitionCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }

    newRepetitionCount = repetitionCount + 1;

    // Update ease factor using SM2 formula
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // Minimum EF is 1.3
    newEaseFactor = Math.min(5.0, newEaseFactor); // Maximum EF is 5.0
    newEaseFactor = Math.round(newEaseFactor * 100) / 100; // Round to 2 decimals

    // Determine status based on interval
    if (newInterval >= 21) {
      newStatus = 'mastered';
    } else if (newInterval >= 3) {
      newStatus = 'reviewing';
    } else {
      newStatus = 'learning';
    }
  }

  // Cap interval at 365 days
  newInterval = Math.min(365, newInterval);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  nextReviewAt.setHours(0, 0, 0, 0);

  return {
    nextReviewAt,
    newInterval,
    newEaseFactor,
    newRepetitionCount,
    newLapseCount,
    newStatus,
  };
}

/**
 * Calculate mastery level (0-100) from review status and repetition count
 */
function calculateMasteryLevel(status: ReviewStatus, repetitionCount: number): number {
  switch (status) {
    case 'new':
      return 0;
    case 'learning':
      return Math.min(30, repetitionCount * 10);
    case 'reviewing':
      return 30 + Math.min(50, repetitionCount * 5);
    case 'mastered':
      return 80 + Math.min(20, repetitionCount);
    default:
      return 0;
  }
}

/**
 * Update user's review streak
 */
async function updateStreak(db: DatabaseConnection, userId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const rows = await db.query<ReviewStreakRow[]>(
    `SELECT * FROM review_streaks WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    // Create new streak record
    await db.execute(
      `INSERT INTO review_streaks
         (user_id, current_streak, longest_streak, last_review_date, streak_start_date, total_review_days)
       VALUES (?, 1, 1, ?, ?, 1)`,
      [userId, today, today]
    );
    return;
  }

  const streak = rows[0];
  const lastDate = streak.last_review_date;

  if (lastDate) {
    const lastDateStr = new Date(lastDate).toISOString().split('T')[0];

    if (lastDateStr === today) {
      // Already reviewed today, no streak update needed
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDateStr === yesterdayStr) {
      // Consecutive day - increment streak
      const newStreak = streak.current_streak + 1;
      const newLongest = Math.max(newStreak, streak.longest_streak);

      await db.execute(
        `UPDATE review_streaks SET
           current_streak = ?,
           longest_streak = ?,
           last_review_date = ?,
           total_review_days = total_review_days + 1
         WHERE user_id = ?`,
        [newStreak, newLongest, today, userId]
      );
    } else {
      // Streak broken - reset
      await db.execute(
        `UPDATE review_streaks SET
           current_streak = 1,
           last_review_date = ?,
           streak_start_date = ?,
           total_review_days = total_review_days + 1
         WHERE user_id = ?`,
        [today, today, userId]
      );
    }
  } else {
    // First ever review
    await db.execute(
      `UPDATE review_streaks SET
         current_streak = 1,
         longest_streak = 1,
         last_review_date = ?,
         streak_start_date = ?,
         total_review_days = 1
       WHERE user_id = ?`,
      [today, today, userId]
    );
  }
}

export async function submitReview(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  vocabularyId: number;
  englishWord: string;
  vietnameseWord: string;
  previousStatus: string;
  newStatus: string;
  previousInterval: number;
  newInterval: number;
  previousEaseFactor: number;
  newEaseFactor: number;
  nextReviewAt: string;
  message: string;
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get current vocabulary state
  const vocabRows = await db.query<VocabularyRow[]>(
    `SELECT * FROM vocabulary WHERE id = ? AND user_id = ?`,
    [input.vocabularyId, effectiveUserId]
  );

  if (vocabRows.length === 0) {
    throw new Error(`Vocabulary item ${input.vocabularyId} not found for user ${effectiveUserId}`);
  }

  const vocab = vocabRows[0];

  // Calculate new SM2 values
  const result = calculateSM2(
    input.quality,
    vocab.review_interval,
    Number(vocab.ease_factor),
    vocab.repetition_count,
    vocab.lapse_count
  );

  // Update vocabulary with new SM2 values
  await db.execute(
    `UPDATE vocabulary SET
       next_review_at = ?,
       review_interval = ?,
       ease_factor = ?,
       repetition_count = ?,
       lapse_count = ?,
       review_status = ?,
       times_practiced = times_practiced + 1,
       last_practiced_at = NOW(),
       mastery_level = ?
     WHERE id = ?`,
    [
      result.nextReviewAt.toISOString().split('T')[0],
      result.newInterval,
      result.newEaseFactor,
      result.newRepetitionCount,
      result.newLapseCount,
      result.newStatus,
      calculateMasteryLevel(result.newStatus, result.newRepetitionCount),
      input.vocabularyId,
    ]
  );

  // Record review history
  await db.execute(
    `INSERT INTO vocabulary_reviews
       (user_id, vocabulary_id, quality, ease_factor_before, ease_factor_after,
        interval_before, interval_after, review_type, direction, time_spent_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      effectiveUserId,
      input.vocabularyId,
      input.quality,
      vocab.ease_factor,
      result.newEaseFactor,
      vocab.review_interval,
      result.newInterval,
      input.reviewType,
      input.direction,
      input.timeSpentSeconds,
    ]
  );

  // Dual-write to V3 tables if enabled
  if (shouldWriteToV3()) {
    await dualWriteReviewToV3(
      db,
      effectiveUserId,
      vocab.english_word,
      vocab.part_of_speech || 'noun',
      input.quality,
      result,
      vocab.ease_factor,
      vocab.review_interval,
      input.reviewType,
      input.direction,
      input.timeSpentSeconds
    );
  }

  // Mark as completed in today's queue
  const today = new Date().toISOString().split('T')[0];
  await db.execute(
    `UPDATE daily_review_queue SET
       is_completed = TRUE,
       completed_at = NOW(),
       quality_rating = ?
     WHERE user_id = ? AND vocabulary_id = ? AND queue_date = ?`,
    [input.quality, effectiveUserId, input.vocabularyId, today]
  );

  // Update streak
  await updateStreak(db, effectiveUserId);

  // Generate quality label
  const qualityLabels: Record<number, string> = {
    0: 'Blackout',
    1: 'Again',
    2: 'Hard',
    3: 'Good',
    4: 'Good+',
    5: 'Easy',
  };

  const qualityLabel = qualityLabels[input.quality] || 'Unknown';
  const nextReviewStr = result.nextReviewAt.toISOString().split('T')[0];

  return {
    success: true,
    vocabularyId: vocab.id,
    englishWord: vocab.english_word,
    vietnameseWord: vocab.vietnamese_word,
    previousStatus: vocab.review_status,
    newStatus: result.newStatus,
    previousInterval: vocab.review_interval,
    newInterval: result.newInterval,
    previousEaseFactor: Number(vocab.ease_factor),
    newEaseFactor: result.newEaseFactor,
    nextReviewAt: nextReviewStr,
    message: `Review recorded (${qualityLabel}). "${vocab.english_word}" will be reviewed again in ${result.newInterval} day${result.newInterval > 1 ? 's' : ''} (${nextReviewStr}).`,
  };
}

/**
 * Dual-write review to V3 tables
 * Updates user_vocabulary SM2 fields and records review history
 */
async function dualWriteReviewToV3(
  db: DatabaseConnection,
  userId: number,
  englishWord: string,
  partOfSpeech: string,
  quality: number,
  result: SM2Result,
  easeFactorBefore: number,
  intervalBefore: number,
  reviewType: string,
  direction: string,
  timeSpentSeconds: number
): Promise<void> {
  try {
    logDualWrite('review_v3_start', { englishWord, quality });

    // Find master_vocabulary entry
    const masterRows = await db.query<RowDataPacket[]>(
      `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
      [englishWord, partOfSpeech]
    );

    if (masterRows.length === 0) {
      logDualWrite('review_v3_skip', { englishWord, reason: 'No master_vocabulary found' });
      return;
    }

    const masterVocabId = masterRows[0].id;

    // Find user_vocabulary entry
    const userVocabRows = await db.query<RowDataPacket[]>(
      `SELECT id FROM user_vocabulary WHERE user_id = ? AND master_vocabulary_id = ?`,
      [userId, masterVocabId]
    );

    if (userVocabRows.length === 0) {
      logDualWrite('review_v3_skip', { englishWord, reason: 'No user_vocabulary found' });
      return;
    }

    const userVocabId = userVocabRows[0].id;

    // Update user_vocabulary with SM2 values
    await db.execute(
      `UPDATE user_vocabulary SET
         next_review_at = ?,
         review_interval = ?,
         ease_factor = ?,
         repetition_count = ?,
         lapse_count = ?,
         review_status = ?,
         times_practiced = times_practiced + 1,
         last_practiced_at = NOW(),
         mastery_level = ?
       WHERE id = ?`,
      [
        result.nextReviewAt.toISOString().split('T')[0],
        result.newInterval,
        result.newEaseFactor,
        result.newRepetitionCount,
        result.newLapseCount,
        result.newStatus,
        calculateMasteryLevel(result.newStatus, result.newRepetitionCount),
        userVocabId,
      ]
    );

    // Record review history in V3 table (vocabulary_reviews_v3)
    // Check if table exists first, if not skip this step
    try {
      await db.execute(
        `INSERT INTO vocabulary_reviews_v3
           (user_id, user_vocabulary_id, quality, ease_factor_before, ease_factor_after,
            interval_before, interval_after, review_type, direction, time_spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userVocabId,
          quality,
          easeFactorBefore,
          result.newEaseFactor,
          intervalBefore,
          result.newInterval,
          reviewType,
          direction,
          timeSpentSeconds,
        ]
      );
    } catch (tableError) {
      // Table might not exist yet, log and continue
      logDualWrite('review_v3_table_missing', {
        table: 'vocabulary_reviews_v3',
        error: tableError instanceof Error ? tableError.message : 'Unknown error'
      });
    }

    logDualWrite('review_v3_success', { englishWord, userVocabId, newStatus: result.newStatus });
  } catch (error) {
    // Log error but don't fail the V2 update
    console.error('[MCP-DUAL-WRITE] Failed to write review to V3:', error);
    logDualWrite('review_v3_error', {
      englishWord,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
