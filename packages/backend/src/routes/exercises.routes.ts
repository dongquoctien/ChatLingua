import { Router, Response } from 'express';
import { z } from 'zod';
import { exerciseService } from '../services/exercise.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import exerciseSessionsRoutes from './exercise-sessions.routes.js';

const router = Router();

// Mount session routes at /api/exercises/sessions
router.use('/sessions', exerciseSessionsRoutes);

// All routes require authentication
router.use(authMiddleware);

const submitAnswerSchema = z.object({
  answer: z.string(),
  timeSpentSeconds: z.number().min(0),
});

// GET /api/exercises
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const conversationId = req.query.conversationId
      ? parseInt(req.query.conversationId as string)
      : undefined;
    const filters = {
      exerciseType: req.query.type as string | undefined,
      difficultyLevel: req.query.difficulty as string | undefined,
      conversationId: conversationId && !isNaN(conversationId) ? conversationId : undefined,
    };

    const result = await exerciseService.getExercises(req.userId!, page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercises';
    res.status(500).json({ error: message });
  }
});

// GET /api/exercises/counts-by-conversation
router.get('/counts-by-conversation', async (req: AuthRequest, res: Response) => {
  try {
    const counts = await exerciseService.getExerciseCountsByConversation(req.userId!);
    res.json(counts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise counts';
    res.status(500).json({ error: message });
  }
});

// GET /api/exercises/random
router.get('/random', async (req: AuthRequest, res: Response) => {
  try {
    const count = Math.min(parseInt(req.query.count as string) || 10, 50);
    const types = req.query.types
      ? (req.query.types as string).split(',')
      : undefined;

    const exercises = await exerciseService.getRandomExercises(req.userId!, count, types);
    res.json(exercises);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get random exercises';
    res.status(500).json({ error: message });
  }
});

// GET /api/exercises/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    if (isNaN(exerciseId)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const exercise = await exerciseService.getExerciseById(req.userId!, exerciseId);

    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    res.json(exercise);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise';
    res.status(500).json({ error: message });
  }
});

// POST /api/exercises/:id/submit
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    if (isNaN(exerciseId)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const input = submitAnswerSchema.parse(req.body);
    const result = await exerciseService.submitAnswer(
      req.userId!,
      exerciseId,
      input.answer,
      input.timeSpentSeconds
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    res.status(500).json({ error: message });
  }
});

// GET /api/exercises/:id/history
router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    if (isNaN(exerciseId)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const history = await exerciseService.getExerciseHistory(req.userId!, exerciseId);
    res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise history';
    res.status(500).json({ error: message });
  }
});

export default router;
