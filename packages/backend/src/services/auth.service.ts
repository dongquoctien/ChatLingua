import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { jwtConfig } from '../config/jwt.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: number;
    username: string;
    email: string;
  };
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { username, email, password } = input;

    // Check if email already exists
    const [existing] = await pool.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const [existingUsername] = await pool.execute<UserRow[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = result.insertId;

    // Initialize user statistics
    await pool.execute(
      'INSERT INTO user_statistics (user_id) VALUES (?)',
      [userId]
    );

    // Generate token
    const token = this.generateToken(userId, username, email);

    return {
      user: { id: userId, username, email },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // Find user
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate token
    const token = this.generateToken(user.id, user.username, user.email);

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token,
    };
  }

  async getProfile(userId: number): Promise<{ id: number; username: string; email: string; createdAt: Date }> {
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
    };
  }

  private generateToken(userId: number, username: string, email: string): string {
    return jwt.sign(
      { userId, username, email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn as jwt.SignOptions['expiresIn'] }
    );
  }
}

export const authService = new AuthService();
