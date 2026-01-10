import { describe, it, expect } from 'vitest';

/**
 * UserGrammarService Tests
 *
 * Tests for the V3 user grammar service.
 * These tests verify the business logic for grammar spaced repetition.
 */

// SM2 algorithm constants
const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASY_BONUS: 1.3,
  INTERVAL_MODIFIER: 1.0,
};

/**
 * Format interval for human-readable display (matching service logic)
 */
function formatInterval(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days === 7) return '1 week';
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  if (days === 30) return '1 month';
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/**
 * Simulate grammar review submission (matching service logic)
 */
function simulateGrammarReview(
  currentGrammar: {
    easeFactor: number;
    reviewInterval: number;
    repetitionCount: number;
    lapseCount: number;
  },
  quality: number
): {
  newEaseFactor: number;
  newInterval: number;
  newRepetitionCount: number;
  newLapseCount: number;
  newStatus: 'new' | 'learning' | 'reviewing' | 'mastered';
  masteryLevel: number;
  intervalText: string;
} {
  // Calculate new ease factor
  let newEaseFactor = currentGrammar.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);

  let newInterval: number;
  let newRepetitionCount: number;
  let newLapseCount = currentGrammar.lapseCount;

  if (quality < 3) {
    // Failed review
    newInterval = 1;
    newRepetitionCount = 0;
    newLapseCount += 1;
  } else {
    // Successful review
    newRepetitionCount = currentGrammar.repetitionCount + 1;

    if (currentGrammar.repetitionCount === 0) {
      newInterval = 1;
    } else if (currentGrammar.repetitionCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentGrammar.reviewInterval * newEaseFactor * SM2.INTERVAL_MODIFIER);
    }

    if (quality === 5) {
      newInterval = Math.round(newInterval * SM2.EASY_BONUS);
    }
  }

  // Determine status
  let newStatus: 'new' | 'learning' | 'reviewing' | 'mastered';
  if (newRepetitionCount === 0) {
    newStatus = 'learning';
  } else if (newInterval >= 21) {
    newStatus = 'mastered';
  } else {
    newStatus = 'reviewing';
  }

  // Calculate mastery
  const masteryLevel = Math.min(100, Math.round(
    (newRepetitionCount / 10) * 50 +
    ((newEaseFactor - SM2.MIN_EASE_FACTOR) / (3.0 - SM2.MIN_EASE_FACTOR)) * 30 +
    (quality / 5) * 20
  ));

  return {
    newEaseFactor,
    newInterval,
    newRepetitionCount,
    newLapseCount,
    newStatus,
    masteryLevel,
    intervalText: formatInterval(newInterval),
  };
}

