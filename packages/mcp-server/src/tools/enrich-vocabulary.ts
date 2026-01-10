import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket } from 'mysql2/promise';
import { shouldWriteToV3, logDualWrite } from '../helpers/dual-write.js';

// Tool definition for MCP
export const enrichVocabularyTool: Tool = {
  name: 'enrich_vocabulary',
  description: `[STEP 2 of 3] Enrich vocabulary with dictionary data.

This is the SECOND step of the learning flow:
1. analyze_conversation → Already completed, gave you vocabularyIds
2. enrich_vocabulary (this tool) → Add dictionary data
3. generate_exercises → Create practice exercises

=== WHAT THIS TOOL DOES ===
- Takes vocabularyIds from analyze_conversation
- Adds rich dictionary data: definitions, examples, word family, etc.
- Updates existing vocabulary records

=== HOW TO USE ===
1. Get vocabularyIds from analyze_conversation response
2. For EACH vocabulary, provide dictionary data
3. Process in batches of 3-5 words for better performance

=== REQUIRED DICTIONARY FIELDS ===
For EACH vocabulary in the batch, provide:

1. PRONUNCIATION: pronunciationUk (UK IPA), pronunciationUs if different
   Example: "/ˈkɒntrækt/" (UK), "/ˈkɑːntrækt/" (US)

2. DEFINITIONS (2-3 senses): Each with:
   - definition: English definition
   - definitionVi: Vietnamese translation
   - grammar: "[countable]", "[transitive]", etc.
   - examples: [{en: "...", vi: "..."}]
   - patterns: ["contract with sb", "under contract"]

3. WORD FORMS:
   - Nouns: plural
   - Verbs: past, pastParticiple, presentParticiple, thirdPerson
   - Adjectives: comparative, superlative

4. WORD FAMILY: noun, verb, adjective, adverb forms

5. SYNONYMS & ANTONYMS: Related words

6. COLLOCATIONS:
   - adjective: ["long-term", "binding"]
   - verbContract: ["sign", "negotiate"]
   - phrases: ["breach of contract"]

7. EXTRA EXAMPLES (3-5 sentences): Additional usage examples

8. Other: usageNotes, grammarInfo, topics, wordOrigin, seeAlso

=== EXAMPLE ===
{
  "vocabularyIds": [456, 457],
  "vocabulary": [
    {
      "id": 456,
      "pronunciationUk": "/ˈkɒntrækt/",
      "definitions": [{"definition": "official agreement", "definitionVi": "hợp đồng", "examples": [{"en": "Sign a contract", "vi": "Ký hợp đồng"}]}],
      "wordForms": {"plural": "contracts"},
      "wordFamily": {"noun": ["contract"], "verb": ["contract"], "adjective": ["contractual"]},
      "synonyms": ["agreement", "deal"],
      "collocations": {"phrases": ["breach of contract"]},
      "extraExamples": [{"en": "The contract expires next month.", "vi": "Hợp đồng hết hạn tháng sau."}]
    }
  ]
}`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID (optional, uses authenticated user)',
      },
      vocabularyIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'List of vocabulary IDs to enrich (from analyze_conversation)',
      },
      vocabulary: {
        type: 'array',
        description: 'Dictionary data for each vocabulary',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Vocabulary ID (must match one in vocabularyIds)' },
            pronunciationUk: { type: 'string', description: 'UK IPA pronunciation' },
            pronunciationUs: { type: 'string', description: 'US IPA pronunciation' },
            wordForms: {
              type: 'object',
              properties: {
                plural: { type: 'string' },
                past: { type: 'string' },
                pastParticiple: { type: 'string' },
                presentParticiple: { type: 'string' },
                thirdPerson: { type: 'string' },
                comparative: { type: 'string' },
                superlative: { type: 'string' },
              },
            },
            definitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  definition: { type: 'string' },
                  definitionVi: { type: 'string' },
                  grammar: { type: 'string' },
                  register: { type: 'string', enum: ['formal', 'informal', 'neutral', 'slang', 'technical'] },
                  examples: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        en: { type: 'string' },
                        vi: { type: 'string' },
                      },
                      required: ['en', 'vi'],
                    },
                  },
                  patterns: { type: 'array', items: { type: 'string' } },
                },
                required: ['definition', 'definitionVi'],
              },
            },
            wordFamily: {
              type: 'object',
              properties: {
                noun: { type: 'array', items: { type: 'string' } },
                verb: { type: 'array', items: { type: 'string' } },
                adjective: { type: 'array', items: { type: 'string' } },
                adverb: { type: 'array', items: { type: 'string' } },
              },
            },
            synonyms: { type: 'array', items: { type: 'string' } },
            antonyms: { type: 'array', items: { type: 'string' } },
            collocations: {
              type: 'object',
              properties: {
                adjective: { type: 'array', items: { type: 'string' } },
                verbContract: { type: 'array', items: { type: 'string' } },
                contractVerb: { type: 'array', items: { type: 'string' } },
                contractNoun: { type: 'array', items: { type: 'string' } },
                preposition: { type: 'array', items: { type: 'string' } },
                phrases: { type: 'array', items: { type: 'string' } },
              },
            },
            idioms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phrase: { type: 'string' },
                  meaning: { type: 'string' },
                  meaningVi: { type: 'string' },
                },
              },
            },
            usageNotes: { type: 'string' },
            grammarInfo: {
              type: 'object',
              properties: {
                countable: { type: 'boolean' },
                transitive: { type: 'boolean' },
                patterns: { type: 'array', items: { type: 'string' } },
              },
            },
            register: { type: 'string', enum: ['formal', 'informal', 'neutral', 'slang', 'technical'] },
            extraExamples: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  en: { type: 'string' },
                  vi: { type: 'string' },
                },
                required: ['en', 'vi'],
              },
            },
            topics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
                },
              },
            },
            wordOrigin: { type: 'string' },
            seeAlso: { type: 'array', items: { type: 'string' } },
          },
          required: ['id'],
        },
      },
    },
    required: ['vocabularyIds', 'vocabulary'],
  },
};

