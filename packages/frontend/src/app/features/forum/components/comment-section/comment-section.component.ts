import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faComments,
  faPaperPlane,
  faSpinner,
  faSort
} from '@fortawesome/free-solid-svg-icons';
import { CommentInfo, VoteType } from '../../services/forum.service';
import { CommentItemComponent } from '../comment-item/comment-item.component';
import { AuthService } from '../../../../core/services/auth.service';

export type SortOption = 'newest' | 'oldest' | 'popular';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, CommentItemComponent],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.scss']
})
export class CommentSectionComponent {
  @Input() comments: CommentInfo[] = [];
  @Input() totalCount = 0;
  @Input() loading = false;
  @Input() submitting = false;
  @Input() maxDepth = 3;

  @Output() addComment = new EventEmitter<string>();
  @Output() replyComment = new EventEmitter<{ parentId: number; content: string }>();
  @Output() editComment = new EventEmitter<{ commentId: number; content: string }>();
  @Output() deleteComment = new EventEmitter<number>();
  @Output() reportComment = new EventEmitter<number>();
  @Output() voteComment = new EventEmitter<{ commentId: number; voteType: VoteType }>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() sortChange = new EventEmitter<SortOption>();

  private readonly authService = inject(AuthService);

  faComments = faComments;
  faPaperPlane = faPaperPlane;
  faSpinner = faSpinner;
  faSort = faSort;

  newComment = '';
  sortBy = signal<SortOption>('newest');
  showSortMenu = false;

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get hasMoreComments(): boolean {
    return this.comments.length < this.totalCount;
  }

  get sortLabel(): string {
    switch (this.sortBy()) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'popular': return 'Most Popular';
      default: return 'Sort';
    }
  }

  submitComment(): void {
    if (!this.newComment.trim()) return;
    this.addComment.emit(this.newComment.trim());
    this.newComment = '';
  }

  onReply(event: { parentId: number; content: string }): void {
    this.replyComment.emit(event);
  }

  onEdit(event: { commentId: number; content: string }): void {
    this.editComment.emit(event);
  }

  onDelete(commentId: number): void {
    this.deleteComment.emit(commentId);
  }

  onReport(commentId: number): void {
    this.reportComment.emit(commentId);
  }

  onVote(event: { commentId: number; voteType: VoteType }): void {
    this.voteComment.emit(event);
  }

  onLoadMore(): void {
    this.loadMore.emit();
  }

  toggleSortMenu(): void {
    this.showSortMenu = !this.showSortMenu;
  }

  selectSort(option: SortOption): void {
    this.sortBy.set(option);
    this.sortChange.emit(option);
    this.showSortMenu = false;
  }
}
