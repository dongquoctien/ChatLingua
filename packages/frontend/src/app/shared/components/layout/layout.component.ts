import { Component, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
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
} from '../../icons';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, filter } from 'rxjs';

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
    FontAwesomeModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;

  authService = inject(AuthService);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

  isMobile = false;
  sidenavMode: 'side' | 'over' = 'side';
  sidenavOpened = true;

  // Icons
  faGraduationCap = faGraduationCap;
  faHome = faHome;
  faComments = faComments;
  faLanguage = faLanguage;
  faBrain = faBrain;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faChartLine = faChartLine;
  faBars = faBars;
  faUserCircle = faUserCircle;
  faSignOutAlt = faSignOutAlt;

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
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  logout() {
    this.authService.logout();
  }
}
