import { Component, OnInit, inject, signal, output, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { UserStatusBadgeComponent } from '../user-status-badge/user-status-badge.component';
import type { UserStatusInfo, PaginatedResponse } from '../../chat.types';
import { STATUS_COLORS, ACTIVITY_LABELS } from '../../chat.types';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserStatusBadgeComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);

  readonly compact = input(false); // Smaller items for widget
  readonly userSelect = output<UserStatusInfo>();

  // State
  readonly users = signal<UserStatusInfo[]>([]);
  readonly searchQuery = signal('');
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly hasMore = signal(true);

  // From socket service
  readonly onlineUsers = this.socketService.onlineUsers;

  // Computed
  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(query) ||
      u.displayName?.toLowerCase().includes(query)
    );
  });

  readonly onlineFirst = computed(() => {
    return [...this.filteredUsers()].sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return (a.displayName || a.username).localeCompare(b.displayName || b.username);
      }
      return a.isOnline ? -1 : 1;
    });
  });

  readonly STATUS_COLORS = STATUS_COLORS;
  readonly ACTIVITY_LABELS = ACTIVITY_LABELS;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.chatService.getAllUsers(this.page(), 50).subscribe({
      next: (response: PaginatedResponse<UserStatusInfo>) => {
        if (this.page() === 1) {
          this.users.set(response.items);
        } else {
          this.users.update(users => [...users, ...response.items]);
        }
        this.hasMore.set(response.page < response.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.page.update(p => p + 1);
    this.loadUsers();
  }

  search(query: string): void {
    this.searchQuery.set(query);
    if (query.length >= 2) {
      this.loading.set(true);
      this.chatService.searchUsers(query).subscribe({
        next: (response) => {
          this.users.set(response.items);
          this.hasMore.set(false);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else if (query.length === 0) {
      this.page.set(1);
      this.loadUsers();
    }
  }

  selectUser(user: UserStatusInfo): void {
    this.userSelect.emit(user);
  }

  getInitials(user: UserStatusInfo): string {
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  }

  formatLastSeen(lastSeenAt: string | null): string {
    if (!lastSeenAt) return 'Never';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
