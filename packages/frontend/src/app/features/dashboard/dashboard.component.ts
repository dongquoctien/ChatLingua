import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFire,
  faComments,
  faLanguage,
  faCheckCircle,
  faGraduationCap,
  faDumbbell,
  faQuestionCircle,
  faHistory,
  faSpinner,
} from '../../shared/icons';
import { ApiService, UserStats } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    FontAwesomeModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  // Icons
  faFire = faFire;
  faComments = faComments;
  faLanguage = faLanguage;
  faCheckCircle = faCheckCircle;
  faGraduationCap = faGraduationCap;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faHistory = faHistory;
  faSpinner = faSpinner;

  stats = signal<UserStats | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.apiService.getStatsOverview().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
