import pool from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

interface StatsRow extends RowDataPacket {
  user_id: number;
  total_conversations: number;
  total_vocabulary_learned: number;
  total_grammar_learned: number;
  total_exercises_completed: number;
  total_correct_answers: number;
  total_quizzes_completed: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: Date | null;
}

interface DailyLogRow extends RowDataPacket {
  activity_date: Date;
  conversations_added: number;
  vocabulary_learned: number;
  exercises_completed: number;
  correct_answers: number;
  quizzes_completed: number;
  time_spent_minutes: number;
}

export interface UserOverviewStats {
  totalConversations: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  totalQuizzes: number;
  correctRate: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}

export interface DailyActivity {
  date: Date;
  conversationsAdded: number;
  vocabularyLearned: number;
  exercisesCompleted: number;
  correctAnswers: number;
  quizzesCompleted: number;
  timeSpentMinutes: number;
}

export interface PeriodReport {
  period: string;
  startDate: Date;
  endDate: Date;
  summary: {
    totalDaysActive: number;
    totalConversations: number;
    totalVocabulary: number;
    totalExercises: number;
    totalQuizzes: number;
    averageCorrectRate: number;
    totalTimeSpentMinutes: number;
  };
  dailyBreakdown: DailyActivity[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number;
  quizTitle?: string;
  timeSpentSeconds?: number;
  completedAt?: Date;
}

export class StatsService {
  async getOverview(userId: number): Promise<UserOverviewStats> {
    const [rows] = await pool.execute<StatsRow[]>(
      'SELECT * FROM user_statistics WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      // Create initial stats if not exists
      await pool.execute(
        'INSERT INTO user_statistics (user_id) VALUES (?)',
        [userId]
      );
      return {
        totalConversations: 0,
        totalVocabulary: 0,
        totalGrammar: 0,
        totalExercises: 0,
        totalQuizzes: 0,
        correctRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    const stats = rows[0];
    const correctRate = stats.total_exercises_completed > 0
      ? Math.round((stats.total_correct_answers / stats.total_exercises_completed) * 100)
      : 0;

    return {
      totalConversations: stats.total_conversations,
      totalVocabulary: stats.total_vocabulary_learned,
      totalGrammar: stats.total_grammar_learned,
      totalExercises: stats.total_exercises_completed,
      totalQuizzes: stats.total_quizzes_completed,
      correctRate,
      currentStreak: stats.current_streak,
      longestStreak: stats.longest_streak,
      lastActivityDate: stats.last_activity_date,
    };
  }

  async getWeeklyReport(userId: number): Promise<PeriodReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    return this.getPeriodReport(userId, 'weekly', startDate, endDate);
  }

  async getMonthlyReport(userId: number): Promise<PeriodReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);

    return this.getPeriodReport(userId, 'monthly', startDate, endDate);
  }

  async getPeriodReport(
    userId: number,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<PeriodReport> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const [rows] = await pool.execute<DailyLogRow[]>(
      `SELECT * FROM daily_activity_log
       WHERE user_id = ? AND activity_date BETWEEN ? AND ?
       ORDER BY activity_date ASC`,
      [userId, startDateStr, endDateStr]
    );

    const dailyBreakdown: DailyActivity[] = rows.map((row) => ({
      date: row.activity_date,
      conversationsAdded: row.conversations_added,
      vocabularyLearned: row.vocabulary_learned,
      exercisesCompleted: row.exercises_completed,
      correctAnswers: row.correct_answers,
      quizzesCompleted: row.quizzes_completed,
      timeSpentMinutes: row.time_spent_minutes,
    }));

    // Calculate summary
    const summary = dailyBreakdown.reduce(
      (acc, day) => ({
        totalDaysActive: acc.totalDaysActive + 1,
        totalConversations: acc.totalConversations + day.conversationsAdded,
        totalVocabulary: acc.totalVocabulary + day.vocabularyLearned,
        totalExercises: acc.totalExercises + day.exercisesCompleted,
        totalQuizzes: acc.totalQuizzes + day.quizzesCompleted,
        totalCorrectAnswers: acc.totalCorrectAnswers + day.correctAnswers,
        totalTimeSpentMinutes: acc.totalTimeSpentMinutes + day.timeSpentMinutes,
      }),
      {
        totalDaysActive: 0,
        totalConversations: 0,
        totalVocabulary: 0,
        totalExercises: 0,
        totalQuizzes: 0,
        totalCorrectAnswers: 0,
        totalTimeSpentMinutes: 0,
      }
    );

    const averageCorrectRate = summary.totalExercises > 0
      ? Math.round((summary.totalCorrectAnswers / summary.totalExercises) * 100)
      : 0;

    return {
      period,
      startDate,
      endDate,
      summary: {
        totalDaysActive: summary.totalDaysActive,
        totalConversations: summary.totalConversations,
        totalVocabulary: summary.totalVocabulary,
        totalExercises: summary.totalExercises,
        totalQuizzes: summary.totalQuizzes,
        averageCorrectRate,
        totalTimeSpentMinutes: summary.totalTimeSpentMinutes,
      },
      dailyBreakdown,
    };
  }

  async getTopQuizScores(quizId: number, limit: number = 10): Promise<LeaderboardEntry[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT qa.user_id, u.username, qa.score, qa.time_spent_seconds, qa.completed_at, q.title as quiz_title
       FROM quiz_attempts qa
       JOIN users u ON qa.user_id = u.id
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.quiz_id = ? AND qa.completed_at IS NOT NULL
       ORDER BY qa.score DESC, qa.time_spent_seconds ASC
       LIMIT ?`,
      [quizId, limit]
    );

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      score: row.score,
      quizTitle: row.quiz_title,
      timeSpentSeconds: row.time_spent_seconds,
      completedAt: row.completed_at,
    }));
  }

  async getFastestQuizCompletions(quizId: number, limit: number = 10): Promise<LeaderboardEntry[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT qa.user_id, u.username, qa.score, qa.time_spent_seconds, qa.completed_at, q.title as quiz_title
       FROM quiz_attempts qa
       JOIN users u ON qa.user_id = u.id
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.quiz_id = ? AND qa.completed_at IS NOT NULL AND qa.score >= 70
       ORDER BY qa.time_spent_seconds ASC
       LIMIT ?`,
      [quizId, limit]
    );

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      score: row.score,
      quizTitle: row.quiz_title,
      timeSpentSeconds: row.time_spent_seconds,
      completedAt: row.completed_at,
    }));
  }

  async updateStreak(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Get last activity date
    const [stats] = await pool.execute<StatsRow[]>(
      'SELECT last_activity_date, current_streak, longest_streak FROM user_statistics WHERE user_id = ?',
      [userId]
    );

    if (stats.length === 0) return;

    const lastActivity = stats[0].last_activity_date;
    let currentStreak = stats[0].current_streak;

    if (lastActivity) {
      const lastDate = new Date(lastActivity).toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === today) {
        // Already active today, no update needed
        return;
      } else if (lastDate === yesterdayStr) {
        // Consecutive day, increment streak
        currentStreak += 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }
    } else {
      // First activity
      currentStreak = 1;
    }

    const longestStreak = Math.max(currentStreak, stats[0].longest_streak);

    await pool.execute(
      `UPDATE user_statistics
       SET current_streak = ?, longest_streak = ?, last_activity_date = ?
       WHERE user_id = ?`,
      [currentStreak, longestStreak, today, userId]
    );
  }
}

export const statsService = new StatsService();
