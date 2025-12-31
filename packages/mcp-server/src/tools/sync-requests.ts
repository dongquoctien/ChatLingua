import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// =============================================================================
// GET PENDING SYNC REQUESTS TOOL
// =============================================================================

export const getPendingSyncRequestsTool: Tool = {
  name: 'get_pending_sync_requests',
  description: `[SYNC-REQUEST] Get pending sync requests that helpers can claim.

Returns a list of sync requests with status 'pending', including the user's own requests.

=== PARAMETERS ===
- limit: Max requests to return (default: 20)
- priority: Filter by priority (low, normal, high)
- difficultyLevel: Filter by difficulty (beginner, intermediate, advanced)

=== RETURNS ===
- requests: Array of pending sync requests with requester info
- total: Total count of pending requests`,
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum requests to return (default: 20)',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high'],
        description: 'Filter by priority',
      },
      difficultyLevel: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Filter by difficulty level',
      },
    },
    required: [],
  },
};

const getPendingInputSchema = z.object({
  _resolvedUserId: z.number().optional(),
  limit: z.number().min(1).max(50).optional().default(20),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

interface SyncRequestRow extends RowDataPacket {
  id: number;
  requester_user_id: number;
  syncer_user_id: number | null;
  vietnamese_text: string;
  topic: string | null;
  difficulty_level: string | null;
  priority: string;
  status: string;
  conversation_id: number | null;
  sync_notes: string | null;
  created_at: Date;
  updated_at: Date;
  sync_completed_at: Date | null;
  requester_username: string;
  requester_nickname: string | null;
}

interface SyncRequest {
  id: number;
  requesterUserId: number;
  syncerUserId: number | null;
  vietnameseText: string;
  topic: string | null;
  difficultyLevel: string | null;
  priority: string;
  status: string;
  conversationId: number | null;
  syncNotes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  requester: {
    id: number;
    username: string;
    nickname: string | null;
  };
}

export async function getPendingSyncRequests(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  requests: SyncRequest[];
  total: number;
  message: string;
}> {
  const input = getPendingInputSchema.parse(args);
  const effectiveUserId = input._resolvedUserId ?? 1;

  // Build WHERE conditions (include own requests)
  const conditions: string[] = ["sr.status = 'pending'"];
  const params: unknown[] = [];

  if (input.priority) {
    conditions.push('sr.priority = ?');
    params.push(input.priority);
  }

  if (input.difficultyLevel) {
    conditions.push('sr.difficulty_level = ?');
    params.push(input.difficultyLevel);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM sync_requests sr WHERE ${whereClause}`,
    params
  );
  const total = Number(countRows[0].total);

  // Get requests
  const rows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE ${whereClause}
     ORDER BY
       FIELD(sr.priority, 'high', 'normal', 'low'),
       sr.created_at ASC
     LIMIT ?`,
    [...params, input.limit]
  );

  const requests: SyncRequest[] = rows.map((row) => ({
    id: row.id,
    requesterUserId: row.requester_user_id,
    syncerUserId: row.syncer_user_id,
    vietnameseText: row.vietnamese_text,
    topic: row.topic,
    difficultyLevel: row.difficulty_level,
    priority: row.priority,
    status: row.status,
    conversationId: row.conversation_id,
    syncNotes: row.sync_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.sync_completed_at?.toISOString() ?? null,
    requester: {
      id: row.requester_user_id,
      username: row.requester_username,
      nickname: row.requester_nickname,
    },
  }));

  return {
    success: true,
    requests,
    total,
    message: total > 0
      ? `Found ${total} pending sync request(s). Use start_sync_request to claim one.`
      : 'No pending sync requests available.',
  };
}

// =============================================================================
// GET SYNC REQUEST DETAIL TOOL
// =============================================================================

export const getSyncRequestDetailTool: Tool = {
  name: 'get_sync_request_detail',
  description: `[SYNC-REQUEST] Get detailed information about a specific sync request.

Returns full details of a sync request including requester info and sync history.

=== PARAMETERS ===
- requestId: The sync request ID (required)

=== RETURNS ===
- request: Full sync request details`,
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'number',
        description: 'Sync request ID',
      },
    },
    required: ['requestId'],
  },
};

const getDetailInputSchema = z.object({
  _resolvedUserId: z.number().optional(),
  requestId: z.number(),
});

