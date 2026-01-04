import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { isAnswerCorrect } from '../utils/answer-matching.js';
import { challengeService } from './challenge.service.js';
import { gamificationService } from './gamification.service.js';

// ============= Types =============

interface SessionRow extends RowDataPacket {
  id: number;
  user_id: number;
  total_questions: number;
  correct_answers: number;
  total_time_seconds: number;
  score_percentage: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exercise_types: string | null;
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

interface SessionAnswerRow extends RowDataPacket {
  id: number;
  session_id: number;
  exercise_id: number;
  question_order: number;
  user_answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  answered_at: Date | null;
  // Joined from exercises table
  exercise_type?: string;
  question_text?: string;
  options?: string;
  correct_answer?: string;
}

interface ExerciseRow extends RowDataPacket {
  id: number;
  exercise_type: string;
  question: string;
  options: string | null;
  correct_answer: string;
  difficulty_level: string;
  exercise_data: string | object | null;
  audio_url: string | null;
}

// ============= Public Interfaces =============

export interface ExerciseSession {
  id: number;
  userId: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSeconds: number;
  scorePercentage: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exerciseTypes: string[];
  startedAt: Date;
  completedAt: Date | null;
}

export interface SessionExercise {
  id: number;
  exerciseType: string;
  questionText: string;
  options: string[] | null;
  difficultyLevel: string;
  questionOrder: number;
  exerciseData?: unknown;
  audioUrl?: string | null;
}

export interface SessionAnswer {
  exerciseId: number;
  questionOrder: number;
  exerciseType: string;
  questionText: string;
  options: string[] | null;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SessionResult {
  sessionId: number;
  score: number;
  total: number;
  percentage: number;
  timeSpent: number;
  results: SessionAnswer[];
}

export interface StartSessionInput {
  count?: number;
  exerciseTypes?: string[];
}

export interface SubmitSessionInput {
  answers: Record<string, string>; // exerciseId -> userAnswer
  totalTimeSeconds: number;
}

// ============= Service =============

export class ExerciseSessionService {
  /**
   * Start a new exercise session
   */
  async startSession(
    userId: number,
    input: StartSessionInput
  ): Promise<{ sessionId: number; exercises: SessionExercise[]; startedAt: Date }> {
    const count = Math.min(input.count || 10, 50);
    const exerciseTypes = input.exerciseTypes;

    // Build query for random exercises
    let typeFilter = '';
    const params: (string | number)[] = [userId];

    if (exerciseTypes && exerciseTypes.length > 0) {
      const placeholders = exerciseTypes.map(() => '?').join(', ');
      typeFilter = `AND e.exercise_type IN (${placeholders})`;
      params.push(...exerciseTypes);
    }

    params.push(count);

    // Get random exercises for this user
    const [exerciseRows] = await pool.query<ExerciseRow[]>(
      `SELECT e.id, e.exercise_type, e.question, e.options, e.correct_answer, e.difficulty_level, e.exercise_data, e.audio_url
       FROM exercises e
       LEFT JOIN conversations c ON e.conversation_id = c.id
       WHERE (c.user_id = ? OR e.user_id = ?) ${typeFilter}
       ORDER BY RAND()
       LIMIT ?`,
      [userId, ...params]
    );

    if (exerciseRows.length === 0) {
      throw new Error('No exercises available. Create some conversations first!');
    }

    // Get unique exercise types for this session
    const uniqueTypes = [...new Set(exerciseRows.map(e => e.exercise_type))];

    // Create session
    const [sessionResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exercise_sessions (user_id, total_questions, exercise_types, started_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, exerciseRows.length, JSON.stringify(uniqueTypes)]
    );

    const sessionId = sessionResult.insertId;
    const startedAt = new Date();

    // Create session answers (empty, to be filled when user answers)
    const exercises: SessionExercise[] = [];

    for (let i = 0; i < exerciseRows.length; i++) {
      const exercise = exerciseRows[i];
      const questionOrder = i + 1;

      await pool.execute(
        `INSERT INTO exercise_session_answers (session_id, exercise_id, question_order)
         VALUES (?, ?, ?)`,
        [sessionId, exercise.id, questionOrder]
      );

      let options: string[] | null = null;
      if (exercise.options) {
        // Handle both cases: JSON column returns array, TEXT column returns string
        if (Array.isArray(exercise.options)) {
          options = exercise.options;
        } else if (typeof exercise.options === 'string') {
          try {
            const parsed = JSON.parse(exercise.options);
            options = Array.isArray(parsed) ? parsed : null;
          } catch {
            options = null;
          }
        }
      }

      // Parse exercise_data
      let exerciseData: unknown = null;
      if (exercise.exercise_data) {
        if (typeof exercise.exercise_data === 'object') {
          exerciseData = exercise.exercise_data;
        } else if (typeof exercise.exercise_data === 'string') {
          try {
            exerciseData = JSON.parse(exercise.exercise_data);
          } catch {
            exerciseData = null;
          }
        }
      }

      exercises.push({
        id: exercise.id,
        exerciseType: exercise.exercise_type,
        questionText: exercise.question,
        options,
        difficultyLevel: exercise.difficulty_level,
        questionOrder,
        exerciseData,
        audioUrl: exercise.audio_url,
      });
    }

    return { sessionId, exercises, startedAt };
  }

