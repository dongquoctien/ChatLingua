import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { masterExercisesService } from './master-exercises.service.js';

// ============================================================
// Types
// ============================================================

interface LessonExamRow extends RowDataPacket {
  id: number;
  unit_lesson_id: number;
  exam_type: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_seconds: number | null;
  max_attempts: number | null;
  exercise_count: number;
  exercise_ids: string;
  xp_reward: number;
  bonus_xp_perfect: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserExamAttemptRow extends RowDataPacket {
  id: number;
  user_id: number;
  lesson_exam_id: number;
  attempt_number: number;
  started_at: Date;
  completed_at: Date | null;
  score: number;
  passed: boolean;
  time_spent_seconds: number;
  answers: string | null;
  xp_earned: number;
}

export interface LessonExam {
  id: number;
  unitLessonId: number;
  examType: 'checkpoint' | 'boss' | 'review';
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitSeconds: number | null;
  maxAttempts: number | null;
  exerciseCount: number;
  exerciseIds: number[];
  xpReward: number;
  bonusXpPerfect: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserExamAttempt {
  id: number;
  userId: number;
  lessonExamId: number;
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers: ExamAnswer[] | null;
  xpEarned: number;
}

export interface ExamAnswer {
  exerciseId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface ExamWithDetails extends LessonExam {
  lessonTitle?: string;
  unitName?: string;
  userAttempts?: number;
  bestScore?: number;
  hasPassed?: boolean;
}

export interface CreateExamInput {
  unitLessonId: number;
  examType: 'checkpoint' | 'boss' | 'review';
  title: string;
  description?: string;
  passingScore?: number;
  timeLimitSeconds?: number;
  maxAttempts?: number;
  exerciseCount: number;
  exerciseIds: number[];
  xpReward?: number;
  bonusXpPerfect?: number;
}

// ============================================================
// Service
// ============================================================

export class ExamService {
  // ============================================================
  // Lesson Exams
  // ============================================================

  /**
   * Get exam by ID
   */
  async getExamById(id: number): Promise<LessonExam | null> {
    const [rows] = await pool.execute<LessonExamRow[]>(
      'SELECT * FROM lesson_exams WHERE id = ? AND is_active = TRUE',
      [id]
    );

    return rows.length > 0 ? this.mapToLessonExam(rows[0]) : null;
  }

  /**
   * Get exams for a lesson
   */
  async getExamsForLesson(lessonId: number): Promise<LessonExam[]> {
    const [rows] = await pool.execute<LessonExamRow[]>(
      `SELECT * FROM lesson_exams
       WHERE unit_lesson_id = ? AND is_active = TRUE
       ORDER BY exam_type ASC`,
      [lessonId]
    );

    return rows.map(row => this.mapToLessonExam(row));
  }

  /**
   * Get boss exam for a unit
   */
  async getBossExamForUnit(unitId: number): Promise<LessonExam | null> {
    const [rows] = await pool.execute<LessonExamRow[]>(
      `SELECT le.* FROM lesson_exams le
       JOIN unit_lessons ul ON le.unit_lesson_id = ul.id
       WHERE ul.map_unit_id = ? AND le.exam_type = 'boss' AND le.is_active = TRUE
       LIMIT 1`,
      [unitId]
    );

    return rows.length > 0 ? this.mapToLessonExam(rows[0]) : null;
  }

