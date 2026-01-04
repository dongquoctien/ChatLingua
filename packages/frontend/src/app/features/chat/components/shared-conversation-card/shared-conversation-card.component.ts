import { Component, input, output, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faShare,
  faBook,
  faGraduationCap,
  faPencil,
  faDownload,
  faCheck,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { ChatService } from '../../services/chat.service';
import type { SharedConversationPayload } from '../../chat.types';

@Component({
  selector: 'app-shared-conversation-card',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './shared-conversation-card.component.html',
  styleUrls: ['./shared-conversation-card.component.scss'],
})
export class SharedConversationCardComponent implements OnInit, OnChanges {
  private chatService = inject(ChatService);

  readonly data = input.required<SharedConversationPayload>();
  readonly messageId = input.required<number>();
  readonly isOwn = input(false);
  readonly refreshTrigger = input(0); // Increment to force refresh import status

  readonly importClick = output<number>();

  // Icons
  readonly faShare = faShare;
  readonly faBook = faBook;
  readonly faGraduationCap = faGraduationCap;
  readonly faPencil = faPencil;
  readonly faDownload = faDownload;
  readonly faCheck = faCheck;
  readonly faSpinner = faSpinner;

  // State
  readonly isImported = signal(false);
  readonly isChecking = signal(false);
  readonly isOpening = signal(false);

  ngOnInit() {
    this.checkImportStatus();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-check import status when refreshTrigger changes
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.checkImportStatus();
    }
  }

  checkImportStatus() {
    this.isChecking.set(true);
    this.chatService.getImportStatus(this.messageId()).subscribe({
      next: (result) => {
        this.isImported.set(result.imported);
        this.isChecking.set(false);
      },
      error: () => {
        this.isChecking.set(false);
      },
    });
  }

  onImportClick() {
    if (this.isOpening()) return; // Prevent double-click
    this.isOpening.set(true);
    this.importClick.emit(this.messageId());
    // Reset loading after dialog opens (dialog opens synchronously)
    // Using setTimeout to allow UI to update before dialog opens
    setTimeout(() => this.isOpening.set(false), 500);
  }

  /** Called by parent after dialog closes */
  resetOpening() {
    this.isOpening.set(false);
  }

  /** Called by parent after successful import */
  markAsImported() {
    this.isImported.set(true);
    this.isOpening.set(false);
  }

  getDifficultyLabel(): string {
    switch (this.data().difficultyLevel) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return '';
    }
  }

  getDifficultyColor(): string {
    switch (this.data().difficultyLevel) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}
