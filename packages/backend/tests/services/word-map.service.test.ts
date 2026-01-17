import { describe, it, expect } from 'vitest';

/**
 * WordMapService Tests
 *
 * Tests for the V3 Word Map curriculum service.
 * These tests verify the business logic for Word Map progression and XP calculation.
 */

// XP reward constants (matching service implementation)
const XP_REWARDS = {
  LESSON_STUDY_COMPLETE: 25,
  LESSON_EXAM_PASS: 50,
  BOSS_EXAM_PASS: 100,
  VOCABULARY_MASTERED: 5,
  GRAMMAR_MASTERED: 10,
  PERFECT_EXAM_BONUS: 25,
  STREAK_BONUS_MULTIPLIER: 0.1,
};

// Exam configuration
const EXAM_CONFIG = {
  PASSING_SCORE: 70,
  BOSS_PASSING_SCORE: 80,
  MAX_ATTEMPTS_PER_DAY: 5,
};

describe('WordMapService Business Logic', () => {
  describe('XP Calculation', () => {
    function calculateLessonStudyXP(
      vocabMastered: number,
      grammarMastered: number,
      streakDays: number = 0
    ): number {
      let xp = XP_REWARDS.LESSON_STUDY_COMPLETE;
      xp += vocabMastered * XP_REWARDS.VOCABULARY_MASTERED;
      xp += grammarMastered * XP_REWARDS.GRAMMAR_MASTERED;

      if (streakDays > 0) {
        xp = Math.round(xp * (1 + streakDays * XP_REWARDS.STREAK_BONUS_MULTIPLIER));
      }

      return xp;
    }

    function calculateExamXP(
      score: number,
      isBossExam: boolean,
      streakDays: number = 0
    ): number {
      const passingScore = isBossExam ? EXAM_CONFIG.BOSS_PASSING_SCORE : EXAM_CONFIG.PASSING_SCORE;

      if (score < passingScore) {
        return 0;
      }

      let xp = isBossExam ? XP_REWARDS.BOSS_EXAM_PASS : XP_REWARDS.LESSON_EXAM_PASS;

      if (score === 100) {
        xp += XP_REWARDS.PERFECT_EXAM_BONUS;
      }

      if (streakDays > 0) {
        xp = Math.round(xp * (1 + streakDays * XP_REWARDS.STREAK_BONUS_MULTIPLIER));
      }

      return xp;
    }

    it('should give base XP for completing lesson study', () => {
      const xp = calculateLessonStudyXP(0, 0);
      expect(xp).toBe(XP_REWARDS.LESSON_STUDY_COMPLETE);
    });

    it('should add vocabulary mastery XP', () => {
      const xp = calculateLessonStudyXP(5, 0);
      expect(xp).toBe(XP_REWARDS.LESSON_STUDY_COMPLETE + 5 * XP_REWARDS.VOCABULARY_MASTERED);
    });

    it('should add grammar mastery XP', () => {
      const xp = calculateLessonStudyXP(0, 3);
      expect(xp).toBe(XP_REWARDS.LESSON_STUDY_COMPLETE + 3 * XP_REWARDS.GRAMMAR_MASTERED);
    });

    it('should combine vocab and grammar mastery XP', () => {
      const xp = calculateLessonStudyXP(10, 2);
      const expected = XP_REWARDS.LESSON_STUDY_COMPLETE +
        10 * XP_REWARDS.VOCABULARY_MASTERED +
        2 * XP_REWARDS.GRAMMAR_MASTERED;
      expect(xp).toBe(expected);
    });

    it('should apply streak bonus', () => {
      const baseXP = calculateLessonStudyXP(5, 2, 0);
      const streakXP = calculateLessonStudyXP(5, 2, 3);

      expect(streakXP).toBeGreaterThan(baseXP);
      expect(streakXP).toBe(Math.round(baseXP * 1.3)); // 3 * 0.1 = 30% bonus
    });

    it('should return 0 XP for failed exam', () => {
      expect(calculateExamXP(60, false)).toBe(0);
      expect(calculateExamXP(75, true)).toBe(0); // Boss needs 80%
    });

    it('should give exam XP for passing', () => {
      const xp = calculateExamXP(70, false);
      expect(xp).toBe(XP_REWARDS.LESSON_EXAM_PASS);
    });

    it('should give higher XP for boss exam', () => {
      const regularXP = calculateExamXP(80, false);
      const bossXP = calculateExamXP(80, true);
      expect(bossXP).toBeGreaterThan(regularXP);
    });

    it('should give perfect score bonus', () => {
      const normalXP = calculateExamXP(90, false);
      const perfectXP = calculateExamXP(100, false);
      expect(perfectXP).toBe(normalXP + XP_REWARDS.PERFECT_EXAM_BONUS);
    });

    it('should apply streak bonus to exam XP', () => {
      const baseXP = calculateExamXP(85, false, 0);
      const streakXP = calculateExamXP(85, false, 5);
      expect(streakXP).toBe(Math.round(baseXP * 1.5)); // 5 * 0.1 = 50% bonus
    });
  });

  describe('Progress Calculation', () => {
    interface LessonProgress {
      studyCompleted: boolean;
      examPassed: boolean;
    }

    interface UnitProgress {
      lessons: LessonProgress[];
      bossExamPassed: boolean;
    }

    function calculateUnitProgress(unit: UnitProgress): number {
      const totalLessons = unit.lessons.length;
      if (totalLessons === 0) return 0;

      let completedSteps = 0;
      let totalSteps = totalLessons * 2 + 1; // Each lesson: study + exam, plus boss exam

      for (const lesson of unit.lessons) {
        if (lesson.studyCompleted) completedSteps++;
        if (lesson.examPassed) completedSteps++;
      }

      if (unit.bossExamPassed) completedSteps++;

      return Math.round((completedSteps / totalSteps) * 100);
    }

    function calculateWordMapProgress(units: UnitProgress[]): number {
      if (units.length === 0) return 0;

      const totalProgress = units.reduce((sum, unit) => sum + calculateUnitProgress(unit), 0);
      return Math.round(totalProgress / units.length);
    }

    it('should return 0% for no progress', () => {
      const unit: UnitProgress = {
        lessons: [
          { studyCompleted: false, examPassed: false },
          { studyCompleted: false, examPassed: false },
        ],
        bossExamPassed: false,
      };

      expect(calculateUnitProgress(unit)).toBe(0);
    });

    it('should calculate partial progress correctly', () => {
      const unit: UnitProgress = {
        lessons: [
          { studyCompleted: true, examPassed: true },
          { studyCompleted: true, examPassed: false },
        ],
        bossExamPassed: false,
      };

      // 3 out of 5 steps (2 lessons * 2 + 1 boss = 5)
      expect(calculateUnitProgress(unit)).toBe(60);
    });

    it('should return 100% for fully completed unit', () => {
      const unit: UnitProgress = {
        lessons: [
          { studyCompleted: true, examPassed: true },
          { studyCompleted: true, examPassed: true },
        ],
        bossExamPassed: true,
      };

      expect(calculateUnitProgress(unit)).toBe(100);
    });

    it('should calculate Word Map progress across units', () => {
      const units: UnitProgress[] = [
        {
          lessons: [
            { studyCompleted: true, examPassed: true },
            { studyCompleted: true, examPassed: true },
          ],
          bossExamPassed: true,
        }, // 100%
        {
          lessons: [
            { studyCompleted: true, examPassed: false },
            { studyCompleted: false, examPassed: false },
          ],
          bossExamPassed: false,
        }, // 20%
      ];

      // Average of 100% and 20% = 60%
      expect(calculateWordMapProgress(units)).toBe(60);
    });
  });

  describe('Unit Unlock Logic', () => {
    interface WordMapUnit {
      id: number;
      order: number;
      isLocked: boolean;
    }

    function calculateUnlockStatus(
      units: WordMapUnit[],
      completedUnitIds: Set<number>
    ): WordMapUnit[] {
      return units.map((unit, index) => ({
        ...unit,
        isLocked: index > 0 && !completedUnitIds.has(units[index - 1].id),
      }));
    }

    it('should always unlock first unit', () => {
      const units: WordMapUnit[] = [
        { id: 1, order: 1, isLocked: true },
        { id: 2, order: 2, isLocked: true },
      ];

      const result = calculateUnlockStatus(units, new Set());
      expect(result[0].isLocked).toBe(false);
    });

    it('should lock second unit if first not completed', () => {
      const units: WordMapUnit[] = [
        { id: 1, order: 1, isLocked: false },
        { id: 2, order: 2, isLocked: false },
      ];

      const result = calculateUnlockStatus(units, new Set());
      expect(result[1].isLocked).toBe(true);
    });

    it('should unlock second unit if first is completed', () => {
      const units: WordMapUnit[] = [
        { id: 1, order: 1, isLocked: false },
        { id: 2, order: 2, isLocked: true },
      ];

      const result = calculateUnlockStatus(units, new Set([1]));
      expect(result[1].isLocked).toBe(false);
    });

    it('should unlock third unit only if second is completed', () => {
      const units: WordMapUnit[] = [
        { id: 1, order: 1, isLocked: false },
        { id: 2, order: 2, isLocked: false },
        { id: 3, order: 3, isLocked: true },
      ];

      // Only first unit completed - third still locked
      let result = calculateUnlockStatus(units, new Set([1]));
      expect(result[2].isLocked).toBe(true);

      // First and second completed - third unlocked
      result = calculateUnlockStatus(units, new Set([1, 2]));
      expect(result[2].isLocked).toBe(false);
    });
  });

  describe('Lesson Unlock Logic', () => {
    interface Lesson {
      id: number;
      order: number;
      studyCompleted: boolean;
      examPassed: boolean;
    }

    function isLessonUnlocked(lesson: Lesson, lessons: Lesson[]): boolean {
      if (lesson.order === 1) return true;

      const previousLesson = lessons.find(l => l.order === lesson.order - 1);
      return previousLesson ? previousLesson.examPassed : false;
    }

    it('should always unlock first lesson', () => {
      const lessons: Lesson[] = [
        { id: 1, order: 1, studyCompleted: false, examPassed: false },
        { id: 2, order: 2, studyCompleted: false, examPassed: false },
      ];

      expect(isLessonUnlocked(lessons[0], lessons)).toBe(true);
    });

    it('should lock second lesson if first exam not passed', () => {
      const lessons: Lesson[] = [
        { id: 1, order: 1, studyCompleted: true, examPassed: false },
        { id: 2, order: 2, studyCompleted: false, examPassed: false },
      ];

      expect(isLessonUnlocked(lessons[1], lessons)).toBe(false);
    });

    it('should unlock second lesson when first exam passed', () => {
      const lessons: Lesson[] = [
        { id: 1, order: 1, studyCompleted: true, examPassed: true },
        { id: 2, order: 2, studyCompleted: false, examPassed: false },
      ];

      expect(isLessonUnlocked(lessons[1], lessons)).toBe(true);
    });
  });

  describe('Exam Scoring', () => {
    interface ExamAnswer {
      questionId: number;
      userAnswer: string;
      correctAnswer: string;
    }

    function calculateExamScore(answers: ExamAnswer[]): {
      score: number;
      correctCount: number;
      totalQuestions: number;
      passed: boolean;
      isBossExam?: boolean;
    } {
      const correctCount = answers.filter(a =>
        a.userAnswer.toLowerCase().trim() === a.correctAnswer.toLowerCase().trim()
      ).length;

      const score = Math.round((correctCount / answers.length) * 100);

      return {
        score,
        correctCount,
        totalQuestions: answers.length,
        passed: score >= EXAM_CONFIG.PASSING_SCORE,
      };
    }

    it('should calculate 100% for all correct', () => {
      const answers: ExamAnswer[] = [
        { questionId: 1, userAnswer: 'hello', correctAnswer: 'hello' },
        { questionId: 2, userAnswer: 'world', correctAnswer: 'world' },
      ];

      const result = calculateExamScore(answers);
      expect(result.score).toBe(100);
      expect(result.correctCount).toBe(2);
      expect(result.passed).toBe(true);
    });

    it('should calculate 0% for all wrong', () => {
      const answers: ExamAnswer[] = [
        { questionId: 1, userAnswer: 'wrong', correctAnswer: 'hello' },
        { questionId: 2, userAnswer: 'wrong', correctAnswer: 'world' },
      ];

      const result = calculateExamScore(answers);
      expect(result.score).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should calculate partial score correctly', () => {
      const answers: ExamAnswer[] = [
        { questionId: 1, userAnswer: 'hello', correctAnswer: 'hello' },
        { questionId: 2, userAnswer: 'wrong', correctAnswer: 'world' },
        { questionId: 3, userAnswer: 'test', correctAnswer: 'test' },
        { questionId: 4, userAnswer: 'wrong', correctAnswer: 'right' },
      ];

      const result = calculateExamScore(answers);
      expect(result.score).toBe(50);
      expect(result.correctCount).toBe(2);
      expect(result.passed).toBe(false); // 50 < 70
    });

    it('should be case-insensitive', () => {
      const answers: ExamAnswer[] = [
        { questionId: 1, userAnswer: 'HELLO', correctAnswer: 'hello' },
        { questionId: 2, userAnswer: 'World', correctAnswer: 'WORLD' },
      ];

      const result = calculateExamScore(answers);
      expect(result.score).toBe(100);
    });

    it('should trim whitespace', () => {
      const answers: ExamAnswer[] = [
        { questionId: 1, userAnswer: '  hello  ', correctAnswer: 'hello' },
      ];

      const result = calculateExamScore(answers);
      expect(result.score).toBe(100);
    });

    it('should pass at exactly 70%', () => {
      const answers: ExamAnswer[] = [];
      for (let i = 1; i <= 10; i++) {
        answers.push({
          questionId: i,
          userAnswer: i <= 7 ? 'correct' : 'wrong',
          correctAnswer: 'correct',
        });
      }

      const result = calculateExamScore(answers);
      expect(result.score).toBe(70);
      expect(result.passed).toBe(true);
    });

    it('should fail at 69%', () => {
      const answers: ExamAnswer[] = [];
      for (let i = 1; i <= 100; i++) {
        answers.push({
          questionId: i,
          userAnswer: i <= 69 ? 'correct' : 'wrong',
          correctAnswer: 'correct',
        });
      }

      const result = calculateExamScore(answers);
      expect(result.score).toBe(69);
      expect(result.passed).toBe(false);
    });
  });

  describe('Attempt Limits', () => {
    function canAttemptExam(
      attemptsToday: number,
      lastAttemptAt: Date | null
    ): { allowed: boolean; reason?: string; attemptsRemaining: number } {
      if (attemptsToday >= EXAM_CONFIG.MAX_ATTEMPTS_PER_DAY) {
        return {
          allowed: false,
          reason: 'Maximum daily attempts reached',
          attemptsRemaining: 0,
        };
      }

      return {
        allowed: true,
        attemptsRemaining: EXAM_CONFIG.MAX_ATTEMPTS_PER_DAY - attemptsToday,
      };
    }

    it('should allow first attempt', () => {
      const result = canAttemptExam(0, null);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(5);
    });

    it('should allow up to max attempts', () => {
      const result = canAttemptExam(4, new Date());
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(1);
    });

    it('should block at max attempts', () => {
      const result = canAttemptExam(5, new Date());
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Maximum daily attempts reached');
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should block beyond max attempts', () => {
      const result = canAttemptExam(10, new Date());
      expect(result.allowed).toBe(false);
    });
  });
});