  /**
   * Get exam with user progress
   */
  async getExamWithProgress(userId: number, examId: number): Promise<ExamWithDetails | null> {
    const exam = await this.getExamById(examId);
    if (!exam) return null;

    const [attemptStats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as attempts,
         MAX(score) as best_score,
         MAX(passed) as has_passed
       FROM user_exam_attempts
       WHERE user_id = ? AND lesson_exam_id = ?`,
      [userId, examId]
    );

    return {
      ...exam,
      userAttempts: attemptStats[0].attempts as number,
      bestScore: attemptStats[0].best_score as number | undefined,
      hasPassed: Boolean(attemptStats[0].has_passed),
    };
  }

  /**
   * Create a new exam
   */
  async createExam(input: CreateExamInput): Promise<LessonExam> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lesson_exams (
        unit_lesson_id, exam_type, title, description, passing_score,
        time_limit_seconds, max_attempts, exercise_count, exercise_ids,
        xp_reward, bonus_xp_perfect, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.unitLessonId,
        input.examType,
        input.title,
        input.description || null,
        input.passingScore || 70,
        input.timeLimitSeconds || null,
        input.maxAttempts || null,
        input.exerciseCount,
        JSON.stringify(input.exerciseIds),
        input.xpReward || 50,
        input.bonusXpPerfect || 25,
      ]
    );

    const exam = await this.getExamById(result.insertId);
    if (!exam) throw new Error('Failed to create exam');
    return exam;
  }

  /**
   * Update an exam
   */
  async updateExam(id: number, updates: Partial<CreateExamInput>): Promise<LessonExam | null> {
    const updateFields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.examType !== undefined) {
      updateFields.push('exam_type = ?');
      params.push(updates.examType);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updates.description || null);
    }
    if (updates.passingScore !== undefined) {
      updateFields.push('passing_score = ?');
      params.push(updates.passingScore);
    }
    if (updates.timeLimitSeconds !== undefined) {
      updateFields.push('time_limit_seconds = ?');
      params.push(updates.timeLimitSeconds || null);
    }
    if (updates.maxAttempts !== undefined) {
      updateFields.push('max_attempts = ?');
      params.push(updates.maxAttempts || null);
    }
    if (updates.exerciseCount !== undefined) {
      updateFields.push('exercise_count = ?');
      params.push(updates.exerciseCount);
    }
    if (updates.exerciseIds !== undefined) {
      updateFields.push('exercise_ids = ?');
      params.push(JSON.stringify(updates.exerciseIds));
    }
    if (updates.xpReward !== undefined) {
      updateFields.push('xp_reward = ?');
      params.push(updates.xpReward);
    }
    if (updates.bonusXpPerfect !== undefined) {
      updateFields.push('bonus_xp_perfect = ?');
      params.push(updates.bonusXpPerfect);
    }

    if (updateFields.length === 0) return this.getExamById(id);

    params.push(id);
    await pool.execute(
      `UPDATE lesson_exams SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return this.getExamById(id);
  }

  /**
   * Delete an exam (soft delete)
   */
  async deleteExam(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE lesson_exams SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // Exam Attempts
  // ============================================================

  /**
   * Start an exam attempt
   */
  async startExamAttempt(userId: number, examId: number): Promise<{
    attemptId: number;
    exercises: { id: number; exerciseType: string; question: string; options?: string[] }[];
    timeLimit: number | null;
  } | { error: string }> {
    const exam = await this.getExamById(examId);
    if (!exam) {
      return { error: 'Exam not found' };
    }

    // Check max attempts
    if (exam.maxAttempts !== null) {
      const [attempts] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM user_exam_attempts WHERE user_id = ? AND lesson_exam_id = ?',
        [userId, examId]
      );
      if ((attempts[0].count as number) >= exam.maxAttempts) {
        return { error: 'Maximum attempts reached' };
      }
    }

    // Get attempt number
    const [lastAttempt] = await pool.execute<RowDataPacket[]>(
      'SELECT MAX(attempt_number) as last FROM user_exam_attempts WHERE user_id = ? AND lesson_exam_id = ?',
      [userId, examId]
    );
    const attemptNumber = ((lastAttempt[0].last as number) || 0) + 1;

    // Create attempt
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_exam_attempts (user_id, lesson_exam_id, attempt_number, started_at, score, passed, time_spent_seconds, xp_earned)
       VALUES (?, ?, ?, NOW(), 0, FALSE, 0, 0)`,
      [userId, examId, attemptNumber]
    );

    // Get exercises
    const exercises = await masterExercisesService.getByIds(exam.exerciseIds);

    return {
      attemptId: result.insertId,
      exercises: exercises.map(ex => ({
        id: ex.id,
        exerciseType: ex.exerciseType,
        question: ex.question,
        options: ex.options || undefined,
      })),
      timeLimit: exam.timeLimitSeconds,
    };
  }

  /**
   * Submit exam answers
   */
  async submitExamAttempt(
    userId: number,
    attemptId: number,
    answers: ExamAnswer[],
    timeSpentSeconds: number
  ): Promise<{
    passed: boolean;
    score: number;
    xpEarned: number;
    correctCount: number;
    totalCount: number;
    detailedResults: { exerciseId: number; isCorrect: boolean; correctAnswer: string }[];
  } | { error: string }> {
    // Get attempt
    const [attemptRows] = await pool.execute<UserExamAttemptRow[]>(
      'SELECT * FROM user_exam_attempts WHERE id = ? AND user_id = ?',
      [attemptId, userId]
    );

    if (attemptRows.length === 0) {
      return { error: 'Attempt not found' };
    }

    const attempt = attemptRows[0];
    if (attempt.completed_at) {
      return { error: 'Attempt already completed' };
    }

    // Get exam
    const exam = await this.getExamById(attempt.lesson_exam_id);
    if (!exam) {
      return { error: 'Exam not found' };
    }

    // Get exercises for grading
    const exercises = await masterExercisesService.getByIds(exam.exerciseIds);
    const exerciseMap = new Map(exercises.map(e => [e.id, e]));

    // Grade answers
    let correctCount = 0;
    const detailedResults: { exerciseId: number; isCorrect: boolean; correctAnswer: string }[] = [];

    for (const answer of answers) {
      const exercise = exerciseMap.get(answer.exerciseId);
      if (!exercise) continue;

      const isCorrect = this.gradeAnswer(answer.userAnswer, exercise.correctAnswer, exercise.exerciseType);
      if (isCorrect) correctCount++;

      detailedResults.push({
        exerciseId: answer.exerciseId,
        isCorrect,
        correctAnswer: exercise.correctAnswer,
      });

      // Update answer with correct status
      answer.isCorrect = isCorrect;
    }

    const totalCount = exercises.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = score >= exam.passingScore;

    // Calculate XP
    let xpEarned = passed ? exam.xpReward : Math.round(exam.xpReward * 0.2); // 20% XP even if failed
    if (score === 100) {
      xpEarned += exam.bonusXpPerfect;
    }

    // Update attempt
    await pool.execute(
      `UPDATE user_exam_attempts SET
         completed_at = NOW(),
         score = ?,
         passed = ?,
         time_spent_seconds = ?,
         answers = ?,
         xp_earned = ?
       WHERE id = ?`,
      [score, passed, timeSpentSeconds, JSON.stringify(answers), xpEarned, attemptId]
    );

    return {
      passed,
      score,
      xpEarned,
      correctCount,
      totalCount,
      detailedResults,
    };
  }

  /**
   * Grade a single answer
   */
  private gradeAnswer(userAnswer: string, correctAnswer: string, exerciseType: string): boolean {
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    // Simple comparison for most types
    if (exerciseType === 'multiple_choice' || exerciseType === 'fill_blank') {
      return normalizedUser === normalizedCorrect;
    }

    // Translation - more lenient
    if (exerciseType === 'translation') {
      // Remove punctuation and extra spaces
      const cleanUser = normalizedUser.replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ');
      const cleanCorrect = normalizedCorrect.replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ');
      return cleanUser === cleanCorrect;
    }

    // Default comparison
    return normalizedUser === normalizedCorrect;
  }

  /**
   * Get user's exam attempts
   */
  async getUserAttempts(userId: number, examId?: number, limit: number = 10): Promise<UserExamAttempt[]> {
    let query = 'SELECT * FROM user_exam_attempts WHERE user_id = ?';
    const params: (number)[] = [userId];

    if (examId) {
      query += ' AND lesson_exam_id = ?';
      params.push(examId);
    }

    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query<UserExamAttemptRow[]>(query, params);

    return rows.map(row => this.mapToUserExamAttempt(row));
  }

  /**
   * Get attempt by ID
   */
  async getAttemptById(userId: number, attemptId: number): Promise<UserExamAttempt | null> {
    const [rows] = await pool.execute<UserExamAttemptRow[]>(
      'SELECT * FROM user_exam_attempts WHERE id = ? AND user_id = ?',
      [attemptId, userId]
    );

    return rows.length > 0 ? this.mapToUserExamAttempt(rows[0]) : null;
  }

  /**
   * Get exam statistics for a user
   */
  async getUserExamStats(userId: number): Promise<{
    totalAttempts: number;
    totalPassed: number;
    averageScore: number;
    totalXpEarned: number;
    examsByType: Record<string, { attempts: number; passed: number }>;
  }> {
    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total_attempts,
         SUM(passed) as total_passed,
         AVG(score) as avg_score,
         SUM(xp_earned) as total_xp
       FROM user_exam_attempts
       WHERE user_id = ? AND completed_at IS NOT NULL`,
      [userId]
    );

    const [byType] = await pool.execute<RowDataPacket[]>(
      `SELECT
         le.exam_type,
         COUNT(*) as attempts,
         SUM(uea.passed) as passed
       FROM user_exam_attempts uea
       JOIN lesson_exams le ON uea.lesson_exam_id = le.id
       WHERE uea.user_id = ? AND uea.completed_at IS NOT NULL
       GROUP BY le.exam_type`,
      [userId]
    );

    const examsByType: Record<string, { attempts: number; passed: number }> = {};
    for (const row of byType) {
      examsByType[row.exam_type as string] = {
        attempts: row.attempts as number,
        passed: row.passed as number,
      };
    }

    return {
      totalAttempts: stats[0].total_attempts as number,
      totalPassed: stats[0].total_passed as number,
      averageScore: Math.round(stats[0].avg_score as number) || 0,
      totalXpEarned: stats[0].total_xp as number,
      examsByType,
    };
  }

