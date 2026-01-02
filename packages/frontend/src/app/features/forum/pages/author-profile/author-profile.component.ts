import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faFileAlt,
  faThumbsUp,
  faComment,
  faCalendar,
  faGlobe,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { ForumService, AuthorProfile, PostPreview } from '../../services/forum.service';
import { AuthorBadgeComponent } from '../../components/author-badge/author-badge.component';
import { PostCardComponent } from '../../components/post-card/post-card.component';

@Component({
  selector: 'app-author-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FontAwesomeModule,
    AuthorBadgeComponent,
    PostCardComponent
  ],
  templateUrl: './author-profile.component.html',
  styleUrls: ['./author-profile.component.scss']
})
export class AuthorProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly forumService = inject(ForumService);

  // Expose Math for template
  Math = Math;

  faArrowLeft = faArrowLeft;
  faSpinner = faSpinner;
  faFileAlt = faFileAlt;
  faThumbsUp = faThumbsUp;
  faComment = faComment;
  faCalendar = faCalendar;
  faGlobe = faGlobe;
  faEnvelope = faEnvelope;

  author = signal<AuthorProfile | null>(null);
  posts = signal<PostPreview[]>([]);
  loading = signal(true);
  loadingPosts = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  totalPosts = signal(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username');
    if (username) {
      this.loadAuthorProfile(username);
    } else {
      this.error.set('Author not found');
      this.loading.set(false);
    }
  }

  loadAuthorProfile(username: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getAuthorProfile(username).subscribe({
      next: (profile) => {
        this.author.set(profile);
        this.loading.set(false);
        this.loadAuthorPosts(username);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load author profile');
        this.loading.set(false);
      }
    });
  }

  loadAuthorPosts(username: string): void {
    this.loadingPosts.set(true);

    this.forumService.getAuthorPosts(username, this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.posts.set(response.items);
        this.totalPosts.set(response.total);
        this.loadingPosts.set(false);
      },
      error: (err) => {
        console.error('Failed to load posts:', err);
        this.loadingPosts.set(false);
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalPosts() / this.pageSize) || 1;
  }

  get hasMorePosts(): boolean {
    return this.currentPage() < this.totalPages;
  }

  loadMore(): void {
    if (this.loadingPosts() || !this.hasMorePosts) return;

    const author = this.author();
    if (!author) return;

    this.currentPage.update(p => p + 1);
    this.loadingPosts.set(true);

    this.forumService.getAuthorPosts(author.username, this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.posts.update(posts => [...posts, ...response.items]);
        this.loadingPosts.set(false);
      },
      error: (err) => {
        console.error('Failed to load more posts:', err);
        this.currentPage.update(p => p - 1);
        this.loadingPosts.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
