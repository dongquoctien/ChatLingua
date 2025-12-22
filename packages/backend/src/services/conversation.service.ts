import pool from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

interface ConversationRow extends RowDataPacket {
  id: number;
  user_id: number;
  vietnamese_text: string;
  english_translation: string;
  topic: string | null;
  difficulty_level: string;
  ai_analysis: string | null;
  created_at: Date;
}

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
}

interface GrammarRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  grammar_rule: string;
  explanation_vi: string | null;
  explanation_en: string | null;
  example_vi: string | null;
  example_en: string | null;
  difficulty_level: string;
}

export interface ConversationSummary {
  id: number;
  vietnameseText: string;
  englishTranslation: string;
  topic: string | null;
  difficultyLevel: string;
  vocabularyCount: number;
  grammarCount: number;
  createdAt: Date;
}

export interface ConversationDetail extends ConversationSummary {
  aiAnalysis: string | null;
  vocabulary: Array<{
    id: number;
    vietnameseWord: string;
    englishWord: string;
    phonetic: string | null;
    partOfSpeech: string | null;
    exampleVi: string | null;
    exampleEn: string | null;
    difficultyLevel: string;
  }>;
  grammarPoints: Array<{
    id: number;
    rule: string;
    explanationVi: string | null;
    explanationEn: string | null;
    exampleVi: string | null;
    exampleEn: string | null;
    difficultyLevel: string;
  }>;
}

export class ConversationService {
  async getConversations(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: ConversationSummary[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM conversations WHERE user_id = ?',
      [userId]
    );
    const total = countResult[0].total as number;

    // Get conversations with counts
    // Note: Using query instead of execute because LIMIT/OFFSET don't work well with prepared statements
    const [rows] = await pool.query<ConversationRow[]>(
      `SELECT c.*,
        (SELECT COUNT(*) FROM vocabulary WHERE conversation_id = c.id) as vocabulary_count,
        (SELECT COUNT(*) FROM grammar_points WHERE conversation_id = c.id) as grammar_count
       FROM conversations c
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );

    const data = rows.map((row) => ({
      id: row.id,
      vietnameseText: row.vietnamese_text,
      englishTranslation: row.english_translation,
      topic: row.topic,
      difficultyLevel: row.difficulty_level,
      vocabularyCount: (row as any).vocabulary_count,
      grammarCount: (row as any).grammar_count,
      createdAt: row.created_at,
    }));

    return { data, total, page, limit };
  }

  async getConversationById(
    userId: number,
    conversationId: number
  ): Promise<ConversationDetail | null> {
    // Get conversation
    const [conversations] = await pool.execute<ConversationRow[]>(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );

    if (conversations.length === 0) {
      return null;
    }

    const conv = conversations[0];

    // Get vocabulary
    const [vocabulary] = await pool.execute<VocabularyRow[]>(
      'SELECT * FROM vocabulary WHERE conversation_id = ? ORDER BY id',
      [conversationId]
    );

    // Get grammar points
    const [grammarPoints] = await pool.execute<GrammarRow[]>(
      'SELECT * FROM grammar_points WHERE conversation_id = ? ORDER BY id',
      [conversationId]
    );

    return {
      id: conv.id,
      vietnameseText: conv.vietnamese_text,
      englishTranslation: conv.english_translation,
      topic: conv.topic,
      difficultyLevel: conv.difficulty_level,
      aiAnalysis: conv.ai_analysis,
      vocabularyCount: vocabulary.length,
      grammarCount: grammarPoints.length,
      createdAt: conv.created_at,
      vocabulary: vocabulary.map((v) => ({
        id: v.id,
        vietnameseWord: v.vietnamese_word,
        englishWord: v.english_word,
        phonetic: v.phonetic,
        partOfSpeech: v.part_of_speech,
        exampleVi: v.example_sentence_vi,
        exampleEn: v.example_sentence_en,
        difficultyLevel: v.difficulty_level,
      })),
      grammarPoints: grammarPoints.map((g) => ({
        id: g.id,
        rule: g.grammar_rule,
        explanationVi: g.explanation_vi,
        explanationEn: g.explanation_en,
        exampleVi: g.example_vi,
        exampleEn: g.example_en,
        difficultyLevel: g.difficulty_level,
      })),
    };
  }
}

export const conversationService = new ConversationService();
