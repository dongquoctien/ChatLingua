/**
 * Dual-Write Helper for MCP Server
 *
 * This helper handles writing data to V3 tables when the dual-write feature is enabled.
 * It mirrors the vocabulary and grammar data from V2 inserts to V3 master/user tables.
 */

import { Connection } from 'mysql2/promise';

// ============================================================
// Feature Flag Helpers
// ============================================================

/**
 * Check if V3 dual-write is enabled via environment variable
 */
export function shouldWriteToV3(): boolean {
  // DUAL_WRITE_ENABLED defaults to true (safe migration mode)
  const dualWriteEnabled = process.env.DUAL_WRITE_ENABLED !== 'false';
  const deprecateV2 = process.env.DEPRECATE_V2_TABLES === 'true';

  // Write to V3 if dual-write is enabled OR if V3 is the primary
  return dualWriteEnabled || process.env.USE_V3_TABLES === 'true' || deprecateV2;
}

/**
 * Log dual-write operations for debugging
 */
export function logDualWrite(operation: string, details: Record<string, unknown>): void {
  if (process.env.LOG_DUAL_WRITE === 'true') {
    console.log(`[MCP-DUAL-WRITE] ${operation}:`, JSON.stringify(details, null, 2));
  }
}

// ============================================================
// Types
// ============================================================

export interface VocabularyV3Data {
  englishWord: string;
  vietnameseWord: string;
  partOfSpeech: string;
  phonetic?: string | null;
  pronunciationUk?: string | null;
  pronunciationUs?: string | null;
  cefrLevel?: string | null;
  difficultyLevel?: string;
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
}

export interface GrammarV3Data {
  grammarRule: string;
  explanation: string;
  explanationVi?: string | null;
  category?: string | null;
  cefrLevel?: string | null;
  difficultyLevel?: string;
  formula?: string | null;
  examples?: Array<{ en: string; vi: string }> | null;
  exampleVi?: string | null;
  exampleEn?: string | null;
  commonMistakes?: string[] | null;
  tips?: string | null;
  tags?: string[] | null;
}

// ============================================================
// Dual-Write Functions
// ============================================================

/**
 * Write vocabulary to V3 tables (master_vocabulary + user_vocabulary)
 * This should be called after successfully writing to V2 vocabulary table
 */
