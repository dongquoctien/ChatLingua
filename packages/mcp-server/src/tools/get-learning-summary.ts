import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getLearningSummaryTool: Tool = {
  name: 'get_learning_summary',
  description: `Get a summary of the user's learning progress and statistics.
Use this to show the user their progress, streak, and achievements.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'all'],
        description: 'Time period for the summary',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(), // Injected by handler from user context
  period: z.enum(['today', 'week', 'month', 'all']).optional().default('all'),
});

interface StatsRow extends RowDataPacket {
  total_conversations: number;
  total_vocabulary_learned: number;
  total_grammar_points: number;
  total_exercises_completed: number;
  total_quizzes_taken: number;
  average_quiz_score: number;
  best_quiz_score: number;
  fastest_quiz_time_seconds: number | null;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: Date | null;
}

interface ActivityRow extends RowDataPacket {
  activity_date: Date;
  conversations_count: number;
  vocabulary_added: number;
  exercises_completed: number;
  quizzes_taken: number;
  study_time_minutes: number;
}

export async function getLearningSummary(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  statistics: {
    totalConversations: number;
    totalVocabularyLearned: number;
    totalGrammarPoints: number;
    totalExercisesCompleted: number;
    totalQuizzesTaken: number;
    averageQuizScore: number;
    bestQuizScore: number;
    fastestQuizTimeSeconds: number | null;
    currentStreakDays: number;
    longestStreakDays: number;
    lastActivityDate: string | null;
  };
  periodStats: {
    conversationsCount: number;
    vocabularyAdded: number;
    exercisesCompleted: number;
    quizzesTaken: number;
  };
  recentActivity: {
    date: string;
    conversations: number;
    vocabulary: number;
    exercises: number;
  }[];
}> {
  const input = inputSchema.parse(args);

  // Use explicit userId if provided, otherwise use resolved userId from env auth, fallback to 1
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get overall statistics
  const statsRows = await db.query<StatsRow[]>(
    `SELECT * FROM user_statistics WHERE user_id = ?`,
    [effectiveUserId]
  );

  const stats = statsRows[0] || {
    total_conversations: 0,
    total_vocabulary_learned: 0,
    total_grammar_points: 0,
    total_exercises_completed: 0,
    total_quizzes_taken: 0,
    average_quiz_score: 0,
    best_quiz_score: 0,
    fastest_quiz_time_seconds: null,
    current_streak_days: 0,
    longest_streak_days: 0,
    last_activity_date: null,
  };

  // Get period-specific stats
  let dateFilter = '';
  switch (input.period) {
    case 'today':
      dateFilter = 'AND activity_date = CURDATE()';
      break;
    case 'week':
      dateFilter = 'AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateFilter = 'AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    default:
      dateFilter = '';
  }

  const activityRows = await db.query<ActivityRow[]>(
    `SELECT * FROM daily_activity_log
     WHERE user_id = ? ${dateFilter}
     ORDER BY activity_date DESC
     LIMIT 30`,
    [effectiveUserId]
  );

  // Calculate period totals
  const periodStats = activityRows.reduce(
    (acc, row) => ({
      conversationsCount: acc.conversationsCount + row.conversations_count,
      vocabularyAdded: acc.vocabularyAdded + row.vocabulary_added,
      exercisesCompleted: acc.exercisesCompleted + row.exercises_completed,
      quizzesTaken: acc.quizzesTaken + row.quizzes_taken,
    }),
    { conversationsCount: 0, vocabularyAdded: 0, exercisesCompleted: 0, quizzesTaken: 0 }
  );

  return {
    success: true,
    statistics: {
      totalConversations: stats.total_conversations,
      totalVocabularyLearned: stats.total_vocabulary_learned,
      totalGrammarPoints: stats.total_grammar_points,
      totalExercisesCompleted: stats.total_exercises_completed,
      totalQuizzesTaken: stats.total_quizzes_taken,
      averageQuizScore: stats.average_quiz_score,
      bestQuizScore: stats.best_quiz_score,
      fastestQuizTimeSeconds: stats.fastest_quiz_time_seconds,
      currentStreakDays: stats.current_streak_days,
      longestStreakDays: stats.longest_streak_days,
      lastActivityDate: stats.last_activity_date?.toISOString().split('T')[0] || null,
    },
    periodStats,
    recentActivity: activityRows.slice(0, 7).map((row) => ({
      date: row.activity_date.toISOString().split('T')[0],
      conversations: row.conversations_count,
      vocabulary: row.vocabulary_added,
      exercises: row.exercises_completed,
    })),
  };
}
