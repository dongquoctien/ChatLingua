import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../../database/connection';
import { RowDataPacket } from 'mysql2/promise';

// ============================================================
// Tool Definitions
// ============================================================

export const getUserProgressTool: Tool = {
  name: 'get_user_progress',
  description: `[PROGRESS] Get comprehensive learning progress for a user.

Returns progress across all Word Maps including:
- Overall statistics (vocabulary learned, XP earned)
- Progress per Word Map
- Current unit/lesson status
- Review queue status`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (uses authenticated user if not provided)',
      },
    },
    required: [],
  },
};

export const getVocabularyReviewQueueTool: Tool = {
  name: 'get_vocabulary_review_queue',
  description: `[PROGRESS] Get vocabulary items due for spaced repetition review.

Returns vocabulary that needs review based on SM2 algorithm.
Includes mastery level, last reviewed date, and next review date.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum items to return (default: 20)',
      },
    },
    required: [],
  },
};

export const submitVocabularyReviewTool: Tool = {
  name: 'submit_vocabulary_review',
  description: `[PROGRESS] Submit a vocabulary review result.

Updates spaced repetition scheduling based on quality rating:
- 0-1: Failed (reset interval)
- 2: Hard (increase interval slightly)
- 3-4: Good (normal interval increase)
- 5: Easy (bonus interval increase)`,
  inputSchema: {
    type: 'object',
    properties: {
      userVocabularyId: {
        type: 'number',
        description: 'User vocabulary ID',
      },
      userId: {
        type: 'number',
        description: 'User ID',
      },
      quality: {
        type: 'number',
        minimum: 0,
        maximum: 5,
        description: 'Quality rating (0-5)',
      },
    },
    required: ['userVocabularyId', 'quality'],
  },
};

export const getLeaderboardTool: Tool = {
  name: 'get_leaderboard',
  description: `[PROGRESS] Get Word Map leaderboard rankings.

Returns top learners by XP earned for a specific Word Map or globally.`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID (optional, global if not provided)',
      },
      limit: {
        type: 'number',
        description: 'Number of entries (default: 10)',
      },
      includeUser: {
        type: 'boolean',
        description: 'Include current user position even if not in top',
      },
      userId: {
        type: 'number',
        description: 'User ID for includeUser',
      },
    },
    required: [],
  },
};

export const getStudyStatsTool: Tool = {
  name: 'get_study_stats',
  description: `[PROGRESS] Get detailed study statistics for a user.

Returns breakdown of study activity including:
- Daily/weekly/monthly stats
- Time spent studying
- Vocabulary mastery trends
- Exam performance`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID',
      },
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'all'],
        description: 'Time period for stats',
      },
    },
    required: [],
  },
};

// ============================================================
// Zod Schemas
// ============================================================

const getUserProgressSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const getVocabularyReviewQueueSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  limit: z.number().optional().default(20),
});

const submitVocabularyReviewSchema = z.object({
  userVocabularyId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  quality: z.number().min(0).max(5),
});

const getLeaderboardSchema = z.object({
  mapId: z.number().optional(),
  limit: z.number().optional().default(10),
  includeUser: z.boolean().optional().default(false),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const getStudyStatsSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  period: z.enum(['today', 'week', 'month', 'all']).optional().default('all'),
});

// ============================================================
// Type Definitions
// ============================================================

interface MapProgressRow extends RowDataPacket {
  id: number;
  map_id: number;
  word_map_name: string;
  completion_percentage: number;
  units_completed: number;
  lessons_completed: number;
  total_xp_earned: number;
  current_unit_id: number | null;
  current_unit_name?: string;
}

interface UserVocabularyRow extends RowDataPacket {
  id: number;
  master_vocabulary_id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  part_of_speech: string;
  cefr_level: string;
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: Date | null;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  review_status: string;
}

interface LeaderboardRow extends RowDataPacket {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
}

// SM2 algorithm constants
const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASY_BONUS: 1.3,
  INTERVAL_MODIFIER: 1.0,
};

// ============================================================
// Tool Implementations
// ============================================================

export async function getUserProgress(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  progress: {
    totalVocabulary: number;
    totalXpEarned: number;
    totalTimeSpentMinutes: number;
    activeMaps: number;
    completedMaps: number;
    maps: Array<{
      id: number;
      mapId: number;
      mapName: string;
      progressPercentage: number;
      unitsCompleted: number;
      lessonsCompleted: number;
      xpEarned: number;
      currentUnit: { id: number; name: string } | null;
    }>;
    reviewQueue: {
      dueToday: number;
      newWords: number;
      mastered: number;
    };
  };
}> {
  const input = getUserProgressSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get vocabulary stats
  const [vocabStats] = await db.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN next_review_at <= NOW() OR next_review_at IS NULL THEN 1 ELSE 0 END) as due_today,
       SUM(CASE WHEN review_status = 'new' THEN 1 ELSE 0 END) as new_words,
       SUM(CASE WHEN review_status = 'mastered' THEN 1 ELSE 0 END) as mastered
     FROM user_vocabulary
     WHERE user_id = ?`,
    [effectiveUserId]
  );

  // Get map progress with names
  const mapProgressRows = await db.query<MapProgressRow[]>(
    `SELECT ump.*,
            wm.name as word_map_name,
            mu.title as current_unit_name
     FROM user_map_progress ump
     JOIN word_maps wm ON ump.map_id = wm.id
     LEFT JOIN map_units mu ON ump.current_unit_id = mu.id
     WHERE ump.user_id = ? AND ump.is_active = TRUE
     ORDER BY ump.updated_at DESC`,
    [effectiveUserId]
  );

  // Calculate totals
  const totalXpEarned = mapProgressRows.reduce((sum, m) => sum + (m.total_xp_earned || 0), 0);
  const completedMaps = mapProgressRows.filter(m => (m.completion_percentage || 0) >= 100).length;

  // Get total time spent (from user_map_progress.total_study_time_minutes)
  const [timeStats] = await db.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(total_study_time_minutes), 0) as total_time_minutes
     FROM user_map_progress
     WHERE user_id = ?`,
    [effectiveUserId]
  );

  return {
    success: true,
    progress: {
      totalVocabulary: (vocabStats[0].total as number) || 0,
      totalXpEarned,
      totalTimeSpentMinutes: (timeStats[0].total_time_minutes as number) || 0,
      activeMaps: mapProgressRows.length,
      completedMaps,
      maps: mapProgressRows.map(m => ({
        id: m.id,
        mapId: m.map_id,
        mapName: m.word_map_name,
        progressPercentage: m.completion_percentage || 0,
        unitsCompleted: m.units_completed || 0,
        lessonsCompleted: m.lessons_completed || 0,
        xpEarned: m.total_xp_earned || 0,
        currentUnit: m.current_unit_id ? {
          id: m.current_unit_id,
          name: m.current_unit_name || '',
        } : null,
      })),
      reviewQueue: {
        dueToday: (vocabStats[0].due_today as number) || 0,
        newWords: (vocabStats[0].new_words as number) || 0,
        mastered: (vocabStats[0].mastered as number) || 0,
      },
    },
  };
}

export async function getVocabularyReviewQueue(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  queue: Array<{
    id: number;
    masterVocabularyId: number;
    englishWord: string;
    vietnameseWord: string;
    phonetic: string | null;
    partOfSpeech: string;
    cefrLevel: string;
    masteryLevel: number;
    reviewStatus: string;
    lastPracticedAt: Date | null;
    nextReviewAt: Date | null;
  }>;
  total: number;
}> {
  const input = getVocabularyReviewQueueSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const rows = await db.query<UserVocabularyRow[]>(
    `SELECT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level
     FROM user_vocabulary uv
     JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
     WHERE uv.user_id = ?
       AND (uv.next_review_at IS NULL OR uv.next_review_at <= NOW())
       AND uv.review_status != 'mastered'
     ORDER BY
       CASE
         WHEN uv.next_review_at IS NULL THEN 0
         WHEN uv.next_review_at < NOW() THEN 1
         ELSE 2
       END,
       uv.next_review_at ASC
     LIMIT ?`,
    [effectiveUserId, input.limit]
  );

  return {
    success: true,
    queue: rows.map(row => ({
      id: row.id,
      masterVocabularyId: row.master_vocabulary_id,
      englishWord: row.english_word,
      vietnameseWord: row.vietnamese_word,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      cefrLevel: row.cefr_level,
      masteryLevel: row.mastery_level,
      reviewStatus: row.review_status,
      lastPracticedAt: row.last_practiced_at,
      nextReviewAt: row.next_review_at,
    })),
    total: rows.length,
  };
}

export async function submitVocabularyReview(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  result: {
    nextReviewAt: Date;
    newInterval: number;
    newEaseFactor: number;
    newStatus: string;
    masteryLevel: number;
  };
} | { success: false; error: string }> {
  const input = submitVocabularyReviewSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get current vocabulary state
  const [vocabRows] = await db.query<UserVocabularyRow[]>(
    `SELECT * FROM user_vocabulary WHERE id = ? AND user_id = ?`,
    [input.userVocabularyId, effectiveUserId]
  );

  if (vocabRows.length === 0) {
    return { success: false, error: 'Vocabulary item not found' };
  }

  const vocab = vocabRows[0];
  const quality = input.quality;

  // Calculate new ease factor using SM2
  let newEaseFactor = vocab.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);

  let newInterval: number;
  let newRepetitionCount: number;
  let newLapseCount = vocab.review_interval; // Using review_interval as lapse_count placeholder

  if (quality < 3) {
    // Failed review - reset to learning
    newInterval = 1;
    newRepetitionCount = 0;
    newLapseCount += 1;
  } else {
    // Successful review
    newRepetitionCount = vocab.times_practiced + 1;

    if (vocab.times_practiced === 0) {
      newInterval = 1;
    } else if (vocab.times_practiced === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(vocab.review_interval * newEaseFactor * SM2.INTERVAL_MODIFIER);
    }

    // Easy bonus
    if (quality === 5) {
      newInterval = Math.round(newInterval * SM2.EASY_BONUS);
    }
  }

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  // Determine new status
  let newStatus: string;
  if (newRepetitionCount === 0) {
    newStatus = 'learning';
  } else if (newInterval >= 21) {
    newStatus = 'mastered';
  } else {
    newStatus = 'reviewing';
  }

  // Calculate mastery level (0-100)
  const masteryLevel = Math.min(100, Math.round(
    (newRepetitionCount / 10) * 50 +
    ((newEaseFactor - SM2.MIN_EASE_FACTOR) / (3.0 - SM2.MIN_EASE_FACTOR)) * 30 +
    (quality / 5) * 20
  ));

  // Update database
  await db.query(
    `UPDATE user_vocabulary SET
      mastery_level = ?,
      times_practiced = times_practiced + 1,
      last_practiced_at = NOW(),
      next_review_at = ?,
      review_interval = ?,
      ease_factor = ?,
      review_status = ?
    WHERE id = ?`,
    [masteryLevel, nextReviewAt, newInterval, newEaseFactor, newStatus, input.userVocabularyId]
  );

  // Record in vocabulary_reviews_v3
  await db.query(
    `INSERT INTO vocabulary_reviews_v3 (
      user_id, user_vocabulary_id, quality,
      ease_factor_before, ease_factor_after,
      interval_before, interval_after,
      review_type, direction, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'flashcard', 'vi_to_en', NOW())`,
    [effectiveUserId, input.userVocabularyId, quality, vocab.ease_factor, newEaseFactor, vocab.review_interval, newInterval]
  );

  return {
    success: true,
    result: {
      nextReviewAt,
      newInterval,
      newEaseFactor,
      newStatus,
      masteryLevel,
    },
  };
}

export async function getLeaderboard(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  leaderboard: Array<{
    rank: number;
    userId: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalXp: number;
  }>;
  userPosition?: {
    rank: number;
    totalXp: number;
  };
}> {
  const input = getLeaderboardSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId;

  let leaderboardSql: string;
  let params: (number | string)[];

  if (input.mapId) {
    // Map-specific leaderboard
    leaderboardSql = `
      SELECT
        ump.user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        ump.total_xp_earned as total_xp,
        RANK() OVER (ORDER BY ump.total_xp_earned DESC) as \`rank\`
      FROM user_map_progress ump
      JOIN users u ON ump.user_id = u.id
      WHERE ump.map_id = ? AND ump.is_active = TRUE
      ORDER BY total_xp DESC
      LIMIT ?
    `;
    params = [input.mapId, input.limit];
  } else {
    // Global leaderboard - sum across all maps
    leaderboardSql = `
      SELECT
        ump.user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        SUM(ump.total_xp_earned) as total_xp,
        RANK() OVER (ORDER BY SUM(ump.total_xp_earned) DESC) as \`rank\`
      FROM user_map_progress ump
      JOIN users u ON ump.user_id = u.id
      WHERE ump.is_active = TRUE
      GROUP BY ump.user_id, u.username, u.display_name, u.avatar_url
      ORDER BY total_xp DESC
      LIMIT ?
    `;
    params = [input.limit];
  }

  const rows = await db.query<LeaderboardRow[]>(leaderboardSql, params);

  const leaderboard = rows.map(row => ({
    rank: Number(row.rank),
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalXp: Number(row.total_xp),
  }));

  // Get user position if requested
  let userPosition: { rank: number; totalXp: number } | undefined;

  if (input.includeUser && effectiveUserId) {
    // Check if user is already in leaderboard
    const userInLeaderboard = leaderboard.find(e => e.userId === effectiveUserId);

    if (userInLeaderboard) {
      userPosition = {
        rank: userInLeaderboard.rank,
        totalXp: userInLeaderboard.totalXp,
      };
    } else {
      // Get user's position separately
      let userRankSql: string;
      let userRankParams: number[];

      if (input.mapId) {
        userRankSql = `
          SELECT
            total_xp_earned as total_xp,
            (SELECT COUNT(*) + 1 FROM user_map_progress
             WHERE map_id = ? AND total_xp_earned > ump.total_xp_earned AND is_active = TRUE) as \`rank\`
          FROM user_map_progress ump
          WHERE user_id = ? AND map_id = ? AND is_active = TRUE
        `;
        userRankParams = [input.mapId, effectiveUserId, input.mapId];
      } else {
        userRankSql = `
          SELECT
            (SELECT SUM(total_xp_earned) FROM user_map_progress WHERE user_id = ? AND is_active = TRUE) as total_xp,
            (SELECT COUNT(*) + 1 FROM (
              SELECT user_id, SUM(total_xp_earned) as total_xp
              FROM user_map_progress WHERE is_active = TRUE
              GROUP BY user_id
            ) t WHERE t.total_xp > (
              SELECT COALESCE(SUM(total_xp_earned), 0) FROM user_map_progress WHERE user_id = ? AND is_active = TRUE
            )) as \`rank\`
        `;
        userRankParams = [effectiveUserId, effectiveUserId];
      }

      const [userRankRows] = await db.query<RowDataPacket[]>(userRankSql, userRankParams);

      if (userRankRows.length > 0 && userRankRows[0].total_xp !== null) {
        userPosition = {
          rank: Number(userRankRows[0].rank),
          totalXp: Number(userRankRows[0].total_xp),
        };
      }
    }
  }

  return {
    success: true,
    leaderboard,
    userPosition,
  };
}

