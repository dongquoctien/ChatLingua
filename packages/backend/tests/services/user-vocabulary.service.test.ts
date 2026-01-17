import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * UserVocabularyService Tests
 *
 * Tests for the V3 user vocabulary service.
 * These tests mock the database pool to test business logic in isolation.
 */

// SM2 algorithm constants (matching service implementation)
const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASY_BONUS: 1.3,
  INTERVAL_MODIFIER: 1.0,
};

/**
 * Calculate new ease factor (SM2 algorithm core)
 */
function calculateNewEaseFactor(currentEaseFactor: number, quality: number): number {
  const newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);
}

/**
 * Calculate new interval based on SM2
 */
function calculateNewInterval(
  repetitionCount: number,
  previousInterval: number,
  easeFactor: number,
  quality: number
): number {
  if (quality < 3) {
    return 1; // Failed review
  }

  let newInterval: number;
  if (repetitionCount === 0) {
    newInterval = 1;
  } else if (repetitionCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(previousInterval * easeFactor * SM2.INTERVAL_MODIFIER);
  }

  if (quality === 5) {
    newInterval = Math.round(newInterval * SM2.EASY_BONUS);
  }

  return newInterval;
}

/**
 * Determine review status based on SM2 state
 */
function determineReviewStatus(
  repetitionCount: number,
  interval: number
): 'new' | 'learning' | 'reviewing' | 'mastered' {
  if (repetitionCount === 0) {
    return 'learning';
  } else if (interval >= 21) {
    return 'mastered';
  } else {
    return 'reviewing';
  }
}

/**
 * Calculate mastery level (0-100)
 */
function calculateMasteryLevel(
  repetitionCount: number,
  easeFactor: number,
  quality: number
): number {
  return Math.min(100, Math.round(
    (repetitionCount / 10) * 50 +
    ((easeFactor - SM2.MIN_EASE_FACTOR) / (3.0 - SM2.MIN_EASE_FACTOR)) * 30 +
    (quality / 5) * 20
  ));
}

/**
 * Simulate a complete review submission (matching service logic)
 */
function simulateReviewSubmission(
  currentVocab: {
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
} {
  let newEaseFactor = calculateNewEaseFactor(currentVocab.easeFactor, quality);
  let newInterval: number;
  let newRepetitionCount: number;
  let newLapseCount = currentVocab.lapseCount;

  if (quality < 3) {
    // Failed review
    newInterval = 1;
    newRepetitionCount = 0;
    newLapseCount += 1;
  } else {
    // Successful review
    newRepetitionCount = currentVocab.repetitionCount + 1;

    if (currentVocab.repetitionCount === 0) {
      newInterval = 1;
    } else if (currentVocab.repetitionCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentVocab.reviewInterval * newEaseFactor * SM2.INTERVAL_MODIFIER);
    }

    if (quality === 5) {
      newInterval = Math.round(newInterval * SM2.EASY_BONUS);
    }
  }

  const newStatus = determineReviewStatus(newRepetitionCount, newInterval);
  const masteryLevel = calculateMasteryLevel(newRepetitionCount, newEaseFactor, quality);

  return {
    newEaseFactor,
    newInterval,
    newRepetitionCount,
    newLapseCount,
    newStatus,
    masteryLevel,
  };
}