  /**
   * Get session by ID with exercises
   */
  async getSession(
    userId: number,
    sessionId: number
  ): Promise<{ session: ExerciseSession; exercises: SessionExercise[] } | null> {
    const [sessions] = await pool.execute<SessionRow[]>(
      `SELECT * FROM exercise_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return null;
    }

    const session = this.mapToSession(sessions[0]);

    // Get exercises for this session
    const [answerRows] = await pool.execute<SessionAnswerRow[]>(
      `SELECT esa.*, e.exercise_type, e.question as question_text, e.options, e.correct_answer
       FROM exercise_session_answers esa
       JOIN exercises e ON esa.exercise_id = e.id
       WHERE esa.session_id = ?
       ORDER BY esa.question_order`,
      [sessionId]
    );

    const exercises: SessionExercise[] = answerRows.map(row => {
      let options: string[] | null = null;
      if (row.options) {
        // Handle both cases: JSON column returns array, TEXT column returns string
        if (Array.isArray(row.options)) {
          options = row.options;
        } else if (typeof row.options === 'string') {
          try {
            const parsed = JSON.parse(row.options);
            options = Array.isArray(parsed) ? parsed : null;
          } catch {
            options = null;
          }
        }
      }

      return {
        id: row.exercise_id,
        exerciseType: row.exercise_type || '',
        questionText: row.question_text || '',
        options,
        difficultyLevel: 'beginner',
        questionOrder: row.question_order,
      };
    });

    return { session, exercises };
  }

  /**
   * Submit all answers for a session
   */
  async submitSession(
    userId: number,
    sessionId: number,
    input: SubmitSessionInput
  ): Promise<SessionResult> {
    // Verify session belongs to user and is in progress
    const [sessions] = await pool.execute<SessionRow[]>(
      `SELECT * FROM exercise_sessions WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      throw new Error('Session not found or already completed');
    }

    // Get all exercises for this session
    const [answerRows] = await pool.execute<SessionAnswerRow[]>(
      `SELECT esa.*, e.exercise_type, e.question as question_text, e.options, e.correct_answer
       FROM exercise_session_answers esa
       JOIN exercises e ON esa.exercise_id = e.id
       WHERE esa.session_id = ?
       ORDER BY esa.question_order`,
      [sessionId]
    );

    const results: SessionAnswer[] = [];
    let correctCount = 0;

    // Process each answer with flexible matching
    for (const row of answerRows) {
      const userAnswer = input.answers[row.exercise_id.toString()] || '';
      const correctAnswer = row.correct_answer || '';
      const exerciseType = row.exercise_type || '';
      const correct = isAnswerCorrect(userAnswer, correctAnswer, exerciseType);

      if (correct) {
        correctCount++;
      }

      // Update the answer record
      await pool.execute(
        `UPDATE exercise_session_answers
         SET user_answer = ?, is_correct = ?, answered_at = NOW()
         WHERE session_id = ? AND exercise_id = ?`,
        [userAnswer, correct, sessionId, row.exercise_id]
      );

      let options: string[] | null = null;
      if (row.options) {
        // Handle both cases: JSON column returns array, TEXT column returns string
        if (Array.isArray(row.options)) {
          options = row.options;
        } else if (typeof row.options === 'string') {
          try {
            const parsed = JSON.parse(row.options);
            options = Array.isArray(parsed) ? parsed : null;
          } catch {
            options = null;
          }
        }
      }

      results.push({
        exerciseId: row.exercise_id,
        questionOrder: row.question_order,
        exerciseType: row.exercise_type || '',
        questionText: row.question_text || '',
        options,
        userAnswer,
        correctAnswer: row.correct_answer || '',
        isCorrect: correct,
      });
    }

    const total = answerRows.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Update session as completed
    await pool.execute(
      `UPDATE exercise_sessions
       SET status = 'completed',
           correct_answers = ?,
           total_time_seconds = ?,
           score_percentage = ?,
           completed_at = NOW()
       WHERE id = ?`,
      [correctCount, input.totalTimeSeconds, percentage, sessionId]
    );

    // Update user statistics
    await pool.execute(
      `UPDATE user_statistics
       SET total_exercises_completed = total_exercises_completed + ?,
           total_correct_answers = COALESCE(total_correct_answers, 0) + ?,
           last_activity_date = CURDATE()
       WHERE user_id = ?`,
      [total, correctCount, userId]
    );

    // Update daily activity log
    await pool.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, exercises_completed, correct_answers)
       VALUES (?, CURDATE(), ?, ?)
       ON DUPLICATE KEY UPDATE
         exercises_completed = exercises_completed + VALUES(exercises_completed),
         correct_answers = COALESCE(correct_answers, 0) + VALUES(correct_answers)`,
      [userId, total, correctCount]
    );

    // Update challenge progress for each exercise completed
    try {
      // Update general exercise challenge progress (once per exercise)
      await challengeService.updateProgress(userId, 'exercise', total);
      console.log(`[Challenge] Updated exercise progress: userId=${userId}, count=${total}`);

      // Count exercise types for type-specific challenges
      const typeCounts: Record<string, { total: number; correct: number }> = {};
      for (const row of answerRows) {
        const exerciseType = row.exercise_type || '';
        if (!typeCounts[exerciseType]) {
          typeCounts[exerciseType] = { total: 0, correct: 0 };
        }
        typeCounts[exerciseType].total++;
        const userAnswer = input.answers[row.exercise_id.toString()] || '';
        const correctAnswer = row.correct_answer || '';
        if (isAnswerCorrect(userAnswer, correctAnswer, exerciseType)) {
          typeCounts[exerciseType].correct++;
        }
      }

      // Update spelling challenge (correct spelling answers)
      if (typeCounts['spelling']?.correct > 0) {
        await challengeService.updateProgress(userId, 'spelling', typeCounts['spelling'].correct);
        console.log(`[Challenge] Updated spelling progress: ${typeCounts['spelling'].correct}`);
      }

      // Update translation challenge (all translation exercises)
      if (typeCounts['translation']?.total > 0) {
        await challengeService.updateProgress(userId, 'translation', typeCounts['translation'].total);
        console.log(`[Challenge] Updated translation progress: ${typeCounts['translation'].total}`);
      }

      // Check achievements
      await gamificationService.checkAchievements(userId, 'exercise_complete', {
        exerciseCount: total,
        correctCount,
      });
    } catch (error) {
      console.error('[Challenge] Failed to update challenge/achievement progress:', error);
      // Don't fail the submission if challenge update fails
    }

    return {
      sessionId,
      score: correctCount,
      total,
      percentage,
      timeSpent: input.totalTimeSeconds,
      results,
    };
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: ExerciseSession[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM exercise_sessions WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    const total = countResult[0].total as number;

    // Get sessions
    const [rows] = await pool.query<SessionRow[]>(
      `SELECT * FROM exercise_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );

