import pool from '../config/database.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  type MessageType,
  type SharedContentType,
  type SendMessageDTO,
  type UpdateConversationSettingsDTO,
  type ShareContentDTO,
  type ConversationPreview,
  type Conversation,
  type ConversationSettings,
  type Message,
  type BlockedUser,
  type UserInfo,
  type PaginatedResponse,
  type ConversationRow,
  type MessageRow,
  type BlockRow,
  type ConversationSettingsRow,
  type CountRow,
  MESSAGES_PER_PAGE,
} from '../types/chat.types.js';

export class ChatService {
  // ============================================================
  // Conversations
  // ============================================================

  async getConversations(
    userId: number,
    page: number = 1,
    limit: number = 20,
    includeArchived: boolean = false
  ): Promise<PaginatedResponse<ConversationPreview>> {
    const offset = (page - 1) * limit;

    // Get conversations where user is participant
    const query = `
      SELECT
        c.id,
        c.participant1_id,
        c.participant2_id,
        c.last_message_at,
        -- Other user info
        CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END AS other_user_id,
        CASE WHEN c.participant1_id = ? THEN u2.username ELSE u1.username END AS other_user_username,
        CASE WHEN c.participant1_id = ? THEN u2.display_name ELSE u1.display_name END AS other_user_display_name,
        CASE WHEN c.participant1_id = ? THEN u2.avatar ELSE u1.avatar END AS other_user_avatar,
        -- Status info
        CASE WHEN c.participant1_id = ? THEN us2.is_online ELSE us1.is_online END AS other_user_is_online,
        CASE WHEN c.participant1_id = ? THEN us2.status_type ELSE us1.status_type END AS other_user_status_type,
        -- Last message info
        m.content AS last_message_content,
        m.message_type AS last_message_type,
        m.sender_id AS last_message_sender_id,
        -- Unread count
        (
          SELECT COUNT(*)
          FROM chat_messages cm
          LEFT JOIN chat_message_reads cmr ON cm.id = cmr.message_id AND cmr.user_id = ?
          WHERE cm.conversation_id = c.id
            AND cm.sender_id != ?
            AND cm.is_deleted = FALSE
            AND cmr.id IS NULL
        ) AS unread_count,
        -- Settings
        COALESCE(cs.is_pinned, FALSE) AS is_pinned,
        COALESCE(cs.is_muted, FALSE) AS is_muted,
        COALESCE(cs.is_archived, FALSE) AS is_archived,
        cs.nickname AS conversation_nickname
      FROM chat_conversations c
      LEFT JOIN users u1 ON c.participant1_id = u1.id
      LEFT JOIN users u2 ON c.participant2_id = u2.id
      LEFT JOIN user_status us1 ON c.participant1_id = us1.user_id
      LEFT JOIN user_status us2 ON c.participant2_id = us2.user_id
      LEFT JOIN chat_messages m ON c.last_message_id = m.id
      LEFT JOIN chat_conversation_settings cs ON c.id = cs.conversation_id AND cs.user_id = ?
      WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        ${!includeArchived ? 'AND COALESCE(cs.is_archived, FALSE) = FALSE' : ''}
      ORDER BY
        COALESCE(cs.is_pinned, FALSE) DESC,
        CASE WHEN c.last_message_at IS NULL THEN 1 ELSE 0 END,
        c.last_message_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM chat_conversations c
      LEFT JOIN chat_conversation_settings cs ON c.id = cs.conversation_id AND cs.user_id = ?
      WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        ${!includeArchived ? 'AND COALESCE(cs.is_archived, FALSE) = FALSE' : ''}
    `;

    const params = [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, String(limit), String(offset)];
    const countParams = [userId, userId, userId];

    const [rows] = await pool.execute<ConversationRow[]>(query, params);
    const [countResult] = await pool.execute<CountRow[]>(countQuery, countParams);

    const total = countResult[0]?.count || 0;

    const items: ConversationPreview[] = rows.map(row => ({
      id: row.id,
      otherUser: {
        id: row.other_user_id!,
        username: row.other_user_username!,
        displayName: row.other_user_display_name || null,
        avatar: row.other_user_avatar || null,
      },
      lastMessage: row.last_message_content || null,
      lastMessageType: row.last_message_type || null,
      lastMessageAt: row.last_message_at ? row.last_message_at.toISOString() : null,
      lastMessageSenderId: row.last_message_sender_id || null,
      unreadCount: Number(row.unread_count) || 0,
      isPinned: Boolean(row.is_pinned),
      isMuted: Boolean(row.is_muted),
      isArchived: Boolean(row.is_archived),
      isOnline: Boolean(row.other_user_is_online),
      statusType: row.other_user_status_type || 'offline',
      nickname: row.conversation_nickname || null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrCreateConversation(userId: number, otherUserId: number): Promise<Conversation> {
    // Normalize order - lower ID first
    const [p1, p2] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    // Check if conversation exists
    const [existing] = await pool.execute<ConversationRow[]>(
      `SELECT * FROM chat_conversations WHERE participant1_id = ? AND participant2_id = ?`,
      [p1, p2]
    );

    let conversationId: number;

    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      // Create new conversation
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO chat_conversations (participant1_id, participant2_id) VALUES (?, ?)`,
        [p1, p2]
      );
      conversationId = result.insertId;

      // Create settings for both users
      await pool.execute(
        `INSERT INTO chat_conversation_settings (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
        [conversationId, userId, conversationId, otherUserId]
      );
    }

    return this.getConversationById(conversationId, userId);
  }

  async getConversationById(conversationId: number, userId: number): Promise<Conversation> {
    const [rows] = await pool.execute<ConversationRow[]>(
      `SELECT
        c.*,
        CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END AS other_user_id,
        CASE WHEN c.participant1_id = ? THEN u2.username ELSE u1.username END AS other_user_username,
        CASE WHEN c.participant1_id = ? THEN u2.display_name ELSE u1.display_name END AS other_user_display_name,
        CASE WHEN c.participant1_id = ? THEN u2.avatar ELSE u1.avatar END AS other_user_avatar,
        CASE WHEN c.participant1_id = ? THEN us2.is_online ELSE us1.is_online END AS other_user_is_online,
        CASE WHEN c.participant1_id = ? THEN us2.status_type ELSE us1.status_type END AS other_user_status_type
      FROM chat_conversations c
      LEFT JOIN users u1 ON c.participant1_id = u1.id
      LEFT JOIN users u2 ON c.participant2_id = u2.id
      LEFT JOIN user_status us1 ON c.participant1_id = us1.user_id
      LEFT JOIN user_status us2 ON c.participant2_id = us2.user_id
      WHERE c.id = ? AND (c.participant1_id = ? OR c.participant2_id = ?)`,
      [userId, userId, userId, userId, userId, userId, conversationId, userId, userId]
    );

    if (rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const row = rows[0];
    const settings = await this.getConversationSettings(conversationId, userId);

    return {
      id: row.id,
      participant1Id: row.participant1_id,
      participant2Id: row.participant2_id,
      otherUser: {
        id: row.other_user_id!,
        username: row.other_user_username!,
        displayName: row.other_user_display_name || null,
        avatar: row.other_user_avatar || null,
        status: {
          userId: row.other_user_id!,
          username: row.other_user_username!,
          displayName: row.other_user_display_name || null,
          avatar: row.other_user_avatar || null,
          isOnline: Boolean(row.other_user_is_online),
          statusType: row.other_user_status_type || 'offline',
          statusText: null,
          currentActivity: 'none',
          activityMetadata: null,
          lastSeenAt: null,
        },
      },
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      settings,
    };
  }

  async getOtherParticipant(conversationId: number, userId: number): Promise<number> {
    const [rows] = await pool.execute<ConversationRow[]>(
      `SELECT participant1_id, participant2_id FROM chat_conversations WHERE id = ?`,
      [conversationId]
    );

    if (rows.length === 0) {
      throw new Error('Conversation not found');
    }

    return rows[0].participant1_id === userId ? rows[0].participant2_id : rows[0].participant1_id;
  }

  async getConversationSettings(conversationId: number, userId: number): Promise<ConversationSettings> {
    const [rows] = await pool.execute<ConversationSettingsRow[]>(
      `SELECT * FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (rows.length === 0) {
      return {
        isMuted: false,
        mutedUntil: null,
        isPinned: false,
        isArchived: false,
        nickname: null,
      };
    }

    const row = rows[0];
    return {
      isMuted: Boolean(row.is_muted),
      mutedUntil: row.muted_until ? row.muted_until.toISOString() : null,
      isPinned: Boolean(row.is_pinned),
      isArchived: Boolean(row.is_archived),
      nickname: row.nickname,
    };
  }

  async updateConversationSettings(
    conversationId: number,
    userId: number,
    settings: UpdateConversationSettingsDTO
  ): Promise<ConversationSettings> {
    // Upsert settings
    await pool.execute(
      `INSERT INTO chat_conversation_settings (conversation_id, user_id, is_muted, muted_until, is_pinned, is_archived, nickname)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_muted = COALESCE(VALUES(is_muted), is_muted),
         muted_until = COALESCE(VALUES(muted_until), muted_until),
         is_pinned = COALESCE(VALUES(is_pinned), is_pinned),
         is_archived = COALESCE(VALUES(is_archived), is_archived),
         nickname = COALESCE(VALUES(nickname), nickname)`,
      [
        conversationId,
        userId,
        settings.isMuted ?? null,
        settings.mutedUntil ?? null,
        settings.isPinned ?? null,
        settings.isArchived ?? null,
        settings.nickname ?? null,
      ]
    );

    return this.getConversationSettings(conversationId, userId);
  }

  async deleteConversation(conversationId: number, userId: number): Promise<void> {
    // Soft delete by archiving for this user
    await this.updateConversationSettings(conversationId, userId, { isArchived: true });
  }

  // ============================================================
  // Messages
  // ============================================================

  async getMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = MESSAGES_PER_PAGE
  ): Promise<PaginatedResponse<Message>> {
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        m.*,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar AS sender_avatar,
        CASE WHEN cmr.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_read,
        cmr.read_at
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN chat_message_reads cmr ON m.id = cmr.message_id AND cmr.user_id = ?
      WHERE m.conversation_id = ? AND m.is_deleted = FALSE
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE conversation_id = ? AND is_deleted = FALSE
    `;

    const [rows] = await pool.execute<MessageRow[]>(query, [userId, conversationId, String(limit), String(offset)]);
    const [countResult] = await pool.execute<CountRow[]>(countQuery, [conversationId]);

    const total = countResult[0]?.count || 0;

    const items: Message[] = rows.map(row => this.mapMessageRow(row));

    return {
      items: items.reverse(), // Return in chronological order
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createMessage(data: {
    conversationId: number;
    senderId: number;
    messageType: MessageType;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.conversationId,
        data.senderId,
        data.messageType,
        data.content,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const messageId = result.insertId;

    // Update conversation last message
    await this.updateLastMessage(data.conversationId, messageId);

    // Get the created message with sender info
    const [rows] = await pool.execute<MessageRow[]>(
      `SELECT
        m.*,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar AS sender_avatar
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?`,
      [messageId]
    );

    return this.mapMessageRow(rows[0]);
  }

  async updateLastMessage(conversationId: number, messageId: number): Promise<void> {
    await pool.execute(
      `UPDATE chat_conversations SET last_message_id = ?, last_message_at = NOW() WHERE id = ?`,
      [messageId, conversationId]
    );
  }

  async markMessagesAsRead(userId: number, messageIds: number[]): Promise<void> {
    if (messageIds.length === 0) return;

    const placeholders = messageIds.map(() => '(?, ?)').join(', ');
    const values = messageIds.flatMap(id => [id, userId]);

    await pool.execute(
      `INSERT IGNORE INTO chat_message_reads (message_id, user_id) VALUES ${placeholders}`,
      values
    );
  }

  async deleteMessage(userId: number, messageId: number): Promise<Message | null> {
    // Only allow sender to delete
    const [rows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, u.username AS sender_username, u.display_name AS sender_display_name, u.avatar AS sender_avatar
       FROM chat_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.id = ? AND m.sender_id = ?`,
      [messageId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    await pool.execute(
      `UPDATE chat_messages SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ?`,
      [messageId]
    );

    return this.mapMessageRow(rows[0]);
  }

  private mapMessageRow(row: MessageRow): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      sender: {
        id: row.sender_id,
        username: row.sender_username || '',
        displayName: row.sender_display_name || null,
        avatar: row.sender_avatar || null,
      },
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : null,
      isRead: Boolean(row.is_read),
      readAt: row.read_at ? row.read_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      editedAt: row.edited_at ? row.edited_at.toISOString() : null,
      isDeleted: Boolean(row.is_deleted),
    };
  }

  // ============================================================
  // Blocking
  // ============================================================

  async isBlocked(userId: number, otherUserId: number): Promise<boolean> {
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM user_blocks
       WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      [userId, otherUserId, otherUserId, userId]
    );

    return (rows[0]?.count || 0) > 0;
  }

  async blockUser(blockerId: number, blockedId: number, reason?: string): Promise<void> {
    await pool.execute(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [blockerId, blockedId, reason || null]
    );
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    await pool.execute(
      `DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
      [blockerId, blockedId]
    );
  }

  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    const [rows] = await pool.execute<BlockRow[]>(
      `SELECT b.*, u.username AS blocked_username, u.display_name AS blocked_display_name, u.avatar AS blocked_avatar
       FROM user_blocks b
       LEFT JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.blocked_id,
      username: row.blocked_username || '',
      displayName: row.blocked_display_name || null,
      avatar: row.blocked_avatar || null,
      reason: row.reason,
      blockedAt: row.created_at.toISOString(),
    }));
  }

  // ============================================================
  // Sharing Content
  // ============================================================

  async shareContent(
    senderId: number,
    recipientId: number,
    contentType: SharedContentType,
    contentId: number,
    comment?: string
  ): Promise<Message> {
    // Get or create conversation
    const conversation = await this.getOrCreateConversation(senderId, recipientId);

    // Get content snapshot based on type
    const snapshot = await this.getContentSnapshot(contentType, contentId, senderId);

    // Create message
    const message = await this.createMessage({
      conversationId: conversation.id,
      senderId,
      messageType: contentType as MessageType,
      content: comment || `Shared a ${contentType}`,
      metadata: {
        ...snapshot,
        comment,
      },
    });

    // Save to shared content tracking
    await pool.execute(
      `INSERT INTO chat_shared_content (message_id, content_type, content_id, snapshot)
       VALUES (?, ?, ?, ?)`,
      [message.id, contentType, contentId, JSON.stringify(snapshot)]
    );

    return message;
  }

  private async getContentSnapshot(
    contentType: SharedContentType,
    contentId: number,
    userId: number
  ): Promise<Record<string, unknown>> {
    switch (contentType) {
      case 'achievement': {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT a.*, ua.unlocked_at
           FROM user_achievements ua
           JOIN achievements a ON ua.achievement_id = a.id
           WHERE ua.id = ? AND ua.user_id = ?`,
          [contentId, userId]
        );
        if (rows.length === 0) throw new Error('Achievement not found');
        return {
          title: rows[0].title,
          description: rows[0].description,
          icon: rows[0].icon,
          xpReward: rows[0].xp_reward,
          unlockedAt: rows[0].unlocked_at,
        };
      }

      case 'game': {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT * FROM game_sessions WHERE id = ? AND user_id = ?`,
          [contentId, userId]
        );
        if (rows.length === 0) throw new Error('Game session not found');
        return {
          gameType: rows[0].game_type,
          score: rows[0].score,
          wordsLearned: rows[0].words_learned,
          timeSpent: rows[0].time_spent_seconds,
          completedAt: rows[0].completed_at,
        };
      }

      case 'exercise': {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT * FROM exercise_sessions WHERE id = ? AND user_id = ?`,
          [contentId, userId]
        );
        if (rows.length === 0) throw new Error('Exercise session not found');
        return {
          exerciseType: rows[0].exercise_type,
          correctCount: rows[0].correct_count,
          totalCount: rows[0].total_count,
          accuracy: rows[0].accuracy_percentage,
          timeSpent: rows[0].total_time_seconds,
          completedAt: rows[0].completed_at,
        };
      }

      case 'vocabulary': {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT * FROM vocabulary WHERE id = ?`,
          [contentId]
        );
        if (rows.length === 0) throw new Error('Vocabulary not found');
        return {
          englishWord: rows[0].english_word,
          vietnameseWord: rows[0].vietnamese_word,
          partOfSpeech: rows[0].part_of_speech,
          phonetic: rows[0].phonetic,
        };
      }

      case 'quiz': {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT qh.*, q.title as quiz_title
           FROM quiz_history qh
           JOIN quizzes q ON qh.quiz_id = q.id
           WHERE qh.id = ? AND qh.user_id = ?`,
          [contentId, userId]
        );
        if (rows.length === 0) throw new Error('Quiz result not found');
        return {
          quizTitle: rows[0].quiz_title,
          score: rows[0].score,
          totalQuestions: rows[0].total_questions,
          correctAnswers: rows[0].correct_answers,
          completedAt: rows[0].completed_at,
        };
      }

      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  // ============================================================
  // Users Search
  // ============================================================

  async searchUsers(
    userId: number,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserInfo>> {
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, username, display_name, avatar
       FROM users
       WHERE id != ?
         AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)
         AND id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
         AND id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
       ORDER BY username
       LIMIT ? OFFSET ?`,
      [userId, searchPattern, searchPattern, searchPattern, userId, userId, String(limit), String(offset)]
    );

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count
       FROM users
       WHERE id != ?
         AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)
         AND id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
         AND id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)`,
      [userId, searchPattern, searchPattern, searchPattern, userId, userId]
    );

    const total = countResult[0]?.count || 0;

    const items: UserInfo[] = rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllUsers(
    userId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<UserInfo>> {
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.username, u.display_name, u.avatar,
              us.is_online, us.status_type, us.last_seen_at
       FROM users u
       LEFT JOIN user_status us ON u.id = us.user_id
       WHERE u.id != ?
         AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
       ORDER BY us.is_online DESC, CASE WHEN us.last_seen_at IS NULL THEN 1 ELSE 0 END, us.last_seen_at DESC, u.username
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, String(limit), String(offset)]
    );

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count
       FROM users u
       WHERE u.id != ?
         AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)`,
      [userId, userId, userId]
    );

    const total = countResult[0]?.count || 0;

    const items: UserInfo[] = rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // Message Search
  // ============================================================

  async searchMessages(
    userId: number,
    query: string,
    conversationId?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Message>> {
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    let whereClause = `
      m.content LIKE ?
      AND m.is_deleted = FALSE
      AND (c.participant1_id = ? OR c.participant2_id = ?)
    `;
    let params: (string | number)[] = [searchPattern, userId, userId];

    if (conversationId) {
      whereClause += ` AND m.conversation_id = ?`;
      params.push(conversationId);
    }

    const queryStr = `
      SELECT
        m.*,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar AS sender_avatar
      FROM chat_messages m
      JOIN chat_conversations c ON m.conversation_id = c.id
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM chat_messages m
      JOIN chat_conversations c ON m.conversation_id = c.id
      WHERE ${whereClause}
    `;

    const [rows] = await pool.execute<MessageRow[]>(queryStr, [...params, String(limit), String(offset)]);
    const [countResult] = await pool.execute<CountRow[]>(countQuery, params);

    const total = countResult[0]?.count || 0;

    const items: Message[] = rows.map(row => this.mapMessageRow(row));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const chatService = new ChatService();