export async function getStudyStats(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  stats: {
    period: string;
    lessonsCompleted: number;
    vocabularyLearned: number;
    vocabularyMastered: number;
    examsAttempted: number;
    examsPassed: number;
    averageExamScore: number;
    timeSpentMinutes: number;
    xpEarned: number;
    streakDays: number;
  };
}> {
  const input = getStudyStatsSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Calculate date range
  let dateCondition = '';
  const params: (number | string)[] = [effectiveUserId];

  if (input.period === 'today') {
    dateCondition = 'AND DATE(completed_at) = CURDATE()';
  } else if (input.period === 'week') {
    dateCondition = 'AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  } else if (input.period === 'month') {
    dateCondition = 'AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  }

  // Get lesson stats (use study_time_minutes instead of time_spent_seconds)
  const [lessonStats] = await db.query<RowDataPacket[]>(
    `SELECT
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as lessons_completed,
       COALESCE(SUM(xp_earned), 0) as xp_earned,
       COALESCE(SUM(study_time_minutes), 0) as time_spent_minutes
     FROM user_lesson_progress
     WHERE user_id = ? ${dateCondition.replace('completed_at', 'COALESCE(study_completed_at, created_at)')}`,
    params
  );

  // Get vocabulary stats
  const [vocabStats] = await db.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN review_status = 'mastered' THEN 1 ELSE 0 END) as mastered
     FROM user_vocabulary
     WHERE user_id = ? ${dateCondition.replace('completed_at', 'created_at')}`,
    params
  );

  // Get exam stats (use is_passed, score instead of passed, percentage)
  const [examStats] = await db.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as attempts,
       SUM(CASE WHEN is_passed = TRUE THEN 1 ELSE 0 END) as passed,
       AVG(score) as avg_score
     FROM user_exam_attempts
     WHERE user_id = ? AND completed_at IS NOT NULL ${dateCondition}`,
    params
  );

  // Calculate streak (consecutive days with activity)
  const [streakResult] = await db.query<RowDataPacket[]>(
    `WITH RECURSIVE dates AS (
       SELECT CURDATE() as dt
       UNION ALL
       SELECT DATE_SUB(dt, INTERVAL 1 DAY) FROM dates WHERE dt > DATE_SUB(CURDATE(), INTERVAL 365 DAY)
     ),
     activity_days AS (
       SELECT DISTINCT DATE(COALESCE(last_activity_at, updated_at)) as activity_date
       FROM user_lesson_progress
       WHERE user_id = ?
       UNION
       SELECT DISTINCT DATE(reviewed_at)
       FROM vocabulary_reviews_v3
       WHERE user_id = ?
     )
     SELECT COUNT(*) as streak
     FROM (
       SELECT d.dt, a.activity_date,
              SUM(CASE WHEN a.activity_date IS NULL THEN 1 ELSE 0 END) OVER (ORDER BY d.dt DESC) as grp
       FROM dates d
       LEFT JOIN activity_days a ON d.dt = a.activity_date
       WHERE d.dt <= CURDATE()
     ) t
     WHERE grp = 0`,
    [effectiveUserId, effectiveUserId]
  );

  return {
    success: true,
    stats: {
      period: input.period,
      lessonsCompleted: (lessonStats[0].lessons_completed as number) || 0,
      vocabularyLearned: (vocabStats[0].total as number) || 0,
      vocabularyMastered: (vocabStats[0].mastered as number) || 0,
      examsAttempted: (examStats[0].attempts as number) || 0,
      examsPassed: (examStats[0].passed as number) || 0,
      averageExamScore: Math.round((examStats[0].avg_score as number) || 0),
      timeSpentMinutes: (lessonStats[0].time_spent_minutes as number) || 0,
      xpEarned: (lessonStats[0].xp_earned as number) || 0,
      streakDays: (streakResult[0]?.streak as number) || 0,
    },
  };
}
