import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface AuthRequest extends Request {
  userId?: number;
  user?: { id: number; username: string; email: string };
  userRole?: UserRole;
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

interface UserRoleRow extends RowDataPacket {
  role: UserRole;
}

/**
 * Middleware that checks if user has admin role.
 * Must be used after authMiddleware.
 */
export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!hasValidUserId(req)) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const [rows] = await pool.execute<UserRoleRow[]>(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userRole = rows[0].role;
    req.userRole = userRole;

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

/**
 * Middleware that checks if user has moderator or admin role.
 * Must be used after authMiddleware.
 */
export const moderatorMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!hasValidUserId(req)) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const [rows] = await pool.execute<UserRoleRow[]>(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userRole = rows[0].role;
    req.userRole = userRole;

    if (userRole !== 'admin' && userRole !== 'moderator') {
      res.status(403).json({ error: 'Moderator or admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Moderator middleware error:', error);
    res.status(500).json({ error: 'Failed to verify moderator access' });
  }
};
