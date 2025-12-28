import { Component, Input, Output, EventEmitter, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell, faTrophy, faArrowUp, faFire, faCalendarCheck,
  faCheck, faCheckDouble, faTimes, faCircle
} from '@fortawesome/free-solid-svg-icons';
import { GamificationNotification, NotificationBadgeInfo } from '../../../core/services/api.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="notification-bell-container" [class.open]="isOpen()">
      <!-- Bell Button -->
      <button class="bell-button"
              [class.has-notifications]="badgeInfo.unreadCount > 0"
              (click)="toggleDropdown()">
        <fa-icon [icon]="faBell" [class.ringing]="badgeInfo.unreadCount > 0"></fa-icon>
        @if (badgeInfo.unreadCount > 0) {
          <span class="badge" [class.large]="badgeInfo.unreadCount > 9">
            {{ badgeInfo.unreadCount > 99 ? '99+' : badgeInfo.unreadCount }}
          </span>
        }
      </button>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div class="dropdown" (click)="$event.stopPropagation()">
          <div class="dropdown-header">
            <h4>Notifications</h4>
            @if (notifications.length > 0) {
              <button class="mark-all-btn" (click)="onMarkAllRead()">
                <fa-icon [icon]="faCheckDouble"></fa-icon>
                Mark all read
              </button>
            }
          </div>

          <div class="notification-list">
            @if (notifications.length === 0) {
              <div class="empty-state">
                <fa-icon [icon]="faBell" class="empty-icon"></fa-icon>
                <p>No notifications yet</p>
              </div>
            } @else {
              @for (notification of notifications; track notification.id) {
                <div class="notification-item"
                     [class.unread]="!notification.isRead"
                     (click)="onNotificationClick(notification)">
                  <div class="notification-icon" [ngClass]="getIconClass(notification.notificationType)">
                    <fa-icon [icon]="getIcon(notification.notificationType)"></fa-icon>
                  </div>
                  <div class="notification-content">
                    <span class="title">{{ notification.title }}</span>
                    <span class="message">{{ notification.message }}</span>
                    <span class="time">{{ formatTime(notification.createdAt) }}</span>
                  </div>
                  @if (!notification.isRead) {
                    <div class="unread-dot">
                      <fa-icon [icon]="faCircle"></fa-icon>
                    </div>
                  }
                </div>
              }
            }
          </div>

          @if (notifications.length > 5) {
            <div class="dropdown-footer">
              <button class="view-all-btn" (click)="onViewAll()">
                View All Notifications
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-bell-container {
      position: relative;
    }

    .bell-button {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      fa-icon {
        font-size: 1.25rem;
        color: #666;
        transition: color 0.2s ease;

        &.ringing {
          animation: ring 0.5s ease 0s 2;
          color: #ffd700;
        }
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);

        fa-icon {
          color: #333;
        }
      }

      &.has-notifications {
        fa-icon {
          color: #ffd700;
        }
      }
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      color: white;
      border-radius: 9px;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(238, 90, 36, 0.4);

      &.large {
        min-width: 24px;
        font-size: 0.65rem;
      }
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 340px;
      max-height: 480px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 1000;
      animation: slideDown 0.2s ease;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #eee;

      h4 {
        margin: 0;
        font-size: 1rem;
        color: #333;
      }

      .mark-all-btn {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: 1px solid #2196f3;
        border-radius: 6px;
        color: #2196f3;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #2196f3;
          color: white;
        }
      }
    }

    .notification-list {
      max-height: 360px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.2s ease;
      border-bottom: 1px solid #f5f5f5;

      &:hover {
        background: #f8f9fa;
      }

      &.unread {
        background: #f0f7ff;

        &:hover {
          background: #e3f0ff;
        }
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .notification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;

      &.achievement {
        background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      }

      &.level_up {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
      }

      &.streak {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      }

      &.challenge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.default {
        background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      }
    }

    .notification-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;

      .title {
        font-weight: 600;
        font-size: 0.9rem;
        color: #333;
      }

      .message {
        font-size: 0.8rem;
        color: #666;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .time {
        font-size: 0.7rem;
        color: #999;
      }
    }

    .unread-dot {
      flex-shrink: 0;
      color: #2196f3;
      font-size: 0.5rem;
      align-self: center;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #999;

      .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.3;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
      }
    }

    .dropdown-footer {
      padding: 0.75rem;
      border-top: 1px solid #eee;
      text-align: center;

      .view-all-btn {
        width: 100%;
        padding: 0.5rem;
        background: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        color: #666;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #f0f0f0;
          color: #333;
        }
      }
    }

    @keyframes ring {
      0%, 100% { transform: rotate(0deg); }
      20%, 60% { transform: rotate(15deg); }
      40%, 80% { transform: rotate(-15deg); }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class NotificationBellComponent {
  @Input() notifications: GamificationNotification[] = [];
  @Input() badgeInfo: NotificationBadgeInfo = {
    unreadCount: 0,
    hasNewAchievements: false,
    hasNewChallenges: false
  };
  @Output() notificationClick = new EventEmitter<GamificationNotification>();
  @Output() markAllRead = new EventEmitter<void>();
  @Output() viewAll = new EventEmitter<void>();

  // Icons
  faBell = faBell;
  faTrophy = faTrophy;
  faArrowUp = faArrowUp;
  faFire = faFire;
  faCalendarCheck = faCalendarCheck;
  faCheck = faCheck;
  faCheckDouble = faCheckDouble;
  faTimes = faTimes;
  faCircle = faCircle;

  // State
  isOpen = signal(false);

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown() {
    this.isOpen.update(v => !v);
  }

  getIcon(type: string): any {
    const iconMap: Record<string, any> = {
      'achievement': faTrophy,
      'level_up': faArrowUp,
      'streak': faFire,
      'challenge': faCalendarCheck,
    };
    return iconMap[type] || faBell;
  }

  getIconClass(type: string): string {
    const validTypes = ['achievement', 'level_up', 'streak', 'challenge'];
    return validTypes.includes(type) ? type : 'default';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  onNotificationClick(notification: GamificationNotification) {
    this.notificationClick.emit(notification);
  }

  onMarkAllRead() {
    this.markAllRead.emit();
  }

  onViewAll() {
    this.viewAll.emit();
    this.isOpen.set(false);
  }
}
