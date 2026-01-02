import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================
// Enums & Types
// ============================================================

export type PostStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'hidden' | 'deleted';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type VoteType = 'upvote' | 'downvote';
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'misinformation' | 'duplicate' | 'other';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ForumRank = 'newcomer' | 'contributor' | 'active_contributor' | 'trusted_contributor' | 'expert' | 'master' | 'legend';
export type SortBy = 'hot' | 'new' | 'top';
export type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

// ============================================================
// Response Interfaces
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

export interface PostDetail extends PostPreview {
  vietnameseText: string;
  englishTranslation: string;
  topic?: string;

  vocabulary: VocabularyPreview[];
  grammarPoints: GrammarPreview[];

  allowComments: boolean;
  status: PostStatus;
}

export interface CommentInfo {
  id: number;
  postId: number;
  userId: number;
  parentId?: number;
  content: string;
  upvoteCount: number;
  isEdited: boolean;
  isDeleted?: boolean;
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

export interface AuthorProfile {
  id: number;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  reputation: number;
  rank: ForumRank;
  postCount: number;
  commentCount: number;
  totalUpvotes: number;
  badges: BadgeInfo[];
  joinedAt: string;
}

export interface CollectionPreview {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetail extends CollectionPreview {
  userId: number;
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
  userId: number;
  username: string;
  displayName: string;
  avatar?: string;
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

export interface ImportResult {
  conversationId: number;
  vocabularyImported: number;
  grammarImported: number;
  exercisesImported: number;
  xpEarned: number;
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

// ============================================================
// Request Interfaces
// ============================================================

export interface GetPostsFilters {
  page?: number;
  limit?: number;
  categorySlug?: string;
  tagSlug?: string;
  difficulty?: DifficultyLevel;
  sortBy?: SortBy;
  period?: TimePeriod;
  query?: string;
}

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

export interface CreateReportDTO {
  contentType: 'post' | 'comment';
  contentId: number;
  reason: ReportReason;
  description?: string;
}

export interface CreateCollectionDTO {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface UpdateCollectionDTO {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================
// Forum Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/forum`;

  // --------------------------------------------------------
  // Categories & Tags
  // --------------------------------------------------------

  getCategories(): Observable<CategoryInfo[]> {
    return this.http.get<CategoryInfo[]>(`${this.apiUrl}/categories`);
  }

  getTags(): Observable<TagInfo[]> {
    return this.http.get<TagInfo[]>(`${this.apiUrl}/tags`);
  }

  getPopularTags(limit = 20): Observable<TagInfo[]> {
    return this.http.get<TagInfo[]>(`${this.apiUrl}/tags/popular`, {
      params: { limit: limit.toString() }
    });
  }

  // --------------------------------------------------------
  // Posts
  // --------------------------------------------------------

  getPosts(filters: GetPostsFilters = {}): Observable<PaginatedPosts> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.categorySlug) params = params.set('category', filters.categorySlug);
    if (filters.tagSlug) params = params.set('tag', filters.tagSlug);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters.sortBy) params = params.set('sort', filters.sortBy);
    if (filters.period) params = params.set('period', filters.period);
    if (filters.query) params = params.set('q', filters.query);

    return this.http.get<PaginatedPosts>(`${this.apiUrl}/posts`, { params });
  }

