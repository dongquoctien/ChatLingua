import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ForumService,
  PostPreview,
  VoteType,
  SortBy,
  TimePeriod,
  DifficultyLevel
} from '../../services/forum.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { CategorySidebarComponent } from '../../components/category-sidebar/category-sidebar.component';

@Component({
  selector: 'app-forum-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PostCardComponent,
    CategorySidebarComponent
  ],
  templateUrl: './forum-home.component.html',
  styleUrls: ['./forum-home.component.scss']
})
export class ForumHomeComponent implements OnInit {
  private readonly forumService = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State
  posts = signal<PostPreview[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalPosts = signal(0);

  // Filters
  selectedCategory = signal<string | null>(null);
  selectedTag = signal<string | null>(null);
  selectedDifficulty = signal<DifficultyLevel | null>(null);
  sortBy = signal<SortBy>('hot');
  period = signal<TimePeriod>('all');
  searchQuery = signal('');

  // Search state
  searchInput = '';
  showFilters = signal(false);

  // Sort options
  readonly sortOptions: { value: SortBy; label: string }[] = [
    { value: 'hot', label: 'Hot' },
    { value: 'new', label: 'New' },
    { value: 'top', label: 'Top' }
  ];

  readonly periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  readonly difficultyOptions: { value: DifficultyLevel | null; label: string }[] = [
    { value: null, label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  ngOnInit(): void {
    // Subscribe to query params
    this.route.queryParams.subscribe(params => {
      if (params['category']) this.selectedCategory.set(params['category']);
      if (params['tag']) this.selectedTag.set(params['tag']);
      if (params['difficulty']) this.selectedDifficulty.set(params['difficulty'] as DifficultyLevel);
      if (params['sort']) this.sortBy.set(params['sort'] as SortBy);
      if (params['period']) this.period.set(params['period'] as TimePeriod);
      if (params['q']) {
        this.searchQuery.set(params['q']);
        this.searchInput = params['q'];
      }
      if (params['page']) this.currentPage.set(parseInt(params['page'], 10));

      this.loadPosts();
    });
  }

  loadPosts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getPosts({
      page: this.currentPage(),
      limit: 20,
      categorySlug: this.selectedCategory() || undefined,
      tagSlug: this.selectedTag() || undefined,
      difficulty: this.selectedDifficulty() || undefined,
      sortBy: this.sortBy(),
      period: this.period(),
      query: this.searchQuery() || undefined
    }).subscribe({
      next: (response) => {
        this.posts.set(response.items);
        this.totalPages.set(response.totalPages);
        this.totalPosts.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load posts. Please try again.');
        this.loading.set(false);
        console.error('Error loading posts:', err);
      }
    });
  }

  // Navigation
  updateFilters(): void {
    const queryParams: Record<string, string | null> = {};

    if (this.selectedCategory()) queryParams['category'] = this.selectedCategory();
    if (this.selectedTag()) queryParams['tag'] = this.selectedTag();
    if (this.selectedDifficulty()) queryParams['difficulty'] = this.selectedDifficulty();
    if (this.sortBy() !== 'hot') queryParams['sort'] = this.sortBy();
    if (this.period() !== 'all') queryParams['period'] = this.period();
    if (this.searchQuery()) queryParams['q'] = this.searchQuery();
    if (this.currentPage() > 1) queryParams['page'] = this.currentPage().toString();

    this.router.navigate(['/forum'], { queryParams });
  }

  onCategorySelect(slug: string | null): void {
    this.selectedCategory.set(slug);
    this.currentPage.set(1);
    this.updateFilters();
  }

  onTagSelect(slug: string | null): void {
    this.selectedTag.set(slug);
    this.currentPage.set(1);
    this.updateFilters();
  }

  onSortChange(sort: SortBy): void {
    this.sortBy.set(sort);
    this.currentPage.set(1);
    this.updateFilters();
  }

  onPeriodChange(period: TimePeriod): void {
    this.period.set(period);
    this.currentPage.set(1);
    this.updateFilters();
  }

  onDifficultyChange(difficulty: DifficultyLevel | null): void {
    this.selectedDifficulty.set(difficulty);
    this.currentPage.set(1);
    this.updateFilters();
  }

  onSearch(): void {
    this.searchQuery.set(this.searchInput);
    this.currentPage.set(1);
    this.updateFilters();
  }

  clearSearch(): void {
    this.searchInput = '';
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.updateFilters();
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  // Pagination
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.updateFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    // Show pages around current
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    // Always show last page if more than 1
    if (total > 1 && !pages.includes(total)) pages.push(total);

    return pages.sort((a, b) => a - b);
  }

  // Post interactions
  onVote(event: { postId: number; voteType: VoteType }): void {
    const post = this.posts().find(p => p.id === event.postId);
    if (!post) return;

    // Optimistic update
    const previousVote = post.userVote;

    if (previousVote === event.voteType) {
      // Remove vote
      this.forumService.removeVote(event.postId).subscribe({
        next: (result) => {
          this.updatePostVote(event.postId, result.upvoteCount, result.downvoteCount, null);
        }
      });
    } else {
      // Add/change vote
      this.forumService.votePost(event.postId, event.voteType).subscribe({
        next: (result) => {
          this.updatePostVote(event.postId, result.upvoteCount, result.downvoteCount, result.userVote);
        }
      });
    }
  }

  private updatePostVote(postId: number, upvoteCount: number, downvoteCount: number, userVote: VoteType | null): void {
    this.posts.update(posts =>
      posts.map(p =>
        p.id === postId
          ? { ...p, upvoteCount, downvoteCount, userVote }
          : p
      )
    );
  }

  onBookmark(event: { postId: number; isBookmarked: boolean }): void {
    if (event.isBookmarked) {
      this.forumService.addBookmark(event.postId).subscribe({
        next: () => {
          this.updatePostBookmark(event.postId, true);
        }
      });
    } else {
      this.forumService.removeBookmark(event.postId).subscribe({
        next: () => {
          this.updatePostBookmark(event.postId, false);
        }
      });
    }
  }

  private updatePostBookmark(postId: number, isBookmarked: boolean): void {
    this.posts.update(posts =>
      posts.map(p =>
        p.id === postId
          ? { ...p, isBookmarked }
          : p
      )
    );
  }
}
