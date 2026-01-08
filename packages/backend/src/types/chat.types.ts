import type { RowDataPacket } from 'mysql2';

// ============================================================
// Enums & Constants
// ============================================================

export type MessageType = 'text' | 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'image' | 'link' | 'gift';
export type StatusType = 'online' | 'offline' | 'away' | 'busy' | 'playing_game' | 'studying' | 'do_not_disturb' | 'invisible';
export type ActivityType = 'none' | 'playing_word_scramble' | 'playing_memory_match' | 'playing_speed_challenge' | 'playing_hangman' | 'doing_exercises' | 'reviewing_vocabulary' | 'learning_grammar' | 'taking_quiz';
export type AllowMessagesFrom = 'everyone' | 'friends_only' | 'nobody';
export type SharedContentType = 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'quiz';

export const MESSAGE_MAX_LENGTH = 5000;
export const STATUS_TEXT_MAX_LENGTH = 100;
export const MESSAGES_PER_PAGE = 50;

// ============================================================
// DTOs - Request
// ============================================================

export interface SendMessageDTO {
  conversationId?: number;
  recipientId?: number;
  messageType: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateConversationDTO {
  userId: number;
}

export interface UpdateConversationSettingsDTO {
  isMuted?: boolean;
  mutedUntil?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  nickname?: string | null;
}

export interface UpdateStatusDTO {
  statusType?: StatusType;
  statusText?: string | null;
  currentActivity?: ActivityType;
  activityMetadata?: Record<string, unknown> | null;
}

export interface BlockUserDTO {
  userId: number;
  reason?: string;
}

export interface ShareContentDTO {
  recipientId: number;
  contentType: SharedContentType;
  contentId: number;
  comment?: string;
}

export interface MarkMessagesReadDTO {
  messageIds: number[];
}

// ============================================================
// DTOs - Response
// ============================================================

export interface UserInfo {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface UserStatusInfo {
  userId: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isOnline: boolean;
  statusType: StatusType;
  statusText: string | null;
  currentActivity: ActivityType;
  activityMetadata: Record<string, unknown> | null;
  lastSeenAt: string | null;
}

export interface ConversationPreview {
  id: number;
  otherUser: UserInfo;
  lastMessage: string | null;
  lastMessageType: MessageType | null;
  lastMessageAt: string | null;
  lastMessageSenderId: number | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isOnline: boolean;
  statusType: StatusType;
  nickname: string | null; // Per-conversation nickname for the other user
}

export interface Conversation {
  id: number;
  participant1Id: number;
  participant2Id: number;
  otherUser: UserInfo & { status: UserStatusInfo };
  createdAt: string;
  updatedAt: string;
  settings: ConversationSettings;
}

export interface ConversationSettings {
  isMuted: boolean;
  mutedUntil: string | null;
  isPinned: boolean;
  isArchived: boolean;
  nickname: string | null;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  sender: UserInfo;
  messageType: MessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
}

export interface BlockedUser {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  reason: string | null;
  blockedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Socket Events - Client to Server
// ============================================================

export interface ClientToServerEvents {
  // Messages
  'message:send': (data: {
    conversationId?: number;
    recipientId?: number;
    messageType: MessageType;
    content: string;
    metadata?: Record<string, unknown>;
  }) => void;
  'message:read': (data: { conversationId: number; messageIds: number[] }) => void;
  'message:delete': (data: { messageId: number }) => void;

  // Typing
  'typing:start': (data: { conversationId: number }) => void;
  'typing:stop': (data: { conversationId: number }) => void;

  // Status
  'status:update': (data: { statusType?: string; statusText?: string }) => void;
  'status:get': (data: { userId: number }, callback: (status: {
    userId: number;
    status: StatusType;
    statusText?: string;
    isOnline: boolean;
    lastSeenAt?: string;
    activity: ActivityType;
  } | null) => void) => void;
  'status:get_online': (callback: (users: {
    userId: number;
    username: string;
    displayName?: string;
    avatar?: string;
    status: StatusType;
    activity: ActivityType;
  }[]) => void) => void;
  'users:online': () => void;
  'activity:update': (data: { activity: ActivityType; metadata?: Record<string, unknown> }) => void;
  'privacy:update': (data: { showOnlineStatus?: boolean; allowMessagesFrom?: AllowMessagesFrom }) => void;

