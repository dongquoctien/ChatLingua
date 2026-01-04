import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { gamificationService } from './gamification.service.js';
import { challengeService } from './challenge.service.js';
import { isAnswerCorrect } from '../utils/answer-matching.js';

interface QuizRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  exercise_ids: string | number[]; // JSON column can be parsed automatically
  time_limit_seconds: number | null;
  max_attempts: number;
  created_at: Date;
}

interface QuizAttemptRow extends RowDataPacket {
  id: number;
  quiz_id: number;
  user_id: number;
  attempt_number: number;
  started_at: Date;
  completed_at: Date | null;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  answers: string | null;
  is_passed: boolean;
}

export interface QuestionPreview {
  id: number;
  questionText: string;
  exerciseType: string;
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
  questionPreviews?: QuestionPreview[];
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  answers: Record<number, string> | null;
}

export interface AttemptDetailResult {
  exerciseId: number;
  questionText: string;
  exerciseType: string;
  options: string[] | null;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizAttemptDetail extends QuizAttempt {
  quizTitle: string;
  results: AttemptDetailResult[];
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

    // Map quizzes and fetch question previews
    const data = await Promise.all(
      rows.map(async (row) => {
        const quiz = this.mapToQuiz(row);
        quiz.questionPreviews = await this.getQuestionPreviews(quiz.exerciseIds);
        return quiz;
      })
    );

    return { data, total, page, limit };
  }