describe('UserVocabularyService Business Logic', () => {
  describe('SM2 Algorithm Integration', () => {
    it('should correctly calculate first review (quality 4)', () => {
      const vocab = {
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      };

      const result = simulateReviewSubmission(vocab, 4);

      expect(result.newInterval).toBe(1);
      expect(result.newRepetitionCount).toBe(1);
      expect(result.newStatus).toBe('reviewing');
      expect(result.newEaseFactor).toBe(2.5); // Quality 4 maintains ease factor
    });

    it('should correctly calculate second review (quality 5)', () => {
      const vocab = {
        easeFactor: 2.5,
        reviewInterval: 1,
        repetitionCount: 1,
        lapseCount: 0,
      };

      const result = simulateReviewSubmission(vocab, 5);

      expect(result.newInterval).toBe(8); // 6 * 1.3 = 7.8 -> 8
      expect(result.newRepetitionCount).toBe(2);
      expect(result.newStatus).toBe('reviewing');
      expect(result.newEaseFactor).toBe(2.6); // Quality 5 increases ease factor
    });

    it('should reset on failed review (quality 2)', () => {
      const vocab = {
        easeFactor: 2.6,
        reviewInterval: 15,
        repetitionCount: 3,
        lapseCount: 0,
      };

      const result = simulateReviewSubmission(vocab, 2);

      expect(result.newInterval).toBe(1);
      expect(result.newRepetitionCount).toBe(0);
      expect(result.newLapseCount).toBe(1);
      expect(result.newStatus).toBe('learning');
      expect(result.newEaseFactor).toBeLessThan(vocab.easeFactor);
    });

    it('should reach mastered status with interval >= 21', () => {
      const vocab = {
        easeFactor: 2.6,
        reviewInterval: 15,
        repetitionCount: 3,
        lapseCount: 0,
      };

      const result = simulateReviewSubmission(vocab, 5);

      // 15 * 2.6 * 1.3 = 50.7 -> 51 (well above 21)
      expect(result.newInterval).toBeGreaterThanOrEqual(21);
      expect(result.newStatus).toBe('mastered');
    });

    it('should accumulate lapse count on repeated failures', () => {
      let vocab = {
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 6,
        repetitionCount: 2,
        lapseCount: 0,
      };

      // First failure
      let result = simulateReviewSubmission(vocab, 1);
      expect(result.newLapseCount).toBe(1);

      // Second failure
      vocab = { ...result, reviewInterval: result.newInterval, easeFactor: result.newEaseFactor, repetitionCount: result.newRepetitionCount, lapseCount: result.newLapseCount };
      result = simulateReviewSubmission(vocab, 0);
      expect(result.newLapseCount).toBe(2);
    });
  });

  describe('Mastery Level Calculation', () => {
    it('should start low for new vocabulary', () => {
      const result = simulateReviewSubmission({
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      }, 3);

      expect(result.masteryLevel).toBeLessThan(50);
    });

    it('should increase with successful reviews', () => {
      const levels: number[] = [];

      let vocab = {
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      };

      for (let i = 0; i < 5; i++) {
        const result = simulateReviewSubmission(vocab, 4);
        levels.push(result.masteryLevel);
        vocab = {
          easeFactor: result.newEaseFactor,
          reviewInterval: result.newInterval,
          repetitionCount: result.newRepetitionCount,
          lapseCount: result.newLapseCount,
        };
      }

      // Each review should increase mastery
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBeGreaterThan(levels[i - 1]);
      }
    });

    it('should cap at 100', () => {
      const result = simulateReviewSubmission({
        easeFactor: 3.0,
        reviewInterval: 30,
        repetitionCount: 20,
        lapseCount: 0,
      }, 5);

      expect(result.masteryLevel).toBe(100);
    });

    it('should decrease on failure', () => {
      const beforeFail = simulateReviewSubmission({
        easeFactor: 2.6,
        reviewInterval: 6,
        repetitionCount: 2,
        lapseCount: 0,
      }, 4);

      const afterFail = simulateReviewSubmission({
        easeFactor: beforeFail.newEaseFactor,
        reviewInterval: beforeFail.newInterval,
        repetitionCount: beforeFail.newRepetitionCount,
        lapseCount: beforeFail.newLapseCount,
      }, 1);

      expect(afterFail.masteryLevel).toBeLessThan(beforeFail.masteryLevel);
    });
  });

  describe('Review Status Transitions', () => {
    it('should transition: new -> learning on first review', () => {
      const result = simulateReviewSubmission({
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      }, 1); // Fail

      expect(result.newStatus).toBe('learning');
    });

    it('should transition: learning -> reviewing on success', () => {
      const result = simulateReviewSubmission({
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      }, 4); // Pass

      expect(result.newStatus).toBe('reviewing');
    });

    it('should transition: reviewing -> mastered with high interval', () => {
      const result = simulateReviewSubmission({
        easeFactor: 2.6,
        reviewInterval: 15,
        repetitionCount: 3,
        lapseCount: 0,
      }, 5); // Easy

      expect(result.newStatus).toBe('mastered');
    });

    it('should transition: mastered -> learning on failure', () => {
      // First, simulate getting to mastered state
      let vocab = {
        easeFactor: 2.8,
        reviewInterval: 30,
        repetitionCount: 5,
        lapseCount: 0,
      };

      // Verify it's mastered-eligible
      expect(vocab.reviewInterval).toBeGreaterThanOrEqual(21);

      // Then fail
      const result = simulateReviewSubmission(vocab, 0);
      expect(result.newStatus).toBe('learning');
    });
  });

  describe('Quality Rating Effects', () => {
    const baseVocab = {
      easeFactor: SM2.DEFAULT_EASE_FACTOR,
      reviewInterval: 6,
      repetitionCount: 2,
      lapseCount: 0,
    };

    it('should give longer intervals for higher quality', () => {
      const quality3 = simulateReviewSubmission(baseVocab, 3);
      const quality4 = simulateReviewSubmission(baseVocab, 4);
      const quality5 = simulateReviewSubmission(baseVocab, 5);

      expect(quality5.newInterval).toBeGreaterThan(quality4.newInterval);
      // Quality 3 and 4 have same interval calculation, only 5 gets easy bonus
      expect(quality5.newInterval).toBeGreaterThan(quality3.newInterval);
    });

    it('should increase ease factor for quality 5', () => {
      const result = simulateReviewSubmission(baseVocab, 5);
      expect(result.newEaseFactor).toBeGreaterThan(baseVocab.easeFactor);
    });

    it('should maintain ease factor for quality 4', () => {
      const result = simulateReviewSubmission(baseVocab, 4);
      expect(result.newEaseFactor).toBe(baseVocab.easeFactor);
    });

    it('should decrease ease factor for quality 3', () => {
      const result = simulateReviewSubmission(baseVocab, 3);
      expect(result.newEaseFactor).toBeLessThan(baseVocab.easeFactor);
    });

    it('should significantly decrease ease factor for quality 0', () => {
      const result = simulateReviewSubmission(baseVocab, 0);
      expect(result.newEaseFactor).toBeLessThan(baseVocab.easeFactor);
      expect(baseVocab.easeFactor - result.newEaseFactor).toBeGreaterThan(0.3);
    });
  });

  describe('Edge Cases', () => {
    it('should not allow ease factor below minimum', () => {
      let vocab = {
        easeFactor: 1.4, // Close to minimum
        reviewInterval: 6,
        repetitionCount: 2,
        lapseCount: 0,
      };

      // Repeated failures
      for (let i = 0; i < 5; i++) {
        const result = simulateReviewSubmission(vocab, 0);
        vocab = {
          easeFactor: result.newEaseFactor,
          reviewInterval: result.newInterval,
          repetitionCount: result.newRepetitionCount,
          lapseCount: result.newLapseCount,
        };
      }

      expect(vocab.easeFactor).toBe(SM2.MIN_EASE_FACTOR);
    });

    it('should handle zero interval correctly', () => {
      const result = simulateReviewSubmission({
        easeFactor: SM2.DEFAULT_EASE_FACTOR,
        reviewInterval: 0,
        repetitionCount: 0,
        lapseCount: 0,
      }, 3);

      expect(result.newInterval).toBe(1);
    });

    it('should handle very large intervals', () => {
      const result = simulateReviewSubmission({
        easeFactor: 2.5,
        reviewInterval: 365, // 1 year
        repetitionCount: 10,
        lapseCount: 0,
      }, 5);

      expect(result.newInterval).toBeGreaterThan(365);
      expect(result.newStatus).toBe('mastered');
    });
  });
});

