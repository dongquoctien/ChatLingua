import pool from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

interface VocabularyRow extends RowDataPacket {
  id: number;
  user_id: number;
  vietnamese_word: string;
  english_word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  difficulty_level: string;
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: Date | null;
  created_at: Date;
  // Dictionary fields
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  audio_uk_url: string | null;
  audio_us_url: string | null;
  word_forms: string | null;
  definitions: string | null;
  word_family: string | null;
  synonyms: string | null;
  antonyms: string | null;
  collocations: string | null;
  idioms: string | null;
  usage_notes: string | null;
  grammar_info: string | null;
  register: string | null;
  extra_examples: string | null;
  frequency_rank: number | null;
  cefr_level: string | null;
  topics: string | null;
  word_origin: string | null;
  see_also: string | null;
}

interface VocabularyContextRow extends RowDataPacket {
  id: number;
  vocabulary_id: number;
  conversation_id: number;
  vietnamese_word: string;
  example_sentence_vi: string | null;
  example_sentence_en: string | null;
  created_at: Date;
}

export interface VocabularyContext {
  id: number;
  vocabularyId: number;
  conversationId: number;
  vietnameseWord: string;
  exampleVi: string | null;
  exampleEn: string | null;
  createdAt: Date;
}

export interface VocabularyItem {
  id: number;
  vietnameseWord: string;
  englishWord: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  difficultyLevel: string;
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt: Date | null;
  createdAt: Date;
  // Dictionary fields (optional for list view)
  cefrLevel?: string | null;
  definitionCount?: number;
  exampleCount?: number;
  // Contexts (optional)
  contexts?: VocabularyContext[];
}

export interface DictionaryEntry extends VocabularyItem {
  // Pronunciation
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  audioUkUrl: string | null;
  audioUsUrl: string | null;
  // Word forms and definitions
  wordForms: Record<string, string> | null;
  definitions: Array<{
    senseId: number;
    definition: string;
    definitionVi: string;
    grammar?: string;
    register?: string;
    examples: Array<{ en: string; vi: string }>;
    patterns?: string[];
    topics?: Array<{ name: string; level: string }>;
  }> | null;
  // Related vocabulary
  wordFamily: Record<string, string[]> | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  // Usage
  collocations: Record<string, string[]> | null;
  idioms: Array<{ phrase: string; meaning: string; meaningVi: string }> | null;
  usageNotes: string | null;
  extraExamples: Array<{ en: string; vi: string }> | null;
  // Grammar and classification
  grammarInfo: Record<string, unknown> | null;
  register: string | null;
  frequencyRank: number | null;
  cefrLevel: string | null;
  topics: Array<{ name: string; level: string }> | null;
  wordOrigin: string | null;
  seeAlso: string[] | null;
  // Computed
  definitionCount: number;
  exampleCount: number;
  // Contexts
  contexts: VocabularyContext[];
}

export interface VocabularyFilters {
  difficultyLevel?: string;
  partOfSpeech?: string;
  masteryLevel?: number;
  cefrLevel?: string;
  searchTerm?: string;
}