describe('CEFR Level Ordering', () => {
  const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  function compareCefrLevels(a: string, b: string): number {
    return CEFR_ORDER.indexOf(a) - CEFR_ORDER.indexOf(b);
  }

  function sortByCefr<T extends { cefrLevel: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => compareCefrLevels(a.cefrLevel, b.cefrLevel));
  }

  it('should order A1 before A2', () => {
    expect(compareCefrLevels('A1', 'A2')).toBeLessThan(0);
  });

  it('should order B1 before C1', () => {
    expect(compareCefrLevels('B1', 'C1')).toBeLessThan(0);
  });

  it('should return 0 for same level', () => {
    expect(compareCefrLevels('B2', 'B2')).toBe(0);
  });

  it('should sort items by CEFR level', () => {
    const items = [
      { name: 'C1 Course', cefrLevel: 'C1' },
      { name: 'A1 Course', cefrLevel: 'A1' },
      { name: 'B2 Course', cefrLevel: 'B2' },
    ];

    const sorted = sortByCefr(items);

    expect(sorted[0].cefrLevel).toBe('A1');
    expect(sorted[1].cefrLevel).toBe('B2');
    expect(sorted[2].cefrLevel).toBe('C1');
  });
});

describe('Difficulty Level Mapping', () => {
  const DIFFICULTY_MAP: Record<string, string> = {
    'A1': 'beginner',
    'A2': 'elementary',
    'B1': 'intermediate',
    'B2': 'upper_intermediate',
    'C1': 'advanced',
    'C2': 'proficient',
  };

  function cefrToDifficulty(cefr: string): string {
    return DIFFICULTY_MAP[cefr] || 'intermediate';
  }

  it('should map A1 to beginner', () => {
    expect(cefrToDifficulty('A1')).toBe('beginner');
  });

  it('should map B1 to intermediate', () => {
    expect(cefrToDifficulty('B1')).toBe('intermediate');
  });

  it('should map C2 to proficient', () => {
    expect(cefrToDifficulty('C2')).toBe('proficient');
  });

  it('should default to intermediate for unknown', () => {
    expect(cefrToDifficulty('X1')).toBe('intermediate');
  });
});
