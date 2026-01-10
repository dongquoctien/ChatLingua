import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ============================================================
// Tool Definitions
// ============================================================

export const startLessonExamTool: Tool = {
  name: 'start_lesson_exam',
  description: `[EXAM] Start an exam attempt for a lesson.

Creates a new exam attempt and returns the exam questions.
The user must have completed the lesson study phase first.`,
  inputSchema: {
    type: 'object',
    properties: {
      lessonId: {
        type: 'number',
        description: 'Unit Lesson ID',
      },
      userId: {
        type: 'number',
        description: 'User ID',
      },
    },
    required: ['lessonId'],
  },
};

export const submitExamAnswersTool: Tool = {
  name: 'submit_exam_answers',
  description: `[EXAM] Submit answers for an exam attempt.

Grades the exam, calculates score, and awards XP if passed.
Returns detailed results including which questions were correct.`,
  inputSchema: {
    type: 'object',
    properties: {
      attemptId: {
        type: 'number',
        description: 'Exam attempt ID from start_lesson_exam',
      },
      userId: {
        type: 'number',
        description: 'User ID',
      },
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            questionId: { type: 'number' },
            answer: { type: 'string' },
          },
          required: ['questionId', 'answer'],
        },
        description: 'Array of answers for each question',
      },
      timeSpentSeconds: {
        type: 'number',
        description: 'Total time spent on exam in seconds',
      },
    },
    required: ['attemptId', 'answers'],
  },
};

export const getExamResultsTool: Tool = {
  name: 'get_exam_results',
  description: `[EXAM] Get results from a completed exam attempt.

Returns detailed breakdown of score, correct/incorrect answers, and feedback.`,
  inputSchema: {
    type: 'object',
    properties: {
      attemptId: {
        type: 'number',
        description: 'Exam attempt ID',
      },
      userId: {
        type: 'number',
        description: 'User ID',
      },
    },
    required: ['attemptId'],
  },
};

export const getExamHistoryTool: Tool = {
  name: 'get_exam_history',
  description: `[EXAM] Get user's exam history for a lesson or all lessons.

Returns list of past exam attempts with scores and pass/fail status.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID',
      },
      lessonId: {
        type: 'number',
        description: 'Filter by specific lesson (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
      },
    },
    required: [],
  },
};

// ============================================================
// Zod Schemas
// ============================================================

const startLessonExamSchema = z.object({
  lessonId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const submitExamAnswersSchema = z.object({
  attemptId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  answers: z.array(z.object({
    questionId: z.number(),
    answer: z.string(),
  })),
  timeSpentSeconds: z.number().optional(),
});

const getExamResultsSchema = z.object({
  attemptId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const getExamHistorySchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  lessonId: z.number().optional(),
  limit: z.number().optional().default(20),
});

// ============================================================
// Type Definitions
// ============================================================

interface LessonExamRow extends RowDataPacket {
  id: number;
  unit_lesson_id: number;
  exam_type: string;
  title: string | null;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number;
  total_questions: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_after: boolean;
  max_attempts: number;
  is_active: boolean;
}

interface ExamQuestionRow extends RowDataPacket {
  id: number;
  lesson_exam_id: number;
  master_exercise_id: number | null;
  custom_question: string | null;
  custom_options: string | null;
  custom_correct_answer: string | null;
  points: number;
  display_order: number;
  // Joined exercise fields
  exercise_type?: string;
  question?: string;
  options?: string;
  correct_answer?: string;
  explanation?: string;
}

interface ExamAttemptRow extends RowDataPacket {
  id: number;
  user_id: number;
  lesson_exam_id: number;
  unit_lesson_id: number;
  attempt_number: number;
  status: string;
  score: number | null;
  total_points: number | null;
  percentage: number | null;
  passed: boolean | null;
  started_at: Date;
  completed_at: Date | null;
  time_spent_seconds: number | null;
  answers_json: string | null;
  results_json: string | null;
  // Joined lesson fields
  lesson_title?: string;
  exam_title?: string;
}

// ============================================================
// Tool Implementations
// ============================================================

export async function startLessonExam(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  attempt: {
    id: number;
    examId: number;
    attemptNumber: number;
    timeLimitMinutes: number | null;
    totalQuestions: number;
    passingScore: number;
  };
  questions: Array<{
    id: number;
    exerciseType: string;
    question: string;
    options: string[] | null;
    points: number;
  }>;
} | { success: false; error: string }> {
  const input = startLessonExamSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Check if lesson has an exam
  const examRows = await db.query<LessonExamRow[]>(
    `SELECT * FROM lesson_exams WHERE unit_lesson_id = ? AND is_active = TRUE`,
    [input.lessonId]
  );

  if (examRows.length === 0) {
    return { success: false, error: 'No exam found for this lesson' };
  }

  const exam = examRows[0];

  // Check if user completed lesson study
  const progressRows = await db.query<RowDataPacket[]>(
    `SELECT * FROM user_lesson_progress WHERE user_id = ? AND unit_lesson_id = ? AND status = 'completed'`,
    [effectiveUserId, input.lessonId]
  );

  if (progressRows.length === 0) {
    return { success: false, error: 'Complete the lesson study phase before taking the exam' };
  }

  // Check max attempts
  const attemptCountRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM user_exam_attempts WHERE user_id = ? AND lesson_exam_id = ?`,
    [effectiveUserId, exam.id]
  );

  if (exam.max_attempts > 0 && (attemptCountRows[0].count as number) >= exam.max_attempts) {
    return { success: false, error: `Maximum attempts (${exam.max_attempts}) reached for this exam` };
  }

  // Get exam questions with exercises
  const questionRows = await db.query<ExamQuestionRow[]>(
    `SELECT eq.*,
            me.exercise_type, me.question, me.options, me.correct_answer, me.explanation
     FROM exam_questions eq
     LEFT JOIN master_exercises me ON eq.master_exercise_id = me.id
     WHERE eq.lesson_exam_id = ? AND eq.is_active = TRUE
     ORDER BY ${exam.shuffle_questions ? 'RAND()' : 'eq.display_order ASC'}`,
    [exam.id]
  );

  // Create attempt
  const attemptNumber = (attemptCountRows[0].count as number) + 1;
  const result = await db.execute(
    `INSERT INTO user_exam_attempts (user_id, lesson_exam_id, unit_lesson_id, attempt_number, status, started_at)
     VALUES (?, ?, ?, ?, 'in_progress', NOW())`,
    [effectiveUserId, exam.id, input.lessonId, attemptNumber]
  );

  const attemptId = result.insertId;

  // Format questions (without answers)
  const parseJson = <T>(value: unknown): T | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  };

  const questions = questionRows.map(q => {
    const questionText = q.custom_question ?? q.question ?? '';
    let options = parseJson<string[]>(q.custom_options ?? q.options);

    // Shuffle options if enabled
    if (options && exam.shuffle_options) {
      options = [...options].sort(() => Math.random() - 0.5);
    }

    return {
      id: q.id,
      exerciseType: q.exercise_type ?? 'multiple_choice',
      question: questionText,
      options,
      points: q.points,
    };
  });

  return {
    success: true,
    attempt: {
      id: attemptId,
      examId: exam.id,
      attemptNumber,
      timeLimitMinutes: exam.time_limit_minutes,
      totalQuestions: questions.length,
      passingScore: exam.passing_score,
    },
    questions,
  };
}

