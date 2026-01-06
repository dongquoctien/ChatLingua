import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faGraduationCap,
  faHome,
  faComments,
  faLanguage,
  faDumbbell,
  faQuestionCircle,
  faChartLine,
  faBars,
  faUserCircle,
  faSignOutAlt,
  faBrain,
  faBook,
  faBell,
  faTrophy,
  faTimes,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCog,
  faGamepad,
  faPaperPlane,
  faEnvelope,
  faStore,
} from '../../icons';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService, GamificationNotification } from '../../../core/services/api.service';
import { ChatWidgetComponent } from '../../../features/chat/components/chat-widget/chat-widget.component';
import { PetWidgetComponent } from '../../../features/pets/components/pet-widget/pet-widget.component';
import { Subscription, filter, interval } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    ChatWidgetComponent,
    PetWidgetComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

  // State
  sidebarOpen = signal(true);
  sidebarCollapsed = signal(false);
  isMobile = signal(false);
  userMenuOpen = signal(false);
  notificationMenuOpen = signal(false);

  // Notification badge and list
  notificationBadge = signal<{ unreadCount: number; hasNewAchievements: boolean }>({
    unreadCount: 0,
    hasNewAchievements: false,
  });
  notifications = signal<GamificationNotification[]>([]);
  notificationsLoading = signal(false);

  // Icons
  faGraduationCap = faGraduationCap;
  faHome = faHome;
  faComments = faComments;
  faLanguage = faLanguage;
  faBrain = faBrain;
  faBook = faBook;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faChartLine = faChartLine;
  faBars = faBars;
  faUserCircle = faUserCircle;
  faSignOutAlt = faSignOutAlt;
  faBell = faBell;
  faTrophy = faTrophy;
  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCog = faCog;
  faGamepad = faGamepad;
  faPaperPlane = faPaperPlane;
  faEnvelope = faEnvelope;
  faStore = faStore;

  // Navigation items
  // Note: Chat menu removed - accessible via chat widget expand button
  navItems = [
    { path: '/dashboard', icon: this.faHome, label: 'Dashboard' },
    { path: '/conversations', icon: this.faComments, label: 'Conversations' },
    { path: '/vocabulary', icon: this.faLanguage, label: 'Vocabulary' },
    { path: '/review', icon: this.faBrain, label: 'Daily Review' },
    { path: '/grammar', icon: this.faBook, label: 'Grammar' },
    { path: '/exercises', icon: this.faDumbbell, label: 'Exercises' },
    { path: '/quizzes', icon: this.faQuestionCircle, label: 'Quizzes' },
    { path: '/games', icon: this.faGamepad, label: 'Games' },
    { path: '/shop', icon: this.faStore, label: 'Shop' },
    { path: '/sync-requests', icon: this.faPaperPlane, label: 'Sync Requests' },
    { path: '/reports', icon: this.faChartLine, label: 'Reports' },
  ];

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  ngOnInit() {
    this.checkMobile();
    this.loadSidebarCollapsedState();

    // Close sidebar on navigation when in mobile mode
    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) {
          this.sidebarOpen.set(false);
        }
        this.closeMenus();
      });
    this.subscriptions.push(routerSub);

    // Load notification badge
    this.loadNotificationBadge();

    // Refresh badge every 60 seconds
    const badgeSub = interval(60000).subscribe(() => {
      this.loadNotificationBadge();
    });
    this.subscriptions.push(badgeSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  checkMobile() {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) {
      this.sidebarOpen.set(false);
    } else {
      this.sidebarOpen.set(true);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleSidebarCollapse() {
    this.sidebarCollapsed.update(v => !v);
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed()));
  }

  loadSidebarCollapsedState() {
    const collapsed = localStorage.getItem('sidebarCollapsed');
    if (collapsed === 'true') {
      this.sidebarCollapsed.set(true);
    }
  }

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
    this.notificationMenuOpen.set(false);
  }

  toggleNotificationMenu() {
    const wasOpen = this.notificationMenuOpen();
    this.notificationMenuOpen.update(v => !v);
    this.userMenuOpen.set(false);

    // Load notifications when opening
    if (!wasOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    this.notificationsLoading.set(true);
    this.apiService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.notificationsLoading.set(false);
      },
      error: () => {
        this.notificationsLoading.set(false);
      },
    });
  }

  formatNotificationTime(dateString: string): string {
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

  markAllNotificationsRead() {
    this.apiService.markAllNotificationsRead().subscribe({
      next: () => {
        // Update local state
        const updated = this.notifications().map(n => ({ ...n, isRead: true }));
        this.notifications.set(updated);
        this.notificationBadge.update(b => ({ ...b, unreadCount: 0 }));
      },
    });
  }

  closeMenus() {
    this.userMenuOpen.set(false);
    this.notificationMenuOpen.set(false);
  }

  loadNotificationBadge() {
    this.apiService.getNotificationBadge().subscribe({
      next: badge => {
        this.notificationBadge.set(badge);
      },
      error: () => {
        // Silently fail - notifications are not critical
      },
    });
  }

  logout() {
    this.authService.logout();
    this.closeMenus();
  }

  goToAchievements() {
    this.router.navigate(['/achievements']);
    this.closeMenus();
  }

  getUserAvatar(): string {
    const user = this.authService.currentUser();
    if (!user) return 'https://ui-avatars.com/api/?name=User&background=e5e7eb&color=374151&size=40';
    if (user.avatar) return user.avatar;
    const name = user.nickname || user.username;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e5e7eb&color=374151&size=40`;
  }

  getDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'User';
    return user.nickname || user.username;
  }
}
