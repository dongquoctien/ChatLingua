import { Router, Response } from 'express';
import { z } from 'zod';
import { exerciseSessionService } from '../services/exercise-session.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============= Validation Schemas =============

const startSessionSchema = z.object({
  count: z.number().min(1).max(50).optional().default(10),
  exerciseTypes: z.array(z.enum(['multiple_choice', 'fill_blank', 'translation'])).optional(),
});

const submitSessionSchema = z.object({
  answers: z.record(z.string(), z.string()), // exerciseId -> userAnswer
  totalTimeSeconds: z.number().min(0),
});

// ============= Routes =============

/**
 * POST /api/exercises/sessions
 * Start a new exercise session
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const input = startSessionSchema.parse(req.body);
    const result = await exerciseSessionService.startSession(req.userId!, input);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to start session';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/exercises/sessions/history
 * Get user's exercise session history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await exerciseSessionService.getSessionHistory(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get session history';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/exercises/sessions/:id
 * Get a specific session with exercises
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const result = await exerciseSessionService.getSession(req.userId!, sessionId);

    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get session';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/exercises/sessions/:id/detail
 * Get detailed session result for reviewing
 */
router.get('/:id/detail', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const result = await exerciseSessionService.getSessionDetail(req.userId!, sessionId);

    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get session detail';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/exercises/sessions/:id/submit
 * Submit all answers for a session
 */
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const input = submitSessionSchema.parse(req.body);
    const result = await exerciseSessionService.submitSession(req.userId!, sessionId, input);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to submit session';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/exercises/sessions/:id/abandon
 * Abandon an in-progress session
 */
router.post('/:id/abandon', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const success = await exerciseSessionService.abandonSession(req.userId!, sessionId);

    if (!success) {
      res.status(404).json({ error: 'Session not found or already completed' });
      return;
    }

    res.json({ success: true, message: 'Session abandoned' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to abandon session';
    res.status(500).json({ error: message });
  }
});

export default router;