export async function getSyncRequestDetail(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  request: SyncRequest | null;
  canStart: boolean;
  canComplete: boolean;
  message: string;
}> {
  const input = getDetailInputSchema.parse(args);
  const effectiveUserId = input._resolvedUserId ?? 1;

  const rows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE sr.id = ?`,
    [input.requestId]
  );

  if (rows.length === 0) {
    return {
      success: false,
      request: null,
      canStart: false,
      canComplete: false,
      message: 'Sync request not found.',
    };
  }

  const row = rows[0];
  const request: SyncRequest = {
    id: row.id,
    requesterUserId: row.requester_user_id,
    syncerUserId: row.syncer_user_id,
    vietnameseText: row.vietnamese_text,
    topic: row.topic,
    difficultyLevel: row.difficulty_level,
    priority: row.priority,
    status: row.status,
    conversationId: row.conversation_id,
    syncNotes: row.sync_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.sync_completed_at?.toISOString() ?? null,
    requester: {
      id: row.requester_user_id,
      username: row.requester_username,
      nickname: row.requester_nickname,
    },
  };

  // Check permissions
  const isSyncer = row.syncer_user_id === effectiveUserId;
  const canStart = row.status === 'pending';
  const canComplete = isSyncer && row.status === 'in_progress';

  return {
    success: true,
    request,
    canStart,
    canComplete,
    message: `Request #${row.id} - Status: ${row.status}`,
  };
}

// =============================================================================
// START SYNC REQUEST TOOL
// =============================================================================

export const startSyncRequestTool: Tool = {
  name: 'start_sync_request',
  description: `[SYNC-REQUEST] Claim and start working on a sync request.

When you start a sync request, you become the "syncer" and the request status changes to "in_progress".
You are then responsible for:
1. Analyzing the Vietnamese text using analyze_conversation
2. Completing the sync with complete_sync_request

=== PARAMETERS ===
- requestId: The sync request ID to start (required)

=== RETURNS ===
- request: Updated sync request with your assignment`,
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'number',
        description: 'Sync request ID to start',
      },
    },
    required: ['requestId'],
  },
};

const startInputSchema = z.object({
  _resolvedUserId: z.number().optional(),
  requestId: z.number(),
});

export async function startSyncRequest(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  request: SyncRequest | null;
  message: string;
}> {
  const input = startInputSchema.parse(args);
  const effectiveUserId = input._resolvedUserId ?? 1;

  // Check if request exists and is pending
  const rows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE sr.id = ?`,
    [input.requestId]
  );

  if (rows.length === 0) {
    return {
      success: false,
      request: null,
      message: 'Sync request not found.',
    };
  }

  const row = rows[0];

  if (row.status !== 'pending') {
    return {
      success: false,
      request: null,
      message: `Cannot start: request is already ${row.status}.`,
    };
  }

  // Update request
  await db.execute(
    `UPDATE sync_requests
     SET syncer_user_id = ?, status = 'in_progress', sync_started_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [effectiveUserId, input.requestId]
  );

  // Get syncer name for notification
  const syncerRows = await db.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE id = ?`,
    [effectiveUserId]
  );
  const syncerName = syncerRows[0]?.username || 'A helper';

  // Create notification for requester
  await db.execute(
    `INSERT INTO notification_queue
     (user_id, notification_type, title, message, icon, action_url, metadata)
     VALUES (?, 'sync_started', ?, ?, ?, ?, ?)`,
    [
      row.requester_user_id,
      'Sync Started',
      `${syncerName} has started syncing your conversation request`,
      'fa-sync',
      `/sync-requests/${input.requestId}`,
      JSON.stringify({
        requestId: input.requestId,
        syncerName,
        startedAt: new Date().toISOString(),
      }),
    ]
  );

  // Get updated request
  const updatedRows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE sr.id = ?`,
    [input.requestId]
  );

  const updated = updatedRows[0];
  const request: SyncRequest = {
    id: updated.id,
    requesterUserId: updated.requester_user_id,
    syncerUserId: updated.syncer_user_id,
    vietnameseText: updated.vietnamese_text,
    topic: updated.topic,
    difficultyLevel: updated.difficulty_level,
    priority: updated.priority,
    status: updated.status,
    conversationId: updated.conversation_id,
    syncNotes: updated.sync_notes,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    completedAt: updated.sync_completed_at?.toISOString() ?? null,
    requester: {
      id: updated.requester_user_id,
      username: updated.requester_username,
      nickname: updated.requester_nickname,
    },
  };

  return {
    success: true,
    request,
    message: `Started sync request #${input.requestId}. Now analyze the Vietnamese text using analyze_conversation with syncRequestId: ${input.requestId}`,
  };
}

