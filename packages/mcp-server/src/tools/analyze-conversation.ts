import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

// Tool definition for MCP
export const analyzeConversationTool: Tool = {
  name: 'analyze_conversation',
  description: `Analyze Vietnamese text from user's daily conversation and extract English learning content.
This tool will:
1. Store the Vietnamese text as a conversation
2. Provide English translation
3. Extract vocabulary (Vietnamese word, English word, phonetic, part of speech, examples)
4. Identify grammar points (rules, explanations, examples)
5. Assess difficulty level

Use this when user tells you about their day in Vietnamese and wants to learn English from it.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user if not specified)',
      },
      vietnameseText: {
        type: 'string',
        description: 'The Vietnamese text to analyze (what the user told you about their day)',
      },
      englishTranslation: {
        type: 'string',
        description: 'English translation of the Vietnamese text',
      },
      vocabulary: {
        type: 'array',
        description: 'List of vocabulary items extracted from the conversation',
        items: {
          type: 'object',
          properties: {
            vietnameseWord: { type: 'string' },
            englishWord: { type: 'string' },
            phonetic: { type: 'string', description: 'IPA pronunciation' },
            partOfSpeech: {
              type: 'string',
              enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'],
            },
            exampleSentenceVi: { type: 'string' },
            exampleSentenceEn: { type: 'string' },
          },
          required: ['vietnameseWord', 'englishWord', 'partOfSpeech'],
        },
      },
      grammarPoints: {
        type: 'array',
        description: 'List of grammar points identified in the conversation',
        items: {
          type: 'object',
          properties: {
            grammarRule: { type: 'string', description: 'Name of the grammar rule' },
            explanation: { type: 'string', description: 'Explanation in Vietnamese' },
            exampleVi: { type: 'string' },
            exampleEn: { type: 'string' },
            category: { type: 'string', description: 'Category like tense, article, preposition' },
          },
          required: ['grammarRule', 'explanation'],
        },
      },
      topic: {
        type: 'string',
        description: 'Detected topic (e.g., daily life, work, travel, food)',
      },
      difficultyLevel: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Assessed difficulty level',
      },
    },
    required: ['vietnameseText', 'englishTranslation', 'vocabulary', 'grammarPoints'],
  },
};

// Input validation schema
const inputSchema = z.object({
  userId: z.number().optional().default(1),
  vietnameseText: z.string().min(1),
  englishTranslation: z.string().min(1),
  vocabulary: z.array(z.object({
    vietnameseWord: z.string(),
    englishWord: z.string(),
    phonetic: z.string().optional(),
    partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']),
    exampleSentenceVi: z.string().optional(),
    exampleSentenceEn: z.string().optional(),
  })),
  grammarPoints: z.array(z.object({
    grammarRule: z.string(),
    explanation: z.string(),
    exampleVi: z.string().optional(),
    exampleEn: z.string().optional(),
    category: z.string().optional(),
  })),
  topic: z.string().optional().default('general'),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
});

export async function analyzeConversation(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  conversationId: number;
  message: string;
  summary: {
    vocabularyCount: number;
    grammarPointsCount: number;
    difficultyLevel: string;
    topic: string;
  };
}> {
  // Validate input
  const input = inputSchema.parse(args);

  // Start transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Insert conversation
    const [conversationResult] = await connection.execute(
      `INSERT INTO conversations (user_id, vietnamese_text, english_translation, topic, difficulty_level, ai_analysis)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.vietnameseText,
        input.englishTranslation,
        input.topic,
        input.difficultyLevel,
        JSON.stringify({
          vocabularyCount: input.vocabulary.length,
          grammarPointsCount: input.grammarPoints.length,
          analyzedAt: new Date().toISOString(),
        }),
      ]
    );

    const conversationId = (conversationResult as any).insertId;

    // 2. Insert vocabulary items
    for (const vocab of input.vocabulary) {
      await connection.execute(
        `INSERT INTO vocabulary (conversation_id, user_id, vietnamese_word, english_word, phonetic, part_of_speech, example_sentence_vi, example_sentence_en, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationId,
          input.userId,
          vocab.vietnameseWord,
          vocab.englishWord,
          vocab.phonetic || null,
          vocab.partOfSpeech,
          vocab.exampleSentenceVi || null,
          vocab.exampleSentenceEn || null,
          input.difficultyLevel,
        ]
      );
    }

    // 3. Insert grammar points
    for (const grammar of input.grammarPoints) {
      await connection.execute(
        `INSERT INTO grammar_points (conversation_id, user_id, grammar_rule, explanation, example_vi, example_en, category, difficulty_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationId,
          input.userId,
          grammar.grammarRule,
          grammar.explanation,
          grammar.exampleVi || null,
          grammar.exampleEn || null,
          grammar.category || null,
          input.difficultyLevel,
        ]
      );
    }

    // 4. Update user statistics
    await connection.execute(
      `INSERT INTO user_statistics (user_id, total_conversations, total_vocabulary_learned, total_grammar_points, last_activity_date)
       VALUES (?, 1, ?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE
         total_conversations = total_conversations + 1,
         total_vocabulary_learned = total_vocabulary_learned + ?,
         total_grammar_points = total_grammar_points + ?,
         last_activity_date = CURDATE()`,
      [
        input.userId,
        input.vocabulary.length,
        input.grammarPoints.length,
        input.vocabulary.length,
        input.grammarPoints.length,
      ]
    );

    // 5. Update daily activity log
    await connection.execute(
      `INSERT INTO daily_activity_log (user_id, activity_date, conversations_count, vocabulary_added)
       VALUES (?, CURDATE(), 1, ?)
       ON DUPLICATE KEY UPDATE
         conversations_count = conversations_count + 1,
         vocabulary_added = vocabulary_added + ?`,
      [input.userId, input.vocabulary.length, input.vocabulary.length]
    );

    await connection.commit();
    connection.release();

    return {
      success: true,
      conversationId,
      message: `Successfully analyzed conversation and saved ${input.vocabulary.length} vocabulary items and ${input.grammarPoints.length} grammar points.`,
      summary: {
        vocabularyCount: input.vocabulary.length,
        grammarPointsCount: input.grammarPoints.length,
        difficultyLevel: input.difficultyLevel,
        topic: input.topic,
      },
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}
