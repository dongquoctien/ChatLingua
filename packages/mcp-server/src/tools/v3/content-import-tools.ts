import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Tool Definitions
// ============================================================

export const importVocabularyTool: Tool = {
  name: 'import_vocabulary',
  description: `[ADMIN] Import vocabulary to master vocabulary table.

Adds new vocabulary entries to the master_vocabulary table.
Use this to bulk import vocabulary for lessons.
Duplicates are checked by english_word + part_of_speech.`,
  inputSchema: {
    type: 'object',
    properties: {
      vocabulary: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            englishWord: { type: 'string' },
            vietnameseWord: { type: 'string' },
            phonetic: { type: 'string' },
            partOfSpeech: {
              type: 'string',
              enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'],
            },
            cefrLevel: {
              type: 'string',
              enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            },
            definitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  definition: { type: 'string' },
                  definitionVi: { type: 'string' },
                  examples: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        en: { type: 'string' },
                        vi: { type: 'string' },
                      },
                    },
                  },
                },
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
            collocations: { type: 'object' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['englishWord', 'vietnameseWord', 'partOfSpeech', 'cefrLevel'],
        },
        description: 'Array of vocabulary entries to import',
      },
      skipDuplicates: {
        type: 'boolean',
        description: 'Skip entries that already exist (default: true)',
      },
    },
    required: ['vocabulary'],
  },
};

export const importGrammarTool: Tool = {
  name: 'import_grammar',
  description: `[ADMIN] Import grammar points to master grammar table.

Adds new grammar entries to the master_grammar table.
Use this to bulk import grammar rules for lessons.`,
  inputSchema: {
    type: 'object',
    properties: {
      grammar: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            grammarRule: { type: 'string' },
            category: { type: 'string' },
            cefrLevel: {
              type: 'string',
              enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            },
            explanation: { type: 'string' },
            explanationVi: { type: 'string' },
            formula: { type: 'string' },
            examples: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  en: { type: 'string' },
                  vi: { type: 'string' },
                },
              },
            },
            commonMistakes: { type: 'array', items: { type: 'string' } },
            tips: { type: 'string' },
            relatedGrammar: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['grammarRule', 'category', 'cefrLevel', 'explanation', 'explanationVi'],
        },
        description: 'Array of grammar points to import',
      },
    },
    required: ['grammar'],
  },
};

export const importExercisesTool: Tool = {
  name: 'import_exercises',
  description: `[ADMIN] Import exercises to master exercises table.

Adds new exercises to the master_exercises table.
Supports all exercise types: multiple_choice, fill_blank, translation, etc.`,
  inputSchema: {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exerciseType: {
              type: 'string',
              enum: ['multiple_choice', 'fill_blank', 'translation', 'sentence_building', 'matching', 'spelling', 'listening', 'error_correction', 'verb_conjugation', 'cloze'],
            },
            category: { type: 'string' },
            cefrLevel: {
              type: 'string',
              enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            },
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correctAnswer: { type: 'string' },
            explanation: { type: 'string' },
            hint: { type: 'string' },
            audioUrl: { type: 'string' },
            imageUrl: { type: 'string' },
            exerciseData: { type: 'object' },
            relatedVocabularyIds: { type: 'array', items: { type: 'number' } },
            relatedGrammarIds: { type: 'array', items: { type: 'number' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['exerciseType', 'question', 'correctAnswer'],
        },
        description: 'Array of exercises to import',
      },
    },
    required: ['exercises'],
  },
};

export const createWordMapTool: Tool = {
  name: 'create_word_map',
  description: `[ADMIN] Create a new Word Map (curriculum course).

Creates the Word Map structure including units and lessons.
Returns the created map ID for adding content.`,
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Word Map name' },
      description: { type: 'string', description: 'Word Map description' },
      level: {
        type: 'string',
        enum: ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'proficient'],
        description: 'Difficulty level',
      },
      cefrLevel: {
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        description: 'CEFR level',
      },
      coverImageUrl: { type: 'string', description: 'Cover image URL' },
      publisher: { type: 'string', description: 'Publisher name' },
      estimatedHours: { type: 'number', description: 'Estimated completion hours' },
      isFree: { type: 'boolean', description: 'Is free to access' },
      priceCoins: { type: 'number', description: 'Price in coins (if not free)' },
      isFeatured: { type: 'boolean', description: 'Featured on homepage' },
      units: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            theme: { type: 'string' },
            description: { type: 'string' },
            thumbnailUrl: { type: 'string' },
            isReviewUnit: { type: 'boolean' },
            bossPassingScore: { type: 'number' },
            completionXp: { type: 'number' },
            lessons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  lessonType: {
                    type: 'string',
                    enum: ['vocabulary', 'grammar', 'mixed', 'review', 'conversation', 'listening', 'reading'],
                  },
                  description: { type: 'string' },
                  videoUrl: { type: 'string' },
                  audioUrl: { type: 'string' },
                  estimatedMinutes: { type: 'number' },
                  studyXp: { type: 'number' },
                  examXp: { type: 'number' },
                  hasBossExam: { type: 'boolean' },
                },
                required: ['title', 'lessonType'],
              },
            },
          },
          required: ['name', 'lessons'],
        },
        description: 'Units with their lessons',
      },
    },
    required: ['name', 'level', 'cefrLevel', 'units'],
  },
};

