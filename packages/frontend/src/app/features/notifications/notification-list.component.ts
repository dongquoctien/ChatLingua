import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faTrophy,
  faArrowUp,
  faFlag,
  faFire,
  faChartLine,
  faCheck,
  faTrash,
  faSpinner,
  faRefresh,
  faCheckCircle,
  faDumbbell,
  faGift,
} from '../../shared/icons';
import { ApiService, GamificationNotification } from '../../core/services/api.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.scss',
})
export class NotificationListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faBell = faBell;
  faTrophy = faTrophy;
  faArrowUp = faArrowUp;
  faFlag = faFlag;
  faFire = faFire;
  faChartLine = faChartLine;
  faCheck = faCheck;
  faTrash = faTrash;
  faSpinner = faSpinner;
  faSync = faRefresh;
  faCheckCircle = faCheckCircle;
  faDumbbell = faDumbbell;
  faGift = faGift;
  

  // State
  notifications = signal<GamificationNotification[]>([]);
  loading = signal(true);
  markingAllRead = signal(false);
  filter = signal<'all' | 'unread'>('all');

  // Computed
  filteredNotifications = computed(() => {
    const all = this.notifications();
    if (this.filter() === 'unread') {
      return all.filter(n => !n.isRead);
    }
    return all;
  });

  unreadCount = computed(() => {
    return this.notifications().filter(n => !n.isRead).length;
  });

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading.set(true);
    this.apiService.getNotifications(false).subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  markAllAsRead() {
    this.markingAllRead.set(true);
    this.apiService.markAllNotificationsRead().subscribe({
      next: () => {
        const updated = this.notifications().map(n => ({ ...n, isRead: true }));
        this.notifications.set(updated);
        this.markingAllRead.set(false);
      },
      error: () => {
        this.markingAllRead.set(false);
      },
    });
  }

  setFilter(filter: 'all' | 'unread') {
    this.filter.set(filter);
  }

  getNotificationIcon(type: string) {
    switch (type) {
      case 'achievement':
        return this.faTrophy;
      case 'level_up':
        return this.faArrowUp;
      case 'challenge':
        return this.faFlag;
      case 'streak':
        return this.faFire;
      case 'leaderboard':
        return this.faChartLine;
      case 'sync_started':
        return this.faSync;
      case 'sync_completed':
        return this.faCheckCircle;
      case 'gift':
        return this.faGift;
      default:
        return this.faBell;
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'achievement':
        return 'bg-yellow-100 text-yellow-600';
      case 'level_up':
        return 'bg-purple-100 text-purple-600';
      case 'challenge':
        return 'bg-blue-100 text-blue-600';
      case 'streak':
        return 'bg-orange-100 text-orange-600';
      case 'leaderboard':
        return 'bg-green-100 text-green-600';
      case 'sync_started':
        return 'bg-blue-100 text-blue-600';
      case 'sync_completed':
        return 'bg-green-100 text-green-600';
      case 'gift':
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }


}