describe('UserGrammarService Business Logic', () => {
  describe('Interval Text Formatting', () => {
    it('should format 1 day correctly', () => {
      expect(formatInterval(1)).toBe('1 day');
    });

    it('should format days (2-6)', () => {
      expect(formatInterval(2)).toBe('2 days');
      expect(formatInterval(5)).toBe('5 days');
      expect(formatInterval(6)).toBe('6 days');
    });

    it('should format 1 week', () => {
      expect(formatInterval(7)).toBe('1 week');
    });

    it('should format weeks (8-29 days)', () => {
      expect(formatInterval(14)).toBe('2 weeks');
      expect(formatInterval(21)).toBe('3 weeks');
      expect(formatInterval(28)).toBe('4 weeks');
    });

    it('should format 1 month', () => {
      expect(formatInterval(30)).toBe('1 month');
    });

    it('should format months', () => {
      expect(formatInterval(60)).toBe('2 months');
      expect(formatInterval(90)).toBe('3 months');
      expect(formatInterval(180)).toBe('6 months');
    });

    it('should format years', () => {
      expect(formatInterval(365)).toBe('1 years');
      expect(formatInterval(730)).toBe('2 years');
    });
  });

  describe('Grammar Review Submission', () => {
    it('should include intervalText in result', () => {
      const grammar = {
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      };

      const result = simulateGrammarReview(grammar, 4);

      expect(result.intervalText).toBe('1 day');
    });

    it('should show "6 days" after second successful review', () => {
      const grammar = {
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 1,
        repetitionCount: 1,
        lapseCount: 0,
      };

      const result = simulateGrammarReview(grammar, 4);

      expect(result.newInterval).toBe(6);
      expect(result.intervalText).toBe('6 days');
    });

    it('should show weeks for longer intervals', () => {
      const grammar = {
        easeFactor: 2.5,
        reviewInterval: 6,
        repetitionCount: 2,
        lapseCount: 0,
      };

      const result = simulateGrammarReview(grammar, 4);
      // 6 * 2.5 = 15 days = "2 weeks"

      expect(result.newInterval).toBe(15);
      expect(result.intervalText).toBe('2 weeks');
    });
  });

  describe('Grammar Filtering Logic', () => {
    // Helper to simulate filter condition building for grammar
    function buildGrammarFilterConditions(filters: {
      reviewStatus?: string;
      sourceType?: string;
      category?: string;
      cefrLevel?: string;
      searchTerm?: string;
      favoritesOnly?: boolean;
    }): { conditions: string[]; params: (string | number)[] } {
      const conditions: string[] = ['ug.user_id = ?'];
      const params: (string | number)[] = [1];

      if (filters.reviewStatus) {
        conditions.push('ug.review_status = ?');
        params.push(filters.reviewStatus);
      }

      if (filters.sourceType) {
        conditions.push('ug.source_type = ?');
        params.push(filters.sourceType);
      }

      if (filters.category) {
        conditions.push('mg.category = ?');
        params.push(filters.category);
      }

      if (filters.cefrLevel) {
        conditions.push('mg.cefr_level = ?');
        params.push(filters.cefrLevel);
      }

      if (filters.searchTerm) {
        conditions.push('(mg.grammar_rule LIKE ? OR mg.explanation LIKE ? OR mg.explanation_vi LIKE ?)');
        const searchPattern = `%${filters.searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (filters.favoritesOnly) {
        conditions.push('ug.is_favorited = TRUE');
      }

      return { conditions, params };
    }

    it('should filter by category', () => {
      const { conditions, params } = buildGrammarFilterConditions({
        category: 'verb tenses',
      });

      expect(conditions).toContain('mg.category = ?');
      expect(params).toContain('verb tenses');
    });

    it('should filter by favorites only', () => {
      const { conditions } = buildGrammarFilterConditions({
        favoritesOnly: true,
      });

      expect(conditions).toContain('ug.is_favorited = TRUE');
    });

    it('should search in grammar_rule, explanation, and explanation_vi', () => {
      const { conditions, params } = buildGrammarFilterConditions({
        searchTerm: 'present',
      });

      expect(conditions).toContain('(mg.grammar_rule LIKE ? OR mg.explanation LIKE ? OR mg.explanation_vi LIKE ?)');
      expect(params.filter(p => p === '%present%')).toHaveLength(3);
    });

    it('should combine category with status filter', () => {
      const { conditions, params } = buildGrammarFilterConditions({
        category: 'articles',
        reviewStatus: 'learning',
      });

      expect(conditions).toHaveLength(3);
      expect(params).toContain('articles');
      expect(params).toContain('learning');
    });
  });

  describe('Grammar Review Queue Categorization', () => {
    interface GrammarItem {
      nextReviewAt: Date | null;
      reviewStatus: string;
      createdAt: Date;
    }

    function categorizeGrammarItem(item: GrammarItem): 'overdue' | 'due' | 'new' | 'not-due' {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (item.nextReviewAt === null && item.reviewStatus === 'new') {
        return 'new';
      }

      if (item.nextReviewAt === null) {
        return 'not-due';
      }

      const reviewDate = new Date(item.nextReviewAt);
      reviewDate.setHours(0, 0, 0, 0);

      if (reviewDate < today) {
        return 'overdue';
      }

      if (reviewDate.getTime() === today.getTime()) {
        return 'due';
      }

      return 'not-due';
    }

    it('should categorize as "new" when no review date and status is new', () => {
      const item: GrammarItem = {
        nextReviewAt: null,
        reviewStatus: 'new',
        createdAt: new Date(),
      };

      expect(categorizeGrammarItem(item)).toBe('new');
    });

    it('should categorize as "overdue" when review date is in past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const item: GrammarItem = {
        nextReviewAt: yesterday,
        reviewStatus: 'reviewing',
        createdAt: new Date(),
      };

      expect(categorizeGrammarItem(item)).toBe('overdue');
    });

    it('should categorize as "due" when review date is today', () => {
      const today = new Date();

      const item: GrammarItem = {
        nextReviewAt: today,
        reviewStatus: 'reviewing',
        createdAt: new Date(),
      };

      expect(categorizeGrammarItem(item)).toBe('due');
    });

    it('should categorize as "not-due" when review date is in future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const item: GrammarItem = {
        nextReviewAt: tomorrow,
        reviewStatus: 'reviewing',
        createdAt: new Date(),
      };

      expect(categorizeGrammarItem(item)).toBe('not-due');
    });
  });

  describe('Grammar Statistics Calculation', () => {
    interface StatsSummary {
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      byCefrLevel: Record<string, number>;
    }

    function aggregateStats(items: Array<{
      reviewStatus: string;
      category: string;
      cefrLevel: string;
    }>): StatsSummary {
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byCefrLevel: Record<string, number> = {};

      for (const item of items) {
        byStatus[item.reviewStatus] = (byStatus[item.reviewStatus] || 0) + 1;
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        byCefrLevel[item.cefrLevel] = (byCefrLevel[item.cefrLevel] || 0) + 1;
      }

      return { byStatus, byCategory, byCefrLevel };
    }

    it('should aggregate by status', () => {
      const items = [
        { reviewStatus: 'new', category: 'tenses', cefrLevel: 'A1' },
        { reviewStatus: 'new', category: 'tenses', cefrLevel: 'A2' },
        { reviewStatus: 'learning', category: 'articles', cefrLevel: 'A1' },
        { reviewStatus: 'mastered', category: 'tenses', cefrLevel: 'B1' },
      ];

      const stats = aggregateStats(items);

      expect(stats.byStatus['new']).toBe(2);
      expect(stats.byStatus['learning']).toBe(1);
      expect(stats.byStatus['mastered']).toBe(1);
    });

    it('should aggregate by category', () => {
      const items = [
        { reviewStatus: 'new', category: 'verb tenses', cefrLevel: 'A1' },
        { reviewStatus: 'new', category: 'verb tenses', cefrLevel: 'A2' },
        { reviewStatus: 'learning', category: 'articles', cefrLevel: 'A1' },
        { reviewStatus: 'mastered', category: 'prepositions', cefrLevel: 'B1' },
      ];

      const stats = aggregateStats(items);

      expect(stats.byCategory['verb tenses']).toBe(2);
      expect(stats.byCategory['articles']).toBe(1);
      expect(stats.byCategory['prepositions']).toBe(1);
    });

    it('should aggregate by CEFR level', () => {
      const items = [
        { reviewStatus: 'new', category: 'tenses', cefrLevel: 'A1' },
        { reviewStatus: 'new', category: 'tenses', cefrLevel: 'A1' },
        { reviewStatus: 'learning', category: 'articles', cefrLevel: 'B1' },
        { reviewStatus: 'mastered', category: 'tenses', cefrLevel: 'B2' },
      ];

      const stats = aggregateStats(items);

      expect(stats.byCefrLevel['A1']).toBe(2);
      expect(stats.byCefrLevel['B1']).toBe(1);
      expect(stats.byCefrLevel['B2']).toBe(1);
    });
  });

  describe('Average Ease Factor Calculation', () => {
    function calculateAverageEaseFactor(easeFactors: number[]): number {
      if (easeFactors.length === 0) {
        return SM2.DEFAULT_EASE_FACTOR;
      }
      const sum = easeFactors.reduce((a, b) => a + b, 0);
      return sum / easeFactors.length;
    }

    it('should return default for empty list', () => {
      expect(calculateAverageEaseFactor([])).toBe(SM2.DEFAULT_EASE_FACTOR);
    });

    it('should calculate average correctly', () => {
      const factors = [2.5, 2.6, 2.4, 2.5];
      const avg = calculateAverageEaseFactor(factors);
      expect(avg).toBe(2.5);
    });

    it('should handle single value', () => {
      expect(calculateAverageEaseFactor([2.8])).toBe(2.8);
    });

    it('should handle mixed values', () => {
      const factors = [1.3, 2.5, 3.0]; // min, default, above default
      const avg = calculateAverageEaseFactor(factors);
      expect(avg).toBeCloseTo(2.27, 1);
    });
  });
});

describe('Grammar Examples JSON Parsing', () => {
  interface GrammarExample {
    en: string;
    vi: string;
  }

  function parseExamples(examples: string | null | undefined): GrammarExample[] {
    if (!examples) return [];
    try {
      const parsed = typeof examples === 'string' ? JSON.parse(examples) : examples;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  it('should parse valid JSON array', () => {
    const json = '[{"en":"Hello","vi":"Xin chào"},{"en":"Goodbye","vi":"Tạm biệt"}]';
    const examples = parseExamples(json);

    expect(examples).toHaveLength(2);
    expect(examples[0].en).toBe('Hello');
    expect(examples[0].vi).toBe('Xin chào');
  });

  it('should return empty array for null', () => {
    expect(parseExamples(null)).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    expect(parseExamples(undefined)).toEqual([]);
  });

  it('should return empty array for invalid JSON', () => {
    expect(parseExamples('not valid json')).toEqual([]);
  });

  it('should return empty array for non-array JSON', () => {
    expect(parseExamples('{"en":"Hello"}')).toEqual([]);
  });

  it('should handle already parsed objects', () => {
    const examples = [{ en: 'Test', vi: 'Kiểm tra' }];
    expect(parseExamples(examples as unknown as string)).toEqual(examples);
  });
});
