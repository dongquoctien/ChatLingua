import { Component, inject, signal, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import type { BlockedUser } from '../../chat.types';

@Component({
  selector: 'app-blocked-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blocked-users.component.html',
  styleUrls: ['./blocked-users.component.scss'],
})
export class BlockedUsersComponent implements OnInit {
  private chatService = inject(ChatService);

  readonly close = output<void>();

  readonly blockedUsers = signal<BlockedUser[]>([]);
  readonly loading = signal(false);
  readonly unblockingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  private loadBlockedUsers(): void {
    this.loading.set(true);
    this.chatService.getBlockedUsers().subscribe({
      next: users => {
        this.blockedUsers.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  unblockUser(userId: number): void {
    this.unblockingId.set(userId);
    this.chatService.unblockUser(userId).subscribe({
      next: () => {
        this.blockedUsers.update(users => users.filter(u => u.userId !== userId));
        this.unblockingId.set(null);
      },
      error: () => {
        this.unblockingId.set(null);
      },
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  getInitials(user: BlockedUser): string {
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
