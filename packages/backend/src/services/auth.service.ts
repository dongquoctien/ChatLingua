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
  display_name: string | null;
  avatar: string | null;
  nickname: string | null;
  bio: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  nickname: string | null;
  bio: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  createdAt: Date;
}

export interface UpdateProfileInput {
  avatar?: string | null;
  nickname?: string | null;
  bio?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
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

  async getProfile(userId: number): Promise<UserProfile> {
    const [users] = await pool.execute<UserRow[]>(
      `SELECT id, username, email, display_name, avatar, nickname, bio, gender, created_at
       FROM users WHERE id = ?`,
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
      displayName: user.display_name,
      avatar: user.avatar,
      nickname: user.nickname,
      bio: user.bio,
      gender: user.gender,
      createdAt: user.created_at,
    };
  }

  async updateProfile(userId: number, input: UpdateProfileInput): Promise<UserProfile> {
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (input.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(input.avatar);
    }
    if (input.nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(input.nickname);
    }
    if (input.bio !== undefined) {
      updates.push('bio = ?');
      params.push(input.bio);
    }
    if (input.gender !== undefined) {
      updates.push('gender = ?');
      params.push(input.gender);
    }

    if (updates.length === 0) {
      return this.getProfile(userId);
    }

    params.push(userId.toString());
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getProfile(userId);
  }

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const { currentPassword, newPassword } = input;

    // Get current password hash
    const [users] = await pool.execute<UserRow[]>(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
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
