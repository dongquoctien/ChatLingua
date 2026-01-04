// ============================================================
// Enums & Constants
// ============================================================

export type MessageType = 'text' | 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'image' | 'link' | 'shared_conversation';
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
  otherUserId: number;
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
}

// ============================================================
// Status Display Helpers
// ============================================================

export const STATUS_LABELS: Record<StatusType, string> = {
  online: 'Online',
  offline: 'Offline',
  away: 'Away',
  busy: 'Busy',
  playing_game: 'Playing Game',
  studying: 'Studying',
  do_not_disturb: 'Do Not Disturb',
  invisible: 'Invisible',
};

export const STATUS_COLORS: Record<StatusType, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  playing_game: 'bg-purple-500',
  studying: 'bg-blue-500',
  do_not_disturb: 'bg-red-600',
  invisible: 'bg-gray-300',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  none: '',
  playing_word_scramble: 'Playing Word Scramble',
  playing_memory_match: 'Playing Memory Match',
  playing_speed_challenge: 'Playing Speed Challenge',
  playing_hangman: 'Playing Hangman',
  doing_exercises: 'Doing Exercises',
  reviewing_vocabulary: 'Reviewing Vocabulary',
  learning_grammar: 'Learning Grammar',
  taking_quiz: 'Taking Quiz',
};

// ============================================================
// Conversation Sharing Types
// ============================================================

export interface SharedConversationPayload {
  sourceConversationId: number;
  title: string;
  preview: string;
  vocabularyCount: number;
  grammarCount: number;
  exerciseCount: number;
  difficultyLevel?: string;
  sharedBy: {
    userId: number;
    username: string;
    displayName: string;
  };
  importStatus?: 'not_imported' | 'imported' | 'partial';
  importedAt?: string;
}

export interface SharedPreview {
  payload: SharedConversationPayload;
  vocabStats: {
    total: number;
    byPartOfSpeech: Record<string, number>;
    byCefrLevel: Record<string, number>;
  };
  grammarStats: {
    total: number;
    byCategory: Record<string, number>;
  };
  exerciseCount: number;
  alreadyImported: boolean;
  importedAt?: string;
  createdConversationId?: number;
}

export interface ImportOptions {
  importVocabulary: boolean;
  importGrammar: boolean;
  importExercises: boolean;
}

export interface ImportResult {
  success: boolean;
  createdConversationId: number;
  stats: {
    vocabularyImported: number;
    grammarImported: number;
    exercisesImported: number;
  };
}

export interface ImportStatus {
  imported: boolean;
  importedAt?: string;
  createdConversationId?: number;
  stats?: {
    vocabularyImported: number;
    grammarImported: number;
    exercisesImported: number;
  };
}
