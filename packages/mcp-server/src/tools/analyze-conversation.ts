import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';

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

Use this when user tells you about their day in Vietnamese and wants to learn English from it.

=== DICTIONARY DATA (Oxford Learner's Dictionary format) ===

For EACH vocabulary word, you MUST provide ALL these fields for rich dictionary entries:

1. PRONUNCIATION: pronunciationUk with UK IPA (e.g., "/ˈkɒntrækt/"), pronunciationUs if different

2. WORD FORMS: For nouns: plural. For verbs: past, pastParticiple, presentParticiple, thirdPerson. For adjectives: comparative, superlative

3. DEFINITIONS (provide 2-3 senses): Each with definition, definitionVi, grammar label, register, 2+ examples with translations, patterns

4. COLLOCATIONS (REQUIRED): adjective (adjectives that go with word), verbContract (verb + this word), contractNoun (this word + noun), preposition, phrases - these help learners use words naturally

5. WORD FAMILY (REQUIRED): noun, verb, adjective, adverb forms of the word

6. SYNONYMS (REQUIRED) & ANTONYMS: List related words that learner can use interchangeably

7. GRAMMAR INFO: countable (for nouns), transitive (for verbs), patterns

8. CEFR LEVEL: A1, A2, B1, B2, C1, or C2

9. USAGE NOTES: Common mistakes, British vs American, formal vs informal

10. TOPICS: Array of { name: "Business", level: "B2" }

11. EXTRA EXAMPLES (REQUIRED - 3-5 sentences): Additional example sentences showing the word in different contexts. This is CRITICAL for learners to understand real-world usage!

=== EXAMPLE ===
{"englishWord":"contract","vietnameseWord":"hop dong","partOfSpeech":"noun","pronunciationUk":"/ˈkɒntrækt/","pronunciationUs":"/ˈkɑːntrækt/","cefrLevel":"B2","wordForms":{"plural":"contracts"},"definitions":[{"definition":"an official written agreement","definitionVi":"thoa thuan chinh thuc","grammar":"[countable]","register":"formal","examples":[{"en":"They signed a five-year contract.","vi":"Ho ky hop dong 5 nam."}],"patterns":["contract with sb","under contract"]}],"collocations":{"adjective":["written","legal","binding"],"verbContract":["sign","negotiate","break"],"phrases":["breach of contract","under contract"]},"wordFamily":{"noun":["contract","contractor","contraction"],"verb":["contract"],"adjective":["contractual","contracted"]},"synonyms":["agreement","deal","arrangement"],"grammarInfo":{"countable":true},"usageNotes":"More formal than agreement in legal contexts","topics":[{"name":"Law","level":"C1"}],"extraExamples":[{"en":"The company won a contract to build the new stadium.","vi":"Công ty đã giành được hợp đồng xây dựng sân vận động mới."},{"en":"Her contract expires at the end of the year.","vi":"Hợp đồng của cô ấy hết hạn vào cuối năm."},{"en":"Read the contract carefully before you sign it.","vi":"Đọc kỹ hợp đồng trước khi ký."},{"en":"They were sued for breach of contract.","vi":"Họ bị kiện vì vi phạm hợp đồng."}]}`,
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
            phonetic: { type: 'string', description: 'IPA pronunciation (UK)' },
            partOfSpeech: {
              type: 'string',
              enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'],
            },
            exampleSentenceVi: { type: 'string' },
            exampleSentenceEn: { type: 'string' },
            // New dictionary fields
            pronunciationUk: { type: 'string', description: 'UK IPA pronunciation' },
            pronunciationUs: { type: 'string', description: 'US IPA pronunciation (if different)' },
            wordForms: {
              type: 'object',
              description: 'Word forms (plural, past, etc.)',
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
              description: 'REQUIRED - At least 2 definitions with examples',
              items: {
                type: 'object',
                properties: {
                  definition: { type: 'string', description: 'English definition' },
                  definitionVi: { type: 'string', description: 'Vietnamese translation of definition' },
                  grammar: { type: 'string', description: 'Grammar label like [countable], [transitive]' },
                  register: { type: 'string', enum: ['formal', 'informal', 'neutral', 'slang', 'technical'] },
                  examples: {
                    type: 'array',
                    description: 'At least 2 example sentences',
                    items: {
                      type: 'object',
                      properties: {
                        en: { type: 'string' },
                        vi: { type: 'string' },
                      },
                      required: ['en', 'vi'],
                    },
                  },
                  patterns: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Usage patterns like "contract with somebody"',
                  },
                },
                required: ['definition', 'definitionVi', 'examples'],
              },
            },
            wordFamily: {
              type: 'object',
              description: 'Related words by part of speech',
              properties: {
                noun: { type: 'array', items: { type: 'string' } },
                verb: { type: 'array', items: { type: 'string' } },
                adjective: { type: 'array', items: { type: 'string' } },
                adverb: { type: 'array', items: { type: 'string' } },
              },
            },
            synonyms: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of synonyms',
            },
            antonyms: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of antonyms',
            },
            collocations: {
              type: 'object',
              description: 'Common word combinations - REQUIRED',
              properties: {
                adjective: { type: 'array', items: { type: 'string' }, description: 'Adjectives that go with this word' },
                verbContract: { type: 'array', items: { type: 'string' }, description: 'Verbs + this word' },
                contractVerb: { type: 'array', items: { type: 'string' }, description: 'This word + verbs' },
                contractNoun: { type: 'array', items: { type: 'string' }, description: 'This word + nouns' },
                preposition: { type: 'array', items: { type: 'string' }, description: 'Preposition patterns' },
                phrases: { type: 'array', items: { type: 'string' }, description: 'Common phrases' },
              },
            },
            grammarInfo: {
              type: 'object',
              description: 'Grammar information - REQUIRED',
              properties: {
                countable: { type: 'boolean', description: 'For nouns: is it countable?' },
                transitive: { type: 'boolean', description: 'For verbs: is it transitive?' },
                patterns: { type: 'array', items: { type: 'string' } },
              },
            },
            cefrLevel: {
              type: 'string',
              enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
              description: 'CEFR proficiency level - REQUIRED',
            },
            register: {
              type: 'string',
              enum: ['formal', 'informal', 'neutral', 'slang', 'technical'],
            },
            usageNotes: {
              type: 'string',
              description: 'Usage notes and tips',
            },
            topics: {
              type: 'array',
              description: 'Topic categories with CEFR level',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  level: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
                },
              },
            },
            extraExamples: {
              type: 'array',
              description: 'REQUIRED - Additional example sentences (at least 3-5) to help understand word usage in different contexts',
              items: {
                type: 'object',
                properties: {
                  en: { type: 'string', description: 'English example sentence' },
                  vi: { type: 'string', description: 'Vietnamese translation' },
                },
                required: ['en', 'vi'],
              },
            },
          },
          required: ['vietnameseWord', 'englishWord', 'partOfSpeech', 'pronunciationUk', 'definitions', 'cefrLevel', 'wordFamily', 'synonyms', 'antonyms', 'collocations', 'grammarInfo', 'usageNotes', 'extraExamples'],
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

// Definition example schema
const definitionExampleSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

// Definition schema
const definitionSchema = z.object({
  definition: z.string(),
  definitionVi: z.string(),
  grammar: z.string().optional(),
  register: z.enum(['formal', 'informal', 'neutral', 'slang', 'technical']).optional(),
  examples: z.array(definitionExampleSchema).default([]),
  patterns: z.array(z.string()).optional(),
});

// Topic schema
const topicSchema = z.object({
  name: z.string(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
});

// Input validation schema
const inputSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(), // Injected by handler from user context
  vietnameseText: z.string().min(1),
  englishTranslation: z.string().min(1),
  vocabulary: z.array(z.object({
    vietnameseWord: z.string(),
    englishWord: z.string(),
    phonetic: z.string().optional(),
    partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']),
    exampleSentenceVi: z.string().optional(),
    exampleSentenceEn: z.string().optional(),
    // New dictionary fields
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
    }).default({}),
    synonyms: z.array(z.string()).default([]),
    antonyms: z.array(z.string()).optional(),
    collocations: z.object({
      adjective: z.array(z.string()).optional(),
      verbContract: z.array(z.string()).optional(),
      contractVerb: z.array(z.string()).optional(),
      contractNoun: z.array(z.string()).optional(),
      preposition: z.array(z.string()).optional(),
      phrases: z.array(z.string()).optional(),
    }).default({}),
    grammarInfo: z.object({
      countable: z.boolean().optional(),
      transitive: z.boolean().optional(),
      patterns: z.array(z.string()).optional(),
    }).optional(),
    cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
    register: z.enum(['formal', 'informal', 'neutral', 'slang', 'technical']).optional(),
    usageNotes: z.string().optional(),
    topics: z.array(topicSchema).optional(),
    extraExamples: z.array(definitionExampleSchema).default([]),
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

  // Use explicit userId if provided, otherwise use resolved userId from env auth, fallback to 1
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Start transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Insert conversation
    const [conversationResult] = await connection.execute(
      `INSERT INTO conversations (user_id, vietnamese_text, english_translation, topic, difficulty_level, ai_analysis)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        effectiveUserId,
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

    const conversationId = (conversationResult as { insertId: number }).insertId;

    // 2. UPSERT vocabulary items with dictionary fields
    // New schema: vocabulary is unique per (user_id, english_word, part_of_speech)
    // Context-specific data (vietnamese_word, examples) goes to vocabulary_contexts
    for (const vocab of input.vocabulary) {
      // Build definitions JSON with senseId
      let definitionsJson = null;
      if (vocab.definitions && vocab.definitions.length > 0) {
        definitionsJson = JSON.stringify(
          vocab.definitions.map((def, index) => ({
            senseId: index + 1,
            ...def,
          }))
        );
      }

      // Prepare JSON values - use JSON.stringify for any non-empty data
      const wordFormsJson = vocab.wordForms && Object.keys(vocab.wordForms).length > 0
        ? JSON.stringify(vocab.wordForms) : null;
      const wordFamilyJson = vocab.wordFamily && Object.keys(vocab.wordFamily).length > 0
        ? JSON.stringify(vocab.wordFamily) : null;
      const synonymsJson = vocab.synonyms && vocab.synonyms.length > 0
        ? JSON.stringify(vocab.synonyms) : null;
      const antonymsJson = vocab.antonyms && vocab.antonyms.length > 0
        ? JSON.stringify(vocab.antonyms) : null;
      const collocationsJson = vocab.collocations && Object.keys(vocab.collocations).length > 0
        ? JSON.stringify(vocab.collocations) : null;
      const grammarInfoJson = vocab.grammarInfo && Object.keys(vocab.grammarInfo).length > 0
        ? JSON.stringify(vocab.grammarInfo) : null;
      const topicsJson = vocab.topics && vocab.topics.length > 0
        ? JSON.stringify(vocab.topics) : null;
      const extraExamplesJson = vocab.extraExamples && vocab.extraExamples.length > 0
        ? JSON.stringify(vocab.extraExamples) : null;

      // First, try to INSERT with basic fields only (to handle unique constraint)
      // Then UPDATE with dictionary data
      await connection.execute(
        `INSERT INTO vocabulary (
          user_id, vietnamese_word, english_word, phonetic,
          part_of_speech, difficulty_level,
          pronunciation_uk, pronunciation_us, cefr_level, register
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          vietnamese_word = VALUES(vietnamese_word),
          phonetic = COALESCE(VALUES(phonetic), phonetic),
          pronunciation_uk = COALESCE(VALUES(pronunciation_uk), pronunciation_uk),
          pronunciation_us = COALESCE(VALUES(pronunciation_us), pronunciation_us),
          cefr_level = COALESCE(VALUES(cefr_level), cefr_level),
          updated_at = CURRENT_TIMESTAMP`,
        [
          effectiveUserId,
          vocab.vietnameseWord,
          vocab.englishWord,
          vocab.phonetic || vocab.pronunciationUk || null,
          vocab.partOfSpeech,
          input.difficultyLevel,
          vocab.pronunciationUk || vocab.phonetic || null,
          vocab.pronunciationUs || null,
          vocab.cefrLevel || null,
          vocab.register || 'neutral',
        ]
      );

      // Get the vocabulary ID
      const [vocabIdRows] = await connection.execute(
        `SELECT id FROM vocabulary WHERE user_id = ? AND english_word = ? AND part_of_speech = ?`,
        [effectiveUserId, vocab.englishWord, vocab.partOfSpeech]
      );
      const vocabularyId = (vocabIdRows as { id: number }[])[0].id;

      // Update dictionary fields separately (ensures they get set even on existing records)
      if (wordFamilyJson || synonymsJson || definitionsJson || extraExamplesJson || collocationsJson) {
        try {
          await connection.execute(
            `UPDATE vocabulary SET
              word_forms = COALESCE(?, word_forms),
              definitions = COALESCE(?, definitions),
              word_family = COALESCE(?, word_family),
              synonyms = COALESCE(?, synonyms),
              antonyms = COALESCE(?, antonyms),
              collocations = COALESCE(?, collocations),
              grammar_info = COALESCE(?, grammar_info),
              usage_notes = COALESCE(?, usage_notes),
              topics = COALESCE(?, topics),
              extra_examples = COALESCE(?, extra_examples),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              wordFormsJson,
              definitionsJson,
              wordFamilyJson,
              synonymsJson,
              antonymsJson,
              collocationsJson,
              grammarInfoJson,
              vocab.usageNotes || null,
              topicsJson,
              extraExamplesJson,
              vocabularyId,
            ]
          );
        } catch (updateError) {
          // Log error but don't fail - dictionary columns might not exist in older schemas
          console.error(`[WARN] Failed to update dictionary fields for ${vocab.englishWord}: ${updateError}`);
        }
      }

      // vocabularyId already obtained above

      // Insert context-specific data into vocabulary_contexts
      // This links the vocabulary to this specific conversation with context-specific translations/examples
      await connection.execute(
        `INSERT INTO vocabulary_contexts (vocabulary_id, conversation_id, vietnamese_word, example_sentence_vi, example_sentence_en)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           vietnamese_word = VALUES(vietnamese_word),
           example_sentence_vi = COALESCE(VALUES(example_sentence_vi), example_sentence_vi),
           example_sentence_en = COALESCE(VALUES(example_sentence_en), example_sentence_en)`,
        [
          vocabularyId,
          conversationId,
          vocab.vietnameseWord,
          vocab.exampleSentenceVi || null,
          vocab.exampleSentenceEn || null,
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
          effectiveUserId,
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
        effectiveUserId,
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
      [effectiveUserId, input.vocabulary.length, input.vocabulary.length]
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
