import { describe, it, expect } from 'vitest';

/**
 * Data Migration Tests
 *
 * Tests for V2 to V3 data migration logic.
 * These tests verify data transformation and validation
 * for migrating between schema versions.
 */

// V2 Types (old schema)
interface V2Vocabulary {
  id: number;
  user_id: number;
  vietnamese_word: string;
  english_word: string;
  phonetic: string | null;
  part_of_speech: string;
  difficulty_level: string;
  example_sentence_vi: string | null;
  example_sentence_en: string | null;
  definitions: string | null; // JSON string
  word_family: string | null; // JSON string
  synonyms: string | null; // JSON string or comma-separated
  collocations: string | null; // JSON string
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: Date | null;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  created_at: Date;
  updated_at: Date;
}

// V3 Types (new schema)
interface MasterVocabulary {
  id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  part_of_speech: string;
  cefr_level: string;
  definitions: object | null;
  word_family: object | null;
  synonyms: string[];
  antonyms: string[];
  collocations: object | null;
  register: string;
  tags: string[];
  is_common: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserVocabulary {
  id: number;
  user_id: number;
  master_vocabulary_id: number;
  source_type: string;
  source_id: number | null;
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: Date | null;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: string;
  created_at: Date;
  updated_at: Date;
}

describe('V2 to V3 Migration Logic', () => {
  describe('Difficulty to CEFR Mapping', () => {
    function difficultyToCefr(difficulty: string): string {
      const mapping: Record<string, string> = {
        'beginner': 'A1',
        'elementary': 'A2',
        'intermediate': 'B1',
        'upper_intermediate': 'B2',
        'advanced': 'C1',
        'proficient': 'C2',
      };
      return mapping[difficulty.toLowerCase()] || 'B1';
    }

    it('should map beginner to A1', () => {
      expect(difficultyToCefr('beginner')).toBe('A1');
    });

    it('should map intermediate to B1', () => {
      expect(difficultyToCefr('intermediate')).toBe('B1');
    });

    it('should map advanced to C1', () => {
      expect(difficultyToCefr('advanced')).toBe('C1');
    });

    it('should default to B1 for unknown', () => {
      expect(difficultyToCefr('unknown')).toBe('B1');
      expect(difficultyToCefr('')).toBe('B1');
    });

    it('should be case-insensitive', () => {
      expect(difficultyToCefr('BEGINNER')).toBe('A1');
      expect(difficultyToCefr('Intermediate')).toBe('B1');
    });
  });

  describe('JSON Field Parsing', () => {
    function parseJsonField<T>(value: string | null | undefined): T | null {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    function parseSynonymsField(value: string | null): string[] {
      if (!value) return [];

      // Try JSON first
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON, try comma-separated
      }

      // Try comma-separated
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    it('should parse valid JSON', () => {
      const result = parseJsonField<string[]>('["a", "b", "c"]');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should return null for invalid JSON', () => {
      expect(parseJsonField('not json')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseJsonField(null)).toBeNull();
    });

    it('should parse JSON array synonyms', () => {
      const result = parseSynonymsField('["happy", "joyful", "pleased"]');
      expect(result).toEqual(['happy', 'joyful', 'pleased']);
    });

    it('should parse comma-separated synonyms', () => {
      const result = parseSynonymsField('happy, joyful, pleased');
      expect(result).toEqual(['happy', 'joyful', 'pleased']);
    });

    it('should handle empty synonyms', () => {
      expect(parseSynonymsField(null)).toEqual([]);
      expect(parseSynonymsField('')).toEqual([]);
    });

    it('should trim whitespace in comma-separated', () => {
      const result = parseSynonymsField('  happy  ,  joyful  ');
      expect(result).toEqual(['happy', 'joyful']);
    });
  });

  describe('Review Status Determination', () => {
    function determineReviewStatus(
      repetitionCount: number,
      reviewInterval: number,
      lastPracticedAt: Date | null
    ): 'new' | 'learning' | 'reviewing' | 'mastered' {
      if (lastPracticedAt === null) {
        return 'new';
      }

      if (repetitionCount === 0) {
        return 'learning';
      }

      if (reviewInterval >= 21) {
        return 'mastered';
      }

      return 'reviewing';
    }

    it('should return "new" when never practiced', () => {
      expect(determineReviewStatus(0, 0, null)).toBe('new');
    });

    it('should return "learning" for reset items', () => {
      expect(determineReviewStatus(0, 0, new Date())).toBe('learning');
    });

    it('should return "reviewing" for active items', () => {
      expect(determineReviewStatus(3, 10, new Date())).toBe('reviewing');
    });

    it('should return "mastered" for interval >= 21', () => {
      expect(determineReviewStatus(5, 21, new Date())).toBe('mastered');
      expect(determineReviewStatus(8, 30, new Date())).toBe('mastered');
    });
  });

  describe('Vocabulary Migration Transform', () => {
    function transformV2ToMasterVocabulary(v2: V2Vocabulary): Partial<MasterVocabulary> {
      const definitions = v2.definitions ? JSON.parse(v2.definitions) : null;
      const wordFamily = v2.word_family ? JSON.parse(v2.word_family) : null;
      const collocations = v2.collocations ? JSON.parse(v2.collocations) : null;

      let synonyms: string[] = [];
      if (v2.synonyms) {
        try {
          const parsed = JSON.parse(v2.synonyms);
          synonyms = Array.isArray(parsed) ? parsed : [];
        } catch {
          synonyms = v2.synonyms.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const cefrMapping: Record<string, string> = {
        'beginner': 'A1',
        'elementary': 'A2',
        'intermediate': 'B1',
        'upper_intermediate': 'B2',
        'advanced': 'C1',
        'proficient': 'C2',
      };

      return {
        english_word: v2.english_word,
        vietnamese_word: v2.vietnamese_word,
        phonetic: v2.phonetic,
        pronunciation_uk: v2.phonetic, // Copy phonetic as UK pronunciation
        pronunciation_us: null,
        part_of_speech: v2.part_of_speech,
        cefr_level: cefrMapping[v2.difficulty_level.toLowerCase()] || 'B1',
        definitions,
        word_family: wordFamily,
        synonyms,
        antonyms: [],
        collocations,
        register: 'neutral',
        tags: [],
        is_common: true,
      };
    }

    function transformV2ToUserVocabulary(
      v2: V2Vocabulary,
      masterVocabularyId: number
    ): Partial<UserVocabulary> {
      const reviewStatus = v2.last_practiced_at === null ? 'new' :
        v2.repetition_count === 0 ? 'learning' :
        v2.review_interval >= 21 ? 'mastered' : 'reviewing';

      return {
        user_id: v2.user_id,
        master_vocabulary_id: masterVocabularyId,
        source_type: 'conversation', // V2 items are from conversations
        source_id: null, // Link to conversation if available
        mastery_level: v2.mastery_level,
        times_practiced: v2.times_practiced,
        last_practiced_at: v2.last_practiced_at,
        next_review_at: v2.next_review_at,
        review_interval: v2.review_interval,
        ease_factor: v2.ease_factor,
        repetition_count: v2.repetition_count,
        lapse_count: 0, // Not tracked in V2
        review_status: reviewStatus,
      };
    }

    it('should transform V2 vocabulary to master vocabulary', () => {
      const v2: V2Vocabulary = {
        id: 1,
        user_id: 1,
        vietnamese_word: 'Xin chào',
        english_word: 'Hello',
        phonetic: '/həˈloʊ/',
        part_of_speech: 'interjection',
        difficulty_level: 'beginner',
        example_sentence_vi: 'Xin chào bạn',
        example_sentence_en: 'Hello friend',
        definitions: '["a greeting"]',
        word_family: null,
        synonyms: 'hi, hey, greetings',
        collocations: null,
        mastery_level: 50,
        times_practiced: 5,
        last_practiced_at: new Date(),
        next_review_at: new Date(),
        review_interval: 6,
        ease_factor: 2.5,
        repetition_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const master = transformV2ToMasterVocabulary(v2);

      expect(master.english_word).toBe('Hello');
      expect(master.vietnamese_word).toBe('Xin chào');
      expect(master.cefr_level).toBe('A1');
      expect(master.synonyms).toEqual(['hi', 'hey', 'greetings']);
      expect(master.definitions).toEqual(['a greeting']);
    });

    it('should transform V2 to user vocabulary with correct status', () => {
      const v2: V2Vocabulary = {
        id: 1,
        user_id: 42,
        vietnamese_word: 'Test',
        english_word: 'test',
        phonetic: null,
        part_of_speech: 'noun',
        difficulty_level: 'intermediate',
        example_sentence_vi: null,
        example_sentence_en: null,
        definitions: null,
        word_family: null,
        synonyms: null,
        collocations: null,
        mastery_level: 75,
        times_practiced: 8,
        last_practiced_at: new Date(),
        next_review_at: new Date(),
        review_interval: 15,
        ease_factor: 2.6,
        repetition_count: 4,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const user = transformV2ToUserVocabulary(v2, 999);

      expect(user.user_id).toBe(42);
      expect(user.master_vocabulary_id).toBe(999);
      expect(user.source_type).toBe('conversation');
      expect(user.review_status).toBe('reviewing');
      expect(user.mastery_level).toBe(75);
    });
  });

  describe('Duplicate Detection', () => {
    interface VocabularyKey {
      englishWord: string;
      partOfSpeech: string;
    }

    function createVocabularyKey(word: string, pos: string): string {
      return `${word.toLowerCase().trim()}|${pos.toLowerCase().trim()}`;
    }

    function detectDuplicates(vocabularies: VocabularyKey[]): Map<string, number[]> {
      const keyToIndices = new Map<string, number[]>();

      vocabularies.forEach((v, index) => {
        const key = createVocabularyKey(v.englishWord, v.partOfSpeech);
        const indices = keyToIndices.get(key) || [];
        indices.push(index);
        keyToIndices.set(key, indices);
      });

      // Filter to only duplicates
      const duplicates = new Map<string, number[]>();
      keyToIndices.forEach((indices, key) => {
        if (indices.length > 1) {
          duplicates.set(key, indices);
        }
      });

      return duplicates;
    }

    it('should detect no duplicates in unique list', () => {
      const items: VocabularyKey[] = [
        { englishWord: 'hello', partOfSpeech: 'noun' },
        { englishWord: 'world', partOfSpeech: 'noun' },
        { englishWord: 'run', partOfSpeech: 'verb' },
      ];

      const duplicates = detectDuplicates(items);
      expect(duplicates.size).toBe(0);
    });

    it('should detect exact duplicates', () => {
      const items: VocabularyKey[] = [
        { englishWord: 'test', partOfSpeech: 'noun' },
        { englishWord: 'test', partOfSpeech: 'noun' },
      ];

      const duplicates = detectDuplicates(items);
      expect(duplicates.size).toBe(1);
      expect(duplicates.get('test|noun')).toEqual([0, 1]);
    });

    it('should not consider different POS as duplicates', () => {
      const items: VocabularyKey[] = [
        { englishWord: 'run', partOfSpeech: 'verb' },
        { englishWord: 'run', partOfSpeech: 'noun' },
      ];

      const duplicates = detectDuplicates(items);
      expect(duplicates.size).toBe(0);
    });

    it('should be case-insensitive', () => {
      const items: VocabularyKey[] = [
        { englishWord: 'Hello', partOfSpeech: 'noun' },
        { englishWord: 'hello', partOfSpeech: 'Noun' },
      ];

      const duplicates = detectDuplicates(items);
      expect(duplicates.size).toBe(1);
    });

    it('should trim whitespace', () => {
      const items: VocabularyKey[] = [
        { englishWord: '  test  ', partOfSpeech: 'noun' },
        { englishWord: 'test', partOfSpeech: '  noun  ' },
      ];

      const duplicates = detectDuplicates(items);
      expect(duplicates.size).toBe(1);
    });
  });

  describe('Migration Batch Processing', () => {
    function chunkArray<T>(array: T[], chunkSize: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
    }

    function calculateProgress(processed: number, total: number): {
      percentage: number;
      remaining: number;
    } {
      return {
        percentage: Math.round((processed / total) * 100),
        remaining: total - processed,
      };
    }

    it('should chunk array correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(items, 3);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 5);
      expect(chunks).toHaveLength(0);
    });

    it('should handle chunk size larger than array', () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });

    it('should calculate progress correctly', () => {
      expect(calculateProgress(0, 100)).toEqual({ percentage: 0, remaining: 100 });
      expect(calculateProgress(50, 100)).toEqual({ percentage: 50, remaining: 50 });
      expect(calculateProgress(100, 100)).toEqual({ percentage: 100, remaining: 0 });
    });

    it('should round progress percentage', () => {
      expect(calculateProgress(33, 100)).toEqual({ percentage: 33, remaining: 67 });
      expect(calculateProgress(1, 3)).toEqual({ percentage: 33, remaining: 2 });
    });
  });

  describe('Migration Validation', () => {
    interface MigrationResult {
      success: boolean;
      migratedCount: number;
      skippedCount: number;
      errorCount: number;
      errors: string[];
    }

    function validateMigrationResult(result: MigrationResult): {
      isValid: boolean;
      warnings: string[];
    } {
      const warnings: string[] = [];

      // Check for high error rate
      const totalProcessed = result.migratedCount + result.skippedCount + result.errorCount;
      if (totalProcessed > 0) {
        const errorRate = result.errorCount / totalProcessed;
        if (errorRate > 0.1) {
          warnings.push(`High error rate: ${Math.round(errorRate * 100)}%`);
        }
      }

      // Check for high skip rate
      if (totalProcessed > 0) {
        const skipRate = result.skippedCount / totalProcessed;
        if (skipRate > 0.5) {
          warnings.push(`High skip rate: ${Math.round(skipRate * 100)}%`);
        }
      }

      // Check for low migration count
      if (result.migratedCount === 0 && totalProcessed > 0) {
        warnings.push('No items were migrated');
      }

      return {
        isValid: result.success && result.errorCount === 0,
        warnings,
      };
    }

    it('should validate successful migration', () => {
      const result: MigrationResult = {
        success: true,
        migratedCount: 100,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      };

      const validation = validateMigrationResult(result);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn on high error rate', () => {
      const result: MigrationResult = {
        success: true,
        migratedCount: 80,
        skippedCount: 0,
        errorCount: 20,
        errors: [],
      };

      const validation = validateMigrationResult(result);
      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toContain('High error rate: 20%');
    });

    it('should warn on high skip rate', () => {
      const result: MigrationResult = {
        success: true,
        migratedCount: 30,
        skippedCount: 70,
        errorCount: 0,
        errors: [],
      };

      const validation = validateMigrationResult(result);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('High skip rate: 70%');
    });

    it('should warn when no items migrated', () => {
      const result: MigrationResult = {
        success: true,
        migratedCount: 0,
        skippedCount: 100,
        errorCount: 0,
        errors: [],
      };

      const validation = validateMigrationResult(result);
      expect(validation.warnings).toContain('No items were migrated');
    });
  });
});