  // ============================================================
  // Auto-generate exams
  // ============================================================

  /**
   * Auto-generate exam exercises for a lesson
   */
  async generateExamForLesson(
    lessonId: number,
    examType: 'checkpoint' | 'boss' | 'review',
    exerciseCount: number = 10
  ): Promise<LessonExam | null> {
    // Get lesson vocabulary and grammar
    const [lessonContent] = await pool.execute<RowDataPacket[]>(
      `SELECT content_type, master_content_id FROM lesson_content
       WHERE unit_lesson_id = ? AND content_type IN ('vocabulary', 'grammar')`,
      [lessonId]
    );

    if (lessonContent.length === 0) return null;

    const vocabIds: number[] = [];
    const grammarIds: number[] = [];

    for (const content of lessonContent) {
      if (content.content_type === 'vocabulary') {
        vocabIds.push(content.master_content_id as number);
      } else if (content.content_type === 'grammar') {
        grammarIds.push(content.master_content_id as number);
      }
    }

    // Get random exercises for the content
    const exercises = await masterExercisesService.getRandomForExam(exerciseCount, {
      // We would need to filter by vocabulary/grammar IDs if needed
      // For now, just get random exercises
    });

    if (exercises.length === 0) return null;

    // Create exam
    const exam = await this.createExam({
      unitLessonId: lessonId,
      examType,
      title: `${examType.charAt(0).toUpperCase() + examType.slice(1)} Exam`,
      exerciseCount: exercises.length,
      exerciseIds: exercises.map(e => e.id),
      passingScore: examType === 'boss' ? 80 : 70,
      xpReward: examType === 'boss' ? 100 : 50,
      bonusXpPerfect: examType === 'boss' ? 50 : 25,
    });

    return exam;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private parseJson<T>(value: string | object | null): T | null {
    if (!value) return null;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private mapToLessonExam(row: LessonExamRow): LessonExam {
    return {
      id: row.id,
      unitLessonId: row.unit_lesson_id,
      examType: row.exam_type as 'checkpoint' | 'boss' | 'review',
      title: row.title,
      description: row.description,
      passingScore: row.passing_score,
      timeLimitSeconds: row.time_limit_seconds,
      maxAttempts: row.max_attempts,
      exerciseCount: row.exercise_count,
      exerciseIds: this.parseJson<number[]>(row.exercise_ids) || [],
      xpReward: row.xp_reward,
      bonusXpPerfect: row.bonus_xp_perfect,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserExamAttempt(row: UserExamAttemptRow): UserExamAttempt {
    return {
      id: row.id,
      userId: row.user_id,
      lessonExamId: row.lesson_exam_id,
      attemptNumber: row.attempt_number,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      score: row.score,
      passed: row.passed,
      timeSpentSeconds: row.time_spent_seconds,
      answers: this.parseJson<ExamAnswer[]>(row.answers),
      xpEarned: row.xp_earned,
    };
  }
}

export const examService = new ExamService();