  // Sharing
  'share:content': (data: ShareContentDTO) => void;
}

// ============================================================
// Socket Events - Server to Client
// ============================================================

export interface ServerToClientEvents {
  // Messages
  'message:new': (message: Message) => void;
  'message:sent': (message: Message) => void;
  'message:read': (data: { conversationId: number; messageIds: number[]; readBy: number; readAt: string }) => void;
  'message:deleted': (data: { messageId: number; conversationId: number }) => void;
  'message:error': (data: { error: string }) => void;

  // Typing
  'typing:start': (data: { conversationId: number; userId: number }) => void;
  'typing:stop': (data: { conversationId: number; userId: number }) => void;
  'typing:started': (data: { conversationId: number; userId: number }) => void;
  'typing:stopped': (data: { conversationId: number; userId: number }) => void;

  // Status
  'user:online': (data: { userId: number; status: StatusType | string }) => void;
  'user:offline': (data: { userId: number; lastSeen: string }) => void;
  'user:status': (data: UserStatusInfo) => void;
  'user:status_changed': (data: { userId: number; status: StatusType; statusText?: string }) => void;
  'user:activity': (data: { userId: number; activity: ActivityType; metadata?: Record<string, unknown> }) => void;
  'user:activity_changed': (data: { userId: number; activity: ActivityType; metadata?: Record<string, unknown> }) => void;
  'users:online:list': (users: UserStatusInfo[]) => void;
  'status:updated': (data: { success: boolean }) => void;
  'status:error': (data: { error: string }) => void;

  // Sharing
  'share:error': (data: { error: string }) => void;

  // Gift
  'gift:status_changed': (data: { giftId: number; status: string; claimedAt?: string }) => void;
}

// ============================================================
// Socket Data Types
// ============================================================

export interface SocketData {
  userId: number;
  username: string;
  email: string;
}

// ============================================================
// Database Row Types
// ============================================================

export interface UserStatusRow extends RowDataPacket {
  user_id: number;
  is_online: boolean;
  last_seen_at: Date | null;
  status_type: StatusType;
  status_text: string | null;
  current_activity: ActivityType;
  activity_metadata: string | null;
  show_online_status: boolean;
  allow_messages_from: AllowMessagesFrom;
  socket_id: string | null;
  connected_at: Date | null;
  updated_at: Date;
  // Joined user fields
  username?: string;
  display_name?: string | null;
  avatar?: string | null;
}

export interface ConversationRow extends RowDataPacket {
  id: number;
  participant1_id: number;
  participant2_id: number;
  last_message_id: number | null;
  last_message_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  other_user_id?: number;
  other_user_username?: string;
  other_user_display_name?: string | null;
  other_user_avatar?: string | null;
  other_user_is_online?: boolean;
  other_user_status_type?: StatusType;
  last_message_content?: string | null;
  last_message_type?: MessageType | null;
  last_message_sender_id?: number | null;
  unread_count?: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
  conversation_nickname?: string | null;
}

export interface MessageRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  content: string;
  metadata: string | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  edited_at: Date | null;
  // Joined sender fields
  sender_username?: string;
  sender_display_name?: string | null;
  sender_avatar?: string | null;
  // Read status
  is_read?: boolean;
  read_at?: Date | null;
}

export interface BlockRow extends RowDataPacket {
  id: number;
  blocker_id: number;
  blocked_id: number;
  reason: string | null;
  created_at: Date;
  // Joined blocked user fields
  blocked_username?: string;
  blocked_display_name?: string | null;
  blocked_avatar?: string | null;
}

export interface ConversationSettingsRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  user_id: number;
  is_muted: boolean;
  muted_until: Date | null;
  is_pinned: boolean;
  is_archived: boolean;
  nickname: string | null;
  updated_at: Date;
}

export interface CountRow extends RowDataPacket {
  count: number;
}