// Zod schemas for validation
const definitionExampleSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

const definitionSchema = z.object({
  definition: z.string(),
  definitionVi: z.string(),
  grammar: z.string().optional(),
  register: z.enum(['formal', 'informal', 'neutral', 'slang', 'technical']).optional(),
  examples: z.array(definitionExampleSchema).default([]),
  patterns: z.array(z.string()).optional(),
});

const topicSchema = z.object({
  name: z.string(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
});

const idiomSchema = z.object({
  phrase: z.string(),
  meaning: z.string(),
  meaningVi: z.string(),
});

const vocabularyEnrichmentSchema = z.object({
  id: z.number(),
  pronunciationUk: z.string().optional(),
  pronunciationUs: z.string().optional(),
  wordForms: z.object({
    plural: z.string().optional(),
    past: z.string().optional(),
    pastParticiple: z.string().optional(),
    presentParticiple: z.string().optional(),
    thirdPerson: z.string().optional(),
    comparative: z.string().optional(),
    superlative: z.string().optional(),
  }).optional(),
  definitions: z.array(definitionSchema).optional(),
  wordFamily: z.object({
    noun: z.array(z.string()).optional(),
    verb: z.array(z.string()).optional(),
    adjective: z.array(z.string()).optional(),
    adverb: z.array(z.string()).optional(),
  }).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  collocations: z.object({
    adjective: z.array(z.string()).optional(),
    verbContract: z.array(z.string()).optional(),
    contractVerb: z.array(z.string()).optional(),
    contractNoun: z.array(z.string()).optional(),
    preposition: z.array(z.string()).optional(),
    phrases: z.array(z.string()).optional(),
  }).optional(),
  idioms: z.array(idiomSchema).optional(),
  usageNotes: z.string().optional(),
  grammarInfo: z.object({
    countable: z.boolean().optional(),
    transitive: z.boolean().optional(),
    patterns: z.array(z.string()).optional(),
  }).optional(),
  register: z.enum(['formal', 'informal', 'neutral', 'slang', 'technical']).optional(),
  extraExamples: z.array(definitionExampleSchema).optional(),
  topics: z.array(topicSchema).optional(),
  wordOrigin: z.string().optional(),
  seeAlso: z.array(z.string()).optional(),
});

const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  vocabularyIds: z.array(z.number()).min(1),
  vocabulary: z.array(vocabularyEnrichmentSchema),
});

interface EnrichmentResult {
  id: number;
  englishWord: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  retried: boolean;
}

