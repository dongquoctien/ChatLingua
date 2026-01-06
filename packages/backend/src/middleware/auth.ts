import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export interface AuthRequest extends Request {
  userId?: number;
  user?: { id: number; username: string; email: string };
}

export interface JwtPayload {
  userId: number;
  username: string;
  email: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
      req.userId = decoded.userId;
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
      };
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
};

/**
 * Helper function to get validated userId from request.
 * Throws error if userId is not set (should be used after authMiddleware).
 */
export function getValidatedUserId(req: AuthRequest): number {
  if (typeof req.userId !== 'number' || req.userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }
  return req.userId;
}

/**
 * Type guard to check if request has a valid userId
 */
export function hasValidUserId(req: AuthRequest): req is AuthRequest & { userId: number } {
  return typeof req.userId === 'number' && req.userId > 0;
}

/**
 * Middleware that ensures userId is present and valid.
 * Use after authMiddleware for routes that require userId.
 */
export const requireValidUserId = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!hasValidUserId(req)) {
    res.status(401).json({ error: 'Invalid or missing user ID' });
    return;
  }
  next();
};