  // Get question previews (just question text, no answers)
  private async getQuestionPreviews(exerciseIds: number[]): Promise<QuestionPreview[]> {
    if (exerciseIds.length === 0) return [];

    const placeholders = exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, exercise_type, question FROM exercises WHERE id IN (${placeholders})`,
      exerciseIds
    );

    return exercises.map((e) => ({
      id: e.id,
      questionText: e.question,
      exerciseType: e.exercise_type,
    }));
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
    const timeLimitSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : null;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO quizzes (user_id, title, description, exercise_ids, time_limit_seconds, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, description || null, JSON.stringify(exerciseIds), timeLimitSeconds, maxAttempts]
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
      // Get next attempt number
      const attemptNumber = (attempts[0].count as number) + 1;

      // Create new attempt with all required fields
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO quiz_attempts (quiz_id, user_id, attempt_number, score, total_questions, correct_answers, time_taken_seconds, answers, started_at, is_passed)
         VALUES (?, ?, ?, 0, ?, 0, 0, '{}', NOW(), 0)`,
        [quizId, userId, attemptNumber, quiz.exerciseIds.length]
      );
      attemptId = result.insertId;
    }

    // Get exercises (without correct answers)
    const placeholders = quiz.exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, exercise_type, question, options, difficulty_level, exercise_data, audio_url
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
        // Parse exercise_data if it exists
        let exerciseData = null;
        if (e.exercise_data) {
          if (typeof e.exercise_data === 'object') {
            exerciseData = e.exercise_data;
          } else if (typeof e.exercise_data === 'string') {
            try {
              exerciseData = JSON.parse(e.exercise_data);
            } catch {
              exerciseData = null;
            }
          }
        }

        return {
          id: e.id,
          exerciseType: e.exercise_type,
          questionText: e.question,
          options,
          difficultyLevel: e.difficulty_level,
          exerciseData,
          audioUrl: e.audio_url || null,
        };
      }),
    };
  }

  async submitQuiz(
    userId: number,
    quizId: number,
    attemptId: number,
    input: SubmitQuizInput
  ): Promise<{ score: number; totalQuestions: number; results: any[]; xpAwarded?: number; isPerfect?: boolean }> {
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

    // Get correct answers with exercise type for flexible matching
    const placeholders = quiz.exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, correct_answer, exercise_type FROM exercises WHERE id IN (${placeholders})`,
      quiz.exerciseIds
    );

    // Calculate score using flexible answer matching
    let correctCount = 0;
    const results = exercises.map((exercise) => {
      const userAnswer = input.answers[exercise.id] || '';
      const correctAnswer = exercise.correct_answer || '';
      const exerciseType = exercise.exercise_type || '';
      const isCorrect = isAnswerCorrect(userAnswer, correctAnswer, exerciseType);
      if (isCorrect) correctCount++;

      return {
        exerciseId: exercise.id,
        userAnswer,
        correctAnswer,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / exercises.length) * 100);
    const isPassed = score >= 70 ? 1 : 0;

    // Update attempt
    await pool.execute(
      `UPDATE quiz_attempts
       SET completed_at = NOW(), score = ?, correct_answers = ?, time_taken_seconds = ?, answers = ?, is_passed = ?
       WHERE id = ?`,
      [score, correctCount, input.timeSpentSeconds, JSON.stringify(input.answers), isPassed, attemptId]
    );

    // Update user statistics
    await pool.execute(
      `UPDATE user_statistics
       SET total_quizzes_taken = total_quizzes_taken + 1,
           average_quiz_score = (average_quiz_score * (total_quizzes_taken - 1) + ?) / total_quizzes_taken,
           best_quiz_score = GREATEST(best_quiz_score, ?)
       WHERE user_id = ?`,
      [score, score, userId]
    );

    // Log daily activity
    await pool.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, quizzes_taken)
       VALUES (?, CURDATE(), 1)
       ON DUPLICATE KEY UPDATE quizzes_taken = quizzes_taken + 1`,
      [userId]
    );

    // Award XP for quiz completion
    let xpAwarded = 0;
    const isPerfect = score === 100;

    // Base XP based on score
    // 0-49%: 5 XP, 50-69%: 10 XP, 70-89%: 15 XP, 90-99%: 20 XP, 100%: 30 XP
    if (score < 50) {
      xpAwarded = 5;
    } else if (score < 70) {
      xpAwarded = 10;
    } else if (score < 90) {
      xpAwarded = 15;
    } else if (score < 100) {
      xpAwarded = 20;
    } else {
      xpAwarded = 30; // Perfect score!
    }

    // Bonus XP based on number of questions
    xpAwarded += Math.floor(exercises.length / 5) * 2; // +2 XP per 5 questions

    // Bonus for time efficiency (if quiz has time limit and completed quickly)
    if (quiz.timeLimitMinutes) {
      const timeLimitSeconds = quiz.timeLimitMinutes * 60;
      if (input.timeSpentSeconds < timeLimitSeconds * 0.5) {
        xpAwarded += 5; // Speed bonus
      }
    }

    try {
      await gamificationService.awardXP(userId, xpAwarded, 'quiz', quizId, `Quiz "${quiz.title}" - Score: ${score}%`);

      // Update leaderboard
      await gamificationService.updateLeaderboard(userId, { xp: xpAwarded, quizzes: 1 });

      // Check achievements
      await gamificationService.checkAchievements(userId, 'quiz_complete', { isPerfect });
    } catch (error) {
      console.error('Failed to award XP for quiz:', error);
    }

    // Update challenge progress
    try {
      await challengeService.updateProgress(userId, 'quiz', 1);
      if (isPerfect) {
        await challengeService.updateProgress(userId, 'perfect_score', 1);
      }
      if (input.timeSpentSeconds < 120) { // Under 2 minutes (matches Speed Demon challenge)
        await challengeService.updateProgress(userId, 'speed_quiz', 1);
      }
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }

    return {
      score,
      totalQuestions: exercises.length,
      results,
      xpAwarded,
      isPerfect,
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
          answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
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
        correctAnswers: row.correct_answers,
        isPassed: row.is_passed,
        timeSpentSeconds: row.time_taken_seconds,
        answers,
      };
    });
  }

  async getAttemptDetail(userId: number, quizId: number, attemptId: number): Promise<QuizAttemptDetail | null> {
    // Get the attempt
    const [attempts] = await pool.execute<QuizAttemptRow[]>(
      `SELECT * FROM quiz_attempts WHERE id = ? AND quiz_id = ? AND user_id = ?`,
      [attemptId, quizId, userId]
    );

    if (attempts.length === 0 || !attempts[0].completed_at) {
      return null;
    }

    const attempt = attempts[0];

    // Get quiz info
    const quiz = await this.getQuizById(userId, quizId);
    if (!quiz) {
      return null;
    }

    // Parse user answers
    let userAnswers: Record<number, string> = {};
    if (attempt.answers) {
      try {
        userAnswers = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers;
      } catch {
        userAnswers = {};
      }
    }

    // Get exercises with correct answers
    const placeholders = quiz.exerciseIds.map(() => '?').join(', ');
    const [exercises] = await pool.execute<RowDataPacket[]>(
      `SELECT id, exercise_type, question, options, correct_answer FROM exercises WHERE id IN (${placeholders})`,
      quiz.exerciseIds
    );

    // Build results array using flexible answer matching
    const results: AttemptDetailResult[] = exercises.map((e) => {
      const userAnswer = userAnswers[e.id] || '';
      const correctAnswer = e.correct_answer || '';
      const exerciseType = e.exercise_type || '';
      const isCorrect = isAnswerCorrect(userAnswer, correctAnswer, exerciseType);

      let options: string[] | null = null;
      if (e.options) {
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
        exerciseId: e.id,
        questionText: e.question,
        exerciseType: e.exercise_type,
        options,
        userAnswer,
        correctAnswer,
        isCorrect,
      };
    });

    return {
      id: attempt.id,
      quizId: attempt.quiz_id,
      quizTitle: quiz.title,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      isPassed: attempt.is_passed,
      timeSpentSeconds: attempt.time_taken_seconds,
      answers: userAnswers,
      results,
    };
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
    // Handle both cases: JSON column returns array directly, or string needs parsing
    if (Array.isArray(row.exercise_ids)) {
      exerciseIds = row.exercise_ids;
    } else if (typeof row.exercise_ids === 'string') {
      try {
        const parsed = JSON.parse(row.exercise_ids);
        exerciseIds = Array.isArray(parsed) ? parsed : [];
      } catch {
        exerciseIds = [];
      }
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      exerciseIds,
      timeLimitMinutes: row.time_limit_seconds ? Math.round(row.time_limit_seconds / 60) : null,
      maxAttempts: row.max_attempts,
      attemptCount: row.attempt_count,
      bestScore: row.best_score ?? undefined,
      createdAt: row.created_at,
    };
  }
}

export const quizService = new QuizService();
