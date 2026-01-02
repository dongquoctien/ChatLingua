import type { RowDataPacket } from 'mysql2';

// ============================================================
// Enums & Constants
// ============================================================

export type PostStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'hidden' | 'deleted';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type VoteType = 'upvote' | 'downvote';
export type ContentType = 'vocabulary' | 'grammar' | 'exercise';
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'misinformation' | 'duplicate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ForumRank = 'newcomer' | 'contributor' | 'active_contributor' | 'trusted_contributor' | 'expert' | 'master' | 'legend';
export type SortBy = 'hot' | 'new' | 'top';
export type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_TAGS_PER_POST = 10;
export const POSTS_PER_PAGE = 20;
export const COMMENTS_PER_PAGE = 20;

// Reputation thresholds for ranks
export const RANK_THRESHOLDS: Record<ForumRank, number> = {
  newcomer: 0,
  contributor: 51,
  active_contributor: 201,
  trusted_contributor: 501,
  expert: 1001,
  master: 2501,
  legend: 5001,
};

// XP rewards for forum actions
export const FORUM_XP_REWARDS = {
  SHARE_CONVERSATION: 20,
  RECEIVE_UPVOTE: 5,
  RECEIVE_DOWNVOTE: -2,
  CONTENT_IMPORTED: 10,
  IMPORT_CONTENT: 5,
  POST_COMMENT: 2,
  FIRST_COMMENT: 5,
};

// ============================================================
// DTOs - Request
// ============================================================

export interface CreatePostDTO {
  conversationId: number;
  title: string;
  description?: string;
  categoryId?: number;
  tags?: string[];
  includeVocabulary?: boolean;
  includeGrammar?: boolean;
  includeExercises?: boolean;
  isAnonymous?: boolean;
}

export interface UpdatePostDTO {
  title?: string;
  description?: string;
  categoryId?: number;
  tags?: string[];
  allowComments?: boolean;
  isAnonymous?: boolean;
}

export interface CreateCommentDTO {
  content: string;
  parentId?: number;
}

export interface UpdateCommentDTO {
  content: string;
}

export interface ImportPostDTO {
  importVocabulary?: boolean;
  importGrammar?: boolean;
  importExercises?: boolean;
}

export interface CreateCollectionDTO {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCollectionDTO {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface CreateReportDTO {
  contentType: 'post' | 'comment';
  contentId: number;
  reason: ReportReason;
  description?: string;
}

export interface GetPostsFilters {
  page?: number;
  limit?: number;
  categorySlug?: string;
  tagSlug?: string;
  difficulty?: DifficultyLevel;
  sortBy?: SortBy;
  period?: TimePeriod;
  authorId?: number;
  status?: PostStatus;
  query?: string;
}

// ============================================================
// DTOs - Response
// ============================================================

export interface CategoryInfo {
  id: number;
  name: string;
  nameVi: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  postCount: number;
  parentId?: number;
}

export interface TagInfo {
  id: number;
  name: string;
  slug: string;
  usageCount: number;
}

export interface AuthorInfo {
  id: number;
  username: string;
  displayName: string;
  avatar?: string;
  reputation: number;
  rank: ForumRank;
}

export interface PostPreview {
  id: number;
  slug: string;
  title: string;
  description?: string;
  vietnameseTextPreview: string;

  author: AuthorInfo | null;

  category?: {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  };

  tags: TagInfo[];

  difficultyLevel: DifficultyLevel;
  vocabularyCount: number;
  grammarCount: number;
  exerciseCount: number;

  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  importCount: number;
  viewCount: number;

  userVote?: VoteType | null;
  isBookmarked?: boolean;
  isImported?: boolean;

  isFeatured: boolean;
  isPinned: boolean;

  createdAt: string;
  publishedAt?: string;
}

export interface PostDetail extends PostPreview {
  vietnameseText: string;
  englishTranslation: string;
  topic?: string;

  vocabulary: VocabularyPreview[];
  grammarPoints: GrammarPreview[];

  allowComments: boolean;
  status: PostStatus;
}

export interface VocabularyPreview {
  id: number;
  vietnameseWord: string;
  englishWord: string;
  partOfSpeech: string;
  phonetic?: string;
}

export interface GrammarPreview {
  id: number;
  grammarRule: string;
  explanation: string;
  category?: string;
}

export interface CommentInfo {
  id: number;
  postId: number;
  userId: number;
  parentId?: number;
  content: string;
  upvoteCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    displayName: string;
    avatar?: string;
    rank: ForumRank;
  };
  replies?: CommentInfo[];
  userVote?: VoteType | null;
}

export interface ImportResult {
  conversationId: number;
  vocabularyImported: number;
  grammarImported: number;
  exercisesImported: number;
  xpEarned: number;
}

export interface CollectionInfo {
  id: number;
  name: string;
  description?: string;
  slug: string;
  isPublic: boolean;

