import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostPreview, VoteType, ForumService } from '../../services/forum.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent {
  @Input({ required: true }) post!: PostPreview;
  @Input() showAuthor = true;
  @Input() showCategory = true;
  @Input() compact = false;

  @Output() vote = new EventEmitter<{ postId: number; voteType: VoteType }>();
  @Output() bookmark = new EventEmitter<{ postId: number; isBookmarked: boolean }>();

  private readonly forumService = inject(ForumService);

  get score(): number {
    return this.post.upvoteCount - this.post.downvoteCount;
  }

  get difficultyClass(): string {
    switch (this.post.difficultyLevel) {
      case 'beginner': return 'difficulty-beginner';
      case 'intermediate': return 'difficulty-intermediate';
      case 'advanced': return 'difficulty-advanced';
      default: return '';
    }
  }

  get difficultyLabel(): string {
    switch (this.post.difficultyLevel) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return '';
    }
  }

  get rankClass(): string {
    if (!this.post.author) return '';
    switch (this.post.author.rank) {
      case 'legend': return 'rank-legend';
      case 'master': return 'rank-master';
      case 'expert': return 'rank-expert';
      case 'trusted_contributor': return 'rank-trusted';
      case 'active_contributor': return 'rank-active';
      case 'contributor': return 'rank-contributor';
      default: return 'rank-newcomer';
    }
  }

  get rankLabel(): string {
    if (!this.post.author) return '';
    switch (this.post.author.rank) {
      case 'legend': return 'Legend';
      case 'master': return 'Master';
      case 'expert': return 'Expert';
      case 'trusted_contributor': return 'Trusted';
      case 'active_contributor': return 'Active';
      case 'contributor': return 'Contributor';
      default: return 'New';
    }
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  }

  onUpvote(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.vote.emit({ postId: this.post.id, voteType: 'upvote' });
  }

  onDownvote(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.vote.emit({ postId: this.post.id, voteType: 'downvote' });
  }

  onBookmark(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.bookmark.emit({ postId: this.post.id, isBookmarked: !this.post.isBookmarked });
  }
}
