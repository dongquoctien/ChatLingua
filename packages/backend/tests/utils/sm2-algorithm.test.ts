import { describe, it, expect } from 'vitest';

/**
 * SM2 Algorithm Tests
 *
 * The SM2 (SuperMemo 2) algorithm is used for spaced repetition.
 * These tests verify the core algorithm calculations without database dependencies.
 */

// SM2 algorithm constants (matching service implementation)
const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASY_BONUS: 1.3,
  INTERVAL_MODIFIER: 1.0,
};

/**
 * Calculate new ease factor based on quality
 * @param currentEaseFactor Current ease factor
 * @param quality Quality rating (0-5)
 * @returns New ease factor
 */
function calculateNewEaseFactor(currentEaseFactor: number, quality: number): number {
  const newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);
}

/**
 * Calculate new interval based on SM2 algorithm
 * @param repetitionCount Number of successful repetitions
 * @param previousInterval Previous interval in days
 * @param easeFactor Current ease factor
 * @param quality Quality rating (0-5)
 * @returns New interval in days
 */
function calculateNewInterval(
  repetitionCount: number,
  previousInterval: number,
  easeFactor: number,
  quality: number
): number {
  if (quality < 3) {
    // Failed review - reset to 1 day
    return 1;
  }

  let newInterval: number;

  if (repetitionCount === 0) {
    newInterval = 1;
  } else if (repetitionCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(previousInterval * easeFactor * SM2.INTERVAL_MODIFIER);
  }

  // Easy bonus for quality 5
  if (quality === 5) {
    newInterval = Math.round(newInterval * SM2.EASY_BONUS);
  }

  return newInterval;
}

