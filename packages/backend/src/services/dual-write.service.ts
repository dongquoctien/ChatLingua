/**
 * Dual-Write Service
 *
 * This service handles writing data to both V2 and V3 tables during the migration period.
 * It uses feature flags to determine which tables should receive writes.
 *
 * Usage:
 * 1. Import the service: import { dualWriteService } from './dual-write.service.js';
 * 2. Call the appropriate method when creating/updating data
 * 3. The service will handle routing to V2 and/or V3 tables based on feature flags
 */

import pool from '../config/database.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  shouldWriteToV2,
  shouldWriteToV3,
  logDualWrite,
  isDualWriteEnabled,
} from '../config/features.js';
import { masterVocabularyService, userVocabularyService } from './v3/index.js';
import { masterGrammarService, userGrammarService } from './v3/index.js';

// ============================================================
// Types
// ============================================================

export interface VocabularyDualWriteInput {
  userId: number;
  englishWord: string;
  vietnameseWord: string;
  partOfSpeech: string;
  phonetic?: string | null;
  pronunciationUk?: string | null;
  pronunciationUs?: string | null;
  difficultyLevel?: string;
  cefrLevel?: string | null;
  register?: string | null;
  definitions?: unknown[] | null;
  wordFamily?: Record<string, string[]> | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  collocations?: Record<string, string[]> | null;
  grammarInfo?: Record<string, unknown> | null;
  usageNotes?: string | null;
  extraExamples?: unknown[] | null;
  topics?: unknown[] | null;
  wordForms?: Record<string, string> | null;
  sourceType?: 'conversation' | 'word_map' | 'manual' | 'import';
  sourceId?: number | null;
}

export interface GrammarDualWriteInput {
  userId: number;
  grammarRule: string;
  explanation: string;
  explanationVi?: string | null;
  category?: string | null;
  subcategory?: string | null;
  cefrLevel?: string | null;
  difficultyLevel?: string;
  formula?: string | null;
  examples?: Array<{ en: string; vi: string }> | null;
  commonMistakes?: string[] | null;
  tips?: string | null;
  relatedGrammar?: string[] | null;
  tags?: string[] | null;
  sourceType?: 'conversation' | 'word_map' | 'manual' | 'import';
  sourceId?: number | null;
}

export interface DualWriteResult {
  v2Id?: number;
  v3MasterId?: number;
  v3UserId?: number;
  success: boolean;
  writtenTo: ('V2' | 'V3')[];
}

// ============================================================
// Dual Write Service
// ============================================================

