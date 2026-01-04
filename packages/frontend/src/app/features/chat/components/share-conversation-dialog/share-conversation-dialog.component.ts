import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faSearch,
  faBook,
  faGraduationCap,
  faPencil,
  faShare,
  faSpinner,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { DialogRef } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ChatService } from '../../services/chat.service';
import type { UserStatusInfo } from '../../chat.types';

interface LearningConversation {
  id: number;
  vietnameseText: string;
  englishTranslation: string;
  difficultyLevel: string;
  topic: string;
  vocabularyCount: number;
  grammarCount: number;
  exerciseCount: number;
  createdAt: string;
}

export interface ShareConversationDialogData {
  recipientId?: number;
  recipientName?: string;
}

@Component({
  selector: 'app-share-conversation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './share-conversation-dialog.component.html',
  styleUrls: ['./share-conversation-dialog.component.scss'],
})
export class ShareConversationDialogComponent implements OnInit {
  private dialogRef = inject(DialogRef<boolean>);
  private http = inject(HttpClient);
  private chatService = inject(ChatService);

  // Icons
  readonly faTimes = faTimes;
  readonly faSearch = faSearch;
  readonly faBook = faBook;
  readonly faGraduationCap = faGraduationCap;
  readonly faPencil = faPencil;
  readonly faShare = faShare;
  readonly faSpinner = faSpinner;
  readonly faCheck = faCheck;

  // State
  readonly loading = signal(true);
  readonly sharing = signal(false);
  readonly error = signal<string | null>(null);
  readonly conversations = signal<LearningConversation[]>([]);
  readonly users = signal<UserStatusInfo[]>([]);
  readonly searchQuery = signal('');
  readonly selectedConversationId = signal<number | null>(null);
  readonly selectedRecipientIds = signal<Set<number>>(new Set());
  readonly shareMessage = signal('');
  readonly shareSuccess = signal(false);

  // Data from parent
  private preselectedRecipientId: number | null = null;
  recipientName = '';

  readonly filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.conversations();
    return this.conversations().filter(c =>
      c.vietnameseText.toLowerCase().includes(query) ||
      c.englishTranslation.toLowerCase().includes(query) ||
      c.topic.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    const data = this.dialogRef.config.data as ShareConversationDialogData;
    if (data?.recipientId) {
      this.preselectedRecipientId = data.recipientId;
      this.selectedRecipientIds.update(set => {
        set.add(data.recipientId!);
        return new Set(set);
      });
    }
    if (data?.recipientName) {
      this.recipientName = data.recipientName;
    }

    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);

    // Load user's learning conversations
    this.http.get<{ items: LearningConversation[] }>(`${environment.apiUrl}/conversations`).subscribe({
      next: (result) => {
        // Filter to only show conversations with actual content
        const withContent = (result.items || []).filter(c =>
          c.vocabularyCount > 0 || c.grammarCount > 0 || c.exerciseCount > 0
        );
        this.conversations.set(withContent);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load conversations');
        this.loading.set(false);
      },
    });

    // Load users for recipient selection if not preselected
    if (!this.preselectedRecipientId) {
      this.chatService.getAllUsers().subscribe({
        next: (result) => {
          this.users.set(result.items);
        },
        error: () => {
          // Silent fail, we can still share to a preselected recipient
        },
      });
    }
  }

  selectConversation(id: number) {
    if (this.selectedConversationId() === id) {
      this.selectedConversationId.set(null);
    } else {
      this.selectedConversationId.set(id);
    }
  }

  toggleRecipient(userId: number) {
    this.selectedRecipientIds.update(set => {
      if (set.has(userId)) {
        set.delete(userId);
      } else {
        set.add(userId);
      }
      return new Set(set);
    });
  }

  isRecipientSelected(userId: number): boolean {
    return this.selectedRecipientIds().has(userId);
  }

  get canShare(): boolean {
    return this.selectedConversationId() !== null && this.selectedRecipientIds().size > 0;
  }

  doShare() {
    if (!this.canShare || this.sharing()) return;

    this.sharing.set(true);
    this.error.set(null);

    const conversationId = this.selectedConversationId()!;
    const recipientIds = Array.from(this.selectedRecipientIds());
    const message = this.shareMessage().trim() || undefined;

    this.chatService.shareConversation(conversationId, recipientIds, message).subscribe({
      next: () => {
        this.sharing.set(false);
        this.shareSuccess.set(true);
      },
      error: (err) => {
        this.sharing.set(false);
        this.error.set(err.error?.error || 'Failed to share conversation');
      },
    });
  }

  close() {
    this.dialogRef.close(this.shareSuccess());
  }

  getDifficultyLabel(level?: string): string {
    switch (level) {
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

  getDifficultyColor(level?: string): string {
    switch (level) {
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

  getPreviewText(conv: LearningConversation): string {
    const text = conv.vietnameseText || conv.englishTranslation;
    if (text.length > 100) {
      return text.substring(0, 100) + '...';
    }
    return text;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
