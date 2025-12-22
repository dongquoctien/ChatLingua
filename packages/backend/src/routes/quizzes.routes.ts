import { Router, Response } from 'express';
import { z } from 'zod';
import { quizService } from '../services/quiz.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const createQuizSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  exerciseIds: z.array(z.number()).min(1),
  timeLimitMinutes: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
});

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.string()),
  timeSpentSeconds: z.number().min(0),
});

// GET /api/quizzes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await quizService.getQuizzes(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get quizzes';
    res.status(500).json({ error: message });
  }
});

// POST /api/quizzes
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const input = createQuizSchema.parse(req.body);
    const quiz = await quizService.createQuiz(req.userId!, input);
    res.status(201).json(quiz);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create quiz';
    res.status(500).json({ error: message });
  }
});

// GET /api/quizzes/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const quiz = await quizService.getQuizById(req.userId!, quizId);

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    res.json(quiz);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get quiz';
    res.status(500).json({ error: message });
  }
});

// POST /api/quizzes/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const result = await quizService.startQuiz(req.userId!, quizId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start quiz';
    res.status(400).json({ error: message });
  }
});

// POST /api/quizzes/:id/submit
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const { attemptId } = req.query;
    if (!attemptId || isNaN(parseInt(attemptId as string))) {
      res.status(400).json({ error: 'Attempt ID is required' });
      return;
    }

    const input = submitQuizSchema.parse(req.body);

    // Convert string keys to numbers for answers
    const answers: Record<number, string> = {};
    for (const [key, value] of Object.entries(input.answers)) {
      answers[parseInt(key)] = value;
    }

    const result = await quizService.submitQuiz(
      req.userId!,
      quizId,
      parseInt(attemptId as string),
      { answers, timeSpentSeconds: input.timeSpentSeconds }
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to submit quiz';
    res.status(400).json({ error: message });
  }
});

// GET /api/quizzes/:id/attempts
router.get('/:id/attempts', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const attempts = await quizService.getQuizAttempts(req.userId!, quizId);
    res.json(attempts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get quiz attempts';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/quizzes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      res.status(400).json({ error: 'Invalid quiz ID' });
      return;
    }

    const deleted = await quizService.deleteQuiz(req.userId!, quizId);

    if (!deleted) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete quiz';
    res.status(500).json({ error: message });
  }
});

export default router;
