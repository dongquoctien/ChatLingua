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

    // Join with shop_gifts to get the latest gift status for gift messages
    const query = `
      SELECT
        m.*,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar AS sender_avatar,
        CASE WHEN cmr.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_read,
        cmr.read_at,
        sg.status AS gift_status
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN chat_message_reads cmr ON m.id = cmr.message_id AND cmr.user_id = ?
      LEFT JOIN shop_gifts sg ON m.message_type = 'gift' AND JSON_EXTRACT(m.metadata, '$.giftId') = sg.id
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
    let metadata = row.metadata
      ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
      : null;

    // For gift messages, update status from shop_gifts table (real-time status)
    if (row.message_type === 'gift' && metadata && (row as any).gift_status) {
      metadata = { ...metadata, status: (row as any).gift_status };
    }

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
      metadata,
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
          `SELECT gs.*, g.game_code, g.name as game_name
           FROM game_sessions gs
           JOIN games g ON gs.game_id = g.id
           WHERE gs.id = ? AND gs.user_id = ?`,
          [contentId, userId]
        );
        if (rows.length === 0) throw new Error('Game session not found');
        return {
          gameType: rows[0].game_code,
          score: rows[0].score || 0,
          wordsLearned: rows[0].words_correct || 0,
          timeSpent: rows[0].duration_seconds || 0,
          completedAt: rows[0].ended_at,
          accuracy: rows[0].accuracy || 0,
          maxCombo: rows[0].max_combo || 0,
          level: 1,
          perfectRounds: 0,
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
  // Conversation Sharing (Learning Conversations)
  // ============================================================

  /**
   * Share a learning conversation to multiple users via chat
   */
  async shareConversation(
    senderId: number,
    conversationId: number, // Learning conversation ID (from conversations table)
    recipientIds: number[],
    message?: string
  ): Promise<Message[]> {
    // Get the learning conversation with stats
    const [convRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        c.id,
        c.vietnamese_text,
        c.english_translation,
        c.topic,
        c.difficulty_level,
        c.created_at,
        u.id AS user_id,
        u.username,
        u.display_name
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND c.user_id = ?`,
      [conversationId, senderId]
    );

    if (convRows.length === 0) {
      throw new Error('Conversation not found or not owned by user');
    }

    const conversation = convRows[0];

    // Get vocabulary count (via vocabulary_contexts junction table)
    const [vocabCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM vocabulary_contexts WHERE conversation_id = ?`,
      [conversationId]
    );

    // Get grammar count
    const [grammarCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM grammar_points WHERE conversation_id = ?`,
      [conversationId]
    );

    // Get exercises count
    const [exerciseCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM exercises WHERE conversation_id = ?`,
      [conversationId]
    );

    // Create shared conversation payload
    const sharedPayload = {
      sourceConversationId: conversationId,
      title: conversation.topic || 'Shared Conversation',
      preview: (conversation.vietnamese_text || '').substring(0, 100),
      vocabularyCount: Number(vocabCount[0]?.count) || 0,
      grammarCount: Number(grammarCount[0]?.count) || 0,
      exerciseCount: Number(exerciseCount[0]?.count) || 0,
      difficultyLevel: conversation.difficulty_level,
      sharedBy: {
        userId: senderId,
        username: conversation.username,
        displayName: conversation.display_name || conversation.username,
      },
      importStatus: 'not_imported',
    };

    const messages: Message[] = [];

    // Send to each recipient
    for (const recipientId of recipientIds) {
      // Check if blocked
      const isBlocked = await this.isBlocked(senderId, recipientId);
      if (isBlocked) continue;

      // Get or create chat conversation
      const chatConversation = await this.getOrCreateConversation(senderId, recipientId);

      // Create message with shared_conversation type
      const msg = await this.createMessage({
        conversationId: chatConversation.id,
        senderId,
        messageType: 'shared_conversation' as MessageType,
        content: message || `Shared a conversation: ${sharedPayload.title}`,
        metadata: sharedPayload,
      });

      messages.push(msg);
    }

    return messages;
  }

  /**
   * Get preview of shared conversation before import
   */
  async getSharedPreview(
    messageId: number,
    userId: number
  ): Promise<{
    payload: Record<string, unknown>;
    vocabStats: { total: number; new: number; duplicate: number };
    grammarStats: { total: number; new: number; duplicate: number };
    exerciseCount: number;
    alreadyImported: boolean;
  }> {
    // Get the message
    const [msgRows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, c.participant1_id, c.participant2_id
       FROM chat_messages m
       JOIN chat_conversations c ON m.conversation_id = c.id
       WHERE m.id = ? AND m.message_type = 'shared_conversation'
         AND (c.participant1_id = ? OR c.participant2_id = ?)`,
      [messageId, userId, userId]
    );

    if (msgRows.length === 0) {
      throw new Error('Shared conversation not found');
    }

    const message = msgRows[0];
    const metadata = typeof message.metadata === 'string'
      ? JSON.parse(message.metadata)
      : message.metadata;

    const sourceConversationId = metadata.sourceConversationId;

    // Check if already imported
    const [importRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM chat_shared_imports WHERE message_id = ? AND recipient_id = ?`,
      [messageId, userId]
    );
    const alreadyImported = importRows.length > 0;

    // Get vocabulary stats (how many are new vs existing)
    const [vocabRows] = await pool.execute<RowDataPacket[]>(
      `SELECT v.english_word FROM vocabulary v INNER JOIN vocabulary_contexts vc ON v.id = vc.vocabulary_id WHERE vc.conversation_id = ?`,
      [sourceConversationId]
    );

    let vocabNew = 0;
    let vocabDuplicate = 0;
    for (const row of vocabRows) {
      const [existing] = await pool.execute<CountRow[]>(
        `SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ? AND english_word = ?`,
        [userId, row.english_word]
      );
      if ((existing[0]?.count || 0) > 0) {
        vocabDuplicate++;
      } else {
        vocabNew++;
      }
    }

    // Get grammar stats
    const [grammarRows] = await pool.execute<RowDataPacket[]>(
      `SELECT g.grammar_rule FROM grammar_points g WHERE g.conversation_id = ?`,
      [sourceConversationId]
    );

    let grammarNew = 0;
    let grammarDuplicate = 0;
    for (const row of grammarRows) {
      const [existing] = await pool.execute<CountRow[]>(
        `SELECT COUNT(*) as count FROM grammar_points WHERE user_id = ? AND grammar_rule = ?`,
        [userId, row.grammar_rule]
      );
      if ((existing[0]?.count || 0) > 0) {
        grammarDuplicate++;
      } else {
        grammarNew++;
      }
    }

    // Get exercise count from source
    const [exerciseCountResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM exercises WHERE conversation_id = ?`,
      [sourceConversationId]
    );

    return {
      payload: metadata,
      vocabStats: {
        total: vocabRows.length,
        new: vocabNew,
        duplicate: vocabDuplicate,
      },
      grammarStats: {
        total: grammarRows.length,
        new: grammarNew,
        duplicate: grammarDuplicate,
      },
      exerciseCount: Number(exerciseCountResult[0]?.count) || 0,
      alreadyImported,
    };
  }

  /**
   * Import a shared conversation to user's library
   */
  async importSharedConversation(
    messageId: number,
    userId: number,
    options: {
      importVocabulary: boolean;
      importGrammar: boolean;
      importExercises: boolean;
    }
  ): Promise<{
    success: boolean;
    createdConversationId: number;
    stats: {
      vocabularyImported: number;
      vocabularySkipped: number;
      grammarImported: number;
      grammarSkipped: number;
      exercisesImported: number;
    };
  }> {
    // Check if already imported
    const [existingImport] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM chat_shared_imports WHERE message_id = ? AND recipient_id = ?`,
      [messageId, userId]
    );

    if (existingImport.length > 0) {
      throw new Error('Already imported this conversation');
    }

    // Get the message
    const [msgRows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, c.participant1_id, c.participant2_id
       FROM chat_messages m
       JOIN chat_conversations c ON m.conversation_id = c.id
       WHERE m.id = ? AND m.message_type = 'shared_conversation'
         AND (c.participant1_id = ? OR c.participant2_id = ?)`,
      [messageId, userId, userId]
    );

    if (msgRows.length === 0) {
      throw new Error('Shared conversation not found');
    }

    const message = msgRows[0];
    const metadata = typeof message.metadata === 'string'
      ? JSON.parse(message.metadata)
      : message.metadata;

    const sourceConversationId = metadata.sourceConversationId;

    // Get source conversation
    const [sourceRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM conversations WHERE id = ?`,
      [sourceConversationId]
    );

    if (sourceRows.length === 0) {
      throw new Error('Source conversation no longer exists');
    }

    const source = sourceRows[0];

    // Create new conversation for recipient
    const [convResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO conversations (user_id, vietnamese_text, english_translation, topic, difficulty_level)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, source.vietnamese_text, source.english_translation, source.topic, source.difficulty_level]
    );

    const createdConversationId = convResult.insertId;

    const stats = {
      vocabularyImported: 0,
      vocabularySkipped: 0,
      grammarImported: 0,
      grammarSkipped: 0,
      exercisesImported: 0,
    };

    // Import vocabulary if requested
    if (options.importVocabulary) {
      // Get vocabulary via vocabulary_contexts junction table
      const [vocabRows] = await pool.execute<RowDataPacket[]>(
        `SELECT v.*, vc.vietnamese_word as context_vietnamese_word,
                vc.example_sentence_vi, vc.example_sentence_en
         FROM vocabulary v
         INNER JOIN vocabulary_contexts vc ON v.id = vc.vocabulary_id
         WHERE vc.conversation_id = ?`,
        [sourceConversationId]
      );

      for (const vocab of vocabRows) {
        // Check if already exists for this user
        const [existing] = await pool.execute<CountRow[]>(
          `SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ? AND english_word = ?`,
          [userId, vocab.english_word]
        );

        if ((existing[0]?.count || 0) > 0) {
          stats.vocabularySkipped++;
          continue;
        }

        // Insert new vocabulary for this user
        const [insertResult] = await pool.execute<ResultSetHeader>(
          `INSERT INTO vocabulary (
            user_id, vietnamese_word, english_word,
            part_of_speech, phonetic, pronunciation_uk, pronunciation_us,
            cefr_level, difficulty_level, definitions, word_forms,
            word_family, synonyms, antonyms, collocations, extra_examples,
            usage_notes, grammar_info, topics, register
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, vocab.context_vietnamese_word || vocab.vietnamese_word, vocab.english_word,
            vocab.part_of_speech, vocab.phonetic, vocab.pronunciation_uk, vocab.pronunciation_us,
            vocab.cefr_level, vocab.difficulty_level, vocab.definitions, vocab.word_forms,
            vocab.word_family, vocab.synonyms, vocab.antonyms, vocab.collocations, vocab.extra_examples,
            vocab.usage_notes, vocab.grammar_info, vocab.topics, vocab.register,
          ]
        );

        // Create vocabulary_context to link to the new conversation
        const newVocabId = insertResult.insertId;
        await pool.execute(
          `INSERT INTO vocabulary_contexts (vocabulary_id, conversation_id, vietnamese_word, example_sentence_vi, example_sentence_en)
           VALUES (?, ?, ?, ?, ?)`,
          [newVocabId, createdConversationId, vocab.context_vietnamese_word || vocab.vietnamese_word,
           vocab.example_sentence_vi, vocab.example_sentence_en]
        );

        stats.vocabularyImported++;
      }
    }

    // Import grammar if requested
    if (options.importGrammar) {
      const [grammarRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM grammar_points WHERE conversation_id = ?`,
        [sourceConversationId]
      );

      for (const grammar of grammarRows) {
        // Check if already exists
        const [existing] = await pool.execute<CountRow[]>(
          `SELECT COUNT(*) as count FROM grammar_points WHERE user_id = ? AND grammar_rule = ?`,
          [userId, grammar.grammar_rule]
        );

        if ((existing[0]?.count || 0) > 0) {
          stats.grammarSkipped++;
          continue;
        }

        // Insert new grammar point
        await pool.execute(
          `INSERT INTO grammar_points (
            user_id, conversation_id, grammar_rule, explanation,
            example_vi, example_en, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, createdConversationId, grammar.grammar_rule, grammar.explanation,
            grammar.example_vi, grammar.example_en, grammar.category,
          ]
        );
        stats.grammarImported++;
      }
    }

    // Import exercises if requested
    if (options.importExercises) {
      const [exerciseRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM exercises WHERE conversation_id = ?`,
        [sourceConversationId]
      );

      for (const exercise of exerciseRows) {
        await pool.execute(
          `INSERT INTO exercises (
            user_id, conversation_id, exercise_type, question,
            correct_answer, options, explanation, exercise_data,
            audio_url, time_limit_seconds
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, createdConversationId, exercise.exercise_type, exercise.question,
            exercise.correct_answer, exercise.options, exercise.explanation, exercise.exercise_data,
            exercise.audio_url, exercise.time_limit_seconds,
          ]
        );
        stats.exercisesImported++;
      }
    }

    // Record the import
    await pool.execute(
      `INSERT INTO chat_shared_imports (
        message_id, recipient_id, source_conversation_id, created_conversation_id,
        imported_vocabulary, imported_grammar, imported_exercises,
        vocabulary_imported, vocabulary_skipped, grammar_imported, grammar_skipped, exercises_imported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId, userId, sourceConversationId, createdConversationId,
        options.importVocabulary, options.importGrammar, options.importExercises,
        stats.vocabularyImported, stats.vocabularySkipped, stats.grammarImported, stats.grammarSkipped, stats.exercisesImported,
      ]
    );

    return {
      success: true,
      createdConversationId,
      stats,
    };
  }

  /**
   * Get import status for a shared message
   */
  async getImportStatus(
    messageId: number,
    userId: number
  ): Promise<{
    imported: boolean;
    importedAt?: string;
    createdConversationId?: number;
    stats?: {
      vocabularyImported: number;
      vocabularySkipped: number;
      grammarImported: number;
      grammarSkipped: number;
      exercisesImported: number;
    };
  }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM chat_shared_imports WHERE message_id = ? AND recipient_id = ?`,
      [messageId, userId]
    );

    if (rows.length === 0) {
      return { imported: false };
    }

    const row = rows[0];
    return {
      imported: true,
      importedAt: row.imported_at ? row.imported_at.toISOString() : undefined,
      createdConversationId: row.created_conversation_id,
      stats: {
        vocabularyImported: row.vocabulary_imported,
        vocabularySkipped: row.vocabulary_skipped,
        grammarImported: row.grammar_imported,
        grammarSkipped: row.grammar_skipped,
        exercisesImported: row.exercises_imported,
      },
    };
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
