import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ForumService, PostPreview, PaginatedPosts } from '../../services/forum.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './bookmarks.component.html',
  styleUrls: ['./bookmarks.component.scss']
})
export class BookmarksComponent implements OnInit {
  private readonly forumService = inject(ForumService);

  posts = signal<PostPreview[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Pagination
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);

  ngOnInit(): void {
    this.loadBookmarks();
  }

  loadBookmarks(page = 1): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getBookmarks(page, 10).subscribe({
      next: (result: PaginatedPosts) => {
        this.posts.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(result.totalPages);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load bookmarks:', err);
        this.error.set('Failed to load your bookmarks. Please try again.');
        this.loading.set(false);
      }
    });
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.loadBookmarks(this.page() + 1);
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.loadBookmarks(this.page() - 1);
    }
  }
}
