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
