import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faSearch,
  faShare,
  faSpinner,
  faCheck,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { DialogRef } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ChatUser {
  userId: number;
  username: string;
  displayName: string;
  avatar: string | null;
  isOnline: boolean;
  statusType: string;
}

export interface ShareToUsersDialogData {
  conversationId: number;
  conversationTitle: string;
  vocabularyCount: number;
  grammarCount: number;
  exerciseCount: number;
}

@Component({
  selector: 'app-share-to-users-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './share-to-users-dialog.component.html',
  styleUrls: ['./share-to-users-dialog.component.scss'],
})
export class ShareToUsersDialogComponent implements OnInit {
  private dialogRef = inject(DialogRef<boolean>);
  private http = inject(HttpClient);

  // Icons
  readonly faTimes = faTimes;
  readonly faSearch = faSearch;
  readonly faShare = faShare;
  readonly faSpinner = faSpinner;
  readonly faCheck = faCheck;
  readonly faUser = faUser;

  // State
  readonly loading = signal(true);
  readonly sharing = signal(false);
  readonly error = signal<string | null>(null);
  readonly users = signal<ChatUser[]>([]);
  readonly searchQuery = signal('');
  readonly selectedUserIds = signal<Set<number>>(new Set());
  readonly shareMessage = signal('');
  readonly shareSuccess = signal(false);

  // Data from parent
  conversationId = 0;
  conversationTitle = '';
  vocabularyCount = 0;
  grammarCount = 0;
  exerciseCount = 0;

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(query) ||
      u.displayName?.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    const data = this.dialogRef.config.data as ShareToUsersDialogData;
    if (data) {
      this.conversationId = data.conversationId;
      this.conversationTitle = data.conversationTitle || 'Learning Conversation';
      this.vocabularyCount = data.vocabularyCount || 0;
      this.grammarCount = data.grammarCount || 0;
      this.exerciseCount = data.exerciseCount || 0;
    }

    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ items: ChatUser[] }>(`${environment.apiUrl}/chat/users`).subscribe({
      next: (result) => {
        this.users.set(result.items || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load users');
        this.loading.set(false);
      },
    });
  }

  toggleUser(userId: number) {
    this.selectedUserIds.update(set => {
      if (set.has(userId)) {
        set.delete(userId);
      } else {
        set.add(userId);
      }
      return new Set(set);
    });
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds().has(userId);
  }

  get canShare(): boolean {
    return this.selectedUserIds().size > 0;
  }

  doShare() {
    if (!this.canShare || this.sharing()) return;

    this.sharing.set(true);
    this.error.set(null);

    const recipientIds = Array.from(this.selectedUserIds());
    const message = this.shareMessage().trim() || undefined;

    this.http.post(`${environment.apiUrl}/chat/share-conversation`, {
      conversationId: this.conversationId,
      recipientIds,
      message,
    }).subscribe({
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

  getInitials(user: ChatUser): string {
    const name = user.displayName || user.username;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusColor(statusType: string): string {
    switch (statusType) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }
}
