import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { wordMapService, userProgressService, examService } from '../../services/v3/index.js';
import { gamificationService } from '../../services/gamification.service.js';
import { challengeService } from '../../services/challenge.service.js';
import { petService } from '../../services/pet.service.js';

const router = Router();

// ============================================================
// XP Constants for Word Maps
// ============================================================
const WORD_MAP_XP = {
  LESSON_COMPLETE: 20,          // Base XP for completing a lesson
  VOCAB_MASTERED_BONUS: 2,      // XP per vocabulary mastered
  GRAMMAR_MASTERED_BONUS: 3,    // XP per grammar point mastered
  EXAM_PASS: 50,                // Base XP for passing an exam
  EXAM_PERFECT_BONUS: 25,       // Bonus for 100% score
  EXAM_FAIL: 10,                // Partial XP even if failed
  UNIT_COMPLETE_BONUS: 30,      // Bonus for completing a unit
  MAP_COMPLETE_BONUS: 100,      // Bonus for completing a map
};

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Word Maps
// ============================================================

// GET /api/v3/word-maps - Get all published word maps
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const includeProgress = req.query.includeProgress === 'true';
    const maps = await wordMapService.getAllMaps();

    if (includeProgress && req.userId) {
      const userProgress = await userProgressService.getUserMapProgress(req.userId);
      const progressMap = new Map(userProgress.map(p => [p.wordMapId, p]));

      const mapsWithProgress = maps.map(map => ({
        ...map,
        userProgress: progressMap.get(map.id) || null,
      }));

      res.json({ maps: mapsWithProgress });
      return;
    }

    res.json({ maps });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get word maps';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/word-maps/featured - Get featured word maps
