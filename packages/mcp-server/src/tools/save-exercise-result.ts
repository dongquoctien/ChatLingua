import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';

export const saveExerciseResultTool: Tool = {
  name: 'save_exercise_result',
  description: `Save the result of an exercise attempt.
Use this after the user answers an exercise to track their progress.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      exerciseId: {
        type: 'number',
        description: 'The exercise ID that was attempted',
      },
      userAnswer: {
        type: 'string',
        description: 'The answer provided by the user',
      },
      isCorrect: {
        type: 'boolean',
        description: 'Whether the answer was correct',
      },
      timeSpentSeconds: {
        type: 'number',
        description: 'Time spent on the exercise in seconds',
      },
    },
    required: ['exerciseId', 'userAnswer', 'isCorrect'],
  },
};

const inputSchema = z.object({
  userId: z.number().optional().default(1),
  exerciseId: z.number(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().optional(),
});

export async function saveExerciseResult(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  attemptId: number;
  message: string;
  isCorrect: boolean;
}> {
  const input = inputSchema.parse(args);

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Save the attempt
    const [result] = await connection.execute(
      `INSERT INTO exercise_attempts (exercise_id, user_id, user_answer, is_correct, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.exerciseId,
        input.userId,
        input.userAnswer,
        input.isCorrect,
        input.timeSpentSeconds || null,
      ]
    );

    const attemptId = (result as any).insertId;

    // Update user statistics
    await connection.execute(
      `INSERT INTO user_statistics (user_id, total_exercises_completed, last_activity_date)
       VALUES (?, 1, CURDATE())
       ON DUPLICATE KEY UPDATE
         total_exercises_completed = total_exercises_completed + 1,
         last_activity_date = CURDATE()`,
      [input.userId]
    );

    // Update daily activity log
    await connection.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, exercises_completed)
       VALUES (?, CURDATE(), 1)
       ON DUPLICATE KEY UPDATE
         exercises_completed = exercises_completed + 1`,
      [input.userId]
    );

    // If correct, update vocabulary mastery if related
    if (input.isCorrect) {
      await connection.execute(
        `UPDATE vocabulary v
         INNER JOIN exercises e ON JSON_CONTAINS(e.related_vocabulary_ids, CAST(v.id AS JSON))
         SET v.mastery_level = LEAST(v.mastery_level + 5, 100),
             v.times_practiced = v.times_practiced + 1,
             v.last_practiced_at = NOW()
         WHERE e.id = ? AND v.user_id = ?`,
        [input.exerciseId, input.userId]
      );
    }

    await connection.commit();
    connection.release();

    return {
      success: true,
      attemptId,
      message: input.isCorrect
        ? 'Correct! Great job!'
        : 'Incorrect. Keep practicing!',
      isCorrect: input.isCorrect,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}
