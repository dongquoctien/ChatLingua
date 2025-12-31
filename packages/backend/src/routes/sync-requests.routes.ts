import { Router, Response } from 'express';
import { syncRequestService } from '../services/sync-request.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  CreateSyncRequestDTO,
  UpdateSyncRequestDTO,
  SyncRequestStatus,
  SyncRequestFilters,
} from '../types/sync-request.types.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// User Routes - Manage Own Requests
// ============================================================

/**
 * POST /api/sync-requests
 * Create a new sync request
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data: CreateSyncRequestDTO = {
      vietnameseText: req.body.vietnameseText,
      englishTranslation: req.body.englishTranslation,
      topic: req.body.topic,
      difficultyLevel: req.body.difficultyLevel,
      notes: req.body.notes,
      priority: req.body.priority,
    };

    if (!data.vietnameseText || data.vietnameseText.trim().length === 0) {
      res.status(400).json({ error: 'Vietnamese text is required' });
      return;
    }

    const request = await syncRequestService.createRequest(req.userId!, data);
    res.status(201).json(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create sync request';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/sync-requests/my
 * Get user's own requests
 */
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const status = req.query.status as SyncRequestStatus | undefined;

    const result = await syncRequestService.getMyRequests(req.userId!, page, limit, status);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sync requests';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/sync-requests/stats
 * Get sync request statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await syncRequestService.getStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/sync-requests/pending
 * Get all pending requests (for helpers)
 */
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const filters: SyncRequestFilters = {};
    if (req.query.priority) {
      filters.priority = req.query.priority as any;
    }
    if (req.query.difficultyLevel) {
      filters.difficultyLevel = req.query.difficultyLevel as any;
    }
    if (req.query.topic) {
      filters.topic = req.query.topic as string;
    }
    if (req.query.sortBy) {
      filters.sortBy = req.query.sortBy as any;
    }
    if (req.query.sortOrder) {
      filters.sortOrder = req.query.sortOrder as any;
    }

    const result = await syncRequestService.getPendingRequests(page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pending requests';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/sync-requests/:id
 * Get a specific request
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const request = await syncRequestService.getRequestById(requestId);
    if (!request) {
      res.status(404).json({ error: 'Sync request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sync request';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/sync-requests/:id
 * Update a pending request (owner only)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const data: UpdateSyncRequestDTO = {
      vietnameseText: req.body.vietnameseText,
      englishTranslation: req.body.englishTranslation,
      topic: req.body.topic,
      difficultyLevel: req.body.difficultyLevel,
      notes: req.body.notes,
    };

    await syncRequestService.updateRequest(req.userId!, requestId, data);
    const updated = await syncRequestService.getRequestById(requestId);
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update sync request';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/sync-requests/:id
 * Cancel a pending request (owner only)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    await syncRequestService.cancelRequest(req.userId!, requestId);
    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel sync request';
    res.status(400).json({ error: message });
  }
});

// ============================================================
// Helper Routes - Sync Requests
// ============================================================

/**
 * POST /api/sync-requests/:id/start
 * Start syncing a request (claim it)
 */
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const request = await syncRequestService.startSync(req.userId!, requestId);
    res.json(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start sync';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/sync-requests/:id/complete
 * Complete syncing a request
 */
router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const conversationId = parseInt(req.body.conversationId);
    if (isNaN(conversationId)) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    await syncRequestService.completeSync(req.userId!, requestId, {
      conversationId,
      notes: req.body.notes,
    });

    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete sync';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/sync-requests/:id/cancel-sync
 * Cancel an in-progress sync (return to pending)
 */
router.post('/:id/cancel-sync', async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    await syncRequestService.cancelSync(req.userId!, requestId);
    res.json({ success: true, message: 'Sync cancelled, request returned to pending' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel sync';
    res.status(400).json({ error: message });
  }
});

export default router;