router.get('/featured', async (_req: AuthRequest, res: Response) => {
  try {
    const maps = await wordMapService.getFeaturedMaps();
    res.json({ maps });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get featured maps';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/word-maps/:id - Get word map details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mapId = parseInt(req.params.id);
    if (isNaN(mapId)) {
      res.status(400).json({ error: 'Invalid map ID' });
      return;
    }

    const includeStructure = req.query.includeStructure === 'true';

    if (includeStructure) {
      const result = await wordMapService.getMapWithStructure(mapId);
      if (!result) {
        res.status(404).json({ error: 'Word map not found' });
        return;
      }
      res.json(result);
      return;
    }

    const map = await wordMapService.getMapById(mapId);
    if (!map) {
      res.status(404).json({ error: 'Word map not found' });
      return;
    }

    res.json({ map });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get word map';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/word-maps/:id/activate - Activate a word map for learning
router.post('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const mapId = parseInt(req.params.id);
    if (isNaN(mapId)) {
      res.status(400).json({ error: 'Invalid map ID' });
      return;
    }

    // Check if map exists
    const map = await wordMapService.getMapById(mapId);
    if (!map) {
      res.status(404).json({ error: 'Word map not found' });
      return;
    }

    // Create or get progress
    const progress = await userProgressService.getOrCreateMapProgress(req.userId!, mapId);
    res.json({ progress, message: 'Word map activated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate word map';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Units
// ============================================================

// GET /api/v3/word-maps/:mapId/units - Get units for a word map
router.get('/:mapId/units', async (req: AuthRequest, res: Response) => {
  try {
    const mapId = parseInt(req.params.mapId);
    if (isNaN(mapId)) {
      res.status(400).json({ error: 'Invalid map ID' });
      return;
    }

    const includeProgress = req.query.includeProgress === 'true';
    const units = await wordMapService.getUnitsByMapId(mapId);

    if (includeProgress && req.userId) {
      const progress = await userProgressService.getUnitProgress(req.userId, mapId);
      const progressMap = new Map(progress.map(p => [p.mapUnitId, p]));

      const unitsWithProgress = units.map(unit => ({
        ...unit,
        userProgress: progressMap.get(unit.id) || null,
      }));

      res.json({ units: unitsWithProgress });
      return;
    }

    res.json({ units });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get units';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/word-maps/units/:unitId - Get unit details with lessons
router.get('/units/:unitId', async (req: AuthRequest, res: Response) => {
  try {
    const unitId = parseInt(req.params.unitId);
    if (isNaN(unitId)) {
      res.status(400).json({ error: 'Invalid unit ID' });
      return;
    }

    const result = await wordMapService.getUnitWithLessons(unitId);
    if (!result) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    // Include user progress if authenticated
    if (req.userId) {
      const lessonProgress = await userProgressService.getLessonProgress(req.userId, unitId);
      const progressMap = new Map(lessonProgress.map(p => [p.unitLessonId, p]));

      const lessonsWithProgress = result.lessons.map(lesson => ({
        ...lesson,
        userProgress: progressMap.get(lesson.id) || null,
      }));

      res.json({ unit: result.unit, lessons: lessonsWithProgress });
      return;
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get unit';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Lessons
// ============================================================

// GET /api/v3/word-maps/lessons/:lessonId - Get lesson with content
router.get('/lessons/:lessonId', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    const result = await wordMapService.getLessonWithContent(lessonId);
    if (!result) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // Include user progress if authenticated
    if (req.userId) {
      const progress = await userProgressService.getSingleLessonProgress(req.userId, lessonId);
      res.json({ ...result, userProgress: progress });
      return;
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get lesson';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/word-maps/lessons/:lessonId/start - Start studying a lesson
router.post('/lessons/:lessonId/start', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    // Update progress to in_progress
    const progress = await userProgressService.updateLessonProgress(req.userId!, lessonId, {
      status: 'in_progress',
    });

    if (!progress) {
      res.status(404).json({ error: 'Lesson progress not found' });
      return;
    }

    // Start a study session
    const sessionId = await userProgressService.startStudySession(req.userId!, 'lesson', lessonId);

    res.json({ progress, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start lesson';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/word-maps/lessons/:lessonId/complete - Complete studying a lesson
router.post('/lessons/:lessonId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    const { vocabularyMastered, grammarMastered, timeSpentSeconds, sessionId } = req.body;
    const vocabCount = vocabularyMastered || 0;
    const grammarCount = grammarMastered || 0;

    // Calculate XP to award
    let xpEarned = WORD_MAP_XP.LESSON_COMPLETE;
    xpEarned += vocabCount * WORD_MAP_XP.VOCAB_MASTERED_BONUS;
    xpEarned += grammarCount * WORD_MAP_XP.GRAMMAR_MASTERED_BONUS;

    // Update lesson progress
    const progress = await userProgressService.updateLessonProgress(req.userId!, lessonId, {
      status: 'completed',
      progressPercentage: 100,
      vocabularyMastered: vocabCount,
      grammarMastered: grammarCount,
      timeSpentSeconds: timeSpentSeconds || 0,
      completedAt: new Date(),
      xpEarned,
    });

    if (!progress) {
      res.status(404).json({ error: 'Lesson progress not found' });
      return;
    }

    // End study session if provided
    if (sessionId) {
      await userProgressService.endStudySession(sessionId, {
        itemsStudied: vocabCount + grammarCount,
        xpEarned,
      });
    }

    // Complete lesson and unlock next
    const result = await userProgressService.completeLesson(req.userId!, lessonId, xpEarned);

    // === GAMIFICATION INTEGRATION ===
    let levelUp = null;
    let achievements: { achievement: { name: string; icon: string; xpReward: number } }[] = [];

    try {
      // Award XP
      const xpResult = await gamificationService.awardXP(
        req.userId!,
        xpEarned,
        'exercise', // Using 'exercise' source for now, could add 'word_map' source later
        lessonId,
        `Completed Word Map lesson #${lessonId}`
      );
      levelUp = xpResult.levelUp || null;

      // Update leaderboard
      await gamificationService.updateLeaderboard(req.userId!, {
        xp: xpEarned,
        exercises: vocabCount + grammarCount,
      });

      // Check achievements
      const achievementResults = await gamificationService.checkAchievements(req.userId!, 'exercise_complete', {
        isCorrect: true,
      });
      achievements = achievementResults;

      // Check vocabulary achievements
      if (vocabCount > 0) {
        const vocabAchievements = await gamificationService.checkAchievements(req.userId!, 'vocabulary_learned', {});
        achievements = [...achievements, ...vocabAchievements];
      }
    } catch (error) {
      console.error('Failed to process gamification for lesson complete:', error);
    }

    // === CHALLENGE INTEGRATION ===
    try {
      // Update vocabulary challenge progress
      if (vocabCount > 0) {
        await challengeService.updateProgress(req.userId!, 'vocabulary', vocabCount);
      }
      // Update exercise challenge (lessons count as exercises)
      await challengeService.updateProgress(req.userId!, 'exercise', vocabCount + grammarCount);
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }

    // === PET INTEGRATION ===
    try {
      // Add XP to active egg for hatching
      await petService.addHatchXpToActiveEgg(req.userId!, xpEarned, 'exercise');

      // Record activity for pet daily tasks (count vocabulary + grammar as exercises)
      await petService.recordActivityForTasks(req.userId!, 'exercise', {
        count: vocabCount + grammarCount,
      });
    } catch (error) {
      console.error('Failed to update pet system:', error);
    }

    res.json({
      progress: result.lessonProgress,
      nextLesson: result.nextLesson,
      xpEarned,
      levelUp,
      achievements: achievements.map(a => ({
        name: a.achievement.name,
        icon: a.achievement.icon,
        xpReward: a.achievement.xpReward,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete lesson';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/word-maps/lessons/:lessonId/progress - Update lesson progress
router.post('/lessons/:lessonId/progress', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    const { contentCompleted, totalContent, timeSpentSeconds } = req.body;

    const progress = await userProgressService.updateLessonProgress(req.userId!, lessonId, {
      contentCompleted,
      totalContent,
      progressPercentage: totalContent > 0 ? Math.round((contentCompleted / totalContent) * 100) : 0,
      timeSpentSeconds,
    });

    if (!progress) {
      res.status(404).json({ error: 'Lesson progress not found' });
      return;
    }

    res.json({ progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update progress';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Exams
// ============================================================

// POST /api/v3/word-maps/lessons/:lessonId/exam/start - Start an exam for a lesson
router.post('/lessons/:lessonId/exam/start', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    // Get exams for this lesson
    const exams = await examService.getExamsForLesson(lessonId);
    if (exams.length === 0) {
      res.status(404).json({ error: 'No exam found for this lesson' });
      return;
    }

    // Use the first active exam (usually checkpoint or boss)
    const exam = exams[0];

    // Start exam attempt
    const result = await examService.startExamAttempt(req.userId!, exam.id);

    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      attemptId: result.attemptId,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        examType: exam.examType,
        passingScore: exam.passingScore,
        timeLimitSeconds: result.timeLimit,
        exerciseCount: exam.exerciseCount,
        xpReward: exam.xpReward,
        bonusXpPerfect: exam.bonusXpPerfect,
      },
      questions: result.exercises,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start exam';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/word-maps/exams/:attemptId/submit - Submit exam answers
router.post('/exams/:attemptId/submit', async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    if (isNaN(attemptId)) {
      res.status(400).json({ error: 'Invalid attempt ID' });
      return;
    }

    const { answers, timeSpentSeconds } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'Answers must be an array' });
      return;
    }

    // Submit exam
    const result = await examService.submitExamAttempt(
      req.userId!,
      attemptId,
      answers.map((a: { questionId: number; answer: string }) => ({
        exerciseId: a.questionId,
        userAnswer: a.answer,
        isCorrect: false, // Will be calculated in service
      })),
      timeSpentSeconds || 0
    );

    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    const xpEarned = result.xpEarned;

    // === GAMIFICATION INTEGRATION ===
    let levelUp = null;
    let achievements: { achievement: { name: string; icon: string; xpReward: number } }[] = [];

    try {
      // Award XP
      const xpResult = await gamificationService.awardXP(
        req.userId!,
        xpEarned,
        'quiz', // Using 'quiz' source for exams
        attemptId,
        `Completed Word Map exam (Score: ${result.score}%)`
      );
      levelUp = xpResult.levelUp || null;

      // Update leaderboard
      await gamificationService.updateLeaderboard(req.userId!, {
        xp: xpEarned,
        quizzes: 1,
      });

      // Check achievements
      const achievementResults = await gamificationService.checkAchievements(req.userId!, 'quiz_complete', {
        isPerfect: result.score === 100,
      });
      achievements = achievementResults;
    } catch (error) {
      console.error('Failed to process gamification for exam submit:', error);
    }

    // === CHALLENGE INTEGRATION ===
    try {
      await challengeService.updateProgress(req.userId!, 'quiz', 1);
      if (result.score === 100) {
        await challengeService.updateProgress(req.userId!, 'perfect_score', 1);
      }
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }

    // === PET INTEGRATION ===
    try {
      // Add XP to active egg for hatching
      await petService.addHatchXpToActiveEgg(req.userId!, xpEarned, 'quiz');

      // Record activity for pet daily tasks (exams count as exercises)
      await petService.recordActivityForTasks(req.userId!, 'exercise', {
        count: result.totalCount,
        scorePercent: result.score,
      });
    } catch (error) {
      console.error('Failed to update pet system:', error);
    }

    res.json({
      passed: result.passed,
      score: result.score,
      xpEarned,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      questionResults: result.detailedResults.map(r => ({
        questionId: r.exerciseId,
        isCorrect: r.isCorrect,
        correctAnswer: r.correctAnswer,
      })),
      levelUp,
      achievements: achievements.map(a => ({
        name: a.achievement.name,
        icon: a.achievement.icon,
        xpReward: a.achievement.xpReward,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit exam';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/word-maps/exams/:attemptId - Get exam attempt results
router.get('/exams/:attemptId', async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    if (isNaN(attemptId)) {
      res.status(400).json({ error: 'Invalid attempt ID' });
      return;
    }

    const attempt = await examService.getAttemptById(req.userId!, attemptId);
    if (!attempt) {
      res.status(404).json({ error: 'Exam attempt not found' });
      return;
    }

    res.json({ attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exam attempt';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/word-maps/exams/history - Get user's exam history
router.get('/exams/history', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const attempts = await examService.getUserAttempts(req.userId!, undefined, limit);
    res.json({ attempts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exam history';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Leaderboard
// ============================================================

// GET /api/v3/word-maps/leaderboard - Get Word Map leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const mapId = req.query.mapId ? parseInt(req.query.mapId as string) : undefined;
    const period = req.query.period as string || 'weekly';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // For now, use the existing gamification leaderboard
    // Could be extended to have map-specific leaderboards
    const leaderboard = await gamificationService.getWeeklyLeaderboard(req.userId!, limit);

    res.json({
      entries: leaderboard.entries.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.displayName || entry.nickname || entry.username,
        avatarUrl: entry.avatar,
        value: entry.totalXp,
        metric: 'xp',
      })),
      userRank: leaderboard.currentUserRank ? {
        rank: leaderboard.currentUserRank,
        userId: req.userId,
        value: leaderboard.entries.find(e => e.userId === req.userId)?.totalXp || 0,
        metric: 'xp',
      } : null,
      totalParticipants: leaderboard.totalParticipants,
      period,
      mapId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get leaderboard';
    res.status(500).json({ error: message });
  }
});

export default router;