    const data = rows.map(row => this.mapToSession(row));

    return { data, total, page, limit };
  }

  /**
   * Get detailed session result (for reviewing past sessions)
   */
  async getSessionDetail(
    userId: number,
    sessionId: number
  ): Promise<SessionResult | null> {
    // Get session
    const [sessions] = await pool.execute<SessionRow[]>(
      `SELECT * FROM exercise_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0];

    // Get all answers with exercise details
    const [answerRows] = await pool.execute<SessionAnswerRow[]>(
      `SELECT esa.*, e.exercise_type, e.question as question_text, e.options, e.correct_answer
       FROM exercise_session_answers esa
       JOIN exercises e ON esa.exercise_id = e.id
       WHERE esa.session_id = ?
       ORDER BY esa.question_order`,
      [sessionId]
    );

    const results: SessionAnswer[] = answerRows.map(row => {
      let options: string[] | null = null;
      if (row.options) {
        // Handle both cases: JSON column returns array, TEXT column returns string
        if (Array.isArray(row.options)) {
          options = row.options;
        } else if (typeof row.options === 'string') {
          try {
            const parsed = JSON.parse(row.options);
            options = Array.isArray(parsed) ? parsed : null;
          } catch {
            options = null;
          }
        }
      }

      return {
        exerciseId: row.exercise_id,
        questionOrder: row.question_order,
        exerciseType: row.exercise_type || '',
        questionText: row.question_text || '',
        options,
        userAnswer: row.user_answer,
        correctAnswer: row.correct_answer || '',
        isCorrect: row.is_correct || false,
      };
    });

    return {
      sessionId: session.id,
      score: session.correct_answers,
      total: session.total_questions,
      percentage: Number(session.score_percentage),
      timeSpent: session.total_time_seconds,
      results,
    };
  }

  /**
   * Abandon an in-progress session
   */
  async abandonSession(userId: number, sessionId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE exercise_sessions
       SET status = 'abandoned', completed_at = NOW()
       WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      [sessionId, userId]
    );

    return result.affectedRows > 0;
  }

  // ============= Private Helpers =============

  private mapToSession = (row: SessionRow): ExerciseSession => {
    let exerciseTypes: string[] = [];
    if (row.exercise_types) {
      try {
        const parsed = JSON.parse(row.exercise_types);
        exerciseTypes = Array.isArray(parsed) ? parsed : [];
      } catch {
        exerciseTypes = [];
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      totalTimeSeconds: row.total_time_seconds,
      scorePercentage: Number(row.score_percentage),
      status: row.status,
      exerciseTypes,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  };
}

export const exerciseSessionService = new ExerciseSessionService();