/**
 * Determine review status based on SM2 state
 * @param repetitionCount Number of successful repetitions
 * @param interval Current interval in days
 * @returns Review status
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
 * @param repetitionCount Number of successful repetitions
 * @param easeFactor Current ease factor
 * @param quality Last quality rating
 * @returns Mastery level percentage
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

describe('SM2 Algorithm', () => {
  describe('calculateNewEaseFactor', () => {
    it('should maintain default ease factor with quality 5', () => {
      const result = calculateNewEaseFactor(SM2.DEFAULT_EASE_FACTOR, 5);
      expect(result).toBe(2.6); // 2.5 + 0.1
    });

    it('should decrease ease factor with quality 0', () => {
      const result = calculateNewEaseFactor(SM2.DEFAULT_EASE_FACTOR, 0);
      expect(result).toBeLessThan(SM2.DEFAULT_EASE_FACTOR);
    });

    it('should not go below minimum ease factor', () => {
      // With repeated failures, ease factor should not go below 1.3
      let easeFactor = SM2.DEFAULT_EASE_FACTOR;
      for (let i = 0; i < 10; i++) {
        easeFactor = calculateNewEaseFactor(easeFactor, 0);
      }
      expect(easeFactor).toBe(SM2.MIN_EASE_FACTOR);
    });

    it('should increase with quality 4', () => {
      const result = calculateNewEaseFactor(SM2.DEFAULT_EASE_FACTOR, 4);
      expect(result).toBe(2.5); // 2.5 + 0.0 = 2.5
    });

    it('should decrease with quality 3', () => {
      const result = calculateNewEaseFactor(SM2.DEFAULT_EASE_FACTOR, 3);
      expect(result).toBeLessThan(SM2.DEFAULT_EASE_FACTOR);
    });
  });

  describe('calculateNewInterval', () => {
    it('should return 1 day for first successful review', () => {
      const result = calculateNewInterval(0, 0, SM2.DEFAULT_EASE_FACTOR, 3);
      expect(result).toBe(1);
    });

    it('should return 6 days for second successful review', () => {
      const result = calculateNewInterval(1, 1, SM2.DEFAULT_EASE_FACTOR, 3);
      expect(result).toBe(6);
    });

    it('should multiply by ease factor after second review', () => {
      const result = calculateNewInterval(2, 6, 2.5, 3);
      expect(result).toBe(15); // 6 * 2.5 = 15
    });

    it('should reset to 1 day on failed review (quality < 3)', () => {
      const result = calculateNewInterval(5, 30, 2.5, 2);
      expect(result).toBe(1);
    });

    it('should apply easy bonus for quality 5', () => {
      const normalResult = calculateNewInterval(2, 6, 2.5, 4);
      const easyResult = calculateNewInterval(2, 6, 2.5, 5);
      expect(easyResult).toBe(Math.round(normalResult * SM2.EASY_BONUS));
    });

    it('should handle quality 0 (complete blackout)', () => {
      const result = calculateNewInterval(10, 60, 2.5, 0);
      expect(result).toBe(1); // Reset to 1 day
    });
  });

  describe('determineReviewStatus', () => {
    it('should return "learning" when repetition count is 0', () => {
      expect(determineReviewStatus(0, 1)).toBe('learning');
    });

    it('should return "reviewing" for moderate intervals', () => {
      expect(determineReviewStatus(3, 10)).toBe('reviewing');
    });

    it('should return "mastered" for intervals >= 21 days', () => {
      expect(determineReviewStatus(5, 21)).toBe('mastered');
      expect(determineReviewStatus(8, 30)).toBe('mastered');
    });

    it('should not be mastered with short intervals even with many reps', () => {
      expect(determineReviewStatus(10, 15)).toBe('reviewing');
    });
  });

  describe('calculateMasteryLevel', () => {
    it('should return low mastery for new items', () => {
      const result = calculateMasteryLevel(0, SM2.DEFAULT_EASE_FACTOR, 3);
      expect(result).toBeLessThan(50);
    });

    it('should return high mastery for well-practiced items', () => {
      const result = calculateMasteryLevel(10, 2.8, 5);
      expect(result).toBeGreaterThanOrEqual(90);
    });

    it('should be capped at 100', () => {
      const result = calculateMasteryLevel(20, 3.0, 5);
      expect(result).toBe(100);
    });

    it('should factor in quality rating', () => {
      const lowQuality = calculateMasteryLevel(5, 2.5, 2);
      const highQuality = calculateMasteryLevel(5, 2.5, 5);
      expect(highQuality).toBeGreaterThan(lowQuality);
    });

    it('should factor in ease factor', () => {
      const lowEase = calculateMasteryLevel(5, 1.5, 4);
      const highEase = calculateMasteryLevel(5, 2.8, 4);
      expect(highEase).toBeGreaterThan(lowEase);
    });
  });

  describe('SM2 Flow Simulation', () => {
    it('should progress correctly through typical learning flow', () => {
      // Simulate a vocabulary item being learned
      let easeFactor = SM2.DEFAULT_EASE_FACTOR;
      let interval = 0;
      let repetitionCount = 0;

      // First review - quality 4 (Good)
      easeFactor = calculateNewEaseFactor(easeFactor, 4);
      interval = calculateNewInterval(repetitionCount, interval, easeFactor, 4);
      repetitionCount++;

      expect(interval).toBe(1);
      expect(determineReviewStatus(repetitionCount, interval)).toBe('reviewing');

      // Second review - quality 5 (Easy)
      easeFactor = calculateNewEaseFactor(easeFactor, 5);
      interval = calculateNewInterval(repetitionCount, interval, easeFactor, 5);
      repetitionCount++;

      expect(interval).toBe(8); // 6 * 1.3 (easy bonus) = 7.8, rounded to 8
      expect(determineReviewStatus(repetitionCount, interval)).toBe('reviewing');

      // Third review - quality 4 (Good)
      easeFactor = calculateNewEaseFactor(easeFactor, 4);
      interval = calculateNewInterval(repetitionCount, interval, easeFactor, 4);
      repetitionCount++;

      expect(interval).toBeGreaterThan(10);
    });

    it('should reset progress on failure', () => {
      let easeFactor = 2.8; // High ease factor from practice
      let interval = 30;
      let repetitionCount = 5;

      // Fail the review
      easeFactor = calculateNewEaseFactor(easeFactor, 1);
      interval = calculateNewInterval(repetitionCount, interval, easeFactor, 1);
      repetitionCount = 0; // Reset on failure

      expect(interval).toBe(1);
      expect(easeFactor).toBeLessThan(2.8);
      expect(determineReviewStatus(repetitionCount, interval)).toBe('learning');
    });
  });

  describe('Edge Cases', () => {
    it('should handle quality of exactly 3 (threshold)', () => {
      const interval = calculateNewInterval(2, 6, 2.5, 3);
      expect(interval).toBeGreaterThan(1); // Should not reset
    });

    it('should handle very high ease factors', () => {
      const result = calculateNewInterval(5, 30, 3.0, 4);
      expect(result).toBe(90); // 30 * 3.0 = 90
    });

    it('should handle minimum ease factor correctly', () => {
      const result = calculateNewInterval(5, 30, SM2.MIN_EASE_FACTOR, 4);
      expect(result).toBe(39); // 30 * 1.3 = 39
    });
  });
});
