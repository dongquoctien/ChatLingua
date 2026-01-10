import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';
import { shouldWriteToV3, logDualWrite } from '../helpers/dual-write.js';

// Backend API URL for TTS generation
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Generate audio for listening/spelling exercises via backend TTS API
 */
async function generateAudioForExercise(
  exerciseType: string,
  exerciseData: Record<string, unknown> | undefined,
  question: string
): Promise<string | null> {
  // Only generate for types that need audio
  if (!['listening', 'spelling'].includes(exerciseType)) {
    return null;
  }

  let textToSpeak = '';
  let speed: 'slow' | 'normal' | 'fast' = 'normal';

  if (exerciseType === 'listening' && exerciseData) {
    // For listening exercises, use the transcript
    textToSpeak = (exerciseData.transcript as string) || '';
    // Use slower speed for dictation exercises
    if (exerciseData.questionType === 'dictation') {
      speed = 'slow';
    }
  } else if (exerciseType === 'spelling' && exerciseData) {
    // For spelling exercises, use the word
    textToSpeak = (exerciseData.word as string) || '';
    speed = 'slow'; // Slower for clarity
  }

  if (!textToSpeak) {
    console.warn(`No text to speak for ${exerciseType} exercise`);
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/tts/listening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textToSpeak,
        speed,
        accent: 'us',
      }),
    });

    if (!response.ok) {
      console.error(`TTS API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as { success?: boolean; url?: string };
    if (data.success && data.url) {
      // Return full URL for frontend access
      return `${BACKEND_URL}${data.url}`;
    }
    return null;
  } catch (error) {
    console.error('Failed to generate audio:', error);
    return null;
  }
}

export const generateExercisesTool: Tool = {
  name: 'generate_exercises',
  description: `[STEP 3 of 3] Generate practice exercises from conversation vocabulary.

This is the THIRD step of the learning flow:
1. analyze_conversation → Already completed
2. enrich_vocabulary → Already completed (or can skip)
3. generate_exercises (this tool) → Create practice exercises

This tool creates exercises to help Vietnamese users learn ENGLISH.
Supports 10 exercise types for comprehensive language learning.
Can run in PARALLEL with enrich_vocabulary (doesn't require enriched data).

=== EXERCISE TYPES ===

**Basic Types:**

1. **multiple_choice** - Various bilingual formats:
   - English question → Vietnamese options: "What is the meaning of 'contract'?" → ["Hợp đồng", "Hóa đơn", "Giấy kết hôn", "Tài liệu"]
   - Vietnamese question → English options: "Từ tiếng Anh nào có nghĩa 'Xin chào'?" → ["Hi", "Hello", "Goodbye", "Cả a và b đều đúng"]

2. **fill_blank** - Complete the English sentence:
   - "I signed a _____ with the company." (contract)

3. **translation** - Vietnamese to English:
   - Question: "Dịch sang tiếng Anh: 'Tôi ký hợp đồng hôm qua'"
   - Answer: "I signed a contract yesterday"

**Advanced Types (use exerciseData field):**

4. **sentence_building** - Arrange words in correct order:
   - exerciseData: {"words": ["signed", "I", "yesterday", "a", "contract"], "correctOrder": [1, 0, 4, 3, 2]}
   - correctAnswer: "I signed a contract yesterday"

5. **matching** - Match English words to Vietnamese translations:
   - exerciseData: {"pairs": [{"en": "contract", "vi": "hợp đồng"}, {"en": "sign", "vi": "ký"}, {"en": "company", "vi": "công ty"}]}
   - correctAnswer: JSON string of matched pairs

6. **spelling** - Listen and spell the word correctly:
   - exerciseData: {"word": "contract", "hint": "a formal agreement"}
   - audioUrl: URL to pronunciation audio (optional)
   - correctAnswer: "contract"

7. **listening** - Listen to audio and answer:
   - exerciseData: {"transcript": "I signed a contract yesterday", "questionType": "dictation" | "comprehension"}
   - audioUrl: URL to sentence audio
   - correctAnswer: transcript or comprehension answer

8. **error_correction** - Find and fix the error in the sentence:
   - exerciseData: {"errorPosition": 2, "errorWord": "signd"}
   - question: "Find the error: I signd a contract yesterday."
   - correctAnswer: "signed"

9. **verb_conjugation** - Conjugate verb to correct tense:
   - exerciseData: {"verb": "sign", "tense": "past simple", "subject": "I"}
   - question: "Conjugate 'sign' in past simple for 'I'"
   - correctAnswer: "signed"

10. **cloze** - Fill multiple blanks in a passage:
    - exerciseData: {"passage": "I [1] a [2] yesterday.", "blanks": [{"index": 1, "answer": "signed"}, {"index": 2, "answer": "contract"}]}
    - correctAnswer: JSON string of all answers

=== FIELD REQUIREMENTS BY TYPE ===

| Type | options | exerciseData | audioUrl |
|------|---------|--------------|----------|
| multiple_choice | REQUIRED (4+) | - | - |
| fill_blank | - | - | - |
| translation | - | - | - |
| sentence_building | - | REQUIRED | - |
| matching | - | REQUIRED | - |
| spelling | - | REQUIRED | AUTO-GEN |
| listening | - | REQUIRED | AUTO-GEN |
| error_correction | - | REQUIRED | - |
| verb_conjugation | - | REQUIRED | - |
| cloze | - | REQUIRED | - |

=== AUDIO AUTO-GENERATION ===

For **listening** and **spelling** exercises, audio is automatically generated
using Microsoft Edge neural TTS voices if audioUrl is not provided:
- Listening: Uses exerciseData.transcript as speech text
- Spelling: Uses exerciseData.word as speech text
- Dictation exercises use slower speed for clarity

The backend TTS API must be running at BACKEND_URL (default: http://localhost:3000).

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
              enum: [
                'multiple_choice', 'fill_blank', 'translation',
                'sentence_building', 'matching', 'spelling',
                'listening', 'error_correction', 'verb_conjugation', 'cloze'
              ],
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
            exerciseData: {
              type: 'object',
              description: 'Type-specific data (words, pairs, blanks, etc.)',
            },
            audioUrl: {
              type: 'string',
              description: 'Audio URL for listening/spelling exercises',
            },
            timeLimitSeconds: {
              type: 'number',
              description: 'Time limit in seconds (optional)',
            },
          },
          required: ['exerciseType', 'question', 'correctAnswer'],
        },
      },
    },
    required: ['conversationIds', 'exercises'],
  },
};

