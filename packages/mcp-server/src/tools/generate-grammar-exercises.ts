import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { shouldWriteToV3, logDualWrite } from '../helpers/dual-write.js';

export const generateGrammarExercisesTool: Tool = {
  name: 'generate_grammar_exercises',
  description: `Generate grammar-focused exercises for Vietnamese users learning English.

This tool creates exercises specifically for grammar practice, linked to grammar points
from conversations. Use this when you want to create exercises that focus on grammar
rules rather than vocabulary.

=== GRAMMAR EXERCISE TYPES ===

1. **error_correction** - Find and fix grammar errors:
   - question: "Find the error: She don't like coffee."
   - exerciseData: {"errorPosition": 1, "errorWord": "don't", "errorType": "subject-verb agreement"}
   - correctAnswer: "doesn't"

2. **verb_conjugation** - Conjugate verbs correctly:
   - question: "Conjugate 'go' in present perfect for 'She'"
   - exerciseData: {"verb": "go", "tense": "present perfect", "subject": "She"}
   - correctAnswer: "has gone"

3. **tense_selection** - Choose the correct tense:
   - question: "Yesterday, I _____ (go) to the market."
   - options: ["go", "went", "gone", "going"]
   - correctAnswer: "went"

4. **article_usage** - Choose correct article (a/an/the/none):
   - question: "I saw _____ elephant at the zoo."
   - options: ["a", "an", "the", "-"]
   - correctAnswer: "an"

5. **preposition_fill** - Fill in the correct preposition:
   - question: "She is good _____ mathematics."
   - options: ["at", "in", "on", "with"]
   - correctAnswer: "at"

=== EXAMPLE USAGE ===

{
  "grammarPointIds": [1, 2],
  "exercises": [
    {
      "exerciseType": "verb_conjugation",
      "question": "Conjugate 'be' in past simple for 'They'",
      "correctAnswer": "were",
      "exerciseData": {"verb": "be", "tense": "past simple", "subject": "They"},
      "explanation": "'They' requires 'were' in past simple (plural subject)",
      "category": "verb tenses"
    }
  ]
}`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional, uses authenticated user)',
      },
      grammarPointIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'Grammar point IDs to link exercises to (from analyze_conversation)',
      },
      exercises: {
        type: 'array',
        description: 'List of grammar exercises to create',
        items: {
          type: 'object',
          properties: {
            exerciseType: {
              type: 'string',
              enum: ['error_correction', 'verb_conjugation', 'tense_selection', 'article_usage', 'preposition_fill'],
            },
            question: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Options for selection-based exercises',
            },
            correctAnswer: { type: 'string' },
            explanation: { type: 'string' },
            exerciseData: {
              type: 'object',
              description: 'Type-specific data (verb, tense, errorPosition, etc.)',
            },
            category: {
              type: 'string',
              description: 'Grammar category (e.g., "verb tenses", "articles", "prepositions")',
            },
          },
          required: ['exerciseType', 'question', 'correctAnswer'],
        },
      },
    },
    required: ['exercises'],
  },
};

const grammarExerciseTypes = [
  'error_correction', 'verb_conjugation', 'tense_selection',
  'article_usage', 'preposition_fill'
] as const;

const exerciseSchema = z.object({
  exerciseType: z.enum(grammarExerciseTypes),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  exerciseData: z.record(z.unknown()).optional(),
  category: z.string().optional(),
}).refine((data) => {
  // For selection-based types, options are required
  const selectionTypes = ['tense_selection', 'article_usage', 'preposition_fill'];
  if (selectionTypes.includes(data.exerciseType)) {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: "Selection-based exercises MUST have at least 2 options",
});

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  grammarPointIds: z.array(z.number()).optional(),
  exercises: z.array(exerciseSchema).min(1),
});