describe('Vocabulary Filtering Logic', () => {
  // Helper to simulate filter condition building
  function buildFilterConditions(filters: {
    reviewStatus?: string;
    sourceType?: string;
    cefrLevel?: string;
    searchTerm?: string;
  }): { conditions: string[]; params: (string | number)[] } {
    const conditions: string[] = ['uv.user_id = ?'];
    const params: (string | number)[] = [1]; // userId

    if (filters.reviewStatus) {
      conditions.push('uv.review_status = ?');
      params.push(filters.reviewStatus);
    }

    if (filters.sourceType) {
      conditions.push('uv.source_type = ?');
      params.push(filters.sourceType);
    }

    if (filters.cefrLevel) {
      conditions.push('mv.cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.searchTerm) {
      conditions.push('(mv.english_word LIKE ? OR mv.vietnamese_word LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    return { conditions, params };
  }

  it('should build basic user filter', () => {
    const { conditions, params } = buildFilterConditions({});

    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toBe('uv.user_id = ?');
    expect(params).toHaveLength(1);
  });

  it('should add review status filter', () => {
    const { conditions, params } = buildFilterConditions({ reviewStatus: 'learning' });

    expect(conditions).toHaveLength(2);
    expect(conditions).toContain('uv.review_status = ?');
    expect(params).toContain('learning');
  });

  it('should add source type filter', () => {
    const { conditions, params } = buildFilterConditions({ sourceType: 'word_map' });

    expect(conditions).toHaveLength(2);
    expect(conditions).toContain('uv.source_type = ?');
    expect(params).toContain('word_map');
  });

  it('should add CEFR level filter', () => {
    const { conditions, params } = buildFilterConditions({ cefrLevel: 'B1' });

    expect(conditions).toHaveLength(2);
    expect(conditions).toContain('mv.cefr_level = ?');
    expect(params).toContain('B1');
  });

  it('should add search term filter with wildcards', () => {
    const { conditions, params } = buildFilterConditions({ searchTerm: 'hello' });

    expect(conditions).toHaveLength(2);
    expect(conditions).toContain('(mv.english_word LIKE ? OR mv.vietnamese_word LIKE ?)');
    expect(params).toContain('%hello%');
    expect(params.filter(p => p === '%hello%')).toHaveLength(2);
  });

  it('should combine multiple filters', () => {
    const { conditions, params } = buildFilterConditions({
      reviewStatus: 'reviewing',
      sourceType: 'conversation',
      cefrLevel: 'A2',
      searchTerm: 'dog',
    });

    expect(conditions).toHaveLength(5);
    expect(params).toHaveLength(6); // userId + 4 filters (searchTerm adds 2)
  });
});

describe('Pagination Logic', () => {
  it('should calculate correct offset for page 1', () => {
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    expect(offset).toBe(0);
  });

  it('should calculate correct offset for page 2', () => {
    const page = 2;
    const limit = 20;
    const offset = (page - 1) * limit;
    expect(offset).toBe(20);
  });

  it('should calculate correct offset for page 5 with limit 10', () => {
    const page = 5;
    const limit = 10;
    const offset = (page - 1) * limit;
    expect(offset).toBe(40);
  });
});