export async function submitExamAnswers(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  result: {
    attemptId: number;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    xpEarned: number;
    correctCount: number;
    totalQuestions: number;
    questionResults: Array<{
      questionId: number;
      correct: boolean;
      userAnswer: string;
      correctAnswer: string;
      explanation: string | null;
      pointsEarned: number;
    }>;
  };
  nextStep?: {
    message: string;
    unlockedUnit?: number;
    unlockedLesson?: number;
  };
} | { success: false; error: string }> {
  const input = submitExamAnswersSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get attempt
  const attemptRows = await db.query<ExamAttemptRow[]>(
    `SELECT * FROM user_exam_attempts WHERE id = ? AND user_id = ?`,
    [input.attemptId, effectiveUserId]
  );

  if (attemptRows.length === 0) {
    return { success: false, error: 'Exam attempt not found' };
  }

  const attempt = attemptRows[0];

  if (attempt.status !== 'in_progress') {
    return { success: false, error: 'This exam attempt has already been submitted' };
  }

  // Get exam and questions
  const examRows = await db.query<LessonExamRow[]>(
    `SELECT * FROM lesson_exams WHERE id = ?`,
    [attempt.lesson_exam_id]
  );

  const exam = examRows[0];

  const questionRows = await db.query<ExamQuestionRow[]>(
    `SELECT eq.*,
            me.exercise_type, me.question, me.options, me.correct_answer, me.explanation
     FROM exam_questions eq
     LEFT JOIN master_exercises me ON eq.master_exercise_id = me.id
     WHERE eq.lesson_exam_id = ?`,
    [attempt.lesson_exam_id]
  );

  // Grade each answer
  const questionResults: Array<{
    questionId: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    pointsEarned: number;
  }> = [];

  let totalScore = 0;
  let totalPoints = 0;
  let correctCount = 0;

  for (const question of questionRows) {
    const userAnswerObj = input.answers.find(a => a.questionId === question.id);
    const userAnswer = userAnswerObj?.answer ?? '';
    const correctAnswer = question.custom_correct_answer ?? question.correct_answer ?? '';

    // Simple string comparison (case-insensitive, trimmed)
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const pointsEarned = isCorrect ? question.points : 0;

    totalPoints += question.points;
    totalScore += pointsEarned;
    if (isCorrect) correctCount++;

    questionResults.push({
      questionId: question.id,
      correct: isCorrect,
      userAnswer,
      correctAnswer,
      explanation: question.explanation ?? null,
      pointsEarned,
    });
  }

  const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const passed = percentage >= exam.passing_score;

  // Update attempt
  await db.query(
    `UPDATE user_exam_attempts
     SET status = 'completed',
         score = ?,
         total_points = ?,
         percentage = ?,
         passed = ?,
         completed_at = NOW(),
         time_spent_seconds = ?,
         answers_json = ?,
         results_json = ?
     WHERE id = ?`,
    [
      totalScore,
      totalPoints,
      percentage,
      passed,
      input.timeSpentSeconds ?? 0,
      JSON.stringify(input.answers),
      JSON.stringify(questionResults),
      input.attemptId,
    ]
  );

  // Calculate XP earned
  let xpEarned = 0;
  if (passed) {
    // Get lesson XP value
    const lessonRows = await db.query<RowDataPacket[]>(
      `SELECT exam_xp FROM unit_lessons WHERE id = ?`,
      [attempt.unit_lesson_id]
    );

    if (lessonRows.length > 0) {
      xpEarned = lessonRows[0].exam_xp as number;

      // Update lesson progress XP
      await db.query(
        `UPDATE user_lesson_progress
         SET xp_earned = xp_earned + ?
         WHERE user_id = ? AND unit_lesson_id = ?`,
        [xpEarned, effectiveUserId, attempt.unit_lesson_id]
      );
    }
  }

  // Check for unit/next lesson unlock
  let nextStep: { message: string; unlockedUnit?: number; unlockedLesson?: number } | undefined;

  if (passed) {
    // Get current lesson info
    const lessonInfoRows = await db.query<RowDataPacket[]>(
      `SELECT ul.*, mu.word_map_id, mu.unit_number, mu.total_lessons
       FROM unit_lessons ul
       JOIN map_units mu ON ul.map_unit_id = mu.id
       WHERE ul.id = ?`,
      [attempt.unit_lesson_id]
    );

    if (lessonInfoRows.length > 0) {
      const lesson = lessonInfoRows[0];

      // Check if this was the last lesson in the unit
      if (lesson.lesson_number >= lesson.total_lessons) {
        // Try to unlock next unit
        const nextUnitRows = await db.query<RowDataPacket[]>(
          `SELECT * FROM map_units
           WHERE word_map_id = ? AND unit_number = ? AND is_active = TRUE`,
          [lesson.word_map_id, lesson.unit_number + 1]
        );

        if (nextUnitRows.length > 0) {
          const nextUnit = nextUnitRows[0];

          // Check if already unlocked
          const existingUnitProgress = await db.query<RowDataPacket[]>(
            `SELECT * FROM user_unit_progress WHERE user_id = ? AND map_unit_id = ?`,
            [effectiveUserId, nextUnit.id]
          );

          if (existingUnitProgress.length === 0) {
            // Unlock next unit
            await db.execute(
              `INSERT INTO user_unit_progress (user_id, map_unit_id, status, progress_percentage, lessons_completed, total_lessons, xp_earned, boss_exam_passed, boss_exam_attempts)
               VALUES (?, ?, 'available', 0, 0, ?, 0, FALSE, 0)`,
              [effectiveUserId, nextUnit.id, nextUnit.total_lessons]
            );

            // Unlock first lesson of next unit
            const firstLessonRows = await db.query<RowDataPacket[]>(
              `SELECT * FROM unit_lessons WHERE map_unit_id = ? AND lesson_number = 1 AND is_active = TRUE`,
              [nextUnit.id]
            );

            if (firstLessonRows.length > 0) {
              await db.execute(
                `INSERT INTO user_lesson_progress (user_id, unit_lesson_id, status, progress_percentage, content_completed, total_content, vocabulary_mastered, grammar_mastered, exercises_completed, xp_earned, time_spent_seconds)
                 VALUES (?, ?, 'available', 0, 0, 0, 0, 0, 0, 0, 0)`,
                [effectiveUserId, firstLessonRows[0].id]
              );
            }

            nextStep = {
              message: `Congratulations! You unlocked Unit ${nextUnit.unit_number}: ${nextUnit.name}`,
              unlockedUnit: nextUnit.id,
            };
          }
        }
      } else {
        // Unlock next lesson in same unit
        const nextLessonRows = await db.query<RowDataPacket[]>(
          `SELECT * FROM unit_lessons
           WHERE map_unit_id = ? AND lesson_number = ? AND is_active = TRUE`,
          [lesson.map_unit_id, lesson.lesson_number + 1]
        );

        if (nextLessonRows.length > 0) {
          const nextLesson = nextLessonRows[0];

          // Check if already unlocked
          const existingLessonProgress = await db.query<RowDataPacket[]>(
            `SELECT * FROM user_lesson_progress WHERE user_id = ? AND unit_lesson_id = ?`,
            [effectiveUserId, nextLesson.id]
          );

          if (existingLessonProgress.length === 0) {
            await db.execute(
              `INSERT INTO user_lesson_progress (user_id, unit_lesson_id, status, progress_percentage, content_completed, total_content, vocabulary_mastered, grammar_mastered, exercises_completed, xp_earned, time_spent_seconds)
               VALUES (?, ?, 'available', 0, 0, 0, 0, 0, 0, 0, 0)`,
              [effectiveUserId, nextLesson.id]
            );
          }

          nextStep = {
            message: `Next lesson unlocked: ${nextLesson.title}`,
            unlockedLesson: nextLesson.id,
          };
        }
      }
    }
  }

  return {
    success: true,
    result: {
      attemptId: input.attemptId,
      score: totalScore,
      totalPoints,
      percentage,
      passed,
      xpEarned,
      correctCount,
      totalQuestions: questionRows.length,
      questionResults,
    },
    nextStep,
  };
}