// =============================================================================
// COMPLETE SYNC REQUEST TOOL
// =============================================================================

export const completeSyncRequestTool: Tool = {
  name: 'complete_sync_request',
  description: `[SYNC-REQUEST] Complete a sync request after creating the conversation.

Call this after using analyze_conversation to mark the sync request as completed.
The conversation ID from analyze_conversation will be linked to the request.

=== PARAMETERS ===
- requestId: The sync request ID (required)
- conversationId: The conversation ID created (required)
- syncNotes: Optional notes about the sync

=== RETURNS ===
- request: Completed sync request
- nextStep: If vocabulary exists, contains guidance to generate exercises

=== IMPORTANT: NEXT STEP ===
After this tool completes successfully, CHECK the nextStep field!
If vocabulary was created, you MUST call generate_exercises with the conversationId
to complete the learning flow. This creates practice exercises for the user.`,
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'number',
        description: 'Sync request ID to complete',
      },
      conversationId: {
        type: 'number',
        description: 'Conversation ID created from analyze_conversation',
      },
      syncNotes: {
        type: 'string',
        description: 'Optional notes about the sync',
      },
    },
    required: ['requestId', 'conversationId'],
  },
};

const completeInputSchema = z.object({
  _resolvedUserId: z.number().optional(),
  requestId: z.number(),
  conversationId: z.number(),
  syncNotes: z.string().optional(),
});

export async function completeSyncRequest(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  request: SyncRequest | null;
  conversationId?: number;
  vocabularyCount?: number;
  grammarCount?: number;
  message: string;
  nextStep?: {
    action: string;
    description: string;
    conversationIds: number[];
    vocabularyCount: number;
    grammarCount: number;
  } | null;
}> {
  const input = completeInputSchema.parse(args);
  const effectiveUserId = input._resolvedUserId ?? 1;

  // Check if request exists and is in_progress
  const rows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE sr.id = ?`,
    [input.requestId]
  );

  if (rows.length === 0) {
    return {
      success: false,
      request: null,
      message: 'Sync request not found.',
    };
  }

  const row = rows[0];

  if (row.syncer_user_id !== effectiveUserId) {
    return {
      success: false,
      request: null,
      message: 'Only the assigned syncer can complete this request.',
    };
  }

  if (row.status !== 'in_progress') {
    return {
      success: false,
      request: null,
      message: `Cannot complete: request is ${row.status}.`,
    };
  }

  // Verify conversation exists and belongs to requester
  const convRows = await db.query<RowDataPacket[]>(
    'SELECT id, user_id FROM conversations WHERE id = ?',
    [input.conversationId]
  );

  if (convRows.length === 0) {
    return {
      success: false,
      request: null,
      message: `Conversation #${input.conversationId} not found.`,
    };
  }

  if (convRows[0].user_id !== row.requester_user_id) {
    return {
      success: false,
      request: null,
      message: `Conversation must belong to the requester.`,
    };
  }

  // Update request
  await db.execute(
    `UPDATE sync_requests
     SET status = 'completed', conversation_id = ?, sync_notes = ?,
         sync_completed_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [input.conversationId, input.syncNotes || null, input.requestId]
  );

  // Get vocabulary and grammar counts for notification
  const vocabCountRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT vc.vocabulary_id) as count
     FROM vocabulary_contexts vc
     WHERE vc.conversation_id = ?`,
    [input.conversationId]
  );
  const vocabularyCount = Number(vocabCountRows[0]?.count || 0);

  const grammarCountRows = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM grammar_points WHERE conversation_id = ?`,
    [input.conversationId]
  );
  const grammarCount = Number(grammarCountRows[0]?.count || 0);

  // Get syncer name
  const syncerRows = await db.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE id = ?`,
    [effectiveUserId]
  );
  const syncerName = syncerRows[0]?.username || 'A helper';

  // Create notification for requester
  await db.execute(
    `INSERT INTO notification_queue
     (user_id, notification_type, title, message, icon, action_url, metadata)
     VALUES (?, 'sync_completed', ?, ?, ?, ?, ?)`,
    [
      row.requester_user_id,
      'Sync Complete!',
      `${syncerName} has completed syncing your conversation`,
      'fa-check-circle',
      `/conversations/${input.conversationId}`,
      JSON.stringify({
        requestId: input.requestId,
        conversationId: input.conversationId,
        syncerName,
        completedAt: new Date().toISOString(),
        vocabularyCount,
        grammarCount,
      }),
    ]
  );

  // Get updated request
  const updatedRows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*, u.username as requester_username, u.nickname as requester_nickname
     FROM sync_requests sr
     JOIN users u ON sr.requester_user_id = u.id
     WHERE sr.id = ?`,
    [input.requestId]
  );

  const updated = updatedRows[0];
  const request: SyncRequest = {
    id: updated.id,
    requesterUserId: updated.requester_user_id,
    syncerUserId: updated.syncer_user_id,
    vietnameseText: updated.vietnamese_text,
    topic: updated.topic,
    difficultyLevel: updated.difficulty_level,
    priority: updated.priority,
    status: updated.status,
    conversationId: updated.conversation_id,
    syncNotes: updated.sync_notes,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    completedAt: updated.sync_completed_at?.toISOString() ?? null,
    requester: {
      id: updated.requester_user_id,
      username: updated.requester_username,
      nickname: updated.requester_nickname,
    },
  };

  return {
    success: true,
    request,
    conversationId: input.conversationId,
    vocabularyCount,
    grammarCount,
    message: `Sync request #${input.requestId} completed! The requester will now have access to the conversation and vocabulary.`,
    nextStep: vocabularyCount > 0
      ? {
          action: 'generate_exercises',
          description: `IMPORTANT: Now generate exercises for conversation #${input.conversationId} to complete the learning flow. Use generate_exercises tool with conversationIds: [${input.conversationId}].`,
          conversationIds: [input.conversationId],
          vocabularyCount,
          grammarCount,
        }
      : null,
  };
}

