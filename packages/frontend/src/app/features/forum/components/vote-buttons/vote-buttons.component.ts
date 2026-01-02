import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { VoteType } from '../../services/forum.service';

@Component({
  selector: 'app-vote-buttons',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './vote-buttons.component.html',
  styleUrls: ['./vote-buttons.component.scss']
})
export class VoteButtonsComponent {
  @Input() upvotes = 0;
  @Input() downvotes = 0;
  @Input() userVote: VoteType | null = null;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;

  @Output() vote = new EventEmitter<VoteType>();
  @Output() removeVote = new EventEmitter<void>();

  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;

  get score(): number {
    return this.upvotes - this.downvotes;
  }

  get isUpvoted(): boolean {
    return this.userVote === 'upvote';
  }

  get isDownvoted(): boolean {
    return this.userVote === 'downvote';
  }

  get scoreClass(): string {
    if (this.score > 0) return 'text-green-600';
    if (this.score < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  get containerClass(): string {
    const dirClass = this.direction === 'horizontal' ? 'flex-row' : 'flex-col';
    return dirClass;
  }

  get buttonSizeClass(): string {
    switch (this.size) {
      case 'small': return 'w-6 h-6 text-xs';
      case 'large': return 'w-10 h-10 text-lg';
      default: return 'w-8 h-8 text-sm';
    }
  }

  get scoreSizeClass(): string {
    switch (this.size) {
      case 'small': return 'text-xs min-w-[20px]';
      case 'large': return 'text-lg min-w-[40px] font-bold';
      default: return 'text-sm min-w-[30px] font-medium';
    }
  }

  onUpvote(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isUpvoted) {
      this.removeVote.emit();
    } else {
      this.vote.emit('upvote');
    }
  }

  onDownvote(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isDownvoted) {
      this.removeVote.emit();
    } else {
      this.vote.emit('downvote');
    }
  }
}
