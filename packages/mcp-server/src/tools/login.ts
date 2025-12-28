import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnection } from '../database/connection';
import { userContext } from '../auth/user-context';
import crypto from 'crypto';
import { exec } from 'child_process';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export const loginTool: Tool = {
  name: 'login',
  description: `[AUTH] Login to ChatLingua via browser.

This tool initiates the OAuth2 Device Authorization flow:
1. Creates a login session
2. Opens browser to login page
3. After user logs in, use login_status to check completion

=== WHEN TO USE ===
- When user asks to login or switch accounts
- When current user is not authenticated (userId = 1 default)
- At the start of conversation to ensure correct user

=== RETURNS ===
- sessionCode: Use this with login_status tool
- loginUrl: URL opened in browser
- expiresIn: Seconds until session expires

=== NEXT STEP ===
After calling this tool, wait for user to login in browser, then call login_status with the sessionCode.
`,
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const loginStatusTool: Tool = {
  name: 'login_status',
  description: `[AUTH] Check login status and complete authentication.

Call this after login tool to check if user has logged in via browser.
If status is 'completed', the MCP session will be updated with the new user.

=== PARAMETERS ===
- sessionCode: The session code from login tool

=== RETURNS ===
- status: 'pending' | 'completed' | 'expired'
- userId: User ID (if completed)
- username: User email (if completed)
`,
  inputSchema: {
    type: 'object',
    properties: {
      sessionCode: {
        type: 'string',
        description: 'Session code from login tool',
      },
    },
    required: ['sessionCode'],
  },
};

export const getAuthStatusTool: Tool = {
  name: 'get_auth_status',
  description: `[AUTH] Get current authentication status.

Shows who is currently authenticated in this MCP session.

=== RETURNS ===
- isAuthenticated: Whether user is logged in
- userId: Current user ID
- username: User email (if authenticated)
`,
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function login(
  _args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  try {
    // Generate session code
    const sessionCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store session in database
    await db.query(
      `INSERT INTO mcp_auth_sessions (session_code, expires_at) VALUES (?, ?)`,
      [sessionCode, expiresAt]
    );

    const loginUrl = `${FRONTEND_URL}/mcp-auth?session=${sessionCode}`;

    // Try to open browser
    const openCommand = process.platform === 'win32' ? 'start' :
                        process.platform === 'darwin' ? 'open' : 'xdg-open';

    exec(`${openCommand} "${loginUrl}"`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error);
      }
    });

    return {
      success: true,
      message: 'Login initiated. Please complete login in browser.',
      sessionCode,
      loginUrl,
      expiresIn: 300, // 5 minutes
      nextStep: 'After logging in, call login_status tool with this sessionCode to complete authentication.',
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function loginStatus(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  const sessionCode = args.sessionCode as string;

  if (!sessionCode) {
    return {
      success: false,
      error: 'sessionCode is required',
    };
  }

  try {
    const sessions = await db.query<any>(
      `SELECT s.status, s.user_id, s.expires_at, u.email as username
       FROM mcp_auth_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.session_code = ?`,
      [sessionCode]
    );

    if (sessions.length === 0) {
      return {
        success: false,
        error: 'Session not found',
        status: 'not_found',
      };
    }

    const session = sessions[0];

    // Check if expired
    if (new Date(session.expires_at) < new Date() && session.status === 'pending') {
      await db.query(
        `UPDATE mcp_auth_sessions SET status = 'expired' WHERE session_code = ?`,
        [sessionCode]
      );
      return {
        success: false,
        status: 'expired',
        message: 'Login session has expired. Please call login tool again.',
      };
    }

    if (session.status === 'completed' && session.user_id) {
      // Update user context with new user
      await userContext.setUser(session.user_id, session.username);

      return {
        success: true,
        status: 'completed',
        userId: session.user_id,
        username: session.username,
        message: `Successfully logged in as ${session.username} (ID: ${session.user_id})`,
      };
    }

    return {
      success: true,
      status: session.status,
      message: session.status === 'pending'
        ? 'Waiting for user to complete login in browser...'
        : 'Session expired',
    };
  } catch (error) {
    console.error('Login status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getAuthStatus(
  _args: Record<string, unknown>,
  _db: DatabaseConnection
): Promise<unknown> {
  const context = userContext.getContext();

  return {
    isAuthenticated: context.isAuthenticated,
    userId: context.userId,
    username: context.username,
    message: context.isAuthenticated
      ? `Logged in as ${context.username} (ID: ${context.userId})`
      : `Using default user (ID: ${context.userId}). Use 'login' tool to authenticate.`,
  };
}
