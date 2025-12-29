import { Router, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  avatar: z.string().url().nullable().optional(),
  nickname: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await authService.getProfile(req.userId!);
    res.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    res.status(404).json({ error: message });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const profile = await authService.updateProfile(req.userId!, input);
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    res.status(400).json({ error: message });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.userId!, input);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(400).json({ error: message });
  }
});

export default router;
