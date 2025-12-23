import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';

export const getVocabularyListTool: Tool = {
  name: 'get_vocabulary_list',
  description: `Retrieve user's vocabulary list with optional filters.
Use this to show the user what vocabulary they have learned, or to review specific words.

Set includeDictionaryData=true to get full dictionary data (wordFamily, synonyms, extraExamples, collocations, definitions) - useful for generating exercises.`,
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
      includeDictionaryData: {
        type: 'boolean',
        description: 'Include full dictionary data (wordFamily, synonyms, extraExamples, collocations, definitions). Default: false',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(), // Injected by handler from user context
  conversationId: z.number().optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  includeDictionaryData: z.boolean().optional().default(false),
});

interface VocabularyRow extends RowDataPacket {
  id: number;
  vietnamese_word: string;
  english_word: string;
  phonetic: string | null;
  part_of_speech: string;
  difficulty_level: string;
  mastery_level: number;
  times_practiced: number;
  created_at: Date;
  cefr_level: string | null;
  // From vocabulary_contexts join (when filtering by conversation)
  context_vietnamese_word?: string;
  example_sentence_vi?: string | null;
  example_sentence_en?: string | null;
  // Dictionary fields (when includeDictionaryData=true)
  pronunciation_uk?: string | null;
  pronunciation_us?: string | null;
  word_forms?: string | null;
  definitions?: string | null;
  word_family?: string | null;
  synonyms?: string | null;
  antonyms?: string | null;
  collocations?: string | null;
  grammar_info?: string | null;
  usage_notes?: string | null;
  topics?: string | null;
  extra_examples?: string | null;
}

// Dictionary data type for when includeDictionaryData=true
interface DictionaryData {
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  wordForms: Record<string, string> | null;
  definitions: Array<{
    senseId?: number;
    definition: string;
    definitionVi: string;
    grammar?: string;
    register?: string;
    examples: Array<{ en: string; vi: string }>;
    patterns?: string[];
  }> | null;
  wordFamily: Record<string, string[]> | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  collocations: Record<string, string[]> | null;
  grammarInfo: Record<string, unknown> | null;
  usageNotes: string | null;
  topics: Array<{ name: string; level: string }> | null;
  extraExamples: Array<{ en: string; vi: string }> | null;
}

// Base vocabulary item
interface VocabularyItem {
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
  cefrLevel: string | null;
}

// Vocabulary item with dictionary data
type VocabularyItemWithDictionary = VocabularyItem & DictionaryData;

export async function getVocabularyList(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  vocabulary: (VocabularyItem | VocabularyItemWithDictionary)[];
  total: number;
}> {
  const input = inputSchema.parse(args);

  // Use explicit userId if provided, otherwise use resolved userId from env auth, fallback to 1
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;
  const params: any[] = [];

  let sql: string;

  if (input.conversationId) {
    // When filtering by conversation, join with vocabulary_contexts to get context-specific data
    sql = `
      SELECT v.*,
             vc.vietnamese_word as context_vietnamese_word,
             vc.example_sentence_vi,
             vc.example_sentence_en
      FROM vocabulary v
      INNER JOIN vocabulary_contexts vc ON v.id = vc.vocabulary_id
      WHERE v.user_id = ? AND vc.conversation_id = ?
    `;
    params.push(effectiveUserId, input.conversationId);
  } else {
    // Without conversation filter, just get vocabulary
    sql = `SELECT * FROM vocabulary WHERE user_id = ?`;
    params.push(effectiveUserId);
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

  // Helper to safely handle JSON - MySQL2 returns JSON columns as parsed objects
  const parseJson = <T>(value: unknown): T | null => {
    if (value === null || value === undefined) return null;
    // If already an object (MySQL2 parsed it), return as-is
    if (typeof value === 'object') return value as T;
    // If string, try to parse
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Map rows to response
  const vocabulary = rows.map((row) => {
    // Base vocabulary item (always included)
    const baseItem: VocabularyItem = {
      id: row.id,
      vietnameseWord: row.context_vietnamese_word || row.vietnamese_word,
      englishWord: row.english_word,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      exampleSentenceVi: row.example_sentence_vi || null,
      exampleSentenceEn: row.example_sentence_en || null,
      difficultyLevel: row.difficulty_level,
      masteryLevel: row.mastery_level,
      timesPracticed: row.times_practiced,
      cefrLevel: row.cefr_level,
    };

    // If includeDictionaryData is true, add dictionary fields
    if (input.includeDictionaryData) {
      const dictionaryData: DictionaryData = {
        pronunciationUk: row.pronunciation_uk || null,
        pronunciationUs: row.pronunciation_us || null,
        wordForms: parseJson(row.word_forms),
        definitions: parseJson(row.definitions),
        wordFamily: parseJson(row.word_family),
        synonyms: parseJson(row.synonyms),
        antonyms: parseJson(row.antonyms),
        collocations: parseJson(row.collocations),
        grammarInfo: parseJson(row.grammar_info),
        usageNotes: row.usage_notes || null,
        topics: parseJson(row.topics),
        extraExamples: parseJson(row.extra_examples),
      };
      return { ...baseItem, ...dictionaryData } as VocabularyItemWithDictionary;
    }

    return baseItem;
  });

  return {
    success: true,
    vocabulary,
    total: rows.length,
  };
}