export class VocabularyService {
  async getVocabulary(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: VocabularyFilters = {}
  ): Promise<{ data: VocabularyItem[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['v.user_id = ?'];
    const params: (string | number)[] = [userId];

    if (filters.difficultyLevel) {
      conditions.push('v.difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.partOfSpeech) {
      conditions.push('v.part_of_speech = ?');
      params.push(filters.partOfSpeech);
    }

    if (filters.masteryLevel !== undefined) {
      conditions.push('v.mastery_level = ?');
      params.push(filters.masteryLevel);
    }

    if (filters.cefrLevel) {
      conditions.push('v.cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.searchTerm) {
      // Search in both vocabulary and contexts
      conditions.push(`(
        v.english_word LIKE ? OR
        v.vietnamese_word LIKE ? OR
        EXISTS (SELECT 1 FROM vocabulary_contexts vc WHERE vc.vocabulary_id = v.id AND vc.vietnamese_word LIKE ?)
      )`);
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM vocabulary v WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get vocabulary with pagination
    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
              v.part_of_speech, v.difficulty_level, v.mastery_level,
              v.times_practiced, v.last_practiced_at, v.created_at,
              v.cefr_level, v.definitions
       FROM vocabulary v
       WHERE ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const data = rows.map(row => this.mapToVocabularyItem(row));

    return { data, total, page, limit };
  }

  async getVocabularyById(
    userId: number,
    vocabularyId: number
  ): Promise<VocabularyItem | null> {
    const [rows] = await pool.execute<VocabularyRow[]>(
      `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
              v.part_of_speech, v.difficulty_level, v.mastery_level,
              v.times_practiced, v.last_practiced_at, v.created_at,
              v.cefr_level, v.definitions
       FROM vocabulary v
       WHERE v.id = ? AND v.user_id = ?`,
      [vocabularyId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToVocabularyItem(rows[0]);
  }

  // Get full dictionary entry with all fields
  async getDictionaryEntry(
    userId: number,
    vocabularyId: number
  ): Promise<DictionaryEntry | null> {
    const [rows] = await pool.execute<VocabularyRow[]>(
      `SELECT * FROM vocabulary v WHERE v.id = ? AND v.user_id = ?`,
      [vocabularyId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    // Get contexts for this vocabulary
    const contexts = await this.getVocabularyContexts(vocabularyId);

    return this.mapToDictionaryEntry(rows[0], contexts);
  }

  // Get dictionary entry by English word
  async getDictionaryByWord(
    userId: number,
    word: string
  ): Promise<DictionaryEntry | null> {
    const [rows] = await pool.execute<VocabularyRow[]>(
      `SELECT * FROM vocabulary v WHERE v.english_word = ? AND v.user_id = ? LIMIT 1`,
      [word, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const contexts = await this.getVocabularyContexts(rows[0].id);

    return this.mapToDictionaryEntry(rows[0], contexts);
  }

  // Get vocabulary contexts (conversation-specific data)
  async getVocabularyContexts(vocabularyId: number): Promise<VocabularyContext[]> {
    const [rows] = await pool.execute<VocabularyContextRow[]>(
      `SELECT id, vocabulary_id, conversation_id, vietnamese_word,
              example_sentence_vi, example_sentence_en, created_at
       FROM vocabulary_contexts
       WHERE vocabulary_id = ?
       ORDER BY created_at DESC`,
      [vocabularyId]
    );

    return rows.map(row => ({
      id: row.id,
      vocabularyId: row.vocabulary_id,
      conversationId: row.conversation_id,
      vietnameseWord: row.vietnamese_word,
      exampleVi: row.example_sentence_vi,
      exampleEn: row.example_sentence_en,
      createdAt: row.created_at,
    }));
  }

  // Search vocabulary with advanced filters
  async searchVocabulary(
    userId: number,
    query: string,
    options: {
      partOfSpeech?: string;
      cefrLevel?: string;
      limit?: number;
    } = {}
  ): Promise<VocabularyItem[]> {
    const limit = options.limit || 20;
    const conditions: string[] = ['v.user_id = ?'];
    const params: (string | number)[] = [userId];

    // Search in english_word, vietnamese_word, and definitions
    conditions.push(`(
      v.english_word LIKE ? OR
      v.vietnamese_word LIKE ? OR
      v.definitions LIKE ? OR
      EXISTS (SELECT 1 FROM vocabulary_contexts vc WHERE vc.vocabulary_id = v.id AND vc.vietnamese_word LIKE ?)
    )`);
    const searchPattern = `%${query}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);

    if (options.partOfSpeech) {
      conditions.push('v.part_of_speech = ?');
      params.push(options.partOfSpeech);
    }

    if (options.cefrLevel) {
      conditions.push('v.cefr_level = ?');
      params.push(options.cefrLevel);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
              v.part_of_speech, v.difficulty_level, v.mastery_level,
              v.times_practiced, v.last_practiced_at, v.created_at,
              v.cefr_level, v.definitions
       FROM vocabulary v
       WHERE ${whereClause}
       ORDER BY
         CASE WHEN v.english_word = ? THEN 0
              WHEN v.english_word LIKE ? THEN 1
              ELSE 2 END,
         v.english_word
       LIMIT ?`,
      [...params, query, `${query}%`, Number(limit)]
    );

    return rows.map(row => this.mapToVocabularyItem(row));
  }

  // Get related words (word family members, synonyms)
  async getRelatedWords(
    userId: number,
    vocabularyId: number
  ): Promise<{
    wordFamily: VocabularyItem[];
    synonyms: VocabularyItem[];
    seeAlso: VocabularyItem[];
  }> {
    const entry = await this.getDictionaryEntry(userId, vocabularyId);
    if (!entry) {
      return { wordFamily: [], synonyms: [], seeAlso: [] };
    }

    const results = {
      wordFamily: [] as VocabularyItem[],
      synonyms: [] as VocabularyItem[],
      seeAlso: [] as VocabularyItem[],
    };

    // Find word family members
    if (entry.wordFamily) {
      const familyWords = Object.values(entry.wordFamily).flat();
      if (familyWords.length > 0) {
        const placeholders = familyWords.map(() => '?').join(',');
        const [rows] = await pool.query<VocabularyRow[]>(
          `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
                  v.part_of_speech, v.difficulty_level, v.mastery_level,
                  v.times_practiced, v.last_practiced_at, v.created_at,
                  v.cefr_level, v.definitions
           FROM vocabulary v
           WHERE v.user_id = ? AND v.english_word IN (${placeholders}) AND v.id != ?`,
          [userId, ...familyWords, vocabularyId]
        );
        results.wordFamily = rows.map(row => this.mapToVocabularyItem(row));
      }
    }

    // Find synonyms
    if (entry.synonyms && entry.synonyms.length > 0) {
      const placeholders = entry.synonyms.map(() => '?').join(',');
      const [rows] = await pool.query<VocabularyRow[]>(
        `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
                v.part_of_speech, v.difficulty_level, v.mastery_level,
                v.times_practiced, v.last_practiced_at, v.created_at,
                v.cefr_level, v.definitions
         FROM vocabulary v
         WHERE v.user_id = ? AND v.english_word IN (${placeholders})`,
        [userId, ...entry.synonyms]
      );
      results.synonyms = rows.map(row => this.mapToVocabularyItem(row));
    }

    // Find see also
    if (entry.seeAlso && entry.seeAlso.length > 0) {
      const placeholders = entry.seeAlso.map(() => '?').join(',');
      const [rows] = await pool.query<VocabularyRow[]>(
        `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
                v.part_of_speech, v.difficulty_level, v.mastery_level,
                v.times_practiced, v.last_practiced_at, v.created_at,
                v.cefr_level, v.definitions
         FROM vocabulary v
         WHERE v.user_id = ? AND v.english_word IN (${placeholders})`,
        [userId, ...entry.seeAlso]
      );
      results.seeAlso = rows.map(row => this.mapToVocabularyItem(row));
    }

    return results;
  }

  async getVocabularyForReview(
    userId: number,
    limit: number = 10
  ): Promise<VocabularyItem[]> {
    // Get vocabulary that needs review (low mastery or not reviewed recently)
    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT v.id, v.vietnamese_word, v.english_word, v.phonetic,
              v.part_of_speech, v.difficulty_level, v.mastery_level,
              v.times_practiced, v.last_practiced_at, v.created_at,
              v.cefr_level, v.definitions
       FROM vocabulary v
       WHERE v.user_id = ?
       AND (v.mastery_level < 80 OR v.last_practiced_at IS NULL OR v.last_practiced_at < DATE_SUB(NOW(), INTERVAL 1 DAY))
       ORDER BY v.mastery_level ASC, v.last_practiced_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    return rows.map(row => this.mapToVocabularyItem(row));
  }

  async updateMastery(
    userId: number,
    vocabularyId: number,
    correct: boolean
  ): Promise<VocabularyItem | null> {
    // Verify ownership
    const vocabulary = await this.getVocabularyById(userId, vocabularyId);
    if (!vocabulary) {
      return null;
    }

    // Update mastery level (0-100 scale)
    const change = correct ? 10 : -5;
    const newMasteryLevel = Math.max(0, Math.min(100, vocabulary.masteryLevel + change));

    await pool.execute(
      `UPDATE vocabulary
       SET mastery_level = ?, times_practiced = times_practiced + 1, last_practiced_at = NOW()
       WHERE id = ?`,
      [newMasteryLevel, vocabularyId]
    );

    return this.getVocabularyById(userId, vocabularyId);
  }

  // UPSERT vocabulary - insert or update if exists
  async upsertVocabulary(
    userId: number,
    englishWord: string,
    partOfSpeech: string,
    data: {
      vietnameseWord: string;
      phonetic?: string | null;
      difficultyLevel?: string;
      pronunciationUk?: string | null;
      pronunciationUs?: string | null;
      wordForms?: Record<string, string> | null;
      definitions?: unknown[] | null;
      wordFamily?: Record<string, string[]> | null;
      synonyms?: string[] | null;
      antonyms?: string[] | null;
      collocations?: Record<string, string[]> | null;
      grammarInfo?: Record<string, unknown> | null;
      register?: string | null;
      usageNotes?: string | null;
      cefrLevel?: string | null;
      topics?: unknown[] | null;
      extraExamples?: unknown[] | null;
    }
  ): Promise<number> {
    // Check if vocabulary already exists
    const [existing] = await pool.execute<VocabularyRow[]>(
      `SELECT id FROM vocabulary
       WHERE user_id = ? AND english_word = ? AND part_of_speech = ?`,
      [userId, englishWord, partOfSpeech]
    );

    if (existing.length > 0) {
      // Update existing - merge data (keep richer data)
      const vocabId = existing[0].id;
      await pool.execute(
        `UPDATE vocabulary SET
          vietnamese_word = COALESCE(?, vietnamese_word),
          phonetic = COALESCE(?, phonetic),
          pronunciation_uk = COALESCE(?, pronunciation_uk),
          pronunciation_us = COALESCE(?, pronunciation_us),
          word_forms = COALESCE(?, word_forms),
          definitions = COALESCE(?, definitions),
          word_family = COALESCE(?, word_family),
          synonyms = COALESCE(?, synonyms),
          antonyms = COALESCE(?, antonyms),
          collocations = COALESCE(?, collocations),
          grammar_info = COALESCE(?, grammar_info),
          register = COALESCE(?, register),
          usage_notes = COALESCE(?, usage_notes),
          cefr_level = COALESCE(?, cefr_level),
          topics = COALESCE(?, topics),
          extra_examples = COALESCE(?, extra_examples)
        WHERE id = ?`,
        [
          data.vietnameseWord,
          data.phonetic || data.pronunciationUk,
          data.pronunciationUk,
          data.pronunciationUs,
          data.wordForms ? JSON.stringify(data.wordForms) : null,
          data.definitions ? JSON.stringify(data.definitions) : null,
          data.wordFamily ? JSON.stringify(data.wordFamily) : null,
          data.synonyms ? JSON.stringify(data.synonyms) : null,
          data.antonyms ? JSON.stringify(data.antonyms) : null,
          data.collocations ? JSON.stringify(data.collocations) : null,
          data.grammarInfo ? JSON.stringify(data.grammarInfo) : null,
          data.register || 'neutral',
          data.usageNotes,
          data.cefrLevel,
          data.topics ? JSON.stringify(data.topics) : null,
          data.extraExamples ? JSON.stringify(data.extraExamples) : null,
          vocabId,
        ]
      );
      return vocabId;
    } else {
      // Insert new vocabulary
      const [result] = await pool.execute(
        `INSERT INTO vocabulary (
          user_id, english_word, part_of_speech, vietnamese_word, phonetic,
          difficulty_level, pronunciation_uk, pronunciation_us,
          word_forms, definitions, word_family, synonyms, antonyms,
          collocations, grammar_info, register, usage_notes, cefr_level,
          topics, extra_examples
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          englishWord,
          partOfSpeech,
          data.vietnameseWord,
          data.phonetic || data.pronunciationUk,
          data.difficultyLevel || 'beginner',
          data.pronunciationUk,
          data.pronunciationUs,
          data.wordForms ? JSON.stringify(data.wordForms) : null,
          data.definitions ? JSON.stringify(data.definitions) : null,
          data.wordFamily ? JSON.stringify(data.wordFamily) : null,
          data.synonyms ? JSON.stringify(data.synonyms) : null,
          data.antonyms ? JSON.stringify(data.antonyms) : null,
          data.collocations ? JSON.stringify(data.collocations) : null,
          data.grammarInfo ? JSON.stringify(data.grammarInfo) : null,
          data.register || 'neutral',
          data.usageNotes,
          data.cefrLevel,
          data.topics ? JSON.stringify(data.topics) : null,
          data.extraExamples ? JSON.stringify(data.extraExamples) : null,
        ]
      );
      return (result as { insertId: number }).insertId;
    }
  }

  // Add context for a vocabulary item
  async addVocabularyContext(
    vocabularyId: number,
    conversationId: number,
    vietnameseWord: string,
    exampleVi?: string | null,
    exampleEn?: string | null
  ): Promise<void> {
    await pool.execute(
      `INSERT INTO vocabulary_contexts
        (vocabulary_id, conversation_id, vietnamese_word, example_sentence_vi, example_sentence_en)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         vietnamese_word = VALUES(vietnamese_word),
         example_sentence_vi = COALESCE(VALUES(example_sentence_vi), example_sentence_vi),
         example_sentence_en = COALESCE(VALUES(example_sentence_en), example_sentence_en)`,
      [vocabularyId, conversationId, vietnameseWord, exampleVi, exampleEn]
    );
  }

  private mapToVocabularyItem(row: VocabularyRow): VocabularyItem {
    // Parse definitions to get counts
    let definitionCount = 0;
    let exampleCount = 0;

    if (row.definitions) {
      try {
        const defs = JSON.parse(row.definitions);
        if (Array.isArray(defs)) {
          definitionCount = defs.length;
          exampleCount = defs.reduce((count: number, def: { examples?: unknown[] }) => {
            return count + (def.examples?.length || 0);
          }, 0);
        }
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: row.id,
      vietnameseWord: row.vietnamese_word,
      englishWord: row.english_word,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      difficultyLevel: row.difficulty_level,
      masteryLevel: row.mastery_level,
      timesPracticed: row.times_practiced,
      lastPracticedAt: row.last_practiced_at,
      createdAt: row.created_at,
      cefrLevel: row.cefr_level,
      definitionCount,
      exampleCount,
    };
  }

  private mapToDictionaryEntry(row: VocabularyRow, contexts: VocabularyContext[] = []): DictionaryEntry {
    const baseItem = this.mapToVocabularyItem(row);

    // Parse JSON fields safely - handle both string and pre-parsed object
    const parseJson = <T>(value: string | object | null): T | null => {
      if (!value) return null;
      // MySQL2 may return JSON columns as already-parsed objects
      if (typeof value === 'object') return value as T;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    };

    return {
      ...baseItem,
      pronunciationUk: row.pronunciation_uk,
      pronunciationUs: row.pronunciation_us,
      audioUkUrl: row.audio_uk_url,
      audioUsUrl: row.audio_us_url,
      wordForms: parseJson(row.word_forms),
      definitions: parseJson(row.definitions),
      wordFamily: parseJson(row.word_family),
      synonyms: parseJson(row.synonyms),
      antonyms: parseJson(row.antonyms),
      collocations: parseJson(row.collocations),
      idioms: parseJson(row.idioms),
      usageNotes: row.usage_notes,
      extraExamples: parseJson(row.extra_examples),
      grammarInfo: parseJson(row.grammar_info),
      register: row.register,
      frequencyRank: row.frequency_rank,
      cefrLevel: row.cefr_level,
      topics: parseJson(row.topics),
      wordOrigin: row.word_origin,
      seeAlso: parseJson(row.see_also),
      definitionCount: baseItem.definitionCount || 0,
      exampleCount: baseItem.exampleCount || 0,
      contexts,
    };
  }
}

export const vocabularyService = new VocabularyService();
