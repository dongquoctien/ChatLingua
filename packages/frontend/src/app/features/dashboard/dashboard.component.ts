import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
  faBrain,
  faPlay,
} from '../../shared/icons';
import { ApiService, UserStats, QueueStats, ReviewStreak } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
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
  faBrain = faBrain;
  faPlay = faPlay;

  stats = signal<UserStats | null>(null);
  loading = signal(true);
  queueStats = signal<QueueStats | null>(null);
  streak = signal<ReviewStreak | null>(null);

  ngOnInit() {
    this.loadStats();
    this.loadReviewData();
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

  loadReviewData() {
    this.apiService.getQueueStats().subscribe({
      next: (stats) => this.queueStats.set(stats),
    });
    this.apiService.getReviewStreak().subscribe({
      next: (streak) => this.streak.set(streak),
    });
  }

  getTotalDue(): number {
    const q = this.queueStats();
    if (!q) return 0;
    return q.due + q.overdue + q.new;
  }
}