export const addLessonContentTool: Tool = {
  name: 'add_lesson_content',
  description: `[ADMIN] Add content to a lesson.

Links master vocabulary, grammar, or exercises to a lesson.
Content is displayed in the order specified.`,
  inputSchema: {
    type: 'object',
    properties: {
      lessonId: {
        type: 'number',
        description: 'Unit Lesson ID',
      },
      content: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              enum: ['vocabulary', 'grammar', 'exercise'],
              description: 'Type of content',
            },
            masterContentId: {
              type: 'number',
              description: 'ID from master_vocabulary, master_grammar, or master_exercises',
            },
            customContent: {
              type: 'object',
              description: 'Custom content if not using master content',
            },
            section: {
              type: 'string',
              description: 'Section name for grouping',
            },
          },
          required: ['contentType'],
        },
        description: 'Content items to add',
      },
    },
    required: ['lessonId', 'content'],
  },
};

export const importAudioTracksTool: Tool = {
  name: 'import_audio_tracks',
  description: `[ADMIN] Import audio tracks and auto-link to units/lessons.

Parses audio filenames using a pattern and automatically links them to the corresponding lessons.
Useful for bulk importing audio files from textbooks like Evolve.

=== NAMING PATTERN ===

The pattern uses placeholders to extract information from filenames:
- {track} - Track number
- {sub} - Sub-track number (optional)
- {unit} - Unit number
- {page} - Page number
- {ex} - Exercise identifier

Example pattern: "Track {track}.{sub} [EV_SB1_U{unit}_p{page}_Ex{ex}]"
Example filename: "Track 01.02 [EV_SB1_U1_p8_ExA].mp3"

=== RETURNS ===
- linked: Number of tracks successfully linked to lessons
- unlinked: Number of tracks that couldn't be matched
- details: Array of link results with file names and lesson IDs`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID to link audio tracks to',
      },
      audioFolder: {
        type: 'string',
        description: 'Path to folder containing audio files',
      },
      namingPattern: {
        type: 'string',
        description: 'Filename pattern with placeholders like {track}, {unit}, {page}, {ex}',
      },
      audioBaseUrl: {
        type: 'string',
        description: 'Base URL prefix for audio files (default: /audio)',
      },
    },
    required: ['mapId', 'audioFolder', 'namingPattern'],
  },
};

export const importEvolveContentTool: Tool = {
  name: 'import_evolve_content',
  description: `[ADMIN] Import vocabulary/grammar from Evolve textbook structure.

Imports structured content from the Evolve textbook series and links it to Word Map lessons.
Supports bulk import of vocabulary with full dictionary data and grammar points.

=== CONTENT STRUCTURE ===

Each vocabulary item can include:
- englishWord, vietnameseWord (required)
- partOfSpeech, cefrLevel, phonetic
- definitions with examples
- wordFamily, synonyms, antonyms, collocations

Each grammar point can include:
- grammarRule, category (required)
- explanation, explanationVi
- formula, examples, commonMistakes, tips

=== LINKING ===

Content is automatically linked to the specified unit's lessons based on:
- lessonNumber: Which lesson in the unit to add content to
- If not specified, content is added to master tables only`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID',
      },
      unitNumber: {
        type: 'number',
        description: 'Unit number within the Word Map',
      },
      lessonNumber: {
        type: 'number',
        description: 'Lesson number within the unit (optional)',
      },
      contentType: {
        type: 'string',
        enum: ['vocabulary', 'grammar', 'both'],
        description: 'Type of content to import',
      },
      vocabulary: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            englishWord: { type: 'string' },
            vietnameseWord: { type: 'string' },
            phonetic: { type: 'string' },
            partOfSpeech: { type: 'string' },
            cefrLevel: { type: 'string' },
            definitions: { type: 'array' },
            wordFamily: { type: 'object' },
            synonyms: { type: 'array' },
            antonyms: { type: 'array' },
            collocations: { type: 'object' },
            extraExamples: { type: 'array' },
            section: { type: 'string', description: 'Section within lesson (e.g., "Vocabulary A")' },
          },
          required: ['englishWord', 'vietnameseWord'],
        },
        description: 'Vocabulary items to import',
      },
      grammar: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            grammarRule: { type: 'string' },
            category: { type: 'string' },
            cefrLevel: { type: 'string' },
            explanation: { type: 'string' },
            explanationVi: { type: 'string' },
            formula: { type: 'string' },
            examples: { type: 'array' },
            commonMistakes: { type: 'array' },
            tips: { type: 'string' },
            section: { type: 'string', description: 'Section within lesson (e.g., "Grammar Focus")' },
          },
          required: ['grammarRule', 'category'],
        },
        description: 'Grammar points to import',
      },
    },
    required: ['mapId', 'contentType'],
  },
};