// =============================================================================
// SYNC ALL PENDING REQUESTS TOOL (Batch processing)
// =============================================================================

export const syncAllPendingRequestsTool: Tool = {
  name: 'sync_all_pending_requests',
  description: `[SYNC-REQUEST] Process multiple pending sync requests in batch.

This tool helps you efficiently process multiple sync requests:
1. Gets all pending requests (up to limit)
2. Returns the Vietnamese text for each to analyze
3. After analyzing each, call complete_sync_request

=== PARAMETERS ===
- limit: Max requests to process (default: 5)
- priority: Filter by priority

=== RETURNS ===
- requests: Array of pending requests ready to process
- instructions: Step-by-step guide for batch processing`,
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum requests to process (default: 5)',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high'],
        description: 'Filter by priority',
      },
    },
    required: [],
  },
};

const syncAllInputSchema = z.object({
  _resolvedUserId: z.number().optional(),
  limit: z.number().min(1).max(10).optional().default(5),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export async function syncAllPendingRequests(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  requests: Array<{
    id: number;
    vietnameseText: string;
    topic: string | null;
    difficultyLevel: string | null;
    priority: string;
    requesterUserId: number;
  }>;
  instructions: string[];
  message: string;
}> {
  const input = syncAllInputSchema.parse(args);

  // Build WHERE conditions (include own requests)
  const conditions: string[] = ["sr.status = 'pending'"];
  const params: unknown[] = [];

  if (input.priority) {
    conditions.push('sr.priority = ?');
    params.push(input.priority);
  }

  const whereClause = conditions.join(' AND ');

  // Get pending requests
  const rows = await db.query<SyncRequestRow[]>(
    `SELECT sr.*
     FROM sync_requests sr
     WHERE ${whereClause}
     ORDER BY FIELD(sr.priority, 'high', 'normal', 'low'), sr.created_at ASC
     LIMIT ?`,
    [...params, input.limit]
  );

  if (rows.length === 0) {
    return {
      success: true,
      requests: [],
      instructions: [],
      message: 'No pending sync requests available.',
    };
  }

  const requests = rows.map((row) => ({
    id: row.id,
    vietnameseText: row.vietnamese_text,
    topic: row.topic,
    difficultyLevel: row.difficulty_level,
    priority: row.priority,
    requesterUserId: row.requester_user_id,
  }));

  const instructions = [
    `Found ${rows.length} pending request(s) to process.`,
    '',
    'FOR EACH REQUEST:',
    '1. Call start_sync_request with the requestId',
    '2. Call analyze_conversation with:',
    '   - vietnameseText: The text from the request',
    '   - userId: The requesterUserId (IMPORTANT: not your own ID)',
    '   - syncRequestId: The request ID',
    '3. Call complete_sync_request with:',
    '   - requestId: The sync request ID',
    '   - conversationId: From analyze_conversation response',
    '',
    'IMPORTANT: Create conversations for the REQUESTER, not yourself!',
  ];

  return {
    success: true,
    requests,
    instructions,
    message: `Ready to process ${rows.length} request(s). Follow the instructions to complete each one.`,
  };
}