export async function getExamResults(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  attempt: {
    id: number;
    lessonId: number;
    lessonTitle: string;
    examTitle: string | null;
    attemptNumber: number;
    status: string;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    startedAt: Date;
    completedAt: Date | null;
    timeSpentSeconds: number | null;
  };
  questionResults: Array<{
    questionId: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    pointsEarned: number;
  }>;
} | { success: false; error: string }> {
  const input = getExamResultsSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const [rows] = await db.query<ExamAttemptRow[]>(
    `SELECT uea.*,
            ul.title as lesson_title,
            le.title as exam_title
     FROM user_exam_attempts uea
     JOIN unit_lessons ul ON uea.unit_lesson_id = ul.id
     JOIN lesson_exams le ON uea.lesson_exam_id = le.id
     WHERE uea.id = ? AND uea.user_id = ?`,
    [input.attemptId, effectiveUserId]
  );

  if (rows.length === 0) {
    return { success: false, error: 'Exam attempt not found' };
  }

  const attempt = rows[0];

  if (attempt.status !== 'completed') {
    return { success: false, error: 'Exam has not been submitted yet' };
  }

  // Parse results JSON
  let questionResults: Array<{
    questionId: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    pointsEarned: number;
  }> = [];

  if (attempt.results_json) {
    try {
      questionResults = JSON.parse(attempt.results_json);
    } catch {
      // Results not available
    }
  }

  return {
    success: true,
    attempt: {
      id: attempt.id,
      lessonId: attempt.unit_lesson_id,
      lessonTitle: attempt.lesson_title ?? '',
      examTitle: attempt.exam_title ?? null,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      score: attempt.score ?? 0,
      totalPoints: attempt.total_points ?? 0,
      percentage: attempt.percentage ?? 0,
      passed: Boolean(attempt.passed),
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      timeSpentSeconds: attempt.time_spent_seconds,
    },
    questionResults,
  };
}

