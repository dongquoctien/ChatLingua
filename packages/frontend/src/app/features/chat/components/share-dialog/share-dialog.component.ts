import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import type { SharedContentType, UserStatusInfo } from '../../chat.types';

export interface ShareableContent {
  type: SharedContentType;
  id: number;
  title: string;
  subtitle?: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  data?: Record<string, unknown>;
}

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent {
  private chatService = inject(ChatService);

  @Input({ required: true }) content!: ShareableContent;
  @Input() users: UserStatusInfo[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() shared = new EventEmitter<{ recipientId: number; comment: string }>();

  readonly searchQuery = signal('');
  readonly selectedUserId = signal<number | null>(null);
  readonly comment = signal('');
  readonly sending = signal(false);

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users;
    return this.users.filter(
      u =>
        u.username.toLowerCase().includes(query) ||
        (u.displayName?.toLowerCase().includes(query) ?? false)
    );
  });

  readonly canShare = computed(() => {
    return this.selectedUserId() !== null && !this.sending();
  });

  selectUser(userId: number): void {
    this.selectedUserId.set(userId);
  }

  getSelectedUser(): UserStatusInfo | undefined {
    return this.users.find(u => u.userId === this.selectedUserId());
  }

  getInitials(user: UserStatusInfo): string {
    const name = user.displayName || user.username;
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  onShare(): void {
    const recipientId = this.selectedUserId();
    if (!recipientId) return;

    this.sending.set(true);

    this.chatService
      .shareContent({
        recipientId,
        contentType: this.content.type,
        contentId: this.content.id,
        comment: this.comment() || undefined,
      })
      .subscribe({
        next: () => {
          this.shared.emit({ recipientId, comment: this.comment() });
          this.onClose();
        },
        error: err => {
          console.error('Error sharing content:', err);
          this.sending.set(false);
        },
      });
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