export async function enrichVocabulary(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  enriched: EnrichmentResult[];
  message: string;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    retried: number;
  };
  nextStep: {
    tool: string;
    description: string;
  };
}> {
  const input = inputSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  const results: EnrichmentResult[] = [];
  let retriedCount = 0;

  const connection = await db.getConnection();

  for (const vocab of input.vocabulary) {
    // Verify vocabulary exists and belongs to user
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, english_word FROM vocabulary WHERE id = ? AND user_id = ?`,
      [vocab.id, effectiveUserId]
    );

    if (existingRows.length === 0) {
      results.push({
        id: vocab.id,
        englishWord: 'unknown',
        status: 'skipped',
        error: 'Vocabulary not found or not owned by user',
        retried: false,
      });
      continue;
    }

    const englishWord = existingRows[0].english_word;
    let attempts = 0;
    let success = false;
    let lastError: string | undefined;

    // Retry logic: max 2 attempts (1 retry)
    while (attempts < 2 && !success) {
      attempts++;

      try {
        await updateVocabularyDictionary(connection, vocab);
        success = true;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[WARN] Attempt ${attempts} failed for vocabulary ${vocab.id}: ${lastError}`);

        if (attempts < 2) {
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (success) {
      results.push({
        id: vocab.id,
        englishWord,
        status: 'success',
        retried: attempts > 1,
      });
      if (attempts > 1) retriedCount++;
    } else {
      results.push({
        id: vocab.id,
        englishWord,
        status: 'failed',
        error: lastError,
        retried: true,
      });
      retriedCount++;
    }
  }

  connection.release();

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  return {
    success: failed === 0,
    enriched: results,
    message: `Enriched ${succeeded}/${input.vocabulary.length} vocabulary items.${failed > 0 ? ` ${failed} failed after retry.` : ''}${skipped > 0 ? ` ${skipped} skipped.` : ''}`,
    summary: {
      total: input.vocabulary.length,
      succeeded,
      failed,
      retried: retriedCount,
    },
    nextStep: {
      tool: 'generate_exercises',
      description: 'Vocabulary enrichment complete. Call generate_exercises to create practice exercises.',
    },
  };
}

