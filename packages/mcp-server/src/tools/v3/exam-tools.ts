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
  exercise_ids: string; // JSON array
  total_questions: number;
  total_points: number;
  random_question_count: number | null;
  pass_xp: number;
  perfect_score_bonus_xp: number;
  pass_coins: number;
  perfect_score_bonus_coins: number;
  display_order: number;
  is_active: boolean;
}

// Note: exam_questions table doesn't exist in current schema
// Exams use exercise_ids JSON array in lesson_exams table
// Exercises are fetched from master_exercises table
interface MasterExerciseRow extends RowDataPacket {
  id: number;
  exercise_type: string;
  question: string;
  options: string | null; // JSON array
  correct_answer: string;
  explanation: string | null;
  hint: string | null;
  audio_url: string | null;
  image_url: string | null;
  exercise_data: string | null; // JSON
  cefr_level: string | null;
  category: string | null;
  tags: string | null; // JSON array
  points: number;
  is_active: boolean;
}

interface ExamAttemptRow extends RowDataPacket {
  id: number;
  user_id: number;
  exam_id: number;
  lesson_progress_id: number | null;
  unit_progress_id: number | null;
  attempt_number: number;
  started_at: Date;
  completed_at: Date | null;
  score: number; // decimal(5,2)
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  answers: string; // JSON
  is_passed: boolean;
  xp_earned: number;
  coins_earned: number;
  // Joined lesson fields
  lesson_title?: string;
  exam_title?: string;
  lesson_id?: number;
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
    timeLimitSeconds: number | null;
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
    `SELECT * FROM lesson_exams WHERE lesson_id = ? AND is_active = TRUE`,
    [input.lessonId]
  );

  if (examRows.length === 0) {
    return { success: false, error: 'No exam found for this lesson' };
  }

  const exam = examRows[0];

  // Get user's lesson progress (need the progress ID for FK)
  const progressRows = await db.query<RowDataPacket[]>(
    `SELECT ulp.*, uup.id as unit_progress_id
     FROM user_lesson_progress ulp
     JOIN user_unit_progress uup ON ulp.unit_progress_id = uup.id
     WHERE ulp.user_id = ? AND ulp.lesson_id = ? AND ulp.status IN ('exam_ready', 'completed')`,
    [effectiveUserId, input.lessonId]
  );

  if (progressRows.length === 0) {
    return { success: false, error: 'Complete the lesson study phase before taking the exam' };
  }

  const lessonProgress = progressRows[0];

  // Check max attempts
  const attemptCountRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM user_exam_attempts WHERE user_id = ? AND exam_id = ?`,
    [effectiveUserId, exam.id]
  );

  if (exam.max_attempts && exam.max_attempts > 0 && (attemptCountRows[0].count as number) >= exam.max_attempts) {
    return { success: false, error: `Maximum attempts (${exam.max_attempts}) reached for this exam` };
  }

  // Parse exercise_ids JSON to get exercises
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

  const exerciseIds = parseJson<number[]>(exam.exercise_ids) ?? [];

  if (exerciseIds.length === 0) {
    return { success: false, error: 'No questions configured for this exam' };
  }

  // Get exercises from master_exercises
  const exerciseRows = await db.query<MasterExerciseRow[]>(
    `SELECT * FROM master_exercises
     WHERE id IN (${exerciseIds.map(() => '?').join(',')}) AND is_active = TRUE`,
    exerciseIds
  );

  // Shuffle questions if enabled
  let questions = exerciseRows.map(ex => ({
    id: ex.id,
    exerciseType: ex.exercise_type,
    question: ex.question,
    options: parseJson<string[]>(ex.options),
    points: ex.points || 1,
  }));

  if (exam.shuffle_questions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  // Limit to random_question_count if set
  if (exam.random_question_count && exam.random_question_count < questions.length) {
    questions = questions.slice(0, exam.random_question_count);
  }

  // Create attempt
  const attemptNumber = (attemptCountRows[0].count as number) + 1;
  const result = await db.execute(
    `INSERT INTO user_exam_attempts (user_id, exam_id, lesson_progress_id, unit_progress_id, attempt_number, started_at, score, total_questions, correct_answers, time_taken_seconds, answers, is_passed)
     VALUES (?, ?, ?, ?, ?, NOW(), 0, ?, 0, 0, '[]', FALSE)`,
    [effectiveUserId, exam.id, lessonProgress.id, lessonProgress.unit_progress_id, attemptNumber, questions.length]
  );

  const attemptId = result.insertId;

  return {
    success: true,
    attempt: {
      id: attemptId,
      examId: exam.id,
      attemptNumber,
      timeLimitSeconds: exam.time_limit_seconds,
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
    coinsEarned: number;
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

  // Get attempt with lesson info
  const attemptRows = await db.query<ExamAttemptRow[]>(
    `SELECT uea.*, le.lesson_id
     FROM user_exam_attempts uea
     JOIN lesson_exams le ON uea.exam_id = le.id
     WHERE uea.id = ? AND uea.user_id = ?`,
    [input.attemptId, effectiveUserId]
  );

  if (attemptRows.length === 0) {
    return { success: false, error: 'Exam attempt not found' };
  }

  const attempt = attemptRows[0];

  // Check if already completed (completed_at is set)
  if (attempt.completed_at) {
    return { success: false, error: 'This exam attempt has already been submitted' };
  }

  // Get exam
  const examRows = await db.query<LessonExamRow[]>(
    `SELECT * FROM lesson_exams WHERE id = ?`,
    [attempt.exam_id]
  );

  if (examRows.length === 0) {
    return { success: false, error: 'Exam not found' };
  }

  const exam = examRows[0];

  // Parse exercise_ids to get exercises
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

  const exerciseIds = parseJson<number[]>(exam.exercise_ids) ?? [];

  // Get exercises from master_exercises
  const exerciseRows = await db.query<MasterExerciseRow[]>(
    `SELECT * FROM master_exercises WHERE id IN (${exerciseIds.map(() => '?').join(',')})`,
    exerciseIds
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

  for (const exercise of exerciseRows) {
    const userAnswerObj = input.answers.find(a => a.questionId === exercise.id);
    const userAnswer = userAnswerObj?.answer ?? '';
    const correctAnswer = exercise.correct_answer ?? '';

    // Simple string comparison (case-insensitive, trimmed)
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const points = exercise.points || 1;
    const pointsEarned = isCorrect ? points : 0;

    totalPoints += points;
    totalScore += pointsEarned;
    if (isCorrect) correctCount++;

    questionResults.push({
      questionId: exercise.id,
      correct: isCorrect,
      userAnswer,
      correctAnswer,
      explanation: exercise.explanation ?? null,
      pointsEarned,
    });
  }

  const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const passed = percentage >= exam.passing_score;

  // Calculate XP and coins earned
  let xpEarned = 0;
  let coinsEarned = 0;
  if (passed) {
    xpEarned = exam.pass_xp || 0;
    coinsEarned = exam.pass_coins || 0;

    // Bonus for perfect score
    if (percentage === 100) {
      xpEarned += exam.perfect_score_bonus_xp || 0;
      coinsEarned += exam.perfect_score_bonus_coins || 0;
    }
  }

  // Update attempt
  await db.query(
    `UPDATE user_exam_attempts
     SET score = ?,
         total_questions = ?,
         correct_answers = ?,
         completed_at = NOW(),
         time_taken_seconds = ?,
         answers = ?,
         is_passed = ?,
         xp_earned = ?,
         coins_earned = ?
     WHERE id = ?`,
    [
      percentage, // score is percentage in this schema
      exerciseRows.length,
      correctCount,
      input.timeSpentSeconds ?? 0,
      JSON.stringify({ answers: input.answers, results: questionResults }),
      passed,
      xpEarned,
      coinsEarned,
      input.attemptId,
    ]
  );

  // Update lesson progress if passed
  if (passed && attempt.lesson_progress_id) {
    await db.query(
      `UPDATE user_lesson_progress
       SET status = 'completed',
           exam_passed_at = NOW(),
           boss_exam_passed = TRUE,
           best_exam_score = GREATEST(COALESCE(best_exam_score, 0), ?),
           exam_attempts = exam_attempts + 1,
           last_exam_attempt_at = NOW(),
           xp_earned = xp_earned + ?
       WHERE id = ?`,
      [percentage, xpEarned, attempt.lesson_progress_id]
    );
  } else if (attempt.lesson_progress_id) {
    // Update attempt count even if failed
    await db.query(
      `UPDATE user_lesson_progress
       SET exam_attempts = exam_attempts + 1,
           last_exam_attempt_at = NOW(),
           best_exam_score = GREATEST(COALESCE(best_exam_score, 0), ?)
       WHERE id = ?`,
      [percentage, attempt.lesson_progress_id]
    );
  }

  // Check for unit/next lesson unlock
  let nextStep: { message: string; unlockedUnit?: number; unlockedLesson?: number } | undefined;

  if (passed && attempt.lesson_id) {
    // Get current lesson info
    const lessonInfoRows = await db.query<RowDataPacket[]>(
      `SELECT ul.*, mu.map_id, mu.unit_number, mu.total_lessons
       FROM unit_lessons ul
       JOIN map_units mu ON ul.unit_id = mu.id
       WHERE ul.id = ?`,
      [attempt.lesson_id]
    );

    if (lessonInfoRows.length > 0) {
      const lesson = lessonInfoRows[0];

      // Get map_progress_id for FK
      const mapProgressRows = await db.query<RowDataPacket[]>(
        `SELECT id FROM user_map_progress WHERE user_id = ? AND map_id = ?`,
        [effectiveUserId, lesson.map_id]
      );

      const mapProgressId = mapProgressRows.length > 0 ? mapProgressRows[0].id : null;

      // Check if this was the last lesson in the unit
      if (lesson.lesson_number >= lesson.total_lessons) {
        // Try to unlock next unit
        const nextUnitRows = await db.query<RowDataPacket[]>(
          `SELECT * FROM map_units
           WHERE map_id = ? AND unit_number = ? AND is_active = TRUE`,
          [lesson.map_id, lesson.unit_number + 1]
        );

        if (nextUnitRows.length > 0 && mapProgressId) {
          const nextUnit = nextUnitRows[0];

          // Check if already unlocked
          const existingUnitProgress = await db.query<RowDataPacket[]>(
            `SELECT * FROM user_unit_progress WHERE user_id = ? AND unit_id = ?`,
            [effectiveUserId, nextUnit.id]
          );

          if (existingUnitProgress.length === 0) {
            // Unlock next unit
            const unitProgressResult = await db.execute(
              `INSERT INTO user_unit_progress (user_id, unit_id, map_progress_id, status, completion_percentage, lessons_completed, xp_earned)
               VALUES (?, ?, ?, 'unlocked', 0, 0, 0)`,
              [effectiveUserId, nextUnit.id, mapProgressId]
            );

            const newUnitProgressId = unitProgressResult.insertId;

            // Unlock first lesson of next unit
            const firstLessonRows = await db.query<RowDataPacket[]>(
              `SELECT * FROM unit_lessons WHERE unit_id = ? AND lesson_number = 1 AND is_active = TRUE`,
              [nextUnit.id]
            );

            if (firstLessonRows.length > 0) {
              await db.execute(
                `INSERT INTO user_lesson_progress (user_id, lesson_id, unit_progress_id, status, content_progress_percentage, xp_earned)
                 VALUES (?, ?, ?, 'unlocked', 0, 0)`,
                [effectiveUserId, firstLessonRows[0].id, newUnitProgressId]
              );
            }

            nextStep = {
              message: `Congratulations! You unlocked Unit ${nextUnit.unit_number}: ${nextUnit.title}`,
              unlockedUnit: nextUnit.id,
            };
          }
        }
      } else {
        // Unlock next lesson in same unit
        const nextLessonRows = await db.query<RowDataPacket[]>(
          `SELECT * FROM unit_lessons
           WHERE unit_id = ? AND lesson_number = ? AND is_active = TRUE`,
          [lesson.unit_id, lesson.lesson_number + 1]
        );

        if (nextLessonRows.length > 0 && attempt.unit_progress_id) {
          const nextLesson = nextLessonRows[0];

          // Check if already unlocked
          const existingLessonProgress = await db.query<RowDataPacket[]>(
            `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
            [effectiveUserId, nextLesson.id]
          );

          if (existingLessonProgress.length === 0) {
            await db.execute(
              `INSERT INTO user_lesson_progress (user_id, lesson_id, unit_progress_id, status, content_progress_percentage, xp_earned)
               VALUES (?, ?, ?, 'unlocked', 0, 0)`,
              [effectiveUserId, nextLesson.id, attempt.unit_progress_id]
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
      coinsEarned,
      correctCount,
      totalQuestions: exerciseRows.length,
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
    lessonId: number | null;
    lessonTitle: string;
    examTitle: string | null;
    attemptNumber: number;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
    xpEarned: number;
    coinsEarned: number;
    startedAt: Date;
    completedAt: Date | null;
    timeTakenSeconds: number;
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

  const rows = await db.query<ExamAttemptRow[]>(
    `SELECT uea.*,
            ul.title as lesson_title,
            le.title as exam_title,
            le.lesson_id
     FROM user_exam_attempts uea
     JOIN lesson_exams le ON uea.exam_id = le.id
     LEFT JOIN unit_lessons ul ON le.lesson_id = ul.id
     WHERE uea.id = ? AND uea.user_id = ?`,
    [input.attemptId, effectiveUserId]
  );

  if (rows.length === 0) {
    return { success: false, error: 'Exam attempt not found' };
  }

  const attempt = rows[0];

  if (!attempt.completed_at) {
    return { success: false, error: 'Exam has not been submitted yet' };
  }

  // Parse results from answers JSON
  let questionResults: Array<{
    questionId: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    pointsEarned: number;
  }> = [];

  if (attempt.answers) {
    try {
      const parsed = JSON.parse(attempt.answers);
      if (parsed.results) {
        questionResults = parsed.results;
      }
    } catch {
      // Results not available
    }
  }

  return {
    success: true,
    attempt: {
      id: attempt.id,
      lessonId: attempt.lesson_id ?? null,
      lessonTitle: attempt.lesson_title ?? '',
      examTitle: attempt.exam_title ?? null,
      attemptNumber: attempt.attempt_number,
      score: attempt.score ?? 0,
      totalQuestions: attempt.total_questions ?? 0,
      correctAnswers: attempt.correct_answers ?? 0,
      passed: Boolean(attempt.is_passed),
      xpEarned: attempt.xp_earned ?? 0,
      coinsEarned: attempt.coins_earned ?? 0,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      timeTakenSeconds: attempt.time_taken_seconds ?? 0,
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
    lessonId: number | null;
    lessonTitle: string;
    examTitle: string | null;
    attemptNumber: number;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
    xpEarned: number;
    coinsEarned: number;
    completedAt: Date | null;
  }>;
  total: number;
}> {
  const input = getExamHistorySchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  let sql = `
    SELECT uea.*,
           ul.title as lesson_title,
           le.title as exam_title,
           le.lesson_id
    FROM user_exam_attempts uea
    JOIN lesson_exams le ON uea.exam_id = le.id
    LEFT JOIN unit_lessons ul ON le.lesson_id = ul.id
    WHERE uea.user_id = ?
  `;

  const params: (number | string)[] = [effectiveUserId];

  if (input.lessonId) {
    sql += ` AND le.lesson_id = ?`;
    params.push(input.lessonId);
  }

  sql += ` ORDER BY uea.started_at DESC LIMIT ?`;
  params.push(input.limit);

  const rows = await db.query<ExamAttemptRow[]>(sql, params);

  const attempts = rows.map(row => ({
    id: row.id,
    lessonId: row.lesson_id ?? null,
    lessonTitle: row.lesson_title ?? '',
    examTitle: row.exam_title ?? null,
    attemptNumber: row.attempt_number,
    score: row.score ?? 0,
    totalQuestions: row.total_questions ?? 0,
    correctAnswers: row.correct_answers ?? 0,
    passed: Boolean(row.is_passed),
    xpEarned: row.xp_earned ?? 0,
    coinsEarned: row.coins_earned ?? 0,
    completedAt: row.completed_at,
  }));

  return {
    success: true,
    attempts,
    total: attempts.length,
  };
}