export async function getExamHistory(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  attempts: Array<{
    id: number;
    lessonId: number;
    lessonTitle: string;
    examTitle: string | null;
    attemptNumber: number;
    status: string;
    score: number | null;
    percentage: number | null;
    passed: boolean | null;
    completedAt: Date | null;
  }>;
  total: number;
}> {
  const input = getExamHistorySchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  let sql = `
    SELECT uea.*,
           ul.title as lesson_title,
           le.title as exam_title
    FROM user_exam_attempts uea
    JOIN unit_lessons ul ON uea.unit_lesson_id = ul.id
    JOIN lesson_exams le ON uea.lesson_exam_id = le.id
    WHERE uea.user_id = ?
  `;

  const params: (number | string)[] = [effectiveUserId];

  if (input.lessonId) {
    sql += ` AND uea.unit_lesson_id = ?`;
    params.push(input.lessonId);
  }

  sql += ` ORDER BY uea.started_at DESC LIMIT ?`;
  params.push(input.limit);

  const rows = await db.query<ExamAttemptRow[]>(sql, params);

  const attempts = rows.map(row => ({
    id: row.id,
    lessonId: row.unit_lesson_id,
    lessonTitle: row.lesson_title ?? '',
    examTitle: row.exam_title ?? null,
    attemptNumber: row.attempt_number,
    status: row.status,
    score: row.score,
    percentage: row.percentage,
    passed: row.passed,
    completedAt: row.completed_at,
  }));

  return {
    success: true,
    attempts,
    total: attempts.length,
  };
}
