import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const saveExerciseSessionTool: Tool = {
  name: 'save_exercise_session',
  description: `Save a complete exercise session with multiple answers.
Use this when the user has completed multiple exercises and you want to save all results at once.
This is more efficient than calling save_exercise_result multiple times.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      exercises: {
        type: 'array',
        description: 'List of exercise results',
        items: {
          type: 'object',
          properties: {
            exerciseId: {
              type: 'number',
              description: 'Exercise ID',
            },
            userAnswer: {
              type: 'string',
              description: 'User\'s answer',
            },
            isCorrect: {
              type: 'boolean',
              description: 'Whether the answer was correct',
            },
            timeSpentSeconds: {
              type: 'number',
              description: 'Time spent on this exercise in seconds',
            },
          },
          required: ['exerciseId', 'userAnswer', 'isCorrect'],
        },
      },
      totalTimeSeconds: {
        type: 'number',
        description: 'Total time spent on the entire session in seconds',
      },
    },
    required: ['exercises'],
  },
};

const inputSchema = z.object({
  userId: z.number().optional().default(1),
  exercises: z.array(z.object({
    exerciseId: z.number(),
    userAnswer: z.string(),
    isCorrect: z.boolean(),
    timeSpentSeconds: z.number().optional(),
  })).min(1),
  totalTimeSeconds: z.number().optional(),
});

interface ExerciseRow extends RowDataPacket {
  id: number;
  exercise_type: string;
}

export async function saveExerciseSession(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  sessionId: number;
  score: number;
  total: number;
  percentage: number;
  message: string;
  results: {
    exerciseId: number;
    isCorrect: boolean;
  }[];
}> {
  const input = inputSchema.parse(args);

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const correctCount = input.exercises.filter(e => e.isCorrect).length;
    const totalCount = input.exercises.length;
    const percentage = Math.round((correctCount / totalCount) * 100);
    const totalTime = input.totalTimeSeconds || input.exercises.reduce((sum, e) => sum + (e.timeSpentSeconds || 0), 0);

    // Get exercise types for the session
    const exerciseIds = input.exercises.map(e => e.exerciseId);
    const placeholders = exerciseIds.map(() => '?').join(',');
    const [exerciseRows] = await connection.query<ExerciseRow[]>(
      `SELECT id, exercise_type FROM exercises WHERE id IN (${placeholders})`,
      exerciseIds
    );
    const exerciseTypes = [...new Set(exerciseRows.map(e => e.exercise_type))];

    // Create session
    const [sessionResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO exercise_sessions
       (user_id, total_questions, correct_answers, total_time_seconds, score_percentage, status, exercise_types, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, NOW(), NOW())`,
      [input.userId, totalCount, correctCount, totalTime, percentage, JSON.stringify(exerciseTypes)]
    );

    const sessionId = sessionResult.insertId;

    // Save each answer
    const results: { exerciseId: number; isCorrect: boolean }[] = [];

    for (let i = 0; i < input.exercises.length; i++) {
      const exercise = input.exercises[i];

      await connection.execute(
        `INSERT INTO exercise_session_answers
         (session_id, exercise_id, question_order, user_answer, is_correct, time_spent_seconds, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [sessionId, exercise.exerciseId, i + 1, exercise.userAnswer, exercise.isCorrect, exercise.timeSpentSeconds || 0]
      );

      // Also save to exercise_attempts for backward compatibility
      await connection.execute(
        `INSERT INTO exercise_attempts (exercise_id, user_id, user_answer, is_correct, time_spent_seconds)
         VALUES (?, ?, ?, ?, ?)`,
        [exercise.exerciseId, input.userId, exercise.userAnswer, exercise.isCorrect, exercise.timeSpentSeconds || 0]
      );

      results.push({
        exerciseId: exercise.exerciseId,
        isCorrect: exercise.isCorrect,
      });
    }

    // Update user statistics
    await connection.execute(
      `INSERT INTO user_statistics (user_id, total_exercises_completed, last_activity_date)
       VALUES (?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE
         total_exercises_completed = total_exercises_completed + ?,
         last_activity_date = CURDATE()`,
      [input.userId, totalCount, totalCount]
    );

    // Update daily activity log
    await connection.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, exercises_completed)
       VALUES (?, CURDATE(), ?)
       ON DUPLICATE KEY UPDATE
         exercises_completed = exercises_completed + ?`,
      [input.userId, totalCount, totalCount]
    );

    await connection.commit();
    connection.release();

    let message: string;
    if (percentage >= 90) {
      message = `Excellent! You scored ${correctCount}/${totalCount} (${percentage}%). Outstanding performance!`;
    } else if (percentage >= 70) {
      message = `Great job! You scored ${correctCount}/${totalCount} (${percentage}%). Keep up the good work!`;
    } else if (percentage >= 50) {
      message = `Good effort! You scored ${correctCount}/${totalCount} (${percentage}%). Keep practicing!`;
    } else {
      message = `You scored ${correctCount}/${totalCount} (${percentage}%). Don't give up, practice makes perfect!`;
    }

    return {
      success: true,
      sessionId,
      score: correctCount,
      total: totalCount,
      percentage,
      message,
      results,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}
