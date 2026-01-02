import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faReply,
  faEdit,
  faTrash,
  faFlag,
  faEllipsisV,
  faThumbsUp
} from '@fortawesome/free-solid-svg-icons';
import { CommentInfo, VoteType } from '../../services/forum.service';
import { AuthorBadgeComponent } from '../author-badge/author-badge.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FontAwesomeModule, AuthorBadgeComponent],
  templateUrl: './comment-item.component.html',
  styleUrls: ['./comment-item.component.scss']
})
export class CommentItemComponent {
  @Input({ required: true }) comment!: CommentInfo;
  @Input() depth = 0;
  @Input() maxDepth = 3;

  @Output() reply = new EventEmitter<{ parentId: number; content: string }>();
  @Output() edit = new EventEmitter<{ commentId: number; content: string }>();
  @Output() delete = new EventEmitter<number>();
  @Output() report = new EventEmitter<number>();
  @Output() vote = new EventEmitter<{ commentId: number; voteType: VoteType }>();

  private readonly authService = inject(AuthService);

  faReply = faReply;
  faEdit = faEdit;
  faTrash = faTrash;
  faFlag = faFlag;
  faEllipsisV = faEllipsisV;
  faThumbsUp = faThumbsUp;

  showReplyForm = false;
  showEditForm = false;
  showMenu = false;
  replyContent = '';
  editContent = '';

  get isAuthor(): boolean {
    const user = this.authService.currentUser();
    return !!user && user.id === this.comment.userId;
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get canReply(): boolean {
    return this.depth < this.maxDepth && this.isAuthenticated;
  }

  get indentClass(): string {
    if (this.depth === 0) return '';
    return `ml-${Math.min(this.depth * 4, 12)}`;
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

  toggleReplyForm(): void {
    this.showReplyForm = !this.showReplyForm;
    this.showEditForm = false;
    this.replyContent = '';
  }

  toggleEditForm(): void {
    this.showEditForm = !this.showEditForm;
    this.showReplyForm = false;
    this.editContent = this.comment.content;
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  submitReply(): void {
    if (!this.replyContent.trim()) return;
    this.reply.emit({ parentId: this.comment.id, content: this.replyContent.trim() });
    this.replyContent = '';
    this.showReplyForm = false;
  }

  submitEdit(): void {
    if (!this.editContent.trim()) return;
    this.edit.emit({ commentId: this.comment.id, content: this.editContent.trim() });
    this.editContent = '';
    this.showEditForm = false;
  }

  cancelReply(): void {
    this.showReplyForm = false;
    this.replyContent = '';
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.editContent = '';
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.delete.emit(this.comment.id);
    }
    this.showMenu = false;
  }

  onReport(): void {
    this.report.emit(this.comment.id);
    this.showMenu = false;
  }

  onUpvote(): void {
    this.vote.emit({ commentId: this.comment.id, voteType: 'upvote' });
  }
}
