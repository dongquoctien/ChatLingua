import pool from '../config/database.js';
import type { ResultSetHeader } from 'mysql2';
import {
  SyncRequest,
  SyncRequestRow,
  SyncRequestStatus,
  SyncRequestPriority,
  DifficultyLevel,
  CreateSyncRequestDTO,
  UpdateSyncRequestDTO,
  CompleteSyncRequestDTO,
  SyncRequestFilters,
  SyncRequestStats,
  PaginatedSyncRequests,
  CountRow,
  MAX_PENDING_PER_USER,
  MAX_REQUESTS_PER_DAY,
  MAX_TEXT_LENGTH,
  AUTO_CANCEL_DAYS,
} from '../types/sync-request.types.js';

// ============================================================
// Service Class
// ============================================================

export class SyncRequestService {
  // --------------------------------------------------------
  // User Methods - Create & Manage Own Requests
  // --------------------------------------------------------

  /**
   * Create a new sync request
   */
  async createRequest(userId: number, data: CreateSyncRequestDTO): Promise<SyncRequest> {
    // Validate text length
    if (data.vietnameseText.length > MAX_TEXT_LENGTH) {
      throw new Error(`Vietnamese text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
    }

    // Check pending request limit
    const pendingCount = await this.getUserPendingCount(userId);
    if (pendingCount >= MAX_PENDING_PER_USER) {
      throw new Error(`Maximum pending requests (${MAX_PENDING_PER_USER}) reached. Please wait for existing requests to be completed.`);
    }

    // Check daily request limit
    const todayCount = await this.getUserTodayRequestCount(userId);
    if (todayCount >= MAX_REQUESTS_PER_DAY) {
      throw new Error(`Maximum daily requests (${MAX_REQUESTS_PER_DAY}) reached. Please try again tomorrow.`);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sync_requests
       (requester_user_id, vietnamese_text, english_translation, topic, difficulty_level, notes, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.vietnameseText,
        data.englishTranslation || null,
        data.topic || null,
        data.difficultyLevel || null,
        data.notes || null,
        data.priority || 'normal',
      ]
    );

    const request = await this.getRequestById(result.insertId);
    if (!request) {
      throw new Error('Failed to create sync request');
    }

    return request;
  }

  /**
   * Get user's own requests with pagination
   */
  async getMyRequests(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: SyncRequestStatus
  ): Promise<PaginatedSyncRequests> {
    const offset = (page - 1) * limit;
    const safeLimit = Number(limit);
    const safeOffset = Number(offset);

    let countQuery = `SELECT COUNT(*) as count FROM sync_requests WHERE requester_user_id = ?`;
    let dataQuery = `
      SELECT sr.*,
             u1.username as requester_name,
             u1.email as requester_email,
             u2.username as syncer_name
      FROM sync_requests sr
      LEFT JOIN users u1 ON sr.requester_user_id = u1.id
      LEFT JOIN users u2 ON sr.syncer_user_id = u2.id
      WHERE sr.requester_user_id = ?
    `;

    const params: any[] = [userId];

    if (status) {
      countQuery += ` AND status = ?`;
      dataQuery += ` AND sr.status = ?`;
      params.push(status);
    }

    dataQuery += ` ORDER BY sr.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [countResult] = await pool.execute<CountRow[]>(countQuery, status ? [userId, status] : [userId]);
    const total = countResult[0].count;

    const [rows] = await pool.execute<SyncRequestRow[]>(dataQuery, params);

    return {
      items: rows.map(row => this.mapToSyncRequest(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single request by ID
   */
  async getRequestById(requestId: number): Promise<SyncRequest | null> {
    const [rows] = await pool.execute<SyncRequestRow[]>(
      `SELECT sr.*,
              u1.username as requester_name,
              u1.email as requester_email,
              u2.username as syncer_name
       FROM sync_requests sr
       LEFT JOIN users u1 ON sr.requester_user_id = u1.id
       LEFT JOIN users u2 ON sr.syncer_user_id = u2.id
       WHERE sr.id = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToSyncRequest(rows[0]);
  }

  /**
   * Update a pending request (only owner can update)
   */
  async updateRequest(
    userId: number,
    requestId: number,
    data: UpdateSyncRequestDTO
  ): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw new Error('Sync request not found');
    }

    if (request.requesterUserId !== userId) {
      throw new Error('You can only update your own requests');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only update pending requests');
    }

    if (data.vietnameseText && data.vietnameseText.length > MAX_TEXT_LENGTH) {
      throw new Error(`Vietnamese text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.vietnameseText !== undefined) {
      updates.push('vietnamese_text = ?');
      values.push(data.vietnameseText);
    }
    if (data.englishTranslation !== undefined) {
      updates.push('english_translation = ?');
      values.push(data.englishTranslation || null);
    }
    if (data.topic !== undefined) {
      updates.push('topic = ?');
      values.push(data.topic || null);
    }
    if (data.difficultyLevel !== undefined) {
      updates.push('difficulty_level = ?');
      values.push(data.difficultyLevel || null);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes || null);
    }

    if (updates.length === 0) {
      return;
    }

    values.push(requestId);

    await pool.execute(
      `UPDATE sync_requests SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Cancel a pending request (only owner can cancel)
   */
  async cancelRequest(userId: number, requestId: number): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw new Error('Sync request not found');
    }

    if (request.requesterUserId !== userId) {
      throw new Error('You can only cancel your own requests');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only cancel pending requests');
    }

    await pool.execute(
      `UPDATE sync_requests SET status = 'cancelled' WHERE id = ?`,
      [requestId]
    );
  }

  // --------------------------------------------------------
  // Helper Methods - Sync Pending Requests
  // --------------------------------------------------------

  /**
   * Get all pending requests for helpers
   */
  async getPendingRequests(
    page: number = 1,
    limit: number = 10,
    filters?: SyncRequestFilters
  ): Promise<PaginatedSyncRequests> {
    const offset = (page - 1) * limit;
    const safeLimit = Number(limit);
    const safeOffset = Number(offset);

    let whereClause = `sr.status = 'pending'`;
    const params: any[] = [];

    if (filters?.priority) {
      whereClause += ` AND sr.priority = ?`;
      params.push(filters.priority);
    }

    if (filters?.difficultyLevel) {
      whereClause += ` AND sr.difficulty_level = ?`;
      params.push(filters.difficultyLevel);
    }

    if (filters?.topic) {
      whereClause += ` AND sr.topic LIKE ?`;
      params.push(`%${filters.topic}%`);
    }

    // Count query
    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM sync_requests sr WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    // Determine sort order
    let orderBy = 'sr.created_at DESC';
    if (filters?.sortBy === 'priority') {
      orderBy = `FIELD(sr.priority, 'high', 'normal', 'low') ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'}, sr.created_at DESC`;
    } else if (filters?.sortBy === 'created_at') {
      orderBy = `sr.created_at ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (filters?.sortBy === 'updated_at') {
      orderBy = `sr.updated_at ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    // Data query
    const [rows] = await pool.execute<SyncRequestRow[]>(
      `SELECT sr.*,
              u1.username as requester_name,
              u1.email as requester_email,
              u2.username as syncer_name
       FROM sync_requests sr
       LEFT JOIN users u1 ON sr.requester_user_id = u1.id
       LEFT JOIN users u2 ON sr.syncer_user_id = u2.id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      items: rows.map(row => this.mapToSyncRequest(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Start syncing a request (claim it)
   */
  async startSync(helperId: number, requestId: number): Promise<SyncRequest> {
    // Use optimistic locking to prevent race conditions
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE sync_requests
       SET status = 'in_progress',
           syncer_user_id = ?,
           sync_started_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [helperId, requestId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Request not found or already claimed');
    }

    const request = await this.getRequestById(requestId);
    if (!request) {
      throw new Error('Failed to retrieve request');
    }

    // Create notification for requester
    await this.createNotification(request.requesterUserId, {
      notificationType: 'sync_started',
      title: 'Sync Started',
      message: `${request.syncerName || 'A helper'} has started syncing your conversation request`,
      icon: 'fa-sync',
      actionUrl: `/sync-requests/${requestId}`,
      metadata: {
        requestId,
        syncerName: request.syncerName,
        startedAt: new Date().toISOString(),
      },
    });

    return request;
  }

  /**
   * Complete a sync request
   */
  async completeSync(
    helperId: number,
    requestId: number,
    data: CompleteSyncRequestDTO
  ): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw new Error('Sync request not found');
    }

    if (request.syncerUserId !== helperId) {
      throw new Error('You can only complete syncs you started');
    }

    if (request.status !== 'in_progress') {
      throw new Error('Can only complete in-progress syncs');
    }

    await pool.execute(
      `UPDATE sync_requests
       SET status = 'completed',
           conversation_id = ?,
           sync_notes = ?,
           sync_completed_at = NOW()
       WHERE id = ?`,
      [data.conversationId, data.notes || null, requestId]
    );

    // Get vocabulary/grammar counts for the notification
    // Vocabulary links to conversations through vocabulary_contexts table
    const [vocabCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT vc.vocabulary_id) as count
       FROM vocabulary_contexts vc
       WHERE vc.conversation_id = ?`,
      [data.conversationId]
    );

    const [grammarCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM grammar_points WHERE conversation_id = ?`,
      [data.conversationId]
    );

    // Get syncer name
    const [syncerRows] = await pool.execute<any[]>(
      `SELECT username FROM users WHERE id = ?`,
      [helperId]
    );
    const syncerName = syncerRows[0]?.username || 'A helper';

    // Create notification for requester
    await this.createNotification(request.requesterUserId, {
      notificationType: 'sync_completed',
      title: 'Sync Complete!',
      message: `${syncerName} has completed syncing your conversation`,
      icon: 'fa-check-circle',
      actionUrl: `/conversations/${data.conversationId}`,
      metadata: {
        requestId,
        conversationId: data.conversationId,
        syncerName,
        completedAt: new Date().toISOString(),
        vocabularyCount: vocabCount[0].count,
        grammarCount: grammarCount[0].count,
      },
    });
  }

  /**
   * Cancel an in-progress sync (return to pending)
   */
  async cancelSync(helperId: number, requestId: number): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw new Error('Sync request not found');
    }

    if (request.syncerUserId !== helperId) {
      throw new Error('You can only cancel syncs you started');
    }

    if (request.status !== 'in_progress') {
      throw new Error('Can only cancel in-progress syncs');
    }

    await pool.execute(
      `UPDATE sync_requests
       SET status = 'pending',
           syncer_user_id = NULL,
           sync_started_at = NULL
       WHERE id = ?`,
      [requestId]
    );
  }

  // --------------------------------------------------------
  // Statistics
  // --------------------------------------------------------

  /**
   * Get sync request statistics
   */
  async getStats(userId: number): Promise<SyncRequestStats> {
    // Global stats
    const [globalStats] = await pool.execute<any[]>(`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as total_in_progress,
        COUNT(CASE WHEN status = 'completed' AND DATE(sync_completed_at) = CURDATE() THEN 1 END) as completed_today,
        COUNT(CASE WHEN status = 'completed' AND sync_completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as completed_this_week
      FROM sync_requests
    `);

    // User-specific stats
    const [userStats] = await pool.execute<any[]>(`
      SELECT
        COUNT(CASE WHEN requester_user_id = ? AND status = 'pending' THEN 1 END) as my_requests_pending,
        COUNT(CASE WHEN requester_user_id = ? AND status = 'completed' THEN 1 END) as my_requests_completed,
        COUNT(CASE WHEN syncer_user_id = ? AND status = 'completed' THEN 1 END) as my_syncs_completed
      FROM sync_requests
    `, [userId, userId, userId]);

    return {
      totalPending: globalStats[0].total_pending || 0,
      totalInProgress: globalStats[0].total_in_progress || 0,
      completedToday: globalStats[0].completed_today || 0,
      completedThisWeek: globalStats[0].completed_this_week || 0,
      myRequestsPending: userStats[0].my_requests_pending || 0,
      myRequestsCompleted: userStats[0].my_requests_completed || 0,
      mySyncsCompleted: userStats[0].my_syncs_completed || 0,
    };
  }

  // --------------------------------------------------------
  // Maintenance
  // --------------------------------------------------------

  /**
   * Auto-cancel old pending requests
   */
  async autoCancelOldRequests(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE sync_requests
       SET status = 'cancelled'
       WHERE status = 'pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [AUTO_CANCEL_DAYS]
    );

    return result.affectedRows;
  }

  /**
   * Release stale in-progress requests (older than 24 hours)
   */
  async releaseStaleRequests(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE sync_requests
       SET status = 'pending',
           syncer_user_id = NULL,
           sync_started_at = NULL
       WHERE status = 'in_progress'
         AND sync_started_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    return result.affectedRows;
  }

  // --------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------

  private async getUserPendingCount(userId: number): Promise<number> {
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM sync_requests
       WHERE requester_user_id = ? AND status = 'pending'`,
      [userId]
    );
    return rows[0].count;
  }

  private async getUserTodayRequestCount(userId: number): Promise<number> {
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM sync_requests
       WHERE requester_user_id = ? AND DATE(created_at) = CURDATE()`,
      [userId]
    );
    return rows[0].count;
  }

  private async createNotification(
    userId: number,
    notification: {
      notificationType: string;
      title: string;
      message: string;
      icon?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await pool.execute(
      `INSERT INTO notification_queue
       (user_id, notification_type, title, message, icon, action_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        notification.notificationType,
        notification.title,
        notification.message,
        notification.icon || null,
        notification.actionUrl || null,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
      ]
    );
  }

  private mapToSyncRequest(row: SyncRequestRow): SyncRequest {
    return {
      id: row.id,
      requesterUserId: row.requester_user_id,
      requesterName: row.requester_name || 'Unknown',
      requesterEmail: row.requester_email || undefined,
      vietnameseText: row.vietnamese_text,
      englishTranslation: row.english_translation || undefined,
      topic: row.topic || undefined,
      difficultyLevel: row.difficulty_level || undefined,
      notes: row.notes || undefined,
      status: row.status,
      priority: row.priority,
      syncerUserId: row.syncer_user_id || undefined,
      syncerName: row.syncer_name || undefined,
      conversationId: row.conversation_id || undefined,
      syncStartedAt: row.sync_started_at?.toISOString() || undefined,
      syncCompletedAt: row.sync_completed_at?.toISOString() || undefined,
      syncNotes: row.sync_notes || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}

export const syncRequestService = new SyncRequestService();
