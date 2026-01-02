import pool from '../config/database.js';
import type { ResultSetHeader } from 'mysql2';
import { reputationService } from './reputation.service.js';
import {
  PostStatus,
  DifficultyLevel,
  VoteType,
  ContentType,
  CreatePostDTO,
  UpdatePostDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
  ImportPostDTO,
  CreateCollectionDTO,
  UpdateCollectionDTO,
  CreateReportDTO,
  GetPostsFilters,
  CategoryInfo,
  TagInfo,
  PostPreview,
  PostDetail,
  VocabularyPreview,
  GrammarPreview,
  CommentInfo,
  ImportResult,
  CollectionInfo,
  AuthorProfile,
  ForumStats,
  VoteResult,
  PaginatedPosts,
  PaginatedComments,
  PaginatedCollections,
  CategoryRow,
  TagRow,
  PostRow,
  CommentRow,
  CollectionRow,
  CountRow,
  PostContentRow,
  POSTS_PER_PAGE,
  COMMENTS_PER_PAGE,
  MAX_TITLE_LENGTH,
  MAX_TAGS_PER_POST,
  FORUM_XP_REWARDS,
} from '../types/forum.types.js';

// ============================================================
// Forum Service Class
// ============================================================

export class ForumService {
  // --------------------------------------------------------
  // Categories
  // --------------------------------------------------------

