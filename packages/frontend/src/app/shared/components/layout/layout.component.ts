import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
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
} from '../../icons';
import { AuthService } from '../../../core/services/auth.service';

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
export class LayoutComponent {
  authService = inject(AuthService);

  // Icons
  faGraduationCap = faGraduationCap;
  faHome = faHome;
  faComments = faComments;
  faLanguage = faLanguage;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faChartLine = faChartLine;
  faBars = faBars;
  faUserCircle = faUserCircle;
  faSignOutAlt = faSignOutAlt;

  logout() {
    this.authService.logout();
  }
}
