import { Component, Input, Output, EventEmitter, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell, faTrophy, faArrowUp, faFire, faCalendarCheck,
  faCheck, faCheckDouble, faTimes, faCircle
} from '../../../shared/icons';
import { GamificationNotification, NotificationBadgeInfo } from '../../../core/services/api.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
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
      'achievement': this.faTrophy,
      'level_up': this.faArrowUp,
      'streak': this.faFire,
      'challenge': this.faCalendarCheck,
    };
    return iconMap[type] || this.faBell;
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
