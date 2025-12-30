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
  faCog,
  faGamepad,
} from '../../icons';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Subscription, filter, interval } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
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
  isMobile = signal(false);
  userMenuOpen = signal(false);
  notificationMenuOpen = signal(false);

  // Notification badge
  notificationBadge = signal<{ unreadCount: number; hasNewAchievements: boolean }>({
    unreadCount: 0,
    hasNewAchievements: false,
  });

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
  faCog = faCog;
  faGamepad = faGamepad;

  // Navigation items
  navItems = [
    { path: '/dashboard', icon: this.faHome, label: 'Dashboard' },
    { path: '/conversations', icon: this.faComments, label: 'Conversations' },
    { path: '/vocabulary', icon: this.faLanguage, label: 'Vocabulary' },
    { path: '/review', icon: this.faBrain, label: 'Daily Review' },
    { path: '/grammar', icon: this.faBook, label: 'Grammar' },
    { path: '/exercises', icon: this.faDumbbell, label: 'Exercises' },
    { path: '/quizzes', icon: this.faQuestionCircle, label: 'Quizzes' },
    { path: '/games', icon: this.faGamepad, label: 'Games' },
    { path: '/reports', icon: this.faChartLine, label: 'Reports' },
  ];

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  ngOnInit() {
    this.checkMobile();

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

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
    this.notificationMenuOpen.set(false);
  }

  toggleNotificationMenu() {
    this.notificationMenuOpen.update(v => !v);
    this.userMenuOpen.set(false);
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
