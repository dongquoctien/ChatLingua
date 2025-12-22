import { Router, Response } from 'express';
import { statsService } from '../services/stats.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/stats/overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await statsService.getOverview(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get overview';
    res.status(500).json({ error: message });
  }
});

// GET /api/stats/weekly
router.get('/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const report = await statsService.getWeeklyReport(req.userId!);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get weekly report';
    res.status(500).json({ error: message });
  }
});

// GET /api/stats/monthly
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const report = await statsService.getMonthlyReport(req.userId!);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get monthly report';
    res.status(500).json({ error: message });
  }
});

// GET /api/stats/quiz/:quizId/top-scores
router.get('/quiz/:quizId/top-scores', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizId);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const leaderboard = await statsService.getTopQuizScores(quizId, limit);
    res.json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get top scores';
    res.status(500).json({ error: message });
  }
});

// GET /api/stats/quiz/:quizId/fastest
router.get('/quiz/:quizId/fastest', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizId);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const leaderboard = await statsService.getFastestQuizCompletions(quizId, limit);
    res.json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get fastest completions';
    res.status(500).json({ error: message });
  }
});

export default router;