  getPostBySlug(slug: string): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.apiUrl}/posts/${slug}`);
  }

  getPostById(id: number): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.apiUrl}/posts/id/${id}`);
  }

  createPost(data: CreatePostDTO): Observable<PostDetail> {
    return this.http.post<PostDetail>(`${this.apiUrl}/posts`, data);
  }

  updatePost(postId: number, data: UpdatePostDTO): Observable<PostDetail> {
    return this.http.put<PostDetail>(`${this.apiUrl}/posts/${postId}`, data);
  }

  deletePost(postId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/posts/${postId}`);
  }

  // --------------------------------------------------------
  // Voting
  // --------------------------------------------------------

  votePost(postId: number, voteType: VoteType): Observable<VoteResult> {
    return this.http.post<VoteResult>(`${this.apiUrl}/posts/${postId}/vote`, { voteType });
  }

  removeVote(postId: number): Observable<VoteResult> {
    return this.http.delete<VoteResult>(`${this.apiUrl}/posts/${postId}/vote`);
  }

  // --------------------------------------------------------
  // Comments
  // --------------------------------------------------------

  getComments(postId: number, page = 1, limit = 20): Observable<PaginatedComments> {
    return this.http.get<PaginatedComments>(`${this.apiUrl}/posts/${postId}/comments`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  createComment(postId: number, data: CreateCommentDTO): Observable<CommentInfo> {
    return this.http.post<CommentInfo>(`${this.apiUrl}/posts/${postId}/comments`, data);
  }

  updateComment(commentId: number, data: UpdateCommentDTO): Observable<CommentInfo> {
    return this.http.put<CommentInfo>(`${this.apiUrl}/comments/${commentId}`, data);
  }

  deleteComment(commentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/comments/${commentId}`);
  }

  // --------------------------------------------------------
  // Import
  // --------------------------------------------------------

  importPost(postId: number, options: ImportPostDTO = {}): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/posts/${postId}/import`, options);
  }

  // --------------------------------------------------------
  // Bookmarks
  // --------------------------------------------------------

  addBookmark(postId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/posts/${postId}/bookmark`, {});
  }

  removeBookmark(postId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/posts/${postId}/bookmark`);
  }

  getBookmarks(page = 1, limit = 20): Observable<PaginatedPosts> {
    return this.http.get<PaginatedPosts>(`${this.apiUrl}/bookmarks`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  // --------------------------------------------------------
  // User Content
  // --------------------------------------------------------

  getMyPosts(page = 1, limit = 20): Observable<PaginatedPosts> {
    return this.http.get<PaginatedPosts>(`${this.apiUrl}/my-posts`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getMyImports(page = 1, limit = 20): Observable<PaginatedPosts> {
    return this.http.get<PaginatedPosts>(`${this.apiUrl}/my-imports`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  // --------------------------------------------------------
  // Stats & Leaderboard
  // --------------------------------------------------------

  getMyStats(): Observable<ForumStats> {
    return this.http.get<ForumStats>(`${this.apiUrl}/stats`);
  }

  getLeaderboard(limit = 10, period: 'week' | 'month' | 'all' = 'all'): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/leaderboard`, {
      params: { limit: limit.toString(), period }
    });
  }

  getAllBadges(): Observable<BadgeInfo[]> {
    return this.http.get<BadgeInfo[]>(`${this.apiUrl}/badges`);
  }

  // --------------------------------------------------------
  // Reports
  // --------------------------------------------------------

  submitReport(data: CreateReportDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reports`, data);
  }

  // --------------------------------------------------------
  // Comment Voting
  // --------------------------------------------------------

  voteComment(commentId: number, voteType: VoteType): Observable<{ upvoteCount: number; userVote: VoteType }> {
    return this.http.post<{ upvoteCount: number; userVote: VoteType }>(
      `${this.apiUrl}/comments/${commentId}/vote`,
      { voteType }
    );
  }

  removeCommentVote(commentId: number): Observable<{ upvoteCount: number }> {
    return this.http.delete<{ upvoteCount: number }>(`${this.apiUrl}/comments/${commentId}/vote`);
  }

  // --------------------------------------------------------
  // Author Profiles
  // --------------------------------------------------------

  getAuthorProfile(username: string): Observable<AuthorProfile> {
    return this.http.get<AuthorProfile>(`${this.apiUrl}/authors/${username}`);
  }

  getAuthorPosts(username: string, page = 1, limit = 10): Observable<PaginatedPosts> {
    return this.http.get<PaginatedPosts>(`${this.apiUrl}/authors/${username}/posts`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  // --------------------------------------------------------
  // Collections
  // --------------------------------------------------------

  getMyCollections(): Observable<CollectionPreview[]> {
    return this.http.get<CollectionPreview[]>(`${this.apiUrl}/collections`);
  }

  getCollection(collectionId: number): Observable<ApiResponse<CollectionDetail>> {
    return this.http.get<ApiResponse<CollectionDetail>>(`${this.apiUrl}/collections/${collectionId}`);
  }

  getCollectionPosts(collectionId: number, params: { page?: number; limit?: number } = {}): Observable<PaginatedResponse<PostPreview>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<PaginatedResponse<PostPreview>>(
      `${this.apiUrl}/collections/${collectionId}/posts`,
      { params: httpParams }
    );
  }

  createCollection(data: CreateCollectionDTO): Observable<ApiResponse<CollectionDetail>> {
    return this.http.post<ApiResponse<CollectionDetail>>(`${this.apiUrl}/collections`, data);
  }

  updateCollection(collectionId: number, data: UpdateCollectionDTO): Observable<ApiResponse<CollectionDetail>> {
    return this.http.put<ApiResponse<CollectionDetail>>(`${this.apiUrl}/collections/${collectionId}`, data);
  }

  deleteCollection(collectionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/collections/${collectionId}`);
  }

  addToCollection(collectionId: number, postId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/posts`,
      { postId }
    );
  }

  removeFromCollection(collectionId: number, postId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/posts/${postId}`
    );
  }
}
