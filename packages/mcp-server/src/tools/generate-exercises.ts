import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const generateExercisesTool: Tool = {
  name: 'generate_exercises',
  description: `Generate practice exercises from user's conversation vocabulary and grammar.
This tool creates exercises to help Vietnamese users learn ENGLISH.
Supports: multiple choice, fill in blank, and translation exercises.

=== EXERCISE TYPES ===

1. **multiple_choice** - Various bilingual formats:
   - English question → Vietnamese options: "What is the meaning of 'contract'?" → ["Hợp đồng", "Hóa đơn", "Giấy kết hôn", "Tài liệu"]
   - Vietnamese question → English options: "Từ tiếng Anh nào có nghĩa 'Xin chào'?" → ["Hi", "Hello", "Goodbye", "Cả a và b đều đúng"]
   - English question → English options: "Choose the synonym of 'happy'" → ["joyful", "sad", "angry", "tired"]

2. **fill_blank** - Complete the English sentence:
   - "I signed a _____ with the company." (contract)
   - "She said _____ when she arrived." (hello)

3. **translation** - Vietnamese to English:
   - Question: "Dịch sang tiếng Anh: 'Tôi ký hợp đồng hôm qua'"
   - Answer: "I signed a contract yesterday"

IMPORTANT: For 'multiple_choice' type, you MUST provide 'options' array with at least 4 choices including the correct answer.

Use this after analyzing a conversation to create practice material.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      conversationIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'List of conversation IDs to generate exercises from. Use multiple for combined exercises.',
      },
      exercises: {
        type: 'array',
        description: 'List of exercises to save',
        items: {
          type: 'object',
          properties: {
            exerciseType: {
              type: 'string',
              enum: ['multiple_choice', 'fill_blank', 'translation'],
            },
            question: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Options for multiple choice (4 options)',
            },
            correctAnswer: { type: 'string' },
            explanation: { type: 'string' },
            relatedVocabularyIds: {
              type: 'array',
              items: { type: 'number' },
            },
          },
          required: ['exerciseType', 'question', 'correctAnswer'],
        },
      },
    },
    required: ['conversationIds', 'exercises'],
  },
};

const exerciseSchema = z.object({
  exerciseType: z.enum(['multiple_choice', 'fill_blank', 'translation']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  relatedVocabularyIds: z.array(z.number()).optional(),
}).refine((data) => {
  // For multiple_choice, options must be provided with at least 2 items
  if (data.exerciseType === 'multiple_choice') {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: "multiple_choice exercises MUST have at least 2 options",
});

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(), // Injected by handler from user context
  conversationIds: z.array(z.number()).min(1),
  exercises: z.array(exerciseSchema),
});

export async function generateExercises(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  exerciseIds: number[];
  message: string;
  exercises: {
    id: number;
    type: string;
    question: string;
  }[];
}> {
  const input = inputSchema.parse(args);

  // Use explicit userId if provided, otherwise use resolved userId from env auth, fallback to 1
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const isCombined = input.conversationIds.length > 1;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const exerciseIds: number[] = [];
    const savedExercises: { id: number; type: string; question: string }[] = [];

    for (const exercise of input.exercises) {
      const [result] = await connection.execute(
        `INSERT INTO exercises (
          conversation_id, user_id, exercise_type, question, options,
          correct_answer, explanation, related_vocabulary_ids,
          difficulty_level, is_combined, source_conversation_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          isCombined ? null : input.conversationIds[0],
          effectiveUserId,
          exercise.exerciseType,
          exercise.question,
          exercise.options ? JSON.stringify(exercise.options) : null,
          exercise.correctAnswer,
          exercise.explanation || null,
          exercise.relatedVocabularyIds ? JSON.stringify(exercise.relatedVocabularyIds) : null,
          'beginner',
          isCombined,
          isCombined ? JSON.stringify(input.conversationIds) : null,
        ]
      );

      const exerciseId = (result as any).insertId;
      exerciseIds.push(exerciseId);
      savedExercises.push({
        id: exerciseId,
        type: exercise.exerciseType,
        question: exercise.question,
      });
    }

    await connection.commit();
    connection.release();

    return {
      success: true,
      exerciseIds,
      message: `Successfully generated ${exerciseIds.length} exercises from ${input.conversationIds.length} conversation(s).`,
      exercises: savedExercises,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}
