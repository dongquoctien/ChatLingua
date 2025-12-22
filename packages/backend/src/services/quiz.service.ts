import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface QuizRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  exercise_ids: string;
  time_limit_minutes: number | null;
  max_attempts: number;
  created_at: Date;
}

interface QuizAttemptRow extends RowDataPacket {
  id: number;
  quiz_id: number;
  user_id: number;
  started_at: Date;
  completed_at: Date | null;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  answers: string | null;
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  exerciseIds: number[];
  timeLimitMinutes: number | null;
  maxAttempts: number;
  attemptCount?: number;
  bestScore?: number;
  createdAt: Date;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  answers: Record<number, string> | null;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  exerciseIds: number[];
  timeLimitMinutes?: number;
  maxAttempts?: number;
}

export interface SubmitQuizInput {
  answers: Record<number, string>; // exerciseId -> answer
  timeSpentSeconds: number;
}

export class QuizService {
  async getQuizzes(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Quiz[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM quizzes WHERE user_id = ?',
      [userId]
    );
    const total = countResult[0].total as number;

    // Get quizzes with attempt stats
    // Note: Using query instead of execute because LIMIT/OFFSET don't work well with prepared statements
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = q.user_id) as attempt_count,
        (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = q.user_id AND completed_at IS NOT NULL) as best_score
       FROM quizzes q
       WHERE q.user_id = ?
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );

    const data = rows.map((row) => this.mapToQuiz(row));

    return { data, total, page, limit };
  }

  async getQuizById(userId: number, quizId: number): Promise<Quiz | null> {
    const [rows] = await pool.execute<QuizRow[]>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = q.user_id) as attempt_count,
        (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = q.user_id AND completed_at IS NOT NULL) as best_score
       FROM quizzes q
       WHERE q.id = ? AND q.user_id = ?`,
      [quizId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToQuiz(rows[0]);
  }

  async createQuiz(userId: number, input: CreateQuizInput): Promise<Quiz> {
    const { title, description, exerciseIds, timeLimitMinutes, maxAttempts = 3 } = input;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO quizzes (user_id, title, description, exercise_ids, time_limit_minutes, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, description || null, JSON.stringify(exerciseIds), timeLimitMinutes || null, maxAttempts]
    );

    return {
      id: result.insertId,
      title,
      description: description || null,
      exerciseIds,
      timeLimitMinutes: timeLimitMinutes || null,
      maxAttempts,
      attemptCount: 0,
      bestScore: undefined,
      createdAt: new Date(),
    };
  }

  async startQuiz(userId: number, quizId: number): Promise<{ attemptId: number; exercises: any[] }> {
    const quiz = await this.getQuizById(userId, quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Check max attempts
    const [attempts] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND completed_at IS NOT NULL',
      [quizId, userId]
    );

    if (attempts[0].count >= quiz.maxAttempts) {
      throw new Error('Maximum attempts reached');
    }

    // Check for ongoing attempt
    const [ongoing] = await pool.execute<QuizAttemptRow[]>(
      'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND completed_at IS NULL',
      [quizId, userId]
    );

    let attemptId: number;

    if (ongoing.length > 0) {
      // Resume existing attempt
      attemptId = ongoing[0].id;
    } else {
      // Create new attempt
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO quiz_attempts (quiz_id, user_id, total_questions)
         VALUES (?, ?, ?)`,
        [quizId, userId, quiz.exerciseIds.length]
      );
      attemptId = result.insertId;
    }

    // Get exercises (without correct answers)
    const placeholders = quiz.exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, exercise_type, question_text, options, difficulty_level
       FROM exercises WHERE id IN (${placeholders})`,
      quiz.exerciseIds
    );

    return {
      attemptId,
      exercises: exercises.map((e) => {
        let options: string[] | null = null;
        if (e.options) {
          // Handle both cases: JSON column returns array, TEXT column returns string
          if (Array.isArray(e.options)) {
            options = e.options;
          } else if (typeof e.options === 'string') {
            try {
              const parsed = JSON.parse(e.options);
              options = Array.isArray(parsed) ? parsed : null;
            } catch {
              options = null;
            }
          }
        }
        return {
          id: e.id,
          exerciseType: e.exercise_type,
          questionText: e.question_text,
          options,
          difficultyLevel: e.difficulty_level,
        };
      }),
    };
  }

  async submitQuiz(
    userId: number,
    quizId: number,
    attemptId: number,
    input: SubmitQuizInput
  ): Promise<{ score: number; totalQuestions: number; results: any[] }> {
    // Verify attempt belongs to user and is not completed
    const [attempts] = await pool.execute<QuizAttemptRow[]>(
      'SELECT * FROM quiz_attempts WHERE id = ? AND quiz_id = ? AND user_id = ? AND completed_at IS NULL',
      [attemptId, quizId, userId]
    );

    if (attempts.length === 0) {
      throw new Error('Invalid or already completed attempt');
    }

    const quiz = await this.getQuizById(userId, quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Get correct answers
    const placeholders = quiz.exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, correct_answer FROM exercises WHERE id IN (${placeholders})`,
      quiz.exerciseIds
    );

    // Calculate score
    let correctCount = 0;
    const results = exercises.map((exercise) => {
      const userAnswer = input.answers[exercise.id] || '';
      const isCorrect = userAnswer.trim().toLowerCase() === exercise.correct_answer.trim().toLowerCase();
      if (isCorrect) correctCount++;

      return {
        exerciseId: exercise.id,
        userAnswer,
        correctAnswer: exercise.correct_answer,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / exercises.length) * 100);

    // Update attempt
    await pool.execute(
      `UPDATE quiz_attempts
       SET completed_at = NOW(), score = ?, time_spent_seconds = ?, answers = ?
       WHERE id = ?`,
      [score, input.timeSpentSeconds, JSON.stringify(input.answers), attemptId]
    );

    // Update user statistics
    await pool.execute(
      `UPDATE user_statistics
       SET total_quizzes_completed = total_quizzes_completed + 1
       WHERE user_id = ?`,
      [userId]
    );

    // Log daily activity
    await pool.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, quizzes_completed)
       VALUES (?, CURDATE(), 1)
       ON DUPLICATE KEY UPDATE quizzes_completed = quizzes_completed + 1`,
      [userId]
    );

    return {
      score,
      totalQuestions: exercises.length,
      results,
    };
  }

  async getQuizAttempts(userId: number, quizId: number): Promise<QuizAttempt[]> {
    const [rows] = await pool.execute<QuizAttemptRow[]>(
      `SELECT * FROM quiz_attempts
       WHERE quiz_id = ? AND user_id = ?
       ORDER BY started_at DESC`,
      [quizId, userId]
    );

    return rows.map((row) => {
      let answers: Record<number, string> | null = null;
      if (row.answers) {
        try {
          answers = JSON.parse(row.answers);
        } catch {
          answers = null;
        }
      }
      return {
        id: row.id,
        quizId: row.quiz_id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        score: row.score,
        totalQuestions: row.total_questions,
        timeSpentSeconds: row.time_spent_seconds,
        answers,
      };
    });
  }

  async deleteQuiz(userId: number, quizId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM quizzes WHERE id = ? AND user_id = ?',
      [quizId, userId]
    );

    return result.affectedRows > 0;
  }

  private mapToQuiz(row: QuizRow & { attempt_count?: number; best_score?: number }): Quiz {
    let exerciseIds: number[] = [];
    try {
      const parsed = JSON.parse(row.exercise_ids);
      exerciseIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      exerciseIds = [];
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      exerciseIds,
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      attemptCount: row.attempt_count,
      bestScore: row.best_score ?? undefined,
      createdAt: row.created_at,
    };
  }
}

export const quizService = new QuizService();
