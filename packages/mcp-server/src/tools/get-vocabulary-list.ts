import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getVocabularyListTool: Tool = {
  name: 'get_vocabulary_list',
  description: `Retrieve user's vocabulary list with optional filters.
Use this to show the user what vocabulary they have learned, or to review specific words.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (use 1 for default user)',
      },
      conversationId: {
        type: 'number',
        description: 'Filter by specific conversation ID',
      },
      difficultyLevel: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Filter by difficulty level',
      },
      partOfSpeech: {
        type: 'string',
        enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'],
        description: 'Filter by part of speech',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of items to return (default: 50)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional().default(1),
  conversationId: z.number().optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

interface VocabularyRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  vietnamese_word: string;
  english_word: string;
  phonetic: string | null;
  part_of_speech: string;
  example_sentence_vi: string | null;
  example_sentence_en: string | null;
  difficulty_level: string;
  mastery_level: number;
  times_practiced: number;
  created_at: Date;
}

export async function getVocabularyList(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  vocabulary: {
    id: number;
    vietnameseWord: string;
    englishWord: string;
    phonetic: string | null;
    partOfSpeech: string;
    exampleSentenceVi: string | null;
    exampleSentenceEn: string | null;
    difficultyLevel: string;
    masteryLevel: number;
    timesPracticed: number;
  }[];
  total: number;
}> {
  const input = inputSchema.parse(args);

  let sql = `SELECT * FROM vocabulary WHERE user_id = ?`;
  const params: any[] = [input.userId];

  if (input.conversationId) {
    sql += ` AND conversation_id = ?`;
    params.push(input.conversationId);
  }

  if (input.difficultyLevel) {
    sql += ` AND difficulty_level = ?`;
    params.push(input.difficultyLevel);
  }

  if (input.partOfSpeech) {
    sql += ` AND part_of_speech = ?`;
    params.push(input.partOfSpeech);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(input.limit);

  const rows = await db.query<VocabularyRow[]>(sql, params);

  return {
    success: true,
    vocabulary: rows.map((row) => ({
      id: row.id,
      vietnameseWord: row.vietnamese_word,
      englishWord: row.english_word,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      exampleSentenceVi: row.example_sentence_vi,
      exampleSentenceEn: row.example_sentence_en,
      difficultyLevel: row.difficulty_level,
      masteryLevel: row.mastery_level,
      timesPracticed: row.times_practiced,
    })),
    total: rows.length,
  };
}