async function updateVocabularyDictionary(
  connection: any,
  vocab: z.infer<typeof vocabularyEnrichmentSchema>
): Promise<void> {
  // Build JSON values
  const wordFormsJson = vocab.wordForms && Object.keys(vocab.wordForms).length > 0
    ? JSON.stringify(vocab.wordForms) : null;

  let definitionsJson = null;
  if (vocab.definitions && vocab.definitions.length > 0) {
    definitionsJson = JSON.stringify(
      vocab.definitions.map((def, index) => ({
        senseId: index + 1,
        ...def,
      }))
    );
  }

  const wordFamilyJson = vocab.wordFamily && Object.keys(vocab.wordFamily).length > 0
    ? JSON.stringify(vocab.wordFamily) : null;
  const synonymsJson = vocab.synonyms && vocab.synonyms.length > 0
    ? JSON.stringify(vocab.synonyms) : null;
  const antonymsJson = vocab.antonyms && vocab.antonyms.length > 0
    ? JSON.stringify(vocab.antonyms) : null;
  const collocationsJson = vocab.collocations && Object.keys(vocab.collocations).length > 0
    ? JSON.stringify(vocab.collocations) : null;
  const idiomsJson = vocab.idioms && vocab.idioms.length > 0
    ? JSON.stringify(vocab.idioms) : null;
  const grammarInfoJson = vocab.grammarInfo && Object.keys(vocab.grammarInfo).length > 0
    ? JSON.stringify(vocab.grammarInfo) : null;
  const topicsJson = vocab.topics && vocab.topics.length > 0
    ? JSON.stringify(vocab.topics) : null;
  const extraExamplesJson = vocab.extraExamples && vocab.extraExamples.length > 0
    ? JSON.stringify(vocab.extraExamples) : null;
  const seeAlsoJson = vocab.seeAlso && vocab.seeAlso.length > 0
    ? JSON.stringify(vocab.seeAlso) : null;

  // Build dynamic UPDATE query for V2 vocabulary table
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (vocab.pronunciationUk) {
    updates.push('pronunciation_uk = ?');
    values.push(vocab.pronunciationUk);
  }
  if (vocab.pronunciationUs) {
    updates.push('pronunciation_us = ?');
    values.push(vocab.pronunciationUs);
  }
  if (wordFormsJson) {
    updates.push('word_forms = ?');
    values.push(wordFormsJson);
  }
  if (definitionsJson) {
    updates.push('definitions = ?');
    values.push(definitionsJson);
  }
  if (wordFamilyJson) {
    updates.push('word_family = ?');
    values.push(wordFamilyJson);
  }
  if (synonymsJson) {
    updates.push('synonyms = ?');
    values.push(synonymsJson);
  }
  if (antonymsJson) {
    updates.push('antonyms = ?');
    values.push(antonymsJson);
  }
  if (collocationsJson) {
    updates.push('collocations = ?');
    values.push(collocationsJson);
  }
  if (idiomsJson) {
    updates.push('idioms = ?');
    values.push(idiomsJson);
  }
  if (vocab.usageNotes) {
    updates.push('usage_notes = ?');
    values.push(vocab.usageNotes);
  }
  if (grammarInfoJson) {
    updates.push('grammar_info = ?');
    values.push(grammarInfoJson);
  }
  if (vocab.register) {
    updates.push('register = ?');
    values.push(vocab.register);
  }
  if (extraExamplesJson) {
    updates.push('extra_examples = ?');
    values.push(extraExamplesJson);
  }
  if (topicsJson) {
    updates.push('topics = ?');
    values.push(topicsJson);
  }
  if (vocab.wordOrigin) {
    updates.push('word_origin = ?');
    values.push(vocab.wordOrigin);
  }
  if (seeAlsoJson) {
    updates.push('see_also = ?');
    values.push(seeAlsoJson);
  }

  if (updates.length === 0) {
    // Nothing to update
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(vocab.id.toString());

  // Update V2 vocabulary table
  const query = `UPDATE vocabulary SET ${updates.join(', ')} WHERE id = ?`;
  await connection.execute(query, values);

  // Dual-write: Also update master_vocabulary in V3 if enabled
  if (shouldWriteToV3()) {
    await dualWriteEnrichmentToV3(connection, vocab.id, vocab);
  }
}

/**
 * Dual-write enrichment data to V3 master_vocabulary table
 * Finds the linked master_vocabulary via user_vocabulary and updates it
 */
async function dualWriteEnrichmentToV3(
  connection: any,
  v2VocabId: number,
  vocab: z.infer<typeof vocabularyEnrichmentSchema>
): Promise<void> {
  try {
    logDualWrite('enrich_v3_start', { v2VocabId });

    // First, get the english_word and part_of_speech from V2 vocabulary
    const [v2Rows] = await connection.execute(
      `SELECT english_word, part_of_speech FROM vocabulary WHERE id = ?`,
      [v2VocabId]
    ) as [RowDataPacket[], any];

    if (v2Rows.length === 0) {
      logDualWrite('enrich_v3_skip', { v2VocabId, reason: 'V2 vocabulary not found' });
      return;
    }

    const { english_word, part_of_speech } = v2Rows[0];

    // Find the corresponding master_vocabulary entry
    const [masterRows] = await connection.execute(
      `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
      [english_word, part_of_speech]
    ) as [RowDataPacket[], any];

    if (masterRows.length === 0) {
      logDualWrite('enrich_v3_skip', { v2VocabId, reason: 'No matching master_vocabulary found' });
      return;
    }

    const masterVocabId = masterRows[0].id;

    // Build update query for master_vocabulary
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (vocab.pronunciationUk) {
      updates.push('pronunciation_uk = ?');
      values.push(vocab.pronunciationUk);
    }
    if (vocab.pronunciationUs) {
      updates.push('pronunciation_us = ?');
      values.push(vocab.pronunciationUs);
    }
    if (vocab.wordForms && Object.keys(vocab.wordForms).length > 0) {
      updates.push('word_forms = ?');
      values.push(JSON.stringify(vocab.wordForms));
    }
    if (vocab.definitions && vocab.definitions.length > 0) {
      updates.push('definitions = ?');
      values.push(JSON.stringify(
        vocab.definitions.map((def, index) => ({
          senseId: index + 1,
          ...def,
        }))
      ));
    }
    if (vocab.wordFamily && Object.keys(vocab.wordFamily).length > 0) {
      updates.push('word_family = ?');
      values.push(JSON.stringify(vocab.wordFamily));
    }
    if (vocab.synonyms && vocab.synonyms.length > 0) {
      updates.push('synonyms = ?');
      values.push(JSON.stringify(vocab.synonyms));
    }
    if (vocab.antonyms && vocab.antonyms.length > 0) {
      updates.push('antonyms = ?');
      values.push(JSON.stringify(vocab.antonyms));
    }
    if (vocab.collocations && Object.keys(vocab.collocations).length > 0) {
      updates.push('collocations = ?');
      values.push(JSON.stringify(vocab.collocations));
    }
    if (vocab.usageNotes) {
      updates.push('usage_notes = ?');
      values.push(vocab.usageNotes);
    }
    if (vocab.grammarInfo && Object.keys(vocab.grammarInfo).length > 0) {
      updates.push('grammar_info = ?');
      values.push(JSON.stringify(vocab.grammarInfo));
    }
    if (vocab.extraExamples && vocab.extraExamples.length > 0) {
      updates.push('extra_examples = ?');
      values.push(JSON.stringify(vocab.extraExamples));
    }
    if (vocab.topics && vocab.topics.length > 0) {
      updates.push('topics = ?');
      values.push(JSON.stringify(vocab.topics));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(masterVocabId.toString());

      const query = `UPDATE master_vocabulary SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      logDualWrite('enrich_v3_success', { v2VocabId, masterVocabId });
    }
  } catch (error) {
    // Log error but don't fail the V2 update
    console.error('[MCP-DUAL-WRITE] Failed to enrich vocabulary in V3:', error);
    logDualWrite('enrich_v3_error', {
      v2VocabId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