class DualWriteService {
  /**
   * Write vocabulary to both V2 and V3 tables
   * V2: vocabulary table (user-owned)
   * V3: master_vocabulary + user_vocabulary tables
   */
  async writeVocabulary(input: VocabularyDualWriteInput): Promise<DualWriteResult> {
    const result: DualWriteResult = {
      success: true,
      writtenTo: [],
    };

    const writeToV2 = shouldWriteToV2();
    const writeToV3 = shouldWriteToV3();

    logDualWrite('vocabulary', {
      englishWord: input.englishWord,
      writeToV2,
      writeToV3,
    });

    try {
      // Write to V2 (vocabulary table)
      if (writeToV2) {
        const v2Id = await this.writeVocabularyV2(input);
        result.v2Id = v2Id;
        result.writtenTo.push('V2');
      }

      // Write to V3 (master_vocabulary + user_vocabulary)
      if (writeToV3) {
        const v3Result = await this.writeVocabularyV3(input);
        result.v3MasterId = v3Result.masterId;
        result.v3UserId = v3Result.userId;
        result.writtenTo.push('V3');
      }

      return result;
    } catch (error) {
      logDualWrite('vocabulary_error', {
        englishWord: input.englishWord,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.success = false;
      throw error;
    }
  }

  /**
   * Write grammar to both V2 and V3 tables
   * V2: grammar_points table (user-owned)
   * V3: master_grammar + user_grammar tables
   */
  async writeGrammar(input: GrammarDualWriteInput): Promise<DualWriteResult> {
    const result: DualWriteResult = {
      success: true,
      writtenTo: [],
    };

    const writeToV2 = shouldWriteToV2();
    const writeToV3 = shouldWriteToV3();

    logDualWrite('grammar', {
      grammarRule: input.grammarRule,
      writeToV2,
      writeToV3,
    });

    try {
      // Write to V2 (grammar_points table)
      if (writeToV2) {
        const v2Id = await this.writeGrammarV2(input);
        result.v2Id = v2Id;
        result.writtenTo.push('V2');
      }

      // Write to V3 (master_grammar + user_grammar)
      if (writeToV3) {
        const v3Result = await this.writeGrammarV3(input);
        result.v3MasterId = v3Result.masterId;
        result.v3UserId = v3Result.userId;
        result.writtenTo.push('V3');
      }

      return result;
    } catch (error) {
      logDualWrite('grammar_error', {
        grammarRule: input.grammarRule,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.success = false;
      throw error;
    }
  }

  /**
   * Check if dual-write is currently active
   */
  isDualWriteActive(): boolean {
    return isDualWriteEnabled();
  }

  // ============================================================
  // Private V2 Write Methods
  // ============================================================

  private async writeVocabularyV2(input: VocabularyDualWriteInput): Promise<number> {
    // Check if vocabulary already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM vocabulary
       WHERE user_id = ? AND english_word = ? AND part_of_speech = ?`,
      [input.userId, input.englishWord, input.partOfSpeech]
    );

    if (existing.length > 0) {
      // Update existing
      const vocabId = existing[0].id;
      await pool.execute(
        `UPDATE vocabulary SET
          vietnamese_word = ?,
          phonetic = COALESCE(?, phonetic),
          pronunciation_uk = COALESCE(?, pronunciation_uk),
          pronunciation_us = COALESCE(?, pronunciation_us),
          cefr_level = COALESCE(?, cefr_level),
          register = COALESCE(?, register),
          definitions = COALESCE(?, definitions),
          word_family = COALESCE(?, word_family),
          synonyms = COALESCE(?, synonyms),
          antonyms = COALESCE(?, antonyms),
          collocations = COALESCE(?, collocations),
          grammar_info = COALESCE(?, grammar_info),
          usage_notes = COALESCE(?, usage_notes),
          extra_examples = COALESCE(?, extra_examples),
          topics = COALESCE(?, topics),
          word_forms = COALESCE(?, word_forms),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.vietnameseWord,
          input.phonetic,
          input.pronunciationUk,
          input.pronunciationUs,
          input.cefrLevel,
          input.register,
          input.definitions ? JSON.stringify(input.definitions) : null,
          input.wordFamily ? JSON.stringify(input.wordFamily) : null,
          input.synonyms ? JSON.stringify(input.synonyms) : null,
          input.antonyms ? JSON.stringify(input.antonyms) : null,
          input.collocations ? JSON.stringify(input.collocations) : null,
          input.grammarInfo ? JSON.stringify(input.grammarInfo) : null,
          input.usageNotes,
          input.extraExamples ? JSON.stringify(input.extraExamples) : null,
          input.topics ? JSON.stringify(input.topics) : null,
          input.wordForms ? JSON.stringify(input.wordForms) : null,
          vocabId,
        ]
      );
      return vocabId;
    } else {
      // Insert new
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO vocabulary (
          user_id, english_word, part_of_speech, vietnamese_word, phonetic,
          difficulty_level, pronunciation_uk, pronunciation_us, cefr_level, register,
          definitions, word_family, synonyms, antonyms, collocations,
          grammar_info, usage_notes, extra_examples, topics, word_forms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.userId,
          input.englishWord,
          input.partOfSpeech,
          input.vietnameseWord,
          input.phonetic,
          input.difficultyLevel || 'beginner',
          input.pronunciationUk,
          input.pronunciationUs,
          input.cefrLevel,
          input.register || 'neutral',
          input.definitions ? JSON.stringify(input.definitions) : null,
          input.wordFamily ? JSON.stringify(input.wordFamily) : null,
          input.synonyms ? JSON.stringify(input.synonyms) : null,
          input.antonyms ? JSON.stringify(input.antonyms) : null,
          input.collocations ? JSON.stringify(input.collocations) : null,
          input.grammarInfo ? JSON.stringify(input.grammarInfo) : null,
          input.usageNotes,
          input.extraExamples ? JSON.stringify(input.extraExamples) : null,
          input.topics ? JSON.stringify(input.topics) : null,
          input.wordForms ? JSON.stringify(input.wordForms) : null,
        ]
      );
      return result.insertId;
    }
  }