export const parsePdfStructureTool: Tool = {
  name: 'parse_pdf_structure',
  description: `[ADMIN] Parse textbook PDF and extract unit/lesson structure.

This tool helps extract the table of contents and structure from a textbook PDF
to automatically create Word Map units and lessons.

=== HOW IT WORKS ===

1. Provide the PDF file path
2. Optionally provide a mapId to link to existing Word Map
3. Tool extracts:
   - Unit titles and numbers
   - Lesson titles and types
   - Page references

=== OUTPUT ===

Returns a structured representation of the textbook that can be used with create_word_map tool.
Note: This tool extracts structure metadata only. You need to manually verify and adjust the output.`,
  inputSchema: {
    type: 'object',
    properties: {
      pdfPath: {
        type: 'string',
        description: 'Path to the textbook PDF file',
      },
      mapId: {
        type: 'number',
        description: 'Existing Word Map ID to update (optional, creates new if not provided)',
      },
      startPage: {
        type: 'number',
        description: 'Page number where table of contents starts (default: 1)',
      },
      endPage: {
        type: 'number',
        description: 'Page number where table of contents ends',
      },
      unitPattern: {
        type: 'string',
        description: 'Regex pattern to identify unit titles (default: "Unit\\s+(\\d+)")',
      },
      lessonPattern: {
        type: 'string',
        description: 'Regex pattern to identify lesson titles',
      },
    },
    required: ['pdfPath'],
  },
};

export const linkMediaResourceTool: Tool = {
  name: 'link_media_resource',
  description: `[ADMIN] Link a media resource (audio, video, image) to a lesson.

Creates a media_resources entry and links it to the specified lesson.
Use this after uploading files to associate them with lesson content.`,
  inputSchema: {
    type: 'object',
    properties: {
      lessonId: {
        type: 'number',
        description: 'Unit Lesson ID to link media to',
      },
      resourceType: {
        type: 'string',
        enum: ['audio', 'video', 'image', 'document'],
        description: 'Type of media resource',
      },
      resourceUrl: {
        type: 'string',
        description: 'URL or path to the media file',
      },
      title: {
        type: 'string',
        description: 'Display title for the resource',
      },
      description: {
        type: 'string',
        description: 'Optional description',
      },
      duration: {
        type: 'number',
        description: 'Duration in seconds (for audio/video)',
      },
      transcript: {
        type: 'string',
        description: 'Transcript text (for audio/video)',
      },
      section: {
        type: 'string',
        description: 'Section within lesson to display this resource',
      },
    },
    required: ['lessonId', 'resourceType', 'resourceUrl'],
  },
};

// ============================================================
// Zod Schemas
// ============================================================

