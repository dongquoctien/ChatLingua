import pool from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

interface VocabularyRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  vietnamese_word: string;
  english_word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  example_sentence_vi: string | null;
  example_sentence_en: string | null;
  difficulty_level: string;
  mastery_level: number;
  review_count: number;
  last_reviewed: Date | null;
  created_at: Date;
}

export interface VocabularyItem {
  id: number;
  conversationId: number;
  vietnameseWord: string;
  englishWord: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  exampleVi: string | null;
  exampleEn: string | null;
  difficultyLevel: string;
  masteryLevel: number;
  reviewCount: number;
  lastReviewed: Date | null;
  createdAt: Date;
}

export interface VocabularyFilters {
  difficultyLevel?: string;
  partOfSpeech?: string;
  masteryLevel?: number;
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
    const conditions: string[] = ['c.user_id = ?'];
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

    if (filters.searchTerm) {
      conditions.push('(v.vietnamese_word LIKE ? OR v.english_word LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM vocabulary v
       JOIN conversations c ON v.conversation_id = c.id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get vocabulary with pagination
    // Note: Using query instead of execute because LIMIT/OFFSET don't work well with prepared statements
    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT v.* FROM vocabulary v
       JOIN conversations c ON v.conversation_id = c.id
       WHERE ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const data = rows.map(this.mapToVocabularyItem);

    return { data, total, page, limit };
  }

  async getVocabularyById(
    userId: number,
    vocabularyId: number
  ): Promise<VocabularyItem | null> {
    const [rows] = await pool.execute<VocabularyRow[]>(
      `SELECT v.* FROM vocabulary v
       JOIN conversations c ON v.conversation_id = c.id
       WHERE v.id = ? AND c.user_id = ?`,
      [vocabularyId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToVocabularyItem(rows[0]);
  }

  async getVocabularyForReview(
    userId: number,
    limit: number = 10
  ): Promise<VocabularyItem[]> {
    // Get vocabulary that needs review (low mastery or not reviewed recently)
    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT v.* FROM vocabulary v
       JOIN conversations c ON v.conversation_id = c.id
       WHERE c.user_id = ?
       AND (v.mastery_level < 5 OR v.last_reviewed IS NULL OR v.last_reviewed < DATE_SUB(NOW(), INTERVAL 1 DAY))
       ORDER BY v.mastery_level ASC, v.last_reviewed ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    return rows.map(this.mapToVocabularyItem);
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

    // Update mastery level
    const newMasteryLevel = correct
      ? Math.min(vocabulary.masteryLevel + 1, 5)
      : Math.max(vocabulary.masteryLevel - 1, 0);

    await pool.execute(
      `UPDATE vocabulary
       SET mastery_level = ?, review_count = review_count + 1, last_reviewed = NOW()
       WHERE id = ?`,
      [newMasteryLevel, vocabularyId]
    );

    return this.getVocabularyById(userId, vocabularyId);
  }

  private mapToVocabularyItem(row: VocabularyRow): VocabularyItem {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      vietnameseWord: row.vietnamese_word,
      englishWord: row.english_word,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      exampleVi: row.example_sentence_vi,
      exampleEn: row.example_sentence_en,
      difficultyLevel: row.difficulty_level,
      masteryLevel: row.mastery_level,
      reviewCount: row.review_count,
      lastReviewed: row.last_reviewed,
      createdAt: row.created_at,
    };
  }
}

export const vocabularyService = new VocabularyService();
