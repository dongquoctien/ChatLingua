import type { RowDataPacket } from 'mysql2';

// ============================================================
// Enums & Constants
// ============================================================

export type SyncRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type SyncRequestPriority = 'low' | 'normal' | 'high';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export const MAX_PENDING_PER_USER = 5;
export const MAX_REQUESTS_PER_DAY = 10;
export const MAX_TEXT_LENGTH = 5000;
export const AUTO_CANCEL_DAYS = 7;

// ============================================================
// DTOs - Request
// ============================================================

export interface CreateSyncRequestDTO {
  vietnameseText: string;
  englishTranslation?: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel;
  notes?: string;
  priority?: SyncRequestPriority;
}

export interface UpdateSyncRequestDTO {
  vietnameseText?: string;
  englishTranslation?: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel;
  notes?: string;
}

export interface CompleteSyncRequestDTO {
  conversationId: number;
  notes?: string;
}

export interface SyncRequestFilters {
  priority?: SyncRequestPriority;
  difficultyLevel?: DifficultyLevel;
  topic?: string;
  sortBy?: 'created_at' | 'priority' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// DTOs - Response
// ============================================================

export interface SyncRequest {
  id: number;
  requesterUserId: number;
  requesterName: string;
  requesterEmail?: string;
  vietnameseText: string;
  englishTranslation?: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel;
  notes?: string;
  status: SyncRequestStatus;
  priority: SyncRequestPriority;
  syncerUserId?: number;
  syncerName?: string;
  conversationId?: number;
  syncStartedAt?: string;
  syncCompletedAt?: string;
  syncNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncRequestStats {
  totalPending: number;
  totalInProgress: number;
  completedToday: number;
  completedThisWeek: number;
  myRequestsPending: number;
  myRequestsCompleted: number;
  mySyncsCompleted: number;
}

export interface PaginatedSyncRequests {
  items: SyncRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Database Row Types
// ============================================================

export interface SyncRequestRow extends RowDataPacket {
  id: number;
  requester_user_id: number;
  vietnamese_text: string;
  english_translation: string | null;
  topic: string | null;
  difficulty_level: DifficultyLevel | null;
  notes: string | null;
  status: SyncRequestStatus;
  priority: SyncRequestPriority;
  syncer_user_id: number | null;
  conversation_id: number | null;
  sync_started_at: Date | null;
  sync_completed_at: Date | null;
  sync_notes: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  requester_name?: string;
  requester_email?: string;
  syncer_name?: string;
}

export interface CountRow extends RowDataPacket {
  count: number;
}

export interface StatsRow extends RowDataPacket {
  total_pending: number;
  total_in_progress: number;
  completed_today: number;
  completed_this_week: number;
}
