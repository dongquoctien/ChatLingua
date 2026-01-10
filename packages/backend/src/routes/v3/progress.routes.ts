import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { userProgressService } from '../../services/v3/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// User Progress Overview
// ============================================================

// GET /api/v3/progress - Get overall progress for all maps
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const progress = await userProgressService.getUserMapProgress(req.userId!);
    res.json({ progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get progress';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/progress/map/:mapId - Get progress for a specific map
router.get('/map/:mapId', async (req: AuthRequest, res: Response) => {
  try {
    const mapId = parseInt(req.params.mapId);
    if (isNaN(mapId)) {
      res.status(400).json({ error: 'Invalid map ID' });
      return;
    }

    const mapProgress = await userProgressService.getOrCreateMapProgress(req.userId!, mapId);
    const unitProgress = await userProgressService.getUnitProgress(req.userId!, mapId);

    res.json({
      mapProgress,
      unitProgress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get map progress';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/progress/unit/:unitId - Get progress for a specific unit
router.get('/unit/:unitId', async (req: AuthRequest, res: Response) => {
  try {
    const unitId = parseInt(req.params.unitId);
    if (isNaN(unitId)) {
      res.status(400).json({ error: 'Invalid unit ID' });
      return;
    }

    const unitProgress = await userProgressService.getSingleUnitProgress(req.userId!, unitId);
    if (!unitProgress) {
      res.status(404).json({ error: 'Unit progress not found' });
      return;
    }

    const lessonProgress = await userProgressService.getLessonProgress(req.userId!, unitId);

    res.json({
      unitProgress,
      lessonProgress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get unit progress';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/progress/lesson/:lessonId - Get progress for a specific lesson
router.get('/lesson/:lessonId', async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: 'Invalid lesson ID' });
      return;
    }

    const progress = await userProgressService.getSingleLessonProgress(req.userId!, lessonId);
    if (!progress) {
      res.status(404).json({ error: 'Lesson progress not found' });
      return;
    }

    res.json({ progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get lesson progress';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Study Sessions
// ============================================================

// GET /api/v3/progress/sessions - Get recent study sessions
router.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const sessions = await userProgressService.getRecentStudySessions(req.userId!, limit);
    res.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sessions';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/progress/sessions/start - Start a study session
router.post('/sessions/start', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionType, targetId } = req.body;

    if (!sessionType) {
      res.status(400).json({ error: 'Session type is required' });
      return;
    }

    const validTypes = ['lesson', 'review', 'practice', 'exam'];
    if (!validTypes.includes(sessionType)) {
      res.status(400).json({ error: 'Invalid session type' });
      return;
    }

    const sessionId = await userProgressService.startStudySession(
      req.userId!,
      sessionType,
      targetId
    );

    res.json({ sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start session';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/progress/sessions/:sessionId/end - End a study session
router.post('/sessions/:sessionId/end', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const { itemsStudied, itemsCorrect, xpEarned } = req.body;

    await userProgressService.endStudySession(sessionId, {
      itemsStudied: itemsStudied || 0,
      itemsCorrect: itemsCorrect || 0,
      xpEarned: xpEarned || 0,
    });

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to end session';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Statistics
// ============================================================

// GET /api/v3/progress/stats - Get study statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    const stats = await userProgressService.getStudyStats(req.userId!, days);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

export default router;
