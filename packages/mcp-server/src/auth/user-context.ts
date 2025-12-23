import { DatabaseConnection } from '../database/connection';
import bcrypt from 'bcryptjs';

export interface UserContext {
  userId: number;
  username: string | null;
  isAuthenticated: boolean;
}

/**
 * Manages user context for MCP server.
 * If MCP_USERNAME and MCP_PASSWORD are provided in environment,
 * authenticates and uses that user's ID. Otherwise defaults to userId = 1.
 */
export class UserContextManager {
  private context: UserContext = {
    userId: 1,
    username: null,
    isAuthenticated: false,
  };

  /**
   * Initialize user context from environment variables.
   * Call this after database connection is established.
   */
  async initialize(db: DatabaseConnection): Promise<void> {
    const username = process.env.MCP_USERNAME;
    const password = process.env.MCP_PASSWORD;

    // If no credentials provided, use default userId = 1
    if (!username || !password) {
      console.error('MCP: No credentials provided, using default user (ID: 1)');
      this.context = {
        userId: 1,
        username: null,
        isAuthenticated: false,
      };
      return;
    }

    try {
      // Look up user by username (email)
      const users = await db.query<any>(
        'SELECT id, email, password_hash FROM users WHERE email = ?',
        [username]
      );

      if (users.length === 0) {
        console.error(`MCP: User not found: ${username}, using default user (ID: 1)`);
        this.context = {
          userId: 1,
          username: null,
          isAuthenticated: false,
        };
        return;
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        console.error(`MCP: Invalid password for user: ${username}, using default user (ID: 1)`);
        this.context = {
          userId: 1,
          username: null,
          isAuthenticated: false,
        };
        return;
      }

      // Authentication successful
      this.context = {
        userId: user.id,
        username: user.email,
        isAuthenticated: true,
      };

      console.error(`MCP: Authenticated as ${username} (ID: ${user.id})`);
    } catch (error) {
      console.error('MCP: Authentication error, using default user (ID: 1):', error);
      this.context = {
        userId: 1,
        username: null,
        isAuthenticated: false,
      };
    }
  }

  /**
   * Get the current user ID.
   * This is the authenticated user's ID or 1 if not authenticated.
   */
  getUserId(): number {
    return this.context.userId;
  }

  /**
   * Get the full user context.
   */
  getContext(): UserContext {
    return { ...this.context };
  }

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return this.context.isAuthenticated;
  }
}

// Singleton instance
export const userContext = new UserContextManager();
