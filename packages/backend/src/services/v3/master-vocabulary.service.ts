import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface MasterVocabularyRow extends RowDataPacket {
  id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  audio_uk_url: string | null;
  audio_us_url: string | null;
  part_of_speech: string;
  cefr_level: string;
  difficulty_level: string;
  definitions: string | null;
  word_forms: string | null;
  word_family: string | null;
  synonyms: string | null;
  antonyms: string | null;
  collocations: string | null;
  idioms: string | null;
  usage_notes: string | null;
  grammar_info: string | null;
  register: string;
  extra_examples: string | null;
  frequency_rank: number | null;
  topics: string | null;
  word_origin: string | null;
  see_also: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface MasterVocabularyItem {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  audioUkUrl: string | null;
  audioUsUrl: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  difficultyLevel: string;
  definitions: Definition[] | null;
  wordForms: Record<string, string> | null;
  wordFamily: Record<string, string[]> | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  collocations: Record<string, string[]> | null;
  idioms: Idiom[] | null;
  usageNotes: string | null;
  grammarInfo: Record<string, unknown> | null;
  register: string;
  extraExamples: Example[] | null;
  frequencyRank: number | null;
  topics: Topic[] | null;
  wordOrigin: string | null;
  seeAlso: string[] | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Definition {
  definition: string;
  definitionVi: string;
  grammar?: string;
  register?: string;
  examples: Example[];
  patterns?: string[];
}

export interface Example {
  en: string;
  vi: string;
}

export interface Idiom {
  phrase: string;
  meaning: string;
  meaningVi: string;
}

export interface Topic {
  name: string;
  level: string;
}

export interface MasterVocabularyFilters {
  cefrLevel?: string;
  difficultyLevel?: string;
  partOfSpeech?: string;
  searchTerm?: string;
  isActive?: boolean;
}

export interface CreateMasterVocabularyInput {
  englishWord: string;
  vietnameseWord: string;
  partOfSpeech: string;
  phonetic?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  audioUkUrl?: string;
  audioUsUrl?: string;
  cefrLevel?: string;
  difficultyLevel?: string;
  definitions?: Definition[];
  wordForms?: Record<string, string>;
  wordFamily?: Record<string, string[]>;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Record<string, string[]>;
  idioms?: Idiom[];
  usageNotes?: string;
  grammarInfo?: Record<string, unknown>;
  register?: string;
  extraExamples?: Example[];
  frequencyRank?: number;
  topics?: Topic[];
  wordOrigin?: string;
  seeAlso?: string[];
  createdBy?: number;
}

// ============================================================
// Service
// ============================================================

export class MasterVocabularyService {
  /**
   * Get all master vocabulary with pagination and filters
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters: MasterVocabularyFilters = {}
  ): Promise<{ data: MasterVocabularyItem[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    // Build WHERE conditions
    if (filters.cefrLevel) {
      conditions.push('cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.difficultyLevel) {
      conditions.push('difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.partOfSpeech) {
      conditions.push('part_of_speech = ?');
      params.push(filters.partOfSpeech);
    }

    if (filters.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.isActive);
    } else {
      conditions.push('is_active = TRUE');
    }

    if (filters.searchTerm) {
      conditions.push('(english_word LIKE ? OR vietnamese_word LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM master_vocabulary ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get vocabulary with pagination
    const [rows] = await pool.query<MasterVocabularyRow[]>(
      `SELECT * FROM master_vocabulary ${whereClause}
       ORDER BY english_word ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows.map(row => this.mapToMasterVocabularyItem(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get master vocabulary by ID
   */
  async getById(id: number): Promise<MasterVocabularyItem | null> {
    const [rows] = await pool.execute<MasterVocabularyRow[]>(
      'SELECT * FROM master_vocabulary WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToMasterVocabularyItem(rows[0]);
  }

  /**
   * Get master vocabulary by English word and part of speech
   */
  async getByWordAndPos(englishWord: string, partOfSpeech: string): Promise<MasterVocabularyItem | null> {
    const [rows] = await pool.execute<MasterVocabularyRow[]>(
      'SELECT * FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?',
      [englishWord, partOfSpeech]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToMasterVocabularyItem(rows[0]);
  }

  /**
   * Search master vocabulary
   */
  async search(query: string, limit: number = 20): Promise<MasterVocabularyItem[]> {
    const [rows] = await pool.query<MasterVocabularyRow[]>(
      `SELECT * FROM master_vocabulary
       WHERE is_active = TRUE AND (english_word LIKE ? OR vietnamese_word LIKE ?)
       ORDER BY
         CASE WHEN english_word = ? THEN 0
              WHEN english_word LIKE ? THEN 1
              ELSE 2 END,
         english_word
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, query, `${query}%`, Number(limit)]
    );

    return rows.map(row => this.mapToMasterVocabularyItem(row));
  }

  /**
   * Create new master vocabulary (admin only)
   */
  async create(input: CreateMasterVocabularyInput): Promise<MasterVocabularyItem> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO master_vocabulary (
        english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us,
        audio_uk_url, audio_us_url, part_of_speech, cefr_level, difficulty_level,
        definitions, word_forms, word_family, synonyms, antonyms, collocations,
        idioms, usage_notes, grammar_info, register, extra_examples, frequency_rank,
        topics, word_origin, see_also, created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.englishWord,
        input.vietnameseWord,
        input.phonetic || null,
        input.pronunciationUk || null,
        input.pronunciationUs || null,
        input.audioUkUrl || null,
        input.audioUsUrl || null,
        input.partOfSpeech,
        input.cefrLevel || 'A1',
        input.difficultyLevel || 'beginner',
        input.definitions ? JSON.stringify(input.definitions) : null,
        input.wordForms ? JSON.stringify(input.wordForms) : null,
        input.wordFamily ? JSON.stringify(input.wordFamily) : null,
        input.synonyms ? JSON.stringify(input.synonyms) : null,
        input.antonyms ? JSON.stringify(input.antonyms) : null,
        input.collocations ? JSON.stringify(input.collocations) : null,
        input.idioms ? JSON.stringify(input.idioms) : null,
        input.usageNotes || null,
        input.grammarInfo ? JSON.stringify(input.grammarInfo) : null,
        input.register || 'neutral',
        input.extraExamples ? JSON.stringify(input.extraExamples) : null,
        input.frequencyRank || null,
        input.topics ? JSON.stringify(input.topics) : null,
        input.wordOrigin || null,
        input.seeAlso ? JSON.stringify(input.seeAlso) : null,
        input.createdBy || null,
      ]
    );

    const created = await this.getById(result.insertId);
    if (!created) {
      throw new Error('Failed to create master vocabulary');
    }
    return created;
  }

  /**
   * Update master vocabulary (admin only)
   */
  async update(id: number, input: Partial<CreateMasterVocabularyInput>): Promise<MasterVocabularyItem | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.englishWord !== undefined) {
      updates.push('english_word = ?');
      params.push(input.englishWord);
    }
    if (input.vietnameseWord !== undefined) {
      updates.push('vietnamese_word = ?');
      params.push(input.vietnameseWord);
    }
    if (input.phonetic !== undefined) {
      updates.push('phonetic = ?');
      params.push(input.phonetic || null);
    }
    if (input.pronunciationUk !== undefined) {
      updates.push('pronunciation_uk = ?');
      params.push(input.pronunciationUk || null);
    }
    if (input.pronunciationUs !== undefined) {
      updates.push('pronunciation_us = ?');
      params.push(input.pronunciationUs || null);
    }
    if (input.audioUkUrl !== undefined) {
      updates.push('audio_uk_url = ?');
      params.push(input.audioUkUrl || null);
    }
    if (input.audioUsUrl !== undefined) {
      updates.push('audio_us_url = ?');
      params.push(input.audioUsUrl || null);
    }
    if (input.partOfSpeech !== undefined) {
      updates.push('part_of_speech = ?');
      params.push(input.partOfSpeech);
    }
    if (input.cefrLevel !== undefined) {
      updates.push('cefr_level = ?');
      params.push(input.cefrLevel);
    }
    if (input.difficultyLevel !== undefined) {
      updates.push('difficulty_level = ?');
      params.push(input.difficultyLevel);
    }
    if (input.definitions !== undefined) {
      updates.push('definitions = ?');
      params.push(input.definitions ? JSON.stringify(input.definitions) : null);
    }
    if (input.wordForms !== undefined) {
      updates.push('word_forms = ?');
      params.push(input.wordForms ? JSON.stringify(input.wordForms) : null);
    }
    if (input.wordFamily !== undefined) {
      updates.push('word_family = ?');
      params.push(input.wordFamily ? JSON.stringify(input.wordFamily) : null);
    }
    if (input.synonyms !== undefined) {
      updates.push('synonyms = ?');
      params.push(input.synonyms ? JSON.stringify(input.synonyms) : null);
    }
    if (input.antonyms !== undefined) {
      updates.push('antonyms = ?');
      params.push(input.antonyms ? JSON.stringify(input.antonyms) : null);
    }
    if (input.collocations !== undefined) {
      updates.push('collocations = ?');
      params.push(input.collocations ? JSON.stringify(input.collocations) : null);
    }
    if (input.idioms !== undefined) {
      updates.push('idioms = ?');
      params.push(input.idioms ? JSON.stringify(input.idioms) : null);
    }
    if (input.usageNotes !== undefined) {
      updates.push('usage_notes = ?');
      params.push(input.usageNotes || null);
    }
    if (input.grammarInfo !== undefined) {
      updates.push('grammar_info = ?');
      params.push(input.grammarInfo ? JSON.stringify(input.grammarInfo) : null);
    }
    if (input.register !== undefined) {
      updates.push('register = ?');
      params.push(input.register);
    }
    if (input.extraExamples !== undefined) {
      updates.push('extra_examples = ?');
      params.push(input.extraExamples ? JSON.stringify(input.extraExamples) : null);
    }
    if (input.frequencyRank !== undefined) {
      updates.push('frequency_rank = ?');
      params.push(input.frequencyRank || null);
    }
    if (input.topics !== undefined) {
      updates.push('topics = ?');
      params.push(input.topics ? JSON.stringify(input.topics) : null);
    }
    if (input.wordOrigin !== undefined) {
      updates.push('word_origin = ?');
      params.push(input.wordOrigin || null);
    }
    if (input.seeAlso !== undefined) {
      updates.push('see_also = ?');
      params.push(input.seeAlso ? JSON.stringify(input.seeAlso) : null);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    await pool.execute(
      `UPDATE master_vocabulary SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  /**
   * Soft delete master vocabulary (admin only)
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE master_vocabulary SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get vocabulary by CEFR level (for Word Map lessons)
   */
  async getByCefrLevel(cefrLevel: string, limit: number = 50): Promise<MasterVocabularyItem[]> {
    const [rows] = await pool.query<MasterVocabularyRow[]>(
      `SELECT * FROM master_vocabulary
       WHERE cefr_level = ? AND is_active = TRUE
       ORDER BY frequency_rank ASC, english_word ASC
       LIMIT ?`,
      [cefrLevel, Number(limit)]
    );

    return rows.map(row => this.mapToMasterVocabularyItem(row));
  }

  /**
   * Get vocabulary IDs by words (for linking to lessons)
   */
  async getIdsByWords(words: string[]): Promise<Map<string, number>> {
    if (words.length === 0) return new Map();

    const placeholders = words.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, english_word FROM master_vocabulary
       WHERE english_word IN (${placeholders}) AND is_active = TRUE`,
      words
    );

    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(row.english_word as string, row.id as number);
    }
    return result;
  }

  /**
   * Get vocabulary count by CEFR level (for stats)
   */
  async getCountByCefrLevel(): Promise<Record<string, number>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT cefr_level, COUNT(*) as count
       FROM master_vocabulary WHERE is_active = TRUE
       GROUP BY cefr_level`
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.cefr_level as string] = row.count as number;
    }
    return result;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private parseJson<T>(value: string | object | null): T | null {
    if (!value) return null;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private mapToMasterVocabularyItem(row: MasterVocabularyRow): MasterVocabularyItem {
    return {
      id: row.id,
      englishWord: row.english_word,
      vietnameseWord: row.vietnamese_word,
      phonetic: row.phonetic,
      pronunciationUk: row.pronunciation_uk,
      pronunciationUs: row.pronunciation_us,
      audioUkUrl: row.audio_uk_url,
      audioUsUrl: row.audio_us_url,
      partOfSpeech: row.part_of_speech,
      cefrLevel: row.cefr_level,
      difficultyLevel: row.difficulty_level,
      definitions: this.parseJson<Definition[]>(row.definitions),
      wordForms: this.parseJson<Record<string, string>>(row.word_forms),
      wordFamily: this.parseJson<Record<string, string[]>>(row.word_family),
      synonyms: this.parseJson<string[]>(row.synonyms),
      antonyms: this.parseJson<string[]>(row.antonyms),
      collocations: this.parseJson<Record<string, string[]>>(row.collocations),
      idioms: this.parseJson<Idiom[]>(row.idioms),
      usageNotes: row.usage_notes,
      grammarInfo: this.parseJson<Record<string, unknown>>(row.grammar_info),
      register: row.register,
      extraExamples: this.parseJson<Example[]>(row.extra_examples),
      frequencyRank: row.frequency_rank,
      topics: this.parseJson<Topic[]>(row.topics),
      wordOrigin: row.word_origin,
      seeAlso: this.parseJson<string[]>(row.see_also),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    };
  }
}

export const masterVocabularyService = new MasterVocabularyService();
