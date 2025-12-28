import { Component, inject, ViewChild, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
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
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    FontAwesomeModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;

  authService = inject(AuthService);
  private apiService = inject(ApiService);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

  isMobile = false;
  sidenavMode: 'side' | 'over' = 'side';
  sidenavOpened = true;

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

  ngOnInit() {
    // Listen for screen size changes
    const breakpointSub = this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .subscribe(result => {
        this.isMobile = result.matches;
        this.sidenavMode = this.isMobile ? 'over' : 'side';
        this.sidenavOpened = !this.isMobile;
      });
    this.subscriptions.push(breakpointSub);

    // Close sidenav on navigation when in mobile mode
    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile && this.drawer) {
          this.drawer.close();
        }
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
  }

  goToAchievements() {
    this.router.navigate(['/achievements']);
  }
}