export async function generateGrammarExercises(
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
    category?: string;
  }[];
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const exerciseIds: number[] = [];
    const savedExercises: { id: number; type: string; question: string; category?: string }[] = [];

    for (const exercise of input.exercises) {
      // Get grammar_point_id from the first linked grammar point (if any)
      const grammarPointId = input.grammarPointIds && input.grammarPointIds.length > 0
        ? input.grammarPointIds[0]
        : null;

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO grammar_exercises (
          user_id, grammar_point_id, exercise_type, question, options,
          correct_answer, explanation, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          effectiveUserId,
          grammarPointId,
          exercise.exerciseType,
          exercise.question,
          exercise.options ? JSON.stringify(exercise.options) : null,
          exercise.correctAnswer,
          exercise.explanation || null,
          exercise.category || null,
        ]
      );

      const exerciseId = result.insertId;
      exerciseIds.push(exerciseId);
      savedExercises.push({
        id: exerciseId,
        type: exercise.exerciseType,
        question: exercise.question,
        category: exercise.category,
      });

      // Dual-write to V3 master_exercises if enabled
      if (shouldWriteToV3()) {
        await dualWriteGrammarExerciseToV3(
          connection,
          exercise,
          input.grammarPointIds || []
        );
      }
    }

    await connection.commit();
    connection.release();

    return {
      success: true,
      exerciseIds,
      message: `Successfully created ${exerciseIds.length} grammar exercise(s).`,
      exercises: savedExercises,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Dual-write grammar exercise to V3 master_exercises table
 * Creates a master exercise that can be reused across users
 */
async function dualWriteGrammarExerciseToV3(
  connection: any,
  exercise: z.infer<typeof exerciseSchema>,
  grammarPointIds: number[]
): Promise<void> {
  try {
    logDualWrite('grammar_exercise_v3_start', { exerciseType: exercise.exerciseType });

    // Map V2 grammar_point IDs to V3 master_grammar IDs
    const masterGrammarIds: number[] = [];
    for (const gpId of grammarPointIds) {
      const [v2Rows] = await connection.execute(
        `SELECT grammar_rule, category FROM grammar_points WHERE id = ?`,
        [gpId]
      ) as [RowDataPacket[], any];

      if (v2Rows.length > 0) {
        const { grammar_rule, category } = v2Rows[0];
        const [masterRows] = await connection.execute(
          `SELECT id FROM master_grammar WHERE grammar_rule = ? AND category = ?`,
          [grammar_rule, category]
        ) as [RowDataPacket[], any];
        if (masterRows.length > 0) {
          masterGrammarIds.push(masterRows[0].id);
        }
      }
    }

    // Determine CEFR level based on exercise complexity (simple heuristic)
    let cefrLevel = 'B1';
    if (['article_usage', 'preposition_fill'].includes(exercise.exerciseType)) {
      cefrLevel = 'A2';
    } else if (['error_correction'].includes(exercise.exerciseType)) {
      cefrLevel = 'B2';
    }

    // Insert into master_exercises
    await connection.execute(
      `INSERT INTO master_exercises (
        exercise_type, question, correct_answer, options, explanation,
        exercise_data, cefr_level, difficulty_level, category,
        related_grammar_ids, is_active, times_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 0)
      ON DUPLICATE KEY UPDATE times_used = times_used + 1`,
      [
        exercise.exerciseType,
        exercise.question,
        exercise.correctAnswer,
        exercise.options ? JSON.stringify(exercise.options) : null,
        exercise.explanation || null,
        exercise.exerciseData ? JSON.stringify(exercise.exerciseData) : null,
        cefrLevel,
        'intermediate',
        exercise.category || 'grammar',
        masterGrammarIds.length > 0 ? JSON.stringify(masterGrammarIds) : null,
      ]
    );

    logDualWrite('grammar_exercise_v3_success', {
      exerciseType: exercise.exerciseType,
      masterGrammarIds,
    });
  } catch (error) {
    // Log error but don't fail the V2 insert
    console.error('[MCP-DUAL-WRITE] Failed to write grammar exercise to V3:', error);
    logDualWrite('grammar_exercise_v3_error', {
      exerciseType: exercise.exerciseType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