// All supported exercise types
const exerciseTypes = [
  'multiple_choice', 'fill_blank', 'translation',
  'sentence_building', 'matching', 'spelling',
  'listening', 'error_correction', 'verb_conjugation', 'cloze'
] as const;

// Types that require exerciseData
const typesRequiringData = [
  'sentence_building', 'matching', 'spelling',
  'listening', 'error_correction', 'verb_conjugation', 'cloze'
] as const;

const exerciseSchema = z.object({
  exerciseType: z.enum(exerciseTypes),
  question: z.string().min(1, "Question is required"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional(),
  relatedVocabularyIds: z.array(z.number()).optional(),
  exerciseData: z.record(z.unknown()).optional(),
  audioUrl: z.string().optional(),
  timeLimitSeconds: z.number().optional(),
}).refine((data) => {
  // For multiple_choice, options must be provided with at least 2 items
  if (data.exerciseType === 'multiple_choice') {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: "multiple_choice exercises MUST have at least 2 options",
}).refine((data) => {
  // For listening, audioUrl is now optional - will be auto-generated if not provided
  // Just ensure exerciseData.transcript exists for auto-generation
  if (data.exerciseType === 'listening' && !data.audioUrl) {
    return data.exerciseData && typeof (data.exerciseData as any).transcript === 'string';
  }
  return true;
}, {
  message: "listening exercises without audioUrl must have exerciseData.transcript for auto-generation",
}).refine((data) => {
  // For advanced types, exerciseData is required
  if ((typesRequiringData as readonly string[]).includes(data.exerciseType)) {
    return !!data.exerciseData;
  }
  return true;
}, {
  message: "This exercise type requires exerciseData field",
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
      // Auto-generate audio for listening/spelling exercises if not provided
      let audioUrl = exercise.audioUrl || null;
      if (!audioUrl && ['listening', 'spelling'].includes(exercise.exerciseType)) {
        try {
          const generatedUrl = await generateAudioForExercise(
            exercise.exerciseType,
            exercise.exerciseData,
            exercise.question
          );
          if (generatedUrl) {
            audioUrl = generatedUrl;
          }
        } catch (error) {
          console.warn('Failed to auto-generate audio, continuing without it:', error);
        }
      }

      const [result] = await connection.execute(
        `INSERT INTO exercises (
          conversation_id, user_id, exercise_type, question, options,
          correct_answer, explanation, related_vocabulary_ids,
          difficulty_level, is_combined, source_conversation_ids,
          exercise_data, audio_url, time_limit_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          exercise.exerciseData ? JSON.stringify(exercise.exerciseData) : null,
          audioUrl,
          exercise.timeLimitSeconds || null,
        ]
      );

      const exerciseId = (result as any).insertId;
      exerciseIds.push(exerciseId);
      savedExercises.push({
        id: exerciseId,
        type: exercise.exerciseType,
        question: exercise.question,
      });

      // Dual-write to V3 master_exercises if enabled
      if (shouldWriteToV3()) {
        await dualWriteExerciseToV3(
          connection,
          exercise,
          exercise.relatedVocabularyIds || [],
          audioUrl
        );
      }
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

/**
 * Dual-write exercise to V3 master_exercises table
 * Creates a master exercise that can be reused across users
 */
async function dualWriteExerciseToV3(
  connection: any,
  exercise: z.infer<typeof exerciseSchema>,
  relatedVocabularyIds: number[],
  audioUrl: string | null
): Promise<void> {
  try {
    logDualWrite('exercise_v3_start', { exerciseType: exercise.exerciseType });

    // Map V2 vocabulary IDs to V3 master_vocabulary IDs
    const masterVocabIds: number[] = [];
    for (const vocabId of relatedVocabularyIds) {
      const [v2Rows] = await connection.execute(
        `SELECT english_word, part_of_speech FROM vocabulary WHERE id = ?`,
        [vocabId]
      ) as [RowDataPacket[], any];

      if (v2Rows.length > 0) {
        const { english_word, part_of_speech } = v2Rows[0];
        const [masterRows] = await connection.execute(
          `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
          [english_word, part_of_speech]
        ) as [RowDataPacket[], any];
        if (masterRows.length > 0) {
          masterVocabIds.push(masterRows[0].id);
        }
      }
    }

    // Determine CEFR level based on exercise complexity (simple heuristic)
    let cefrLevel = 'B1';
    if (['multiple_choice', 'fill_blank'].includes(exercise.exerciseType)) {
      cefrLevel = 'A2';
    } else if (['cloze', 'listening', 'error_correction'].includes(exercise.exerciseType)) {
      cefrLevel = 'B2';
    }

    // Insert into master_exercises
    await connection.execute(
      `INSERT INTO master_exercises (
        exercise_type, question, correct_answer, options, explanation,
        exercise_data, audio_url, cefr_level, difficulty_level, category,
        related_vocabulary_ids, is_active, times_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 0)
      ON DUPLICATE KEY UPDATE times_used = times_used + 1`,
      [
        exercise.exerciseType,
        exercise.question,
        exercise.correctAnswer,
        exercise.options ? JSON.stringify(exercise.options) : null,
        exercise.explanation || null,
        exercise.exerciseData ? JSON.stringify(exercise.exerciseData) : null,
        audioUrl,
        cefrLevel,
        'intermediate',
        'conversation', // Category based on source
        masterVocabIds.length > 0 ? JSON.stringify(masterVocabIds) : null,
      ]
    );

    logDualWrite('exercise_v3_success', {
      exerciseType: exercise.exerciseType,
      masterVocabIds,
    });
  } catch (error) {
    // Log error but don't fail the V2 insert
    console.error('[MCP-DUAL-WRITE] Failed to write exercise to V3:', error);
    logDualWrite('exercise_v3_error', {
      exerciseType: exercise.exerciseType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
