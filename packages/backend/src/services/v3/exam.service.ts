import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { masterExercisesService } from './master-exercises.service.js';

// ============================================================
// Types
// ============================================================

interface LessonExamRow extends RowDataPacket {
  id: number;
  lesson_id: number | null;
  unit_id: number | null;
  exam_number: number;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  passing_score: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
  show_answers_after: boolean;
  exercise_ids: string;
  total_questions: number;
  total_points: number;
  random_question_count: number | null;
  pass_xp: number;
  perfect_score_bonus_xp: number;
  pass_coins: number;
  perfect_score_bonus_coins: number;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserExamAttemptRow extends RowDataPacket {
  id: number;
  user_id: number;
  exam_id: number;
  lesson_progress_id: number | null;
  unit_progress_id: number | null;
  attempt_number: number;
  started_at: Date;
  completed_at: Date | null;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  answers: string | null;
  is_passed: boolean;
  xp_earned: number;
  coins_earned: number;
}

export interface LessonExam {
  id: number;
  lessonId: number | null;
  unitId: number | null;
  examNumber: number;
  title: string;
  description: string | null;
  timeLimitSeconds: number | null;
  passingScore: number;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  showAnswersAfter: boolean;
  exerciseIds: number[];
  totalQuestions: number;
  totalPoints: number;
  randomQuestionCount: number | null;
  passXp: number;
  perfectScoreBonusXp: number;
  passCoins: number;
  perfectScoreBonusCoins: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserExamAttempt {
  id: number;
  userId: number;
  examId: number;
  lessonProgressId: number | null;
  unitProgressId: number | null;
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  answers: ExamAnswer[] | null;
  isPassed: boolean;
  xpEarned: number;
  coinsEarned: number;
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

// Keep backward compatibility with old interface name
export type { LessonExam as Exam };

export interface CreateExamInput {
  lessonId?: number;
  unitId?: number;
  examNumber?: number;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showAnswersAfter?: boolean;
  exerciseIds: number[];
  totalQuestions: number;
  totalPoints?: number;
  randomQuestionCount?: number;
  passXp?: number;
  perfectScoreBonusXp?: number;
  passCoins?: number;
  perfectScoreBonusCoins?: number;
  displayOrder?: number;
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
       WHERE lesson_id = ? AND is_active = TRUE
       ORDER BY display_order ASC`,
      [lessonId]
    );

    return rows.map(row => this.mapToLessonExam(row));
  }

  /**
   * Get boss exam for a unit
   */
  async getBossExamForUnit(unitId: number): Promise<LessonExam | null> {
    const [rows] = await pool.execute<LessonExamRow[]>(
      `SELECT * FROM lesson_exams
       WHERE unit_id = ? AND is_active = TRUE
       ORDER BY display_order ASC
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
         MAX(is_passed) as has_passed
       FROM user_exam_attempts
       WHERE user_id = ? AND exam_id = ?`,
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
        lesson_id, unit_id, exam_number, title, description,
        time_limit_seconds, passing_score, max_attempts,
        shuffle_questions, show_answers_after, exercise_ids,
        total_questions, total_points, random_question_count,
        pass_xp, perfect_score_bonus_xp, pass_coins, perfect_score_bonus_coins,
        display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.lessonId || null,
        input.unitId || null,
        input.examNumber || 1,
        input.title,
        input.description || null,
        input.timeLimitSeconds || 300,
        input.passingScore || 70,
        input.maxAttempts || null,
        input.shuffleQuestions !== false ? 1 : 0,
        input.showAnswersAfter !== false ? 1 : 0,
        JSON.stringify(input.exerciseIds),
        input.totalQuestions,
        input.totalPoints || input.totalQuestions * 10,
        input.randomQuestionCount || null,
        input.passXp || 50,
        input.perfectScoreBonusXp || 20,
        input.passCoins || 20,
        input.perfectScoreBonusCoins || 10,
        input.displayOrder || 0,
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
        'SELECT COUNT(*) as count FROM user_exam_attempts WHERE user_id = ? AND exam_id = ?',
        [userId, examId]
      );
      if ((attempts[0].count as number) >= exam.maxAttempts) {
        return { error: 'Maximum attempts reached' };
      }
    }

    // Get attempt number
    const [lastAttempt] = await pool.execute<RowDataPacket[]>(
      'SELECT MAX(attempt_number) as last FROM user_exam_attempts WHERE user_id = ? AND exam_id = ?',
      [userId, examId]
    );
    const attemptNumber = ((lastAttempt[0].last as number) || 0) + 1;

    // Create attempt
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_exam_attempts (user_id, exam_id, attempt_number, started_at, score, total_questions, correct_answers, time_taken_seconds, answers, is_passed, xp_earned, coins_earned)
       VALUES (?, ?, ?, NOW(), 0, ?, 0, 0, '[]', FALSE, 0, 0)`,
      [userId, examId, attemptNumber, exam.totalQuestions]
    );

    // Get exercises
    const exercises = await masterExercisesService.getByIds(exam.exerciseIds);

    // Shuffle exercises if needed
    let selectedExercises = [...exercises];
    if (exam.shuffleQuestions) {
      selectedExercises.sort(() => Math.random() - 0.5);
    }

    // Limit to random_question_count if set
    if (exam.randomQuestionCount && exam.randomQuestionCount < selectedExercises.length) {
      selectedExercises = selectedExercises.slice(0, exam.randomQuestionCount);
    }

    return {
      attemptId: result.insertId,
      exercises: selectedExercises.map(ex => ({
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
    detailedResults: { exerciseId: number; isCorrect: boolean; correctAnswer: string; userAnswer: string }[];
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
    const exam = await this.getExamById(attempt.exam_id);
    if (!exam) {
      return { error: 'Exam not found' };
    }

    // Get exercises for grading
    const exercises = await masterExercisesService.getByIds(exam.exerciseIds);
    const exerciseMap = new Map(exercises.map(e => [e.id, e]));

    // Grade answers
    let correctCount = 0;
    const detailedResults: { exerciseId: number; isCorrect: boolean; correctAnswer: string; userAnswer: string }[] = [];

    for (const answer of answers) {
      const exercise = exerciseMap.get(answer.exerciseId);
      if (!exercise) continue;

      const isCorrect = this.gradeAnswer(answer.userAnswer, exercise.correctAnswer, exercise.exerciseType);
      if (isCorrect) correctCount++;

      detailedResults.push({
        exerciseId: answer.exerciseId,
        isCorrect,
        correctAnswer: exercise.correctAnswer,
        userAnswer: answer.userAnswer,
      });

      // Update answer with correct status
      answer.isCorrect = isCorrect;
    }

    const totalCount = exercises.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = score >= exam.passingScore;

    // Calculate XP
    let xpEarned = passed ? exam.passXp : Math.round(exam.passXp * 0.2); // 20% XP even if failed
    if (score === 100) {
      xpEarned += exam.perfectScoreBonusXp;
    }

    // Calculate coins
    let coinsEarned = passed ? exam.passCoins : Math.round(exam.passCoins * 0.1);
    if (score === 100) {
      coinsEarned += exam.perfectScoreBonusCoins;
    }

    // Update attempt
    await pool.execute(
      `UPDATE user_exam_attempts SET
         completed_at = NOW(),
         score = ?,
         correct_answers = ?,
         time_taken_seconds = ?,
         answers = ?,
         is_passed = ?,
         xp_earned = ?,
         coins_earned = ?
       WHERE id = ?`,
      [score, correctCount, timeSpentSeconds, JSON.stringify(answers), passed, xpEarned, coinsEarned, attemptId]
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
      query += ' AND exam_id = ?';
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
         SUM(is_passed) as total_passed,
         AVG(score) as avg_score,
         SUM(xp_earned) as total_xp
       FROM user_exam_attempts
       WHERE user_id = ? AND completed_at IS NOT NULL`,
      [userId]
    );

    const [byType] = await pool.execute<RowDataPacket[]>(
      `SELECT
         'lesson' as exam_type,
         COUNT(*) as attempts,
         SUM(uea.is_passed) as passed
       FROM user_exam_attempts uea
       JOIN lesson_exams le ON uea.exam_id = le.id
       WHERE uea.user_id = ? AND uea.completed_at IS NOT NULL`,
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
    examTitle: string = 'Lesson Exam',
    exerciseCount: number = 10
  ): Promise<LessonExam | null> {
    // Get lesson vocabulary and grammar
    const [lessonContent] = await pool.execute<RowDataPacket[]>(
      `SELECT content_type, master_vocabulary_id, master_grammar_id FROM lesson_content
       WHERE lesson_id = ? AND content_type IN ('vocabulary', 'grammar')`,
      [lessonId]
    );

    if (lessonContent.length === 0) return null;

    const vocabIds: number[] = [];
    const grammarIds: number[] = [];

    for (const content of lessonContent) {
      if (content.content_type === 'vocabulary' && content.master_vocabulary_id) {
        vocabIds.push(content.master_vocabulary_id as number);
      } else if (content.content_type === 'grammar' && content.master_grammar_id) {
        grammarIds.push(content.master_grammar_id as number);
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
      lessonId,
      title: examTitle,
      totalQuestions: exercises.length,
      exerciseIds: exercises.map(e => e.id),
      passingScore: 70,
      passXp: 50,
      perfectScoreBonusXp: 20,
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
      lessonId: row.lesson_id,
      unitId: row.unit_id,
      examNumber: row.exam_number,
      title: row.title,
      description: row.description,
      timeLimitSeconds: row.time_limit_seconds,
      passingScore: row.passing_score,
      maxAttempts: row.max_attempts,
      shuffleQuestions: Boolean(row.shuffle_questions),
      showAnswersAfter: Boolean(row.show_answers_after),
      exerciseIds: this.parseJson<number[]>(row.exercise_ids) || [],
      totalQuestions: row.total_questions,
      totalPoints: row.total_points,
      randomQuestionCount: row.random_question_count,
      passXp: row.pass_xp,
      perfectScoreBonusXp: row.perfect_score_bonus_xp,
      passCoins: row.pass_coins,
      perfectScoreBonusCoins: row.perfect_score_bonus_coins,
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserExamAttempt(row: UserExamAttemptRow): UserExamAttempt {
    return {
      id: row.id,
      userId: row.user_id,
      examId: row.exam_id,
      lessonProgressId: row.lesson_progress_id,
      unitProgressId: row.unit_progress_id,
      attemptNumber: row.attempt_number,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      score: Number(row.score),
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      timeTakenSeconds: row.time_taken_seconds,
      answers: this.parseJson<ExamAnswer[]>(row.answers),
      isPassed: Boolean(row.is_passed),
      xpEarned: row.xp_earned,
      coinsEarned: row.coins_earned,
    };
  }
}

export const examService = new ExamService();
