import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * MCP OAuth2 Device Authorization Flow
 *
 * Flow:
 * 1. MCP calls POST /api/mcp-auth/session to create a pending session
 * 2. MCP opens browser to frontend /mcp-auth?session=CODE
 * 3. User logs in on frontend
 * 4. Frontend calls POST /api/mcp-auth/callback with session code
 * 5. MCP polls GET /api/mcp-auth/status/:code until completed
 * 6. MCP gets userId and stores it
 */

// Create a new MCP auth session (called by MCP)
router.post('/session', async (req: Request, res: Response) => {
  try {
    const sessionCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await pool.query(
      `INSERT INTO mcp_auth_sessions (session_code, expires_at) VALUES (?, ?)`,
      [sessionCode, expiresAt]
    );

    res.json({
      success: true,
      sessionCode,
      expiresAt: expiresAt.toISOString(),
      loginUrl: `${process.env.CORS_ORIGIN || 'http://localhost:4200'}/mcp-auth?session=${sessionCode}`,
    });
  } catch (error) {
    console.error('Failed to create MCP auth session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Complete MCP auth session (called by frontend after login)
router.post('/callback', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionCode } = req.body;
    const userId = req.userId;

    if (!sessionCode) {
      return res.status(400).json({ error: 'Session code is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find the pending session
    const [sessions]: any = await pool.query(
      `SELECT id, status, expires_at FROM mcp_auth_sessions
       WHERE session_code = ? AND status = 'pending' AND expires_at > NOW()`,
      [sessionCode]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Complete the session
    await pool.query(
      `UPDATE mcp_auth_sessions
       SET user_id = ?, status = 'completed', completed_at = NOW()
       WHERE session_code = ?`,
      [userId, sessionCode]
    );

    res.json({ success: true, message: 'MCP authentication completed' });
  } catch (error) {
    console.error('Failed to complete MCP auth:', error);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// Check MCP auth session status (polled by MCP)
router.get('/status/:sessionCode', async (req: Request, res: Response) => {
  try {
    const { sessionCode } = req.params;

    const [sessions]: any = await pool.query(
      `SELECT s.status, s.user_id, s.expires_at, u.email as username
       FROM mcp_auth_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.session_code = ?`,
      [sessionCode]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions[0];

    // Check if expired
    if (new Date(session.expires_at) < new Date() && session.status === 'pending') {
      await pool.query(
        `UPDATE mcp_auth_sessions SET status = 'expired' WHERE session_code = ?`,
        [sessionCode]
      );
      return res.json({ status: 'expired' });
    }

    res.json({
      status: session.status,
      userId: session.user_id,
      username: session.username,
    });
  } catch (error) {
    console.error('Failed to check MCP auth status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

export default router;