  async getCategories(): Promise<CategoryInfo[]> {
    const [rows] = await pool.execute<CategoryRow[]>(
      `SELECT * FROM forum_categories WHERE is_active = TRUE ORDER BY sort_order`
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      nameVi: row.name_vi,
      slug: row.slug,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      postCount: row.post_count,
      parentId: row.parent_id || undefined,
    }));
  }

  async getCategoryBySlug(slug: string): Promise<CategoryInfo | null> {
    const [rows] = await pool.execute<CategoryRow[]>(
      `SELECT * FROM forum_categories WHERE slug = ? AND is_active = TRUE`,
      [slug]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      nameVi: row.name_vi,
      slug: row.slug,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      postCount: row.post_count,
      parentId: row.parent_id || undefined,
    };
  }

  // --------------------------------------------------------
  // Tags
  // --------------------------------------------------------

  async getTags(limit: number = 50): Promise<TagInfo[]> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [rows] = await pool.execute<TagRow[]>(
      `SELECT * FROM forum_tags ORDER BY usage_count DESC LIMIT ${safeLimit}`
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      usageCount: row.usage_count,
    }));
  }

  async getOrCreateTag(name: string): Promise<TagInfo> {
    const slug = this.slugify(name);

    // Try to find existing tag
    const [existing] = await pool.execute<TagRow[]>(
      `SELECT * FROM forum_tags WHERE slug = ?`,
      [slug]
    );

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        name: existing[0].name,
        slug: existing[0].slug,
        usageCount: existing[0].usage_count,
      };
    }

    // Create new tag
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO forum_tags (name, slug) VALUES (?, ?)`,
      [name.trim(), slug]
    );

    return {
      id: result.insertId,
      name: name.trim(),
      slug,
      usageCount: 0,
    };
  }

  // --------------------------------------------------------
  // Posts - CRUD
  // --------------------------------------------------------

  async getPosts(filters: GetPostsFilters, userId?: number): Promise<PaginatedPosts> {
    const page = filters.page || 1;
    const limit = Math.min(100, Math.max(1, filters.limit || POSTS_PER_PAGE));
    const offset = (page - 1) * limit;

    let whereClause = `fp.status = 'published'`;
    const params: any[] = [];

    // Category filter
    if (filters.categorySlug) {
      whereClause += ` AND fc.slug = ?`;
      params.push(filters.categorySlug);
    }

    // Difficulty filter
    if (filters.difficulty) {
      whereClause += ` AND fp.difficulty_level = ?`;
      params.push(filters.difficulty);
    }

    // Author filter
    if (filters.authorId) {
      whereClause += ` AND fp.author_id = ?`;
      params.push(filters.authorId);
    }

    // Tag filter
    if (filters.tagSlug) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM forum_post_tags fpt
        JOIN forum_tags ft ON fpt.tag_id = ft.id
        WHERE fpt.post_id = fp.id AND ft.slug = ?
      )`;
      params.push(filters.tagSlug);
    }

    // Search query
    if (filters.query) {
      whereClause += ` AND MATCH(fp.title, fp.description, fp.vietnamese_text, fp.english_translation) AGAINST(? IN NATURAL LANGUAGE MODE)`;
      params.push(filters.query);
    }

    // Determine sort order
    let orderBy = 'fp.published_at DESC';
    if (filters.sortBy === 'hot') {
      orderBy = 'fp.hot_score DESC, fp.published_at DESC';
    } else if (filters.sortBy === 'top') {
      let periodCondition = '';
      switch (filters.period) {
        case 'day':
          periodCondition = `AND fp.published_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;
          break;
        case 'week':
          periodCondition = `AND fp.published_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)`;
          break;
        case 'month':
          periodCondition = `AND fp.published_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
          break;
        case 'year':
          periodCondition = `AND fp.published_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`;
          break;
      }
      if (periodCondition) {
        whereClause += ` ${periodCondition}`;
      }
      orderBy = 'fp.score DESC, fp.published_at DESC';
    }

    // Count query
    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count
       FROM forum_posts fp
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    // Add user-specific fields
    let userJoins = '';
    let userSelects = '';
    if (userId) {
      userJoins = `
        LEFT JOIN forum_votes fv ON fp.id = fv.post_id AND fv.user_id = ${userId}
        LEFT JOIN forum_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = ${userId}
        LEFT JOIN forum_imports fi ON fp.id = fi.post_id AND fi.user_id = ${userId}
      `;
      userSelects = `, fv.vote_type as user_vote, fb.id as is_bookmarked, fi.id as is_imported`;
    }

    // Data query
    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color
              ${userSelects}
       FROM forum_posts fp
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       ${userJoins}
       WHERE ${whereClause}
       ORDER BY fp.is_pinned DESC, ${orderBy}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // Get tags for each post
    const items: PostPreview[] = [];
    for (const row of rows) {
      const tags = await this.getPostTags(row.id);
      items.push(this.mapToPostPreview(row, tags));
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPostBySlug(slug: string, userId?: number): Promise<PostDetail | null> {
    // Add user-specific fields
    let userJoins = '';
    let userSelects = '';
    if (userId) {
      userJoins = `
        LEFT JOIN forum_votes fv ON fp.id = fv.post_id AND fv.user_id = ${userId}
        LEFT JOIN forum_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = ${userId}
        LEFT JOIN forum_imports fi ON fp.id = fi.post_id AND fi.user_id = ${userId}
      `;
      userSelects = `, fv.vote_type as user_vote, fb.id as is_bookmarked, fi.id as is_imported`;
    }

    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color
              ${userSelects}
       FROM forum_posts fp
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       ${userJoins}
       WHERE fp.slug = ?`,
      [slug]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const tags = await this.getPostTags(row.id);
    const vocabulary = await this.getPostVocabulary(row.id);
    const grammarPoints = await this.getPostGrammar(row.id);

    // Increment view count
    await this.incrementViewCount(row.id);

    return this.mapToPostDetail(row, tags, vocabulary, grammarPoints);
  }

  async getPostById(postId: number, userId?: number): Promise<PostDetail | null> {
    let userJoins = '';
    let userSelects = '';
    if (userId) {
      userJoins = `
        LEFT JOIN forum_votes fv ON fp.id = fv.post_id AND fv.user_id = ${userId}
        LEFT JOIN forum_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = ${userId}
        LEFT JOIN forum_imports fi ON fp.id = fi.post_id AND fi.user_id = ${userId}
      `;
      userSelects = `, fv.vote_type as user_vote, fb.id as is_bookmarked, fi.id as is_imported`;
    }

    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color
              ${userSelects}
       FROM forum_posts fp
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       ${userJoins}
       WHERE fp.id = ?`,
      [postId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const tags = await this.getPostTags(row.id);
    const vocabulary = await this.getPostVocabulary(row.id);
    const grammarPoints = await this.getPostGrammar(row.id);

    return this.mapToPostDetail(row, tags, vocabulary, grammarPoints);
  }

  async createPost(userId: number, data: CreatePostDTO): Promise<PostDetail> {
    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (data.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
    }

    // Verify conversation belongs to user
    const [convRows] = await pool.execute<any[]>(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [data.conversationId, userId]
    );

    if (convRows.length === 0) {
      throw new Error('Conversation not found or does not belong to you');
    }

    const conversation = convRows[0];

    // Check if conversation already shared
    const [existingPost] = await pool.execute<PostRow[]>(
      `SELECT id FROM forum_posts WHERE conversation_id = ? AND status != 'deleted'`,
      [data.conversationId]
    );

    if (existingPost.length > 0) {
      throw new Error('This conversation has already been shared to the forum');
    }

    // Generate slug
    const slug = await this.generateUniqueSlug(data.title);

    // Count vocabulary and grammar
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

    const [exerciseCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM exercises WHERE conversation_id = ?`,
      [data.conversationId]
    );

    // Create post
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO forum_posts (
        author_id, conversation_id, title, description, slug,
        vietnamese_text, english_translation, topic, difficulty_level,
        vocabulary_count, grammar_count, exercise_count,
        category_id, is_anonymous, status, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW())`,
      [
        userId,
        data.conversationId,
        data.title.trim(),
        data.description?.trim() || null,
        slug,
        conversation.vietnamese_text,
        conversation.english_translation,
        conversation.topic || null,
        conversation.difficulty_level || 'intermediate',
        vocabCount[0].count,
        grammarCount[0].count,
        exerciseCount[0].count,
        data.categoryId || null,
        data.isAnonymous || false,
      ]
    );

    const postId = result.insertId;

    // Add tags
    if (data.tags && data.tags.length > 0) {
      const tagsToAdd = data.tags.slice(0, MAX_TAGS_PER_POST);
      for (const tagName of tagsToAdd) {
        const tag = await this.getOrCreateTag(tagName);
        await pool.execute(
          `INSERT INTO forum_post_tags (post_id, tag_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE post_id = post_id`,
          [postId, tag.id]
        );
        await pool.execute(
          `UPDATE forum_tags SET usage_count = usage_count + 1 WHERE id = ?`,
          [tag.id]
        );
      }
    }

    // Store content snapshots if requested
    if (data.includeVocabulary !== false) {
      await this.storeVocabularySnapshot(postId, data.conversationId);
    }
    if (data.includeGrammar !== false) {
      await this.storeGrammarSnapshot(postId, data.conversationId);
    }
    if (data.includeExercises) {
      await this.storeExerciseSnapshot(postId, data.conversationId);
    }

    // Update category post count
    if (data.categoryId) {
      await pool.execute(
        `UPDATE forum_categories SET post_count = post_count + 1 WHERE id = ?`,
        [data.categoryId]
      );
    }

    // Update reputation
    await reputationService.updateReputation(userId, FORUM_XP_REWARDS.SHARE_CONVERSATION, 'post');

    // Award XP
    await reputationService.awardForumXP(userId, 'SHARE_CONVERSATION');

    const post = await this.getPostById(postId, userId);
    if (!post) {
      throw new Error('Failed to create post');
    }

    return post;
  }

  async updatePost(userId: number, postId: number, data: UpdatePostDTO): Promise<PostDetail> {
    const post = await this.getPostById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Only author can update (for now)
    const [authorCheck] = await pool.execute<PostRow[]>(
      `SELECT author_id FROM forum_posts WHERE id = ?`,
      [postId]
    );
    if (authorCheck[0].author_id !== userId) {
      throw new Error('You can only update your own posts');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      if (data.title.length > MAX_TITLE_LENGTH) {
        throw new Error(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
      }
      updates.push('title = ?');
      values.push(data.title.trim());
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description?.trim() || null);
    }

    if (data.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(data.categoryId || null);
    }

    if (data.allowComments !== undefined) {
      updates.push('allow_comments = ?');
      values.push(data.allowComments);
    }

    if (data.isAnonymous !== undefined) {
      updates.push('is_anonymous = ?');
      values.push(data.isAnonymous);
    }

    if (updates.length > 0) {
      values.push(postId);
      await pool.execute(
        `UPDATE forum_posts SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Update tags if provided
    if (data.tags !== undefined) {
      // Remove existing tags
      await pool.execute(
        `DELETE FROM forum_post_tags WHERE post_id = ?`,
        [postId]
      );

      // Add new tags
      const tagsToAdd = data.tags.slice(0, MAX_TAGS_PER_POST);
      for (const tagName of tagsToAdd) {
        const tag = await this.getOrCreateTag(tagName);
        await pool.execute(
          `INSERT INTO forum_post_tags (post_id, tag_id) VALUES (?, ?)`,
          [postId, tag.id]
        );
      }
    }

    const updated = await this.getPostById(postId, userId);
    if (!updated) {
      throw new Error('Failed to update post');
    }

    return updated;
  }

  async deletePost(userId: number, postId: number): Promise<void> {
    const [authorCheck] = await pool.execute<PostRow[]>(
      `SELECT author_id, category_id FROM forum_posts WHERE id = ?`,
      [postId]
    );

    if (authorCheck.length === 0) {
      throw new Error('Post not found');
    }

    if (authorCheck[0].author_id !== userId) {
      throw new Error('You can only delete your own posts');
    }

    // Soft delete
    await pool.execute(
      `UPDATE forum_posts SET status = 'deleted' WHERE id = ?`,
      [postId]
    );

    // Update category post count
    if (authorCheck[0].category_id) {
      await pool.execute(
        `UPDATE forum_categories SET post_count = GREATEST(0, post_count - 1) WHERE id = ?`,
        [authorCheck[0].category_id]
      );
    }
  }

  // --------------------------------------------------------
  // Posts - User's Posts
  // --------------------------------------------------------

  async getMyPosts(userId: number, page: number = 1, limit: number = 20, status?: PostStatus): Promise<PaginatedPosts> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (page - 1) * safeLimit;

    let whereClause = `fp.author_id = ? AND fp.status != 'deleted'`;
    const params: any[] = [userId];

    if (status) {
      whereClause += ` AND fp.status = ?`;
      params.push(status);
    }

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM forum_posts fp WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color
       FROM forum_posts fp
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE ${whereClause}
       ORDER BY fp.created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    const items: PostPreview[] = [];
    for (const row of rows) {
      const tags = await this.getPostTags(row.id);
      items.push(this.mapToPostPreview(row, tags));
    }

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // --------------------------------------------------------
  // Voting
  // --------------------------------------------------------

  async votePost(userId: number, postId: number, voteType: VoteType): Promise<VoteResult> {
    // Check post exists
    const [postCheck] = await pool.execute<PostRow[]>(
      `SELECT id, author_id, upvote_count, downvote_count FROM forum_posts WHERE id = ? AND status = 'published'`,
      [postId]
    );

    if (postCheck.length === 0) {
      throw new Error('Post not found');
    }

    const post = postCheck[0];

    // Can't vote on own post
    if (post.author_id === userId) {
      throw new Error('You cannot vote on your own post');
    }

    // Check existing vote
    const [existingVote] = await pool.execute<any[]>(
      `SELECT * FROM forum_votes WHERE user_id = ? AND post_id = ?`,
      [userId, postId]
    );

    let oldVoteType: VoteType | null = null;

    if (existingVote.length > 0) {
      oldVoteType = existingVote[0].vote_type;

      // If same vote, do nothing
      if (oldVoteType === voteType) {
        return {
          postId,
          upvoteCount: post.upvote_count,
          downvoteCount: post.downvote_count,
          userVote: voteType,
        };
      }

      // Update vote
      await pool.execute(
        `UPDATE forum_votes SET vote_type = ? WHERE user_id = ? AND post_id = ?`,
        [voteType, userId, postId]
      );
    } else {
      // Create new vote
      await pool.execute(
        `INSERT INTO forum_votes (user_id, post_id, vote_type) VALUES (?, ?, ?)`,
        [userId, postId, voteType]
      );
    }

    // Update post counts
    let upvoteChange = 0;
    let downvoteChange = 0;

    if (oldVoteType === 'upvote') upvoteChange = -1;
    if (oldVoteType === 'downvote') downvoteChange = -1;
    if (voteType === 'upvote') upvoteChange += 1;
    if (voteType === 'downvote') downvoteChange += 1;

    await pool.execute(
      `UPDATE forum_posts
       SET upvote_count = upvote_count + ?,
           downvote_count = downvote_count + ?,
           score = (upvote_count + ?) - (downvote_count + ?) + (import_count * 2)
       WHERE id = ?`,
      [upvoteChange, downvoteChange, upvoteChange, downvoteChange, postId]
    );

    // Update author reputation
    if (voteType === 'upvote') {
      await reputationService.updateReputation(post.author_id, FORUM_XP_REWARDS.RECEIVE_UPVOTE, 'upvote');
      await reputationService.awardForumXP(post.author_id, 'RECEIVE_UPVOTE');
    } else if (voteType === 'downvote' && !oldVoteType) {
      await reputationService.updateReputation(post.author_id, FORUM_XP_REWARDS.RECEIVE_DOWNVOTE, 'downvote');
    }

    // Get updated counts
    const [updated] = await pool.execute<PostRow[]>(
      `SELECT upvote_count, downvote_count FROM forum_posts WHERE id = ?`,
      [postId]
    );

    return {
      postId,
      upvoteCount: updated[0].upvote_count,
      downvoteCount: updated[0].downvote_count,
      userVote: voteType,
    };
  }

  async removeVote(userId: number, postId: number): Promise<{ postId: number; upvoteCount: number; downvoteCount: number }> {
    const [existingVote] = await pool.execute<any[]>(
      `SELECT * FROM forum_votes WHERE user_id = ? AND post_id = ?`,
      [userId, postId]
    );

    if (existingVote.length === 0) {
      throw new Error('No vote to remove');
    }

    const oldVoteType = existingVote[0].vote_type;

    // Delete vote
    await pool.execute(
      `DELETE FROM forum_votes WHERE user_id = ? AND post_id = ?`,
      [userId, postId]
    );

    // Update post counts
    if (oldVoteType === 'upvote') {
      await pool.execute(
        `UPDATE forum_posts SET upvote_count = GREATEST(0, upvote_count - 1), score = score - 1 WHERE id = ?`,
        [postId]
      );
    } else {
      await pool.execute(
        `UPDATE forum_posts SET downvote_count = GREATEST(0, downvote_count - 1), score = score + 1 WHERE id = ?`,
        [postId]
      );
    }

    const [updated] = await pool.execute<PostRow[]>(
      `SELECT upvote_count, downvote_count FROM forum_posts WHERE id = ?`,
      [postId]
    );

    return {
      postId,
      upvoteCount: updated[0].upvote_count,
      downvoteCount: updated[0].downvote_count,
    };
  }

  // --------------------------------------------------------
  // Comments
  // --------------------------------------------------------

  async getComments(postId: number, page: number = 1, userId?: number): Promise<PaginatedComments> {
    const limit = COMMENTS_PER_PAGE;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM forum_comments WHERE post_id = ? AND parent_id IS NULL AND is_deleted = FALSE`,
      [postId]
    );
    const total = countResult[0].count;

    let userJoins = '';
    let userSelects = '';
    if (userId) {
      userJoins = `LEFT JOIN forum_comment_votes fcv ON fc.id = fcv.comment_id AND fcv.user_id = ${userId}`;
      userSelects = `, fcv.vote_type as user_vote`;
    }

    // Get top-level comments
    const [rows] = await pool.execute<CommentRow[]>(
      `SELECT fc.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.rank as author_rank
              ${userSelects}
       FROM forum_comments fc
       LEFT JOIN users u ON fc.user_id = u.id
       LEFT JOIN forum_reputation fr ON fc.user_id = fr.user_id
       ${userJoins}
       WHERE fc.post_id = ? AND fc.parent_id IS NULL AND fc.is_deleted = FALSE
       ORDER BY fc.upvote_count DESC, fc.created_at ASC
       LIMIT ${limit} OFFSET ${offset}`,
      [postId]
    );

    const items: CommentInfo[] = [];
    for (const row of rows) {
      const comment = this.mapToCommentInfo(row);
      // Get replies
      const [replies] = await pool.execute<CommentRow[]>(
        `SELECT fc.*,
                u.username as author_username,
                u.username as author_display_name,
                NULL as author_avatar,
                fr.rank as author_rank
                ${userSelects}
         FROM forum_comments fc
         LEFT JOIN users u ON fc.user_id = u.id
         LEFT JOIN forum_reputation fr ON fc.user_id = fr.user_id
         ${userJoins}
         WHERE fc.parent_id = ? AND fc.is_deleted = FALSE
         ORDER BY fc.created_at ASC`,
        [row.id]
      );
      comment.replies = replies.map(r => this.mapToCommentInfo(r));
      items.push(comment);
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createComment(userId: number, postId: number, data: CreateCommentDTO): Promise<CommentInfo> {
    // Check post exists and allows comments
    const [postCheck] = await pool.execute<PostRow[]>(
      `SELECT id, author_id, allow_comments FROM forum_posts WHERE id = ? AND status = 'published'`,
      [postId]
    );

    if (postCheck.length === 0) {
      throw new Error('Post not found');
    }

    if (!postCheck[0].allow_comments) {
      throw new Error('Comments are disabled on this post');
    }

    // Validate parent if provided
    if (data.parentId) {
      const [parentCheck] = await pool.execute<CommentRow[]>(
        `SELECT id FROM forum_comments WHERE id = ? AND post_id = ? AND is_deleted = FALSE`,
        [data.parentId, postId]
      );
      if (parentCheck.length === 0) {
        throw new Error('Parent comment not found');
      }
    }

    // Create comment
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO forum_comments (post_id, user_id, parent_id, content)
       VALUES (?, ?, ?, ?)`,
      [postId, userId, data.parentId || null, data.content.trim()]
    );

    // Update post comment count
    await pool.execute(
      `UPDATE forum_posts SET comment_count = comment_count + 1 WHERE id = ?`,
      [postId]
    );

    // Update reputation
    await reputationService.updateReputation(userId, FORUM_XP_REWARDS.POST_COMMENT, 'comment');
    await reputationService.awardForumXP(userId, 'POST_COMMENT');

    // Notify post author
    if (postCheck[0].author_id !== userId) {
      await this.createNotification(postCheck[0].author_id, {
        notificationType: 'forum_comment',
        title: 'New Comment',
        message: 'Someone commented on your post',
        icon: 'fa-comment',
        actionUrl: `/forum/posts/${postId}`,
        metadata: {
          postId,
          commentId: result.insertId,
          commenterId: userId,
        },
      });
    }

    // Get created comment
    const [rows] = await pool.execute<CommentRow[]>(
      `SELECT fc.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.rank as author_rank
       FROM forum_comments fc
       LEFT JOIN users u ON fc.user_id = u.id
       LEFT JOIN forum_reputation fr ON fc.user_id = fr.user_id
       WHERE fc.id = ?`,
      [result.insertId]
    );

    return this.mapToCommentInfo(rows[0]);
  }

  async updateComment(userId: number, commentId: number, data: UpdateCommentDTO): Promise<CommentInfo> {
    const [commentCheck] = await pool.execute<CommentRow[]>(
      `SELECT * FROM forum_comments WHERE id = ? AND is_deleted = FALSE`,
      [commentId]
    );

    if (commentCheck.length === 0) {
      throw new Error('Comment not found');
    }

    if (commentCheck[0].user_id !== userId) {
      throw new Error('You can only edit your own comments');
    }

    await pool.execute(
      `UPDATE forum_comments SET content = ?, is_edited = TRUE WHERE id = ?`,
      [data.content.trim(), commentId]
    );

    const [rows] = await pool.execute<CommentRow[]>(
      `SELECT fc.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.rank as author_rank
       FROM forum_comments fc
       LEFT JOIN users u ON fc.user_id = u.id
       LEFT JOIN forum_reputation fr ON fc.user_id = fr.user_id
       WHERE fc.id = ?`,
      [commentId]
    );

    return this.mapToCommentInfo(rows[0]);
  }

  async deleteComment(userId: number, commentId: number): Promise<void> {
    const [commentCheck] = await pool.execute<CommentRow[]>(
      `SELECT * FROM forum_comments WHERE id = ?`,
      [commentId]
    );

    if (commentCheck.length === 0) {
      throw new Error('Comment not found');
    }

    if (commentCheck[0].user_id !== userId) {
      throw new Error('You can only delete your own comments');
    }

    // Soft delete
    await pool.execute(
      `UPDATE forum_comments SET is_deleted = TRUE WHERE id = ?`,
      [commentId]
    );

    // Update post comment count
    await pool.execute(
      `UPDATE forum_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?`,
      [commentCheck[0].post_id]
    );
  }

  // --------------------------------------------------------
  // Bookmarks
  // --------------------------------------------------------

  async addBookmark(userId: number, postId: number): Promise<void> {
    const [postCheck] = await pool.execute<PostRow[]>(
      `SELECT id FROM forum_posts WHERE id = ? AND status = 'published'`,
      [postId]
    );

    if (postCheck.length === 0) {
      throw new Error('Post not found');
    }

    await pool.execute(
      `INSERT INTO forum_bookmarks (user_id, post_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId, postId]
    );
  }

  async removeBookmark(userId: number, postId: number): Promise<void> {
    await pool.execute(
      `DELETE FROM forum_bookmarks WHERE user_id = ? AND post_id = ?`,
      [userId, postId]
    );
  }

  async getBookmarks(userId: number, page: number = 1, limit: number = 20): Promise<PaginatedPosts> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (page - 1) * safeLimit;

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count
       FROM forum_bookmarks fb
       JOIN forum_posts fp ON fb.post_id = fp.id
       WHERE fb.user_id = ? AND fp.status = 'published'`,
      [userId]
    );
    const total = countResult[0].count;

    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color,
              fv.vote_type as user_vote,
              1 as is_bookmarked,
              fi.id as is_imported
       FROM forum_bookmarks fb
       JOIN forum_posts fp ON fb.post_id = fp.id
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       LEFT JOIN forum_votes fv ON fp.id = fv.post_id AND fv.user_id = ?
       LEFT JOIN forum_imports fi ON fp.id = fi.post_id AND fi.user_id = ?
       WHERE fb.user_id = ? AND fp.status = 'published'
       ORDER BY fb.created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      [userId, userId, userId]
    );

    const items: PostPreview[] = [];
    for (const row of rows) {
      const tags = await this.getPostTags(row.id);
      items.push(this.mapToPostPreview(row, tags));
    }

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // --------------------------------------------------------
  // Import
  // --------------------------------------------------------

  async importPost(userId: number, postId: number, options: ImportPostDTO): Promise<ImportResult> {
    // Check post exists
    const post = await this.getPostById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if already imported
    const [existingImport] = await pool.execute<any[]>(
      `SELECT id FROM forum_imports WHERE user_id = ? AND post_id = ?`,
      [userId, postId]
    );

    if (existingImport.length > 0) {
      throw new Error('You have already imported this conversation');
    }

    // Can't import own post
    if (post.author?.id === userId) {
      throw new Error('You cannot import your own post');
    }

    // Create new conversation for the user
    const [convResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO conversations (user_id, vietnamese_text, english_translation, topic, difficulty_level)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, post.vietnameseText, post.englishTranslation, post.topic || null, post.difficultyLevel]
    );

    const newConversationId = convResult.insertId;
    let vocabularyImported = 0;
    let grammarImported = 0;
    let exercisesImported = 0;

    // Import vocabulary if requested
    if (options.importVocabulary !== false) {
      const [vocabContent] = await pool.execute<PostContentRow[]>(
        `SELECT * FROM forum_post_content WHERE post_id = ? AND content_type = 'vocabulary'`,
        [postId]
      );

      for (const content of vocabContent) {
        const snapshot = this.parseSnapshot(content.snapshot);
        // Create vocabulary and link to conversation
        try {
          const [vocabResult] = await pool.execute<ResultSetHeader>(
            `INSERT INTO vocabulary (
              user_id, vietnamese_word, english_word, part_of_speech, phonetic,
              pronunciation_uk, pronunciation_us, cefr_level, difficulty_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [
              userId,
              snapshot.vietnameseWord,
              snapshot.englishWord,
              snapshot.partOfSpeech,
              snapshot.phonetic || null,
              snapshot.pronunciationUk || null,
              snapshot.pronunciationUs || null,
              snapshot.cefrLevel || 'B1',
              post.difficultyLevel,
            ]
          );

          // Link to conversation
          await pool.execute(
            `INSERT INTO vocabulary_contexts (vocabulary_id, conversation_id) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE vocabulary_id = vocabulary_id`,
            [vocabResult.insertId, newConversationId]
          );

          vocabularyImported++;
        } catch (e) {
          // Skip if fails (e.g., duplicate)
        }
      }
    }

    // Import grammar if requested
    if (options.importGrammar !== false) {
      const [grammarContent] = await pool.execute<PostContentRow[]>(
        `SELECT * FROM forum_post_content WHERE post_id = ? AND content_type = 'grammar'`,
        [postId]
      );

      for (const content of grammarContent) {
        const snapshot = this.parseSnapshot(content.snapshot);
        try {
          await pool.execute(
            `INSERT INTO grammar_points (
              conversation_id, grammar_rule, explanation, category, example_en, example_vi
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              newConversationId,
              snapshot.grammarRule,
              snapshot.explanation,
              snapshot.category || null,
              snapshot.exampleEn || null,
              snapshot.exampleVi || null,
            ]
          );
          grammarImported++;
        } catch (e) {
          // Skip if fails
        }
      }
    }

    // Import exercises if requested
    if (options.importExercises) {
      const [exerciseContent] = await pool.execute<PostContentRow[]>(
        `SELECT * FROM forum_post_content WHERE post_id = ? AND content_type = 'exercise'`,
        [postId]
      );

      for (const content of exerciseContent) {
        const snapshot = this.parseSnapshot(content.snapshot);
        try {
          await pool.execute(
            `INSERT INTO exercises (
              conversation_id, exercise_type, question, correct_answer, options, explanation, exercise_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newConversationId,
              snapshot.exerciseType,
              snapshot.question,
              snapshot.correctAnswer,
              snapshot.options ? JSON.stringify(snapshot.options) : null,
              snapshot.explanation || null,
              snapshot.exerciseData ? JSON.stringify(snapshot.exerciseData) : null,
            ]
          );
          exercisesImported++;
        } catch (e) {
          // Skip if fails
        }
      }
    }

    // Record import
    await pool.execute(
      `INSERT INTO forum_imports (
        user_id, post_id, conversation_id,
        imported_vocabulary, imported_grammar, imported_exercises,
        vocabulary_imported, grammar_imported, exercises_imported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, postId, newConversationId,
        options.importVocabulary !== false,
        options.importGrammar !== false,
        options.importExercises || false,
        vocabularyImported, grammarImported, exercisesImported,
      ]
    );

    // Update post import count
    await pool.execute(
      `UPDATE forum_posts SET import_count = import_count + 1, score = score + 2 WHERE id = ?`,
      [postId]
    );

    // Update author reputation
    if (post.author) {
      await reputationService.updateReputation(post.author.id, FORUM_XP_REWARDS.CONTENT_IMPORTED, 'import');
      await reputationService.awardForumXP(post.author.id, 'CONTENT_IMPORTED');

      // Notify author
      await this.createNotification(post.author.id, {
        notificationType: 'forum_post_imported',
        title: 'Your content was imported!',
        message: `Someone imported your conversation "${post.title}"`,
        icon: 'fa-download',
        actionUrl: `/forum/posts/${post.slug}`,
        metadata: {
          postId,
          postTitle: post.title,
          importerId: userId,
        },
      });
    }

    // Award XP to importer
    const xpEarned = await reputationService.awardForumXP(userId, 'IMPORT_CONTENT');

    return {
      conversationId: newConversationId,
      vocabularyImported,
      grammarImported,
      exercisesImported,
      xpEarned,
    };
  }

  async getMyImports(userId: number, page: number = 1, limit: number = 20): Promise<PaginatedPosts> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (page - 1) * safeLimit;

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count
       FROM forum_imports fi
       JOIN forum_posts fp ON fi.post_id = fp.id
       WHERE fi.user_id = ? AND fp.status = 'published'`,
      [userId]
    );
    const total = countResult[0].count;

    const [rows] = await pool.execute<PostRow[]>(
      `SELECT fp.*,
              u.username as author_username,
              u.username as author_display_name,
              NULL as author_avatar,
              fr.reputation as author_reputation,
              fr.rank as author_rank,
              fc.name as category_name,
              fc.slug as category_slug,
              fc.icon as category_icon,
              fc.color as category_color,
              fv.vote_type as user_vote,
              fb.id as is_bookmarked,
              1 as is_imported
       FROM forum_imports fi
       JOIN forum_posts fp ON fi.post_id = fp.id
       LEFT JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_reputation fr ON fp.author_id = fr.user_id
       LEFT JOIN forum_categories fc ON fp.category_id = fc.id
       LEFT JOIN forum_votes fv ON fp.id = fv.post_id AND fv.user_id = ?
       LEFT JOIN forum_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = ?
       WHERE fi.user_id = ? AND fp.status = 'published'
       ORDER BY fi.created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      [userId, userId, userId]
    );

    const items: PostPreview[] = [];
    for (const row of rows) {
      const tags = await this.getPostTags(row.id);
      items.push(this.mapToPostPreview(row, tags));
    }

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // --------------------------------------------------------
  // Author Profile
  // --------------------------------------------------------

  async getAuthorProfile(username: string): Promise<AuthorProfile | null> {
    const [userRows] = await pool.execute<any[]>(
      `SELECT id, username, email, created_at FROM users WHERE username = ?`,
      [username]
    );

    if (userRows.length === 0) return null;

    const user = userRows[0];
    const stats = await reputationService.getUserForumStats(user.id);
    const recentPosts = await this.getPosts({ authorId: user.id, limit: 5 });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.username,
        avatar: undefined,
        bio: undefined,
        createdAt: user.created_at.toISOString(),
      },
      reputation: {
        score: stats.reputation,
        rank: stats.rank,
        totalPosts: stats.totalPosts,
        totalImports: stats.totalImportsReceived,
        totalUpvotes: stats.totalUpvotesReceived,
        badges: stats.badges,
      },
      recentPosts: recentPosts.items,
    };
  }

  // --------------------------------------------------------
  // Reports
  // --------------------------------------------------------

  async createReport(userId: number, data: CreateReportDTO): Promise<void> {
    await pool.execute(
      `INSERT INTO forum_reports (reporter_id, content_type, content_id, reason, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, data.contentType, data.contentId, data.reason, data.description || null]
    );
  }

  // --------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------

  private async getPostTags(postId: number): Promise<TagInfo[]> {
    const [rows] = await pool.execute<TagRow[]>(
      `SELECT ft.* FROM forum_tags ft
       JOIN forum_post_tags fpt ON ft.id = fpt.tag_id
       WHERE fpt.post_id = ?`,
      [postId]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      usageCount: row.usage_count,
    }));
  }

  private parseSnapshot(snapshot: string | object): Record<string, any> {
    if (typeof snapshot === 'string') {
      return JSON.parse(snapshot);
    }
    return snapshot as Record<string, any>;
  }

  private async getPostVocabulary(postId: number): Promise<VocabularyPreview[]> {
    const [rows] = await pool.execute<PostContentRow[]>(
      `SELECT * FROM forum_post_content WHERE post_id = ? AND content_type = 'vocabulary'`,
      [postId]
    );

    return rows.map(row => {
      const snapshot = this.parseSnapshot(row.snapshot);
      return {
        id: row.content_id,
        vietnameseWord: snapshot.vietnameseWord,
        englishWord: snapshot.englishWord,
        partOfSpeech: snapshot.partOfSpeech,
        phonetic: snapshot.phonetic,
      };
    });
  }

  private async getPostGrammar(postId: number): Promise<GrammarPreview[]> {
    const [rows] = await pool.execute<PostContentRow[]>(
      `SELECT * FROM forum_post_content WHERE post_id = ? AND content_type = 'grammar'`,
      [postId]
    );

    return rows.map(row => {
      const snapshot = this.parseSnapshot(row.snapshot);
      return {
        id: row.content_id,
        grammarRule: snapshot.grammarRule,
        explanation: snapshot.explanation,
        category: snapshot.category,
      };
    });
  }

  private async storeVocabularySnapshot(postId: number, conversationId: number): Promise<void> {
    const [vocabRows] = await pool.execute<any[]>(
      `SELECT v.* FROM vocabulary v
       JOIN vocabulary_contexts vc ON v.id = vc.vocabulary_id
       WHERE vc.conversation_id = ?`,
      [conversationId]
    );

    for (const vocab of vocabRows) {
      const snapshot = {
        vietnameseWord: vocab.vietnamese_word,
        englishWord: vocab.english_word,
        partOfSpeech: vocab.part_of_speech,
        phonetic: vocab.phonetic,
        pronunciationUk: vocab.pronunciation_uk,
        pronunciationUs: vocab.pronunciation_us,
        cefrLevel: vocab.cefr_level,
      };

      await pool.execute(
        `INSERT INTO forum_post_content (post_id, content_type, content_id, snapshot)
         VALUES (?, 'vocabulary', ?, ?)`,
        [postId, vocab.id, JSON.stringify(snapshot)]
      );
    }
  }

  private async storeGrammarSnapshot(postId: number, conversationId: number): Promise<void> {
    const [grammarRows] = await pool.execute<any[]>(
      `SELECT * FROM grammar_points WHERE conversation_id = ?`,
      [conversationId]
    );

    for (const grammar of grammarRows) {
      const snapshot = {
        grammarRule: grammar.grammar_rule,
        explanation: grammar.explanation,
        category: grammar.category,
        exampleEn: grammar.example_en,
        exampleVi: grammar.example_vi,
      };

      await pool.execute(
        `INSERT INTO forum_post_content (post_id, content_type, content_id, snapshot)
         VALUES (?, 'grammar', ?, ?)`,
        [postId, grammar.id, JSON.stringify(snapshot)]
      );
    }
  }

  private async storeExerciseSnapshot(postId: number, conversationId: number): Promise<void> {
    const [exerciseRows] = await pool.execute<any[]>(
      `SELECT * FROM exercises WHERE conversation_id = ?`,
      [conversationId]
    );

    for (const exercise of exerciseRows) {
      const snapshot = {
        exerciseType: exercise.exercise_type,
        question: exercise.question,
        correctAnswer: exercise.correct_answer,
        options: exercise.options ? JSON.parse(exercise.options) : null,
        explanation: exercise.explanation,
        exerciseData: exercise.exercise_data ? JSON.parse(exercise.exercise_data) : null,
      };

      await pool.execute(
        `INSERT INTO forum_post_content (post_id, content_type, content_id, snapshot)
         VALUES (?, 'exercise', ?, ?)`,
        [postId, exercise.id, JSON.stringify(snapshot)]
      );
    }
  }

  private async incrementViewCount(postId: number): Promise<void> {
    await pool.execute(
      `UPDATE forum_posts SET view_count = view_count + 1 WHERE id = ?`,
      [postId]
    );
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const [existing] = await pool.execute<PostRow[]>(
        `SELECT id FROM forum_posts WHERE slug = ?`,
        [slug]
      );

      if (existing.length === 0) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .substring(0, 200);
  }

  private mapToPostPreview(row: PostRow, tags: TagInfo[]): PostPreview {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description || undefined,
      vietnameseTextPreview: row.vietnamese_text.substring(0, 200) + (row.vietnamese_text.length > 200 ? '...' : ''),

      author: row.is_anonymous ? null : {
        id: row.author_id,
        username: row.author_username || 'Unknown',
        displayName: row.author_display_name || row.author_username || 'Unknown',
        avatar: row.author_avatar || undefined,
        reputation: row.author_reputation || 0,
        rank: row.author_rank || 'newcomer',
      },

      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name || '',
        slug: row.category_slug || '',
        icon: row.category_icon || undefined,
        color: row.category_color || undefined,
      } : undefined,

      tags,

      difficultyLevel: row.difficulty_level,
      vocabularyCount: row.vocabulary_count,
      grammarCount: row.grammar_count,
      exerciseCount: row.exercise_count,

      upvoteCount: row.upvote_count,
      downvoteCount: row.downvote_count,
      commentCount: row.comment_count,
      importCount: row.import_count,
      viewCount: row.view_count,

      userVote: row.user_vote || null,
      isBookmarked: !!row.is_bookmarked,
      isImported: !!row.is_imported,

      isFeatured: row.is_featured,
      isPinned: row.is_pinned,

      createdAt: row.created_at.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    };
  }

  private mapToPostDetail(row: PostRow, tags: TagInfo[], vocabulary: VocabularyPreview[], grammarPoints: GrammarPreview[]): PostDetail {
    return {
      ...this.mapToPostPreview(row, tags),
      vietnameseText: row.vietnamese_text,
      englishTranslation: row.english_translation,
      topic: row.topic || undefined,
      vocabulary,
      grammarPoints,
      allowComments: row.allow_comments,
      status: row.status,
    };
  }

  private mapToCommentInfo(row: CommentRow): CommentInfo {
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      parentId: row.parent_id || undefined,
      content: row.content,
      upvoteCount: row.upvote_count,
      isEdited: row.is_edited,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      author: {
        id: row.user_id,
        username: row.author_username || 'Unknown',
        displayName: row.author_display_name || row.author_username || 'Unknown',
        avatar: row.author_avatar || undefined,
        rank: row.author_rank || 'newcomer',
      },
      userVote: row.user_vote || null,
    };
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
}

export const forumService = new ForumService();