  private async writeGrammarV2(input: GrammarDualWriteInput): Promise<number> {
    // For V2, grammar_points are tied to conversations, but we can still insert them
    // Note: V2 grammar_points has conversation_id which may be null for standalone grammar
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO grammar_points (
        user_id, grammar_rule, explanation, category, difficulty_level
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        explanation = VALUES(explanation),
        category = VALUES(category)`,
      [
        input.userId,
        input.grammarRule,
        input.explanation,
        input.category,
        input.difficultyLevel || 'beginner',
      ]
    );
    return result.insertId || result.affectedRows;
  }

  // ============================================================
  // Private V3 Write Methods
  // ============================================================

  private async writeVocabularyV3(
    input: VocabularyDualWriteInput
  ): Promise<{ masterId: number; userId: number }> {
    // Step 1: Get or create master vocabulary
    let masterVocab = await masterVocabularyService.getByWordAndPos(
      input.englishWord,
      input.partOfSpeech
    );

    if (!masterVocab) {
      // Create master vocabulary
      // Note: Convert null to undefined for V3 service compatibility
      masterVocab = await masterVocabularyService.create({
        englishWord: input.englishWord,
        vietnameseWord: input.vietnameseWord,
        partOfSpeech: input.partOfSpeech as any,
        phonetic: input.phonetic || input.pronunciationUk || '',
        pronunciationUk: input.pronunciationUk ?? undefined,
        pronunciationUs: input.pronunciationUs ?? undefined,
        cefrLevel: (input.cefrLevel as any) || 'B1',
        difficultyLevel: input.difficultyLevel || 'intermediate',
        definitions: input.definitions as any ?? undefined,
        wordFamily: input.wordFamily ?? undefined,
        synonyms: input.synonyms ?? undefined,
        antonyms: input.antonyms ?? undefined,
        collocations: input.collocations ?? undefined,
        grammarInfo: input.grammarInfo ?? undefined,
        usageNotes: input.usageNotes ?? undefined,
        extraExamples: input.extraExamples as any ?? undefined,
        topics: input.topics as any ?? undefined,
        wordForms: input.wordForms ?? undefined,
      });
    }

    // Step 2: Link to user's vocabulary
    const userVocab = await userVocabularyService.addVocabulary(
      input.userId,
      masterVocab.id,
      input.sourceType || 'manual',
      input.sourceId ?? undefined
    );

    return {
      masterId: masterVocab.id,
      userId: userVocab.id,
    };
  }

  private async writeGrammarV3(
    input: GrammarDualWriteInput
  ): Promise<{ masterId: number; userId: number }> {
    // Step 1: Get or create master grammar
    let masterGrammar = await masterGrammarService.getByRuleAndCategory(
      input.grammarRule,
      input.category || 'general'
    );

    if (!masterGrammar) {
      // Create master grammar
      // Note: Convert null to undefined and map types for V3 service compatibility
      masterGrammar = await masterGrammarService.create({
        grammarRule: input.grammarRule,
        category: input.category || 'general',
        subcategory: input.subcategory ?? undefined,
        cefrLevel: (input.cefrLevel as any) || 'B1',
        difficultyLevel: input.difficultyLevel || 'intermediate',
        explanation: input.explanation,
        explanationVi: input.explanationVi ?? input.explanation,
        formula: input.formula ?? undefined,
        // examples is required, default to empty array
        examples: input.examples ?? [],
        // commonMistakes in V3 expects objects, but input may be strings - convert or skip
        commonMistakes: undefined, // V2 format incompatible, skip for now
        usageTips: input.tips ?? undefined,
        // relatedGrammar in V3 expects IDs, but input is strings - skip for now
        relatedGrammarIds: undefined,
      });
    }

    // Step 2: Link to user's grammar
    const userGrammar = await userGrammarService.addGrammar(
      input.userId,
      masterGrammar.id,
      input.sourceType || 'manual',
      input.sourceId ?? undefined
    );

    return {
      masterId: masterGrammar.id,
      userId: userGrammar.id,
    };
  }
}

export const dualWriteService = new DualWriteService();
export default dualWriteService;