export async function dualWriteVocabularyToV3(
  connection: Connection,
  userId: number,
  vocab: VocabularyV3Data,
  sourceType: 'conversation' | 'word_map' | 'manual' | 'import' = 'conversation',
  sourceId: number | null = null
): Promise<{ masterId: number; userId: number } | null> {
  if (!shouldWriteToV3()) {
    return null;
  }

  try {
    logDualWrite('vocabulary_v3_start', { englishWord: vocab.englishWord, userId });

    // Step 1: Check if master vocabulary exists
    const [existingMaster] = await connection.execute(
      `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
      [vocab.englishWord, vocab.partOfSpeech]
    );

    let masterId: number;

    if ((existingMaster as any[]).length > 0) {
      masterId = (existingMaster as any[])[0].id;
    } else {
      // Create master vocabulary
      const [masterResult] = await connection.execute(
        `INSERT INTO master_vocabulary (
          english_word, vietnamese_word, part_of_speech, phonetic,
          pronunciation_uk, pronunciation_us, cefr_level, difficulty_level,
          definitions, word_family, synonyms, antonyms, collocations,
          grammar_info, usage_notes, extra_examples, topics, word_forms, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          vocab.englishWord,
          vocab.vietnameseWord,
          vocab.partOfSpeech,
          vocab.phonetic || vocab.pronunciationUk || '',
          vocab.pronunciationUk,
          vocab.pronunciationUs,
          vocab.cefrLevel || 'B1',
          vocab.difficultyLevel || 'intermediate',
          vocab.definitions ? JSON.stringify(vocab.definitions) : null,
          vocab.wordFamily ? JSON.stringify(vocab.wordFamily) : null,
          vocab.synonyms ? JSON.stringify(vocab.synonyms) : null,
          vocab.antonyms ? JSON.stringify(vocab.antonyms) : null,
          vocab.collocations ? JSON.stringify(vocab.collocations) : null,
          vocab.grammarInfo ? JSON.stringify(vocab.grammarInfo) : null,
          vocab.usageNotes,
          vocab.extraExamples ? JSON.stringify(vocab.extraExamples) : null,
          vocab.topics ? JSON.stringify(vocab.topics) : null,
          vocab.wordForms ? JSON.stringify(vocab.wordForms) : null,
        ]
      );
      masterId = (masterResult as any).insertId;
    }

    // Step 2: Check if user vocabulary link exists
    const [existingUserVocab] = await connection.execute(
      `SELECT id FROM user_vocabulary WHERE user_id = ? AND master_vocabulary_id = ?`,
      [userId, masterId]
    );

    let userVocabId: number;

    if ((existingUserVocab as any[]).length > 0) {
      userVocabId = (existingUserVocab as any[])[0].id;
    } else {
      // Create user vocabulary link
      const [userVocabResult] = await connection.execute(
        `INSERT INTO user_vocabulary (
          user_id, master_vocabulary_id, source_type, source_id,
          mastery_level, times_practiced, review_status, ease_factor, review_interval
        ) VALUES (?, ?, ?, ?, 0, 0, 'new', 2.5, 0)`,
        [userId, masterId, sourceType, sourceId]
      );
      userVocabId = (userVocabResult as any).insertId;
    }

    logDualWrite('vocabulary_v3_success', {
      englishWord: vocab.englishWord,
      masterId,
      userVocabId,
    });

    return { masterId, userId: userVocabId };
  } catch (error) {
    // Log error but don't fail the main V2 transaction
    console.error('[MCP-DUAL-WRITE] Failed to write vocabulary to V3:', error);
    logDualWrite('vocabulary_v3_error', {
      englishWord: vocab.englishWord,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Write grammar to V3 tables (master_grammar + user_grammar)
 * This should be called after successfully writing to V2 grammar_points table
 */
export async function dualWriteGrammarToV3(
  connection: Connection,
  userId: number,
  grammar: GrammarV3Data,
  sourceType: 'conversation' | 'word_map' | 'manual' | 'import' = 'conversation',
  sourceId: number | null = null
): Promise<{ masterId: number; userId: number } | null> {
  if (!shouldWriteToV3()) {
    return null;
  }

  try {
    logDualWrite('grammar_v3_start', { grammarRule: grammar.grammarRule, userId });

    const category = grammar.category || 'general';

    // Step 1: Check if master grammar exists
    const [existingMaster] = await connection.execute(
      `SELECT id FROM master_grammar WHERE grammar_rule = ? AND category = ?`,
      [grammar.grammarRule, category]
    );

    let masterId: number;

    if ((existingMaster as any[]).length > 0) {
      masterId = (existingMaster as any[])[0].id;
    } else {
      // Build examples JSON from exampleVi/exampleEn if not provided
      let examplesJson = null;
      if (grammar.examples && grammar.examples.length > 0) {
        examplesJson = JSON.stringify(grammar.examples);
      } else if (grammar.exampleVi || grammar.exampleEn) {
        examplesJson = JSON.stringify([{
          en: grammar.exampleEn || '',
          vi: grammar.exampleVi || '',
        }]);
      }

      // Create master grammar
      const [masterResult] = await connection.execute(
        `INSERT INTO master_grammar (
          grammar_rule, category, cefr_level, difficulty_level,
          explanation, explanation_vi, formula, examples,
          common_mistakes, tips, tags, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          grammar.grammarRule,
          category,
          grammar.cefrLevel || 'B1',
          grammar.difficultyLevel || 'intermediate',
          grammar.explanation,
          grammar.explanationVi || grammar.explanation,
          grammar.formula,
          examplesJson,
          grammar.commonMistakes ? JSON.stringify(grammar.commonMistakes) : null,
          grammar.tips,
          grammar.tags ? JSON.stringify(grammar.tags) : null,
        ]
      );
      masterId = (masterResult as any).insertId;
    }

    // Step 2: Check if user grammar link exists
    const [existingUserGrammar] = await connection.execute(
      `SELECT id FROM user_grammar WHERE user_id = ? AND master_grammar_id = ?`,
      [userId, masterId]
    );

    let userGrammarId: number;

    if ((existingUserGrammar as any[]).length > 0) {
      userGrammarId = (existingUserGrammar as any[])[0].id;
    } else {
      // Create user grammar link
      const [userGrammarResult] = await connection.execute(
        `INSERT INTO user_grammar (
          user_id, master_grammar_id, source_type, source_id,
          mastery_level, times_practiced, review_status, ease_factor, review_interval
        ) VALUES (?, ?, ?, ?, 0, 0, 'new', 2.5, 0)`,
        [userId, masterId, sourceType, sourceId]
      );
      userGrammarId = (userGrammarResult as any).insertId;
    }

    logDualWrite('grammar_v3_success', {
      grammarRule: grammar.grammarRule,
      masterId,
      userGrammarId,
    });

    return { masterId, userId: userGrammarId };
  } catch (error) {
    // Log error but don't fail the main V2 transaction
    console.error('[MCP-DUAL-WRITE] Failed to write grammar to V3:', error);
    logDualWrite('grammar_v3_error', {
      grammarRule: grammar.grammarRule,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Batch dual-write for multiple vocabulary items
 */
export async function batchDualWriteVocabularyToV3(
  connection: Connection,
  userId: number,
  vocabItems: VocabularyV3Data[],
  sourceType: 'conversation' | 'word_map' | 'manual' | 'import' = 'conversation',
  sourceId: number | null = null
): Promise<Array<{ masterId: number; userId: number } | null>> {
  const results: Array<{ masterId: number; userId: number } | null> = [];

  for (const vocab of vocabItems) {
    const result = await dualWriteVocabularyToV3(connection, userId, vocab, sourceType, sourceId);
    results.push(result);
  }

  return results;
}

/**
 * Batch dual-write for multiple grammar items
 */
export async function batchDualWriteGrammarToV3(
  connection: Connection,
  userId: number,
  grammarItems: GrammarV3Data[],
  sourceType: 'conversation' | 'word_map' | 'manual' | 'import' = 'conversation',
  sourceId: number | null = null
): Promise<Array<{ masterId: number; userId: number } | null>> {
  const results: Array<{ masterId: number; userId: number } | null> = [];

  for (const grammar of grammarItems) {
    const result = await dualWriteGrammarToV3(connection, userId, grammar, sourceType, sourceId);
    results.push(result);
  }

  return results;
}