  owner: {
    id: number;
    username: string;
    displayName: string;
    avatar?: string;
  };

  postCount: number;
  followerCount: number;

  isFollowing?: boolean;
  isOwner?: boolean;

  posts?: PostPreview[];

  createdAt: string;
  updatedAt: string;
}

export interface AuthorProfile {
  user: {
    id: number;
    username: string;
    displayName: string;
    avatar?: string;
    bio?: string;
    createdAt: string;
  };

  reputation: {
    score: number;
    rank: ForumRank;
    totalPosts: number;
    totalImports: number;
    totalUpvotes: number;
    badges: BadgeInfo[];
  };

  recentPosts: PostPreview[];
}

export interface BadgeInfo {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: BadgeRarity;
  earnedAt?: string;
}

export interface ForumStats {
  totalPosts: number;
  totalImportsReceived: number;
  totalUpvotesReceived: number;
  reputation: number;
  rank: ForumRank;
  badges: BadgeInfo[];
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatar?: string;
  };
  reputation: number;
  forumRank: ForumRank;
  totalPosts: number;
  totalImports: number;
  badges: BadgeInfo[];
}

export interface VoteResult {
  postId: number;
  upvoteCount: number;
  downvoteCount: number;
  userVote: VoteType;
}

export interface PaginatedPosts {
  items: PostPreview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedComments {
  items: CommentInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedCollections {
  items: CollectionInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Database Row Types
// ============================================================

export interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  name_vi: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: number | null;
  sort_order: number;
  post_count: number;
  is_active: boolean;
  created_at: Date;
}

export interface TagRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  created_at: Date;
}

export interface PostRow extends RowDataPacket {
  id: number;
  author_id: number;
  conversation_id: number;
  title: string;
  description: string | null;
  slug: string;
  vietnamese_text: string;
  english_translation: string;
  topic: string | null;
  difficulty_level: DifficultyLevel;
  vocabulary_count: number;
  grammar_count: number;
  exercise_count: number;
  category_id: number | null;
  view_count: number;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  import_count: number;
  score: number;
  hot_score: number;
  status: PostStatus;
  rejection_reason: string | null;
  is_featured: boolean;
  is_pinned: boolean;
  allow_comments: boolean;
  is_anonymous: boolean;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  // Joined fields
  author_username?: string;
  author_display_name?: string;
  author_avatar?: string;
  author_reputation?: number;
  author_rank?: ForumRank;
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
  category_color?: string;
  user_vote?: VoteType | null;
  is_bookmarked?: number;
  is_imported?: number;
}

export interface CommentRow extends RowDataPacket {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  upvote_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  author_username?: string;
  author_display_name?: string;
  author_avatar?: string;
  author_rank?: ForumRank;
  user_vote?: VoteType | null;
}

export interface VoteRow extends RowDataPacket {
  id: number;
  user_id: number;
  post_id: number;
  vote_type: VoteType;
  created_at: Date;
  updated_at: Date;
}

export interface ImportRow extends RowDataPacket {
  id: number;
  user_id: number;
  post_id: number;
  conversation_id: number | null;
  imported_vocabulary: boolean;
  imported_grammar: boolean;
  imported_exercises: boolean;
  vocabulary_imported: number;
  grammar_imported: number;
  exercises_imported: number;
  created_at: Date;
}

export interface CollectionRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  slug: string;
  is_public: boolean;
  post_count: number;
  follower_count: number;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  owner_username?: string;
  owner_display_name?: string;
  owner_avatar?: string;
  is_following?: number;
}

export interface ReputationRow extends RowDataPacket {
  user_id: number;
  reputation: number;
  total_posts: number;
  total_imports: number;
  total_upvotes_received: number;
  total_downvotes_received: number;
  total_comments: number;
  badges: string | null;
  rank: ForumRank;
  updated_at: Date;
}

export interface BadgeRow extends RowDataPacket {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
  rarity: BadgeRarity;
  is_active: boolean;
  created_at: Date;
}

export interface CountRow extends RowDataPacket {
  count: number;
}

export interface PostContentRow extends RowDataPacket {
  id: number;
  post_id: number;
  content_type: ContentType;
  content_id: number;
  snapshot: string;
  created_at: Date;
}
