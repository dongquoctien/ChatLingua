import { Router, Response } from 'express';
import { forumService } from '../services/forum.service.js';
import { reputationService } from '../services/reputation.service.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';
import {
  CreatePostDTO,
  UpdatePostDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
  ImportPostDTO,
  CreateReportDTO,
  GetPostsFilters,
  VoteType,
  DifficultyLevel,
  SortBy,
  TimePeriod,
  PostStatus,
} from '../types/forum.types.js';

const router = Router();

// ============================================================
// Public Routes (Optional Auth for user-specific data)
// ============================================================

/**
 * GET /api/forum/categories
 * Get all active categories
 */
router.get('/categories', async (_req, res: Response) => {
  try {
    const categories = await forumService.getCategories();
    res.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/categories/:slug
 * Get category by slug
 */
router.get('/categories/:slug', async (req, res: Response) => {
  try {
    const category = await forumService.getCategoryBySlug(req.params.slug);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get category';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/tags
 * Get all tags
 */
router.get('/tags', async (req, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const tags = await forumService.getTags(limit);
    res.json(tags);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get tags';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/tags/popular
 * Get popular tags (sorted by post count)
 */
router.get('/tags/popular', async (req, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const tags = await forumService.getTags(limit);
    res.json(tags);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get popular tags';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/posts
 * Get posts with filtering and pagination
 */
router.get('/posts', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const filters: GetPostsFilters = {
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)),
      categorySlug: req.query.category as string | undefined,
      tagSlug: req.query.tag as string | undefined,
      difficulty: req.query.difficulty as DifficultyLevel | undefined,
      sortBy: (req.query.sort as SortBy) || 'hot',
      period: req.query.period as TimePeriod | undefined,
      query: req.query.q as string | undefined,
    };

    const result = await forumService.getPosts(filters, req.userId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get posts';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/posts/:slug
 * Get single post by slug
 */
router.get('/posts/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const post = await forumService.getPostBySlug(req.params.slug, req.userId);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get post';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/posts/:id/comments
 * Get comments for a post
 */
router.get('/posts/:id/comments', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const comments = await forumService.getComments(postId, page, req.userId);
    res.json(comments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get comments';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/authors/:username
 * Get author profile
 */
router.get('/authors/:username', async (req, res: Response) => {
  try {
    const profile = await forumService.getAuthorProfile(req.params.username);
    if (!profile) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }
    res.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get author profile';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/leaderboard
 * Get forum leaderboard
 */
router.get('/leaderboard', async (req, res: Response) => {
  try {
    const period = (req.query.period as 'week' | 'month' | 'all') || 'all';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const leaderboard = await reputationService.getLeaderboard(period, limit);
    res.json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get leaderboard';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forum/badges
 * Get all available badges
 */
router.get('/badges', async (_req, res: Response) => {
  try {
    const badges = await reputationService.getAllBadges();
    res.json(badges);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get badges';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Authenticated Routes
// ============================================================

router.use(authMiddleware);

/**
 * POST /api/forum/posts
 * Create a new post (share conversation)
 */
router.post('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const data: CreatePostDTO = {
      conversationId: req.body.conversationId,
      title: req.body.title,
      description: req.body.description,
      categoryId: req.body.categoryId,
      tags: req.body.tags,
      includeVocabulary: req.body.includeVocabulary,
      includeGrammar: req.body.includeGrammar,
      includeExercises: req.body.includeExercises,
      isAnonymous: req.body.isAnonymous,
    };

    if (!data.conversationId) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    if (!data.title || data.title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const post = await forumService.createPost(req.userId!, data);
    res.status(201).json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create post';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/forum/posts/:id
 * Update a post
 */
router.put('/posts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const data: UpdatePostDTO = {
      title: req.body.title,
      description: req.body.description,
      categoryId: req.body.categoryId,
      tags: req.body.tags,
      allowComments: req.body.allowComments,
      isAnonymous: req.body.isAnonymous,
    };

    const post = await forumService.updatePost(req.userId!, postId, data);
    res.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update post';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/forum/posts/:id
 * Delete a post (soft delete)
 */
router.delete('/posts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    await forumService.deletePost(req.userId!, postId);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete post';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/forum/my-posts
 * Get user's own posts
 */
router.get('/my-posts', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as PostStatus | undefined;

    const result = await forumService.getMyPosts(req.userId!, page, limit, status);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get posts';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/forum/posts/:id/vote
 * Vote on a post
 */
router.post('/posts/:id/vote', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const voteType = req.body.voteType as VoteType;
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
      return;
    }

    const result = await forumService.votePost(req.userId!, postId, voteType);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/forum/posts/:id/vote
 * Remove vote from a post
 */
router.delete('/posts/:id/vote', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const result = await forumService.removeVote(req.userId!, postId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove vote';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/forum/posts/:id/comments
 * Create a comment on a post
 */
router.post('/posts/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const data: CreateCommentDTO = {
      content: req.body.content,
      parentId: req.body.parentId,
    };

    if (!data.content || data.content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await forumService.createComment(req.userId!, postId, data);
    res.status(201).json(comment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create comment';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/forum/comments/:id
 * Update a comment
 */
router.put('/comments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    const data: UpdateCommentDTO = {
      content: req.body.content,
    };

    if (!data.content || data.content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await forumService.updateComment(req.userId!, commentId, data);
    res.json(comment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update comment';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/forum/comments/:id
 * Delete a comment
 */
router.delete('/comments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    await forumService.deleteComment(req.userId!, commentId);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/forum/posts/:id/import
 * Import a post's content to user's library
 */
router.post('/posts/:id/import', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const options: ImportPostDTO = {
      importVocabulary: req.body.importVocabulary,
      importGrammar: req.body.importGrammar,
      importExercises: req.body.importExercises,
    };

    const result = await forumService.importPost(req.userId!, postId, options);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import post';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/forum/my-imports
 * Get user's imported posts
 */
router.get('/my-imports', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await forumService.getMyImports(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get imports';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/forum/posts/:id/bookmark
 * Bookmark a post
 */
router.post('/posts/:id/bookmark', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    await forumService.addBookmark(req.userId!, postId);
    res.json({ success: true, message: 'Post bookmarked' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bookmark post';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/forum/posts/:id/bookmark
 * Remove bookmark from a post
 */
router.delete('/posts/:id/bookmark', async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    await forumService.removeBookmark(req.userId!, postId);
    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove bookmark';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/forum/bookmarks
 * Get user's bookmarked posts
 */
router.get('/bookmarks', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await forumService.getBookmarks(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get bookmarks';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/forum/reports
 * Report content
 */
router.post('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const data: CreateReportDTO = {
      contentType: req.body.contentType,
      contentId: req.body.contentId,
      reason: req.body.reason,
      description: req.body.description,
    };

    if (!data.contentType || !['post', 'comment'].includes(data.contentType)) {
      res.status(400).json({ error: 'Invalid content type' });
      return;
    }

    if (!data.contentId) {
      res.status(400).json({ error: 'Content ID is required' });
      return;
    }

    if (!data.reason) {
      res.status(400).json({ error: 'Reason is required' });
      return;
    }

    await forumService.createReport(req.userId!, data);
    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit report';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/forum/stats
 * Get user's forum stats
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await reputationService.getUserForumStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

export default router;
