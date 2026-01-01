import pool from '../config/database.js';
import type { ResultSetHeader } from 'mysql2';
import {
  type StatusType,
  type ActivityType,
  type UpdateStatusDTO,
  type UserStatusInfo,
  type UserStatusRow,
  type PaginatedResponse,
  type CountRow,
} from '../types/chat.types.js';

export class StatusService {
  // ============================================================
  // Online/Offline Management
  // ============================================================

  async setOnline(userId: number, socketId: string): Promise<void> {
    await pool.execute(
      `INSERT INTO user_status (user_id, is_online, status_type, socket_id, connected_at)
       VALUES (?, TRUE, 'online', ?, NOW())
       ON DUPLICATE KEY UPDATE
         is_online = TRUE,
         status_type = CASE WHEN status_type = 'offline' THEN 'online' ELSE status_type END,
         socket_id = VALUES(socket_id),
         connected_at = NOW()`,
      [userId, socketId]
    );
  }

  async setOffline(userId: number, socketId?: string): Promise<boolean> {
    // Don't reset status_type - preserve user's custom status (busy, studying, etc.)
    // When they reconnect, they'll have their previous status
    //
    // If socketId is provided, only mark offline if it matches the current socket_id
    // This prevents a race condition when user refreshes (F5):
    // - New socket connects, sets new socket_id
    // - Old socket disconnects, should NOT overwrite the new connection

    let result: ResultSetHeader;

    if (socketId) {
      // Only set offline if the disconnecting socket matches the stored socket_id
      [result] = await pool.execute<ResultSetHeader>(
        `UPDATE user_status
         SET is_online = FALSE,
             last_seen_at = NOW(),
             socket_id = NULL,
             current_activity = 'none',
             activity_metadata = NULL
         WHERE user_id = ? AND socket_id = ?`,
        [userId, socketId]
      );
    } else {
      // No socketId provided - unconditionally set offline (for backwards compatibility)
      [result] = await pool.execute<ResultSetHeader>(
        `UPDATE user_status
         SET is_online = FALSE,
             last_seen_at = NOW(),
             socket_id = NULL,
             current_activity = 'none',
             activity_metadata = NULL
         WHERE user_id = ?`,
        [userId]
      );
    }

    // Return true if a row was actually updated (user is now offline)
    return result.affectedRows > 0 && result.changedRows > 0;
  }

  // ============================================================
  // Status Updates
  // ============================================================