const vocabularyEntrySchema = z.object({
  englishWord: z.string(),
  vietnameseWord: z.string(),
  phonetic: z.string().optional(),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  definitions: z.array(z.object({
    definition: z.string(),
    definitionVi: z.string().optional(),
    examples: z.array(z.object({
      en: z.string(),
      vi: z.string().optional(),
    })).optional(),
  })).optional(),
  wordFamily: z.object({
    noun: z.array(z.string()).optional(),
    verb: z.array(z.string()).optional(),
    adjective: z.array(z.string()).optional(),
    adverb: z.array(z.string()).optional(),
  }).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  collocations: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const importVocabularySchema = z.object({
  vocabulary: z.array(vocabularyEntrySchema),
  skipDuplicates: z.boolean().optional().default(true),
});

const grammarEntrySchema = z.object({
  grammarRule: z.string(),
  category: z.string(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  explanation: z.string(),
  explanationVi: z.string(),
  formula: z.string().optional(),
  examples: z.array(z.object({
    en: z.string(),
    vi: z.string().optional(),
  })).optional(),
  commonMistakes: z.array(z.string()).optional(),
  tips: z.string().optional(),
  relatedGrammar: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const importGrammarSchema = z.object({
  grammar: z.array(grammarEntrySchema),
});

const exerciseEntrySchema = z.object({
  exerciseType: z.enum(['multiple_choice', 'fill_blank', 'translation', 'sentence_building', 'matching', 'spelling', 'listening', 'error_correction', 'verb_conjugation', 'cloze']),
  category: z.string().optional(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  hint: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  exerciseData: z.record(z.unknown()).optional(),
  relatedVocabularyIds: z.array(z.number()).optional(),
  relatedGrammarIds: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
});

const importExercisesSchema = z.object({
  exercises: z.array(exerciseEntrySchema),
});

const lessonSchema = z.object({
  title: z.string(),
  lessonType: z.enum(['vocabulary', 'grammar', 'mixed', 'review', 'conversation', 'listening', 'reading']),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  estimatedMinutes: z.number().optional().default(15),
  studyXp: z.number().optional().default(10),
  examXp: z.number().optional().default(20),
  hasBossExam: z.boolean().optional().default(false),
});

const unitSchema = z.object({
  name: z.string(),
  theme: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isReviewUnit: z.boolean().optional().default(false),
  bossPassingScore: z.number().optional().default(70),
  completionXp: z.number().optional().default(50),
  lessons: z.array(lessonSchema),
});

const createWordMapSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  level: z.enum(['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'proficient']),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  coverImageUrl: z.string().optional(),
  publisher: z.string().optional(),
  estimatedHours: z.number().optional(),
  isFree: z.boolean().optional().default(true),
  priceCoins: z.number().optional().default(0),
  isFeatured: z.boolean().optional().default(false),
  units: z.array(unitSchema),
});

const contentItemSchema = z.object({
  contentType: z.enum(['vocabulary', 'grammar', 'exercise']),
  masterContentId: z.number().optional(),
  customContent: z.record(z.unknown()).optional(),
  section: z.string().optional(),
});

const addLessonContentSchema = z.object({
  lessonId: z.number(),
  content: z.array(contentItemSchema),
});

const importAudioTracksSchema = z.object({
  mapId: z.number(),
  audioFolder: z.string(),
  namingPattern: z.string(),
  audioBaseUrl: z.string().optional().default('/audio'),
});

const evolveVocabularySchema = z.object({
  englishWord: z.string(),
  vietnameseWord: z.string(),
  phonetic: z.string().optional(),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase']).optional().default('noun'),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional().default('A2'),
  definitions: z.array(z.object({
    definition: z.string(),
    definitionVi: z.string().optional(),
    examples: z.array(z.object({
      en: z.string(),
      vi: z.string().optional(),
    })).optional(),
  })).optional(),
  wordFamily: z.object({
    noun: z.array(z.string()).optional(),
    verb: z.array(z.string()).optional(),
    adjective: z.array(z.string()).optional(),
    adverb: z.array(z.string()).optional(),
  }).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  collocations: z.record(z.unknown()).optional(),
  extraExamples: z.array(z.object({
    en: z.string(),
    vi: z.string().optional(),
  })).optional(),
  section: z.string().optional(),
});

const evolveGrammarSchema = z.object({
  grammarRule: z.string(),
  category: z.string(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional().default('A2'),
  explanation: z.string().optional(),
  explanationVi: z.string().optional(),
  formula: z.string().optional(),
  examples: z.array(z.object({
    en: z.string(),
    vi: z.string().optional(),
  })).optional(),
  commonMistakes: z.array(z.string()).optional(),
  tips: z.string().optional(),
  section: z.string().optional(),
});

const importEvolveContentSchema = z.object({
  mapId: z.number(),
  unitNumber: z.number().optional(),
  lessonNumber: z.number().optional(),
  contentType: z.enum(['vocabulary', 'grammar', 'both']),
  vocabulary: z.array(evolveVocabularySchema).optional(),
  grammar: z.array(evolveGrammarSchema).optional(),
});

const parsePdfStructureSchema = z.object({
  pdfPath: z.string(),
  mapId: z.number().optional(),
  startPage: z.number().optional().default(1),
  endPage: z.number().optional(),
  unitPattern: z.string().optional().default('Unit\\s+(\\d+)'),
  lessonPattern: z.string().optional(),
});

const linkMediaResourceSchema = z.object({
  lessonId: z.number(),
  resourceType: z.enum(['audio', 'video', 'image', 'document']),
  resourceUrl: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  transcript: z.string().optional(),
  section: z.string().optional(),
});

// ============================================================
// Tool Implementations
// ============================================================

export async function importVocabulary(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  ids: number[];
}> {
  const input = importVocabularySchema.parse(args);

  const imported: number[] = [];
  let skipped = 0;

  for (const vocab of input.vocabulary) {
    // Check for existing
    if (input.skipDuplicates) {
      const [existing] = await db.query<RowDataPacket[]>(
        `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
        [vocab.englishWord, vocab.partOfSpeech]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }
    }

    const result = await db.execute(
      `INSERT INTO master_vocabulary (
        english_word, vietnamese_word, phonetic, part_of_speech, cefr_level,
        definitions, word_family, synonyms, antonyms, collocations, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vocab.englishWord,
        vocab.vietnameseWord,
        vocab.phonetic || null,
        vocab.partOfSpeech,
        vocab.cefrLevel,
        vocab.definitions ? JSON.stringify(vocab.definitions) : null,
        vocab.wordFamily ? JSON.stringify(vocab.wordFamily) : null,
        vocab.synonyms ? JSON.stringify(vocab.synonyms) : null,
        vocab.antonyms ? JSON.stringify(vocab.antonyms) : null,
        vocab.collocations ? JSON.stringify(vocab.collocations) : null,
        vocab.tags ? JSON.stringify(vocab.tags) : null,
      ]
    );

    imported.push(result.insertId);
  }

  return {
    success: true,
    imported: imported.length,
    skipped,
    ids: imported,
  };
}

export async function importGrammar(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  imported: number;
  ids: number[];
}> {
  const input = importGrammarSchema.parse(args);

  const imported: number[] = [];

  for (const grammar of input.grammar) {
    const result = await db.execute(
      `INSERT INTO master_grammar (
        grammar_rule, category, cefr_level, explanation, explanation_vi,
        formula, examples, common_mistakes, tips, related_grammar, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        grammar.grammarRule,
        grammar.category,
        grammar.cefrLevel,
        grammar.explanation,
        grammar.explanationVi,
        grammar.formula || null,
        grammar.examples ? JSON.stringify(grammar.examples) : null,
        grammar.commonMistakes ? JSON.stringify(grammar.commonMistakes) : null,
        grammar.tips || null,
        grammar.relatedGrammar ? JSON.stringify(grammar.relatedGrammar) : null,
        grammar.tags ? JSON.stringify(grammar.tags) : null,
      ]
    );

    imported.push(result.insertId);
  }

  return {
    success: true,
    imported: imported.length,
    ids: imported,
  };
}

export async function importExercises(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  imported: number;
  ids: number[];
}> {
  const input = importExercisesSchema.parse(args);

  const imported: number[] = [];

  for (const exercise of input.exercises) {
    const result = await db.execute(
      `INSERT INTO master_exercises (
        exercise_type, category, cefr_level, question, options, correct_answer,
        explanation, hint, audio_url, image_url, exercise_data,
        related_vocabulary_ids, related_grammar_ids, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.exerciseType,
        exercise.category || null,
        exercise.cefrLevel || null,
        exercise.question,
        exercise.options ? JSON.stringify(exercise.options) : null,
        exercise.correctAnswer,
        exercise.explanation || null,
        exercise.hint || null,
        exercise.audioUrl || null,
        exercise.imageUrl || null,
        exercise.exerciseData ? JSON.stringify(exercise.exerciseData) : null,
        exercise.relatedVocabularyIds ? JSON.stringify(exercise.relatedVocabularyIds) : null,
        exercise.relatedGrammarIds ? JSON.stringify(exercise.relatedGrammarIds) : null,
        exercise.tags ? JSON.stringify(exercise.tags) : null,
      ]
    );

    imported.push(result.insertId);
  }

  return {
    success: true,
    imported: imported.length,
    ids: imported,
  };
}

export async function createWordMap(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  wordMap: {
    id: number;
    name: string;
    unitsCreated: number;
    lessonsCreated: number;
  };
  unitIds: number[];
  lessonIds: number[];
}> {
  const input = createWordMapSchema.parse(args);

  // Create the word map
  const mapResult = await db.execute(
    `INSERT INTO word_maps (
      name, description, cover_image_url, level, cefr_level, publisher,
      total_units, estimated_hours, is_free, price_coins, is_featured, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      input.name,
      input.description || null,
      input.coverImageUrl || null,
      input.level,
      input.cefrLevel,
      input.publisher || null,
      input.units.length,
      input.estimatedHours || null,
      input.isFree,
      input.priceCoins,
      input.isFeatured,
    ]
  );

  const mapId = mapResult.insertId;
  const unitIds: number[] = [];
  const lessonIds: number[] = [];

  // Create units and lessons
  for (let unitIndex = 0; unitIndex < input.units.length; unitIndex++) {
    const unit = input.units[unitIndex];
    const unitNumber = unitIndex + 1;

    const unitResult = await db.execute(
      `INSERT INTO map_units (
        word_map_id, unit_number, name, theme, description, thumbnail_url,
        is_review_unit, boss_passing_score, total_lessons, completion_xp, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        mapId,
        unitNumber,
        unit.name,
        unit.theme || null,
        unit.description || null,
        unit.thumbnailUrl || null,
        unit.isReviewUnit,
        unit.bossPassingScore,
        unit.lessons.length,
        unit.completionXp,
      ]
    );

    const unitId = unitResult.insertId;
    unitIds.push(unitId);

    // Create lessons for this unit
    for (let lessonIndex = 0; lessonIndex < unit.lessons.length; lessonIndex++) {
      const lesson = unit.lessons[lessonIndex];
      const lessonNumber = lessonIndex + 1;

      const lessonResult = await db.execute(
        `INSERT INTO unit_lessons (
          map_unit_id, lesson_number, title, lesson_type, description,
          video_url, audio_url, estimated_minutes, study_xp, exam_xp,
          has_boss_exam, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          unitId,
          lessonNumber,
          lesson.title,
          lesson.lessonType,
          lesson.description || null,
          lesson.videoUrl || null,
          lesson.audioUrl || null,
          lesson.estimatedMinutes,
          lesson.studyXp,
          lesson.examXp,
          lesson.hasBossExam,
        ]
      );

      lessonIds.push(lessonResult.insertId);
    }
  }

  return {
    success: true,
    wordMap: {
      id: mapId,
      name: input.name,
      unitsCreated: unitIds.length,
      lessonsCreated: lessonIds.length,
    },
    unitIds,
    lessonIds,
  };
}

export async function addLessonContent(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  added: number;
  contentIds: number[];
} | { success: false; error: string }> {
  const input = addLessonContentSchema.parse(args);

  // Verify lesson exists
  const lessonRows = await db.query<RowDataPacket[]>(
    `SELECT id FROM unit_lessons WHERE id = ?`,
    [input.lessonId]
  );

  if (lessonRows.length === 0) {
    return { success: false, error: 'Lesson not found' };
  }

  // Get current max display order
  const maxOrderRows = await db.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(display_order), 0) as max_order FROM lesson_content WHERE unit_lesson_id = ?`,
    [input.lessonId]
  );

  let displayOrder = (maxOrderRows[0].max_order as number) + 1;
  const contentIds: number[] = [];

  for (const item of input.content) {
    if (!item.masterContentId && !item.customContent) {
      continue; // Skip invalid items
    }

    const result = await db.execute(
      `INSERT INTO lesson_content (
        unit_lesson_id, content_type, master_content_id, custom_content,
        display_order, section, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.lessonId,
        item.contentType,
        item.masterContentId || null,
        item.customContent ? JSON.stringify(item.customContent) : null,
        displayOrder++,
        item.section || null,
      ]
    );

    contentIds.push(result.insertId);
  }

  // Update lesson content counts
  await db.query(
    `UPDATE unit_lessons ul SET
       total_vocabulary = (SELECT COUNT(*) FROM lesson_content WHERE unit_lesson_id = ul.id AND content_type = 'vocabulary' AND is_active = TRUE),
       total_grammar = (SELECT COUNT(*) FROM lesson_content WHERE unit_lesson_id = ul.id AND content_type = 'grammar' AND is_active = TRUE),
       total_exercises = (SELECT COUNT(*) FROM lesson_content WHERE unit_lesson_id = ul.id AND content_type = 'exercise' AND is_active = TRUE)
     WHERE id = ?`,
    [input.lessonId]
  );

  return {
    success: true,
    added: contentIds.length,
    contentIds,
  };
}

/**
 * Parse filename pattern to regex and extract placeholders
 */
function patternToRegex(pattern: string): { regex: RegExp; groups: string[] } {
  const groups: string[] = [];
  // Escape special regex chars except for our placeholders
  let regexStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
    if (match === '{' || match === '}') return match;
    return '\\' + match;
  });

  // Replace placeholders with capturing groups
  regexStr = regexStr.replace(/\{(\w+)\}/g, (_, name) => {
    groups.push(name);
    if (name === 'track' || name === 'sub' || name === 'unit' || name === 'page') {
      return '(\\d+)';
    }
    return '([^\\[\\]]+?)';
  });

  return { regex: new RegExp(regexStr), groups };
}

export async function importAudioTracks(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  linked: number;
  unlinked: number;
  details: Array<{
    filename: string;
    status: 'linked' | 'unlinked' | 'error';
    lessonId?: number;
    unitNumber?: number;
    error?: string;
  }>;
}> {
  const input = importAudioTracksSchema.parse(args);

  // Check if folder exists
  if (!fs.existsSync(input.audioFolder)) {
    throw new Error(`Audio folder not found: ${input.audioFolder}`);
  }

  // Get all audio files
  const files = fs.readdirSync(input.audioFolder)
    .filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));

  const { regex, groups } = patternToRegex(input.namingPattern);

  const details: Array<{
    filename: string;
    status: 'linked' | 'unlinked' | 'error';
    lessonId?: number;
    unitNumber?: number;
    error?: string;
  }> = [];

  let linked = 0;
  let unlinked = 0;

  // Get all units for this map
  const units = await db.query<RowDataPacket[]>(
    `SELECT id, unit_number FROM map_units WHERE word_map_id = ?`,
    [input.mapId]
  );

  const unitMap = new Map<number, number>();
  for (const unit of units) {
    unitMap.set(unit.unit_number, unit.id);
  }

  for (const filename of files) {
    const match = filename.match(regex);

    if (!match) {
      details.push({ filename, status: 'unlinked', error: 'Pattern not matched' });
      unlinked++;
      continue;
    }

    // Extract values from match
    const values: Record<string, string> = {};
    groups.forEach((name, i) => {
      values[name] = match[i + 1];
    });

    const unitNumber = parseInt(values.unit || '0', 10);

    if (!unitNumber || !unitMap.has(unitNumber)) {
      details.push({ filename, status: 'unlinked', unitNumber, error: 'Unit not found' });
      unlinked++;
      continue;
    }

    const unitId = unitMap.get(unitNumber)!;

    // Find or create media resource
    const resourceUrl = `${input.audioBaseUrl}/${filename}`;

    try {
      // Create media resource entry
      const result = await db.execute(
        `INSERT INTO media_resources (
          word_map_id, resource_type, resource_url, filename,
          title, metadata, is_active
        ) VALUES (?, 'audio', ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [
          input.mapId,
          resourceUrl,
          filename,
          filename,
          JSON.stringify(values),
        ]
      );

      // Link to first lesson in unit (or specific lesson based on page)
      const lessonRows = await db.query<RowDataPacket[]>(
        `SELECT id FROM unit_lessons WHERE map_unit_id = ? ORDER BY lesson_number LIMIT 1`,
        [unitId]
      );

      if (lessonRows.length > 0) {
        const lessonId = lessonRows[0].id;

        // Add audio URL to lesson if not set
        await db.execute(
          `UPDATE unit_lessons SET audio_url = ? WHERE id = ? AND audio_url IS NULL`,
          [resourceUrl, lessonId]
        );

        details.push({ filename, status: 'linked', lessonId, unitNumber });
        linked++;
      } else {
        details.push({ filename, status: 'unlinked', unitNumber, error: 'No lessons in unit' });
        unlinked++;
      }
    } catch (error) {
      details.push({
        filename,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      unlinked++;
    }
  }

  return {
    success: true,
    linked,
    unlinked,
    details,
  };
}

export async function importEvolveContent(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  vocabularyImported: number;
  grammarImported: number;
  linkedToLesson: boolean;
  lessonId?: number;
  vocabularyIds: number[];
  grammarIds: number[];
}> {
  const input = importEvolveContentSchema.parse(args);

  const vocabularyIds: number[] = [];
  const grammarIds: number[] = [];
  let lessonId: number | undefined;

  // Find the lesson to link content to (if specified)
  if (input.unitNumber && input.lessonNumber) {
    const lessonRows = await db.query<RowDataPacket[]>(
      `SELECT ul.id FROM unit_lessons ul
       JOIN map_units mu ON ul.map_unit_id = mu.id
       WHERE mu.word_map_id = ? AND mu.unit_number = ? AND ul.lesson_number = ?`,
      [input.mapId, input.unitNumber, input.lessonNumber]
    );

    if (lessonRows.length > 0) {
      lessonId = lessonRows[0].id;
    }
  }

  // Import vocabulary
  if ((input.contentType === 'vocabulary' || input.contentType === 'both') && input.vocabulary) {
    for (const vocab of input.vocabulary) {
      // Check for existing
      const [existing] = await db.query<RowDataPacket[]>(
        `SELECT id FROM master_vocabulary WHERE english_word = ? AND part_of_speech = ?`,
        [vocab.englishWord, vocab.partOfSpeech]
      );

      let vocabId: number;

      if (existing.length > 0) {
        vocabId = existing[0].id;
        // Update existing entry with new data
        await db.execute(
          `UPDATE master_vocabulary SET
             vietnamese_word = COALESCE(?, vietnamese_word),
             phonetic = COALESCE(?, phonetic),
             definitions = COALESCE(?, definitions),
             word_family = COALESCE(?, word_family),
             synonyms = COALESCE(?, synonyms),
             antonyms = COALESCE(?, antonyms),
             collocations = COALESCE(?, collocations),
             extra_examples = COALESCE(?, extra_examples)
           WHERE id = ?`,
          [
            vocab.vietnameseWord,
            vocab.phonetic || null,
            vocab.definitions ? JSON.stringify(vocab.definitions) : null,
            vocab.wordFamily ? JSON.stringify(vocab.wordFamily) : null,
            vocab.synonyms ? JSON.stringify(vocab.synonyms) : null,
            vocab.antonyms ? JSON.stringify(vocab.antonyms) : null,
            vocab.collocations ? JSON.stringify(vocab.collocations) : null,
            vocab.extraExamples ? JSON.stringify(vocab.extraExamples) : null,
            vocabId,
          ]
        );
      } else {
        const result = await db.execute(
          `INSERT INTO master_vocabulary (
            english_word, vietnamese_word, phonetic, part_of_speech, cefr_level,
            definitions, word_family, synonyms, antonyms, collocations, extra_examples
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vocab.englishWord,
            vocab.vietnameseWord,
            vocab.phonetic || null,
            vocab.partOfSpeech,
            vocab.cefrLevel,
            vocab.definitions ? JSON.stringify(vocab.definitions) : null,
            vocab.wordFamily ? JSON.stringify(vocab.wordFamily) : null,
            vocab.synonyms ? JSON.stringify(vocab.synonyms) : null,
            vocab.antonyms ? JSON.stringify(vocab.antonyms) : null,
            vocab.collocations ? JSON.stringify(vocab.collocations) : null,
            vocab.extraExamples ? JSON.stringify(vocab.extraExamples) : null,
          ]
        );
        vocabId = result.insertId;
      }

      vocabularyIds.push(vocabId);

      // Link to lesson if specified
      if (lessonId) {
        const maxOrderRows = await db.query<RowDataPacket[]>(
          `SELECT COALESCE(MAX(display_order), 0) as max_order FROM lesson_content WHERE unit_lesson_id = ?`,
          [lessonId]
        );
        const displayOrder = (maxOrderRows[0].max_order as number) + 1;

        await db.execute(
          `INSERT INTO lesson_content (
            unit_lesson_id, content_type, master_content_id, display_order, section, is_active
          ) VALUES (?, 'vocabulary', ?, ?, ?, TRUE)
          ON DUPLICATE KEY UPDATE id = id`,
          [lessonId, vocabId, displayOrder, vocab.section || null]
        );
      }
    }
  }

  // Import grammar
  if ((input.contentType === 'grammar' || input.contentType === 'both') && input.grammar) {
    for (const grammar of input.grammar) {
      // Check for existing
      const [existing] = await db.query<RowDataPacket[]>(
        `SELECT id FROM master_grammar WHERE grammar_rule = ? AND category = ?`,
        [grammar.grammarRule, grammar.category]
      );

      let grammarId: number;

      if (existing.length > 0) {
        grammarId = existing[0].id;
        // Update existing entry
        await db.execute(
          `UPDATE master_grammar SET
             cefr_level = COALESCE(?, cefr_level),
             explanation = COALESCE(?, explanation),
             explanation_vi = COALESCE(?, explanation_vi),
             formula = COALESCE(?, formula),
             examples = COALESCE(?, examples),
             common_mistakes = COALESCE(?, common_mistakes),
             tips = COALESCE(?, tips)
           WHERE id = ?`,
          [
            grammar.cefrLevel,
            grammar.explanation || null,
            grammar.explanationVi || null,
            grammar.formula || null,
            grammar.examples ? JSON.stringify(grammar.examples) : null,
            grammar.commonMistakes ? JSON.stringify(grammar.commonMistakes) : null,
            grammar.tips || null,
            grammarId,
          ]
        );
      } else {
        const result = await db.execute(
          `INSERT INTO master_grammar (
            grammar_rule, category, cefr_level, explanation, explanation_vi,
            formula, examples, common_mistakes, tips
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            grammar.grammarRule,
            grammar.category,
            grammar.cefrLevel,
            grammar.explanation || '',
            grammar.explanationVi || '',
            grammar.formula || null,
            grammar.examples ? JSON.stringify(grammar.examples) : null,
            grammar.commonMistakes ? JSON.stringify(grammar.commonMistakes) : null,
            grammar.tips || null,
          ]
        );
        grammarId = result.insertId;
      }

      grammarIds.push(grammarId);

      // Link to lesson if specified
      if (lessonId) {
        const maxOrderRows = await db.query<RowDataPacket[]>(
          `SELECT COALESCE(MAX(display_order), 0) as max_order FROM lesson_content WHERE unit_lesson_id = ?`,
          [lessonId]
        );
        const displayOrder = (maxOrderRows[0].max_order as number) + 1;

        await db.execute(
          `INSERT INTO lesson_content (
            unit_lesson_id, content_type, master_content_id, display_order, section, is_active
          ) VALUES (?, 'grammar', ?, ?, ?, TRUE)
          ON DUPLICATE KEY UPDATE id = id`,
          [lessonId, grammarId, displayOrder, grammar.section || null]
        );
      }
    }
  }

  // Update lesson content counts if linked
  if (lessonId) {
    await db.query(
      `UPDATE unit_lessons ul SET
         total_vocabulary = (SELECT COUNT(*) FROM lesson_content WHERE unit_lesson_id = ul.id AND content_type = 'vocabulary' AND is_active = TRUE),
         total_grammar = (SELECT COUNT(*) FROM lesson_content WHERE unit_lesson_id = ul.id AND content_type = 'grammar' AND is_active = TRUE)
       WHERE id = ?`,
      [lessonId]
    );
  }

  return {
    success: true,
    vocabularyImported: vocabularyIds.length,
    grammarImported: grammarIds.length,
    linkedToLesson: !!lessonId,
    lessonId,
    vocabularyIds,
    grammarIds,
  };
}

export async function parsePdfStructure(
  args: Record<string, unknown>,
  _db: DatabaseConnection
): Promise<{
  success: boolean;
  message: string;
  structure?: {
    units: Array<{
      unitNumber: number;
      title: string;
      lessons: Array<{
        lessonNumber: number;
        title: string;
        type: string;
      }>;
    }>;
  };
}> {
  const input = parsePdfStructureSchema.parse(args);

  // Check if file exists
  if (!fs.existsSync(input.pdfPath)) {
    return {
      success: false,
      message: `PDF file not found: ${input.pdfPath}`,
    };
  }

  // Note: PDF parsing requires additional dependencies (pdf-parse, pdfjs-dist, etc.)
  // This is a placeholder that returns instructions for manual processing
  return {
    success: true,
    message: `PDF parsing is available but requires manual verification.
Please use a PDF reader to extract the table of contents and provide the structure
using the create_word_map tool.

File: ${input.pdfPath}
Unit pattern: ${input.unitPattern}

To implement full PDF parsing, install pdf-parse or similar library.`,
    structure: {
      units: [
        {
          unitNumber: 1,
          title: 'Example Unit (placeholder)',
          lessons: [
            { lessonNumber: 1, title: 'Vocabulary', type: 'vocabulary' },
            { lessonNumber: 2, title: 'Grammar', type: 'grammar' },
            { lessonNumber: 3, title: 'Practice', type: 'mixed' },
          ],
        },
      ],
    },
  };
}

export async function linkMediaResource(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  resourceId: number;
  lessonId: number;
}> {
  const input = linkMediaResourceSchema.parse(args);

  // Verify lesson exists
  const lessonRows = await db.query<RowDataPacket[]>(
    `SELECT id, map_unit_id FROM unit_lessons WHERE id = ?`,
    [input.lessonId]
  );

  if (lessonRows.length === 0) {
    throw new Error(`Lesson not found: ${input.lessonId}`);
  }

  // Get word map ID from unit
  const unitRows = await db.query<RowDataPacket[]>(
    `SELECT word_map_id FROM map_units WHERE id = ?`,
    [lessonRows[0].map_unit_id]
  );

  const wordMapId = unitRows[0]?.word_map_id;

  // Create media resource
  const result = await db.execute(
    `INSERT INTO media_resources (
      word_map_id, resource_type, resource_url, title, description,
      duration_seconds, transcript, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      wordMapId,
      input.resourceType,
      input.resourceUrl,
      input.title || path.basename(input.resourceUrl),
      input.description || null,
      input.duration || null,
      input.transcript || null,
    ]
  );

  const resourceId = result.insertId;

  // Link to lesson based on resource type
  if (input.resourceType === 'audio') {
    await db.execute(
      `UPDATE unit_lessons SET audio_url = ? WHERE id = ?`,
      [input.resourceUrl, input.lessonId]
    );
  } else if (input.resourceType === 'video') {
    await db.execute(
      `UPDATE unit_lessons SET video_url = ? WHERE id = ?`,
      [input.resourceUrl, input.lessonId]
    );
  }

  // Also add as lesson content if section specified
  if (input.section) {
    const maxOrderRows = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(display_order), 0) as max_order FROM lesson_content WHERE unit_lesson_id = ?`,
      [input.lessonId]
    );
    const displayOrder = (maxOrderRows[0].max_order as number) + 1;

    await db.execute(
      `INSERT INTO lesson_content (
        unit_lesson_id, content_type, custom_content, display_order, section, is_active
      ) VALUES (?, 'media', ?, ?, ?, TRUE)`,
      [
        input.lessonId,
        JSON.stringify({
          resourceId,
          resourceType: input.resourceType,
          resourceUrl: input.resourceUrl,
          title: input.title,
          duration: input.duration,
        }),
        displayOrder,
        input.section,
      ]
    );
  }

  return {
    success: true,
    resourceId,
    lessonId: input.lessonId,
  };
}