  async updateStatus(userId: number, data: UpdateStatusDTO): Promise<UserStatusInfo> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.statusType !== undefined) {
      updates.push('status_type = ?');
      params.push(data.statusType);

      // If going invisible, don't change is_online but hide from others
      if (data.statusType === 'offline') {
        updates.push('is_online = FALSE');
        updates.push('last_seen_at = NOW()');
      }
    }

    if (data.statusText !== undefined) {
      updates.push('status_text = ?');
      params.push(data.statusText);
    }

    if (data.currentActivity !== undefined) {
      updates.push('current_activity = ?');
      params.push(data.currentActivity);
    }

    if (data.activityMetadata !== undefined) {
      updates.push('activity_metadata = ?');
      params.push(data.activityMetadata ? JSON.stringify(data.activityMetadata) : null);
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.execute(
        `UPDATE user_status SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    }

    return this.getUserStatus(userId);
  }

  async updateActivity(
    userId: number,
    activity: ActivityType,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await pool.execute(
      `UPDATE user_status
       SET current_activity = ?,
           activity_metadata = ?
       WHERE user_id = ?`,
      [activity, metadata ? JSON.stringify(metadata) : null, userId]
    );
  }

  // ============================================================
  // Status Queries
  // ============================================================

  async getUserStatus(userId: number): Promise<UserStatusInfo> {
    const [rows] = await pool.execute<UserStatusRow[]>(
      `SELECT us.*, u.username, u.display_name, u.avatar
       FROM user_status us
       JOIN users u ON us.user_id = u.id
       WHERE us.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create default status if not exists
      await pool.execute(
        `INSERT INTO user_status (user_id, status_type, is_online)
         VALUES (?, 'offline', FALSE)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [userId]
      );

      // Fetch user info
      const [userRows] = await pool.execute<UserStatusRow[]>(
        `SELECT us.*, u.username, u.display_name, u.avatar
         FROM user_status us
         JOIN users u ON us.user_id = u.id
         WHERE us.user_id = ?`,
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      return this.mapStatusRow(userRows[0]);
    }

    return this.mapStatusRow(rows[0]);
  }

  async getOnlineUsers(excludeUserId?: number): Promise<UserStatusInfo[]> {
    let query = `
      SELECT us.*, u.username, u.display_name, u.avatar
      FROM user_status us
      JOIN users u ON us.user_id = u.id
      WHERE us.is_online = TRUE
        AND us.show_online_status = TRUE
        AND us.status_type != 'invisible'
    `;
    const params: number[] = [];

    if (excludeUserId) {
      query += ` AND us.user_id != ?`;
      params.push(excludeUserId);
    }

    query += ` ORDER BY u.username`;

    const [rows] = await pool.execute<UserStatusRow[]>(query, params);

    return rows.map(row => this.mapStatusRow(row));
  }

  async getAllUsersWithStatus(
    excludeUserId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<UserStatusInfo>> {
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar,
        COALESCE(us.is_online, FALSE) as is_online,
        COALESCE(us.status_type, 'offline') as status_type,
        us.status_text,
        COALESCE(us.current_activity, 'none') as current_activity,
        us.activity_metadata,
        us.last_seen_at
      FROM users u
      LEFT JOIN user_status us ON u.id = us.user_id
      WHERE u.id != ?
      ORDER BY
        COALESCE(us.is_online, FALSE) DESC,
        COALESCE(us.last_seen_at, u.created_at) DESC,
        u.username
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count FROM users WHERE id != ?
    `;

    const [rows] = await pool.execute<UserStatusRow[]>(query, [excludeUserId, String(limit), String(offset)]);
    const [countResult] = await pool.execute<CountRow[]>(countQuery, [excludeUserId]);

    const total = countResult[0]?.count || 0;

    return {
      items: rows.map(row => this.mapStatusRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSocketId(userId: number): Promise<string | null> {
    const [rows] = await pool.execute<UserStatusRow[]>(
      `SELECT socket_id FROM user_status WHERE user_id = ? AND is_online = TRUE`,
      [userId]
    );

    return rows[0]?.socket_id || null;
  }

  async getUserIdBySocketId(socketId: string): Promise<number | null> {
    const [rows] = await pool.execute<UserStatusRow[]>(
      `SELECT user_id FROM user_status WHERE socket_id = ?`,
      [socketId]
    );

    return rows[0]?.user_id || null;
  }

  // ============================================================
  // Privacy Settings
  // ============================================================

  async updatePrivacySettings(
    userId: number,
    settings: {
      showOnlineStatus?: boolean;
      allowMessagesFrom?: 'everyone' | 'friends_only' | 'nobody';
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (boolean | string | number)[] = [];

    if (settings.showOnlineStatus !== undefined) {
      updates.push('show_online_status = ?');
      params.push(settings.showOnlineStatus);
    }

    if (settings.allowMessagesFrom !== undefined) {
      updates.push('allow_messages_from = ?');
      params.push(settings.allowMessagesFrom);
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.execute(
        `UPDATE user_status SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    }
  }

  async canSendMessage(fromUserId: number, toUserId: number): Promise<boolean> {
    const [rows] = await pool.execute<UserStatusRow[]>(
      `SELECT allow_messages_from FROM user_status WHERE user_id = ?`,
      [toUserId]
    );

    if (rows.length === 0) return true; // Default: allow

    const setting = rows[0].allow_messages_from;

    switch (setting) {
      case 'everyone':
        return true;
      case 'nobody':
        return false;
      case 'friends_only':
        // For now, allow everyone (implement friends system later)
        return true;
      default:
        return true;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private mapStatusRow(row: UserStatusRow): UserStatusInfo {
    return {
      userId: row.user_id,
      username: row.username || '',
      displayName: row.display_name || null,
      avatar: row.avatar || null,
      isOnline: Boolean(row.is_online),
      statusType: row.status_type || 'offline',
      statusText: row.status_text || null,
      currentActivity: row.current_activity || 'none',
      activityMetadata: row.activity_metadata ? JSON.parse(row.activity_metadata) : null,
      lastSeenAt: row.last_seen_at ? row.last_seen_at.toISOString() : null,
    };
  }
}

export const statusService = new StatusService();
