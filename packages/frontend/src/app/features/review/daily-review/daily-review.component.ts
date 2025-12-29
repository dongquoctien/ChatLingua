import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFire,
  faSpinner,
  faPlay,
  faBrain,
  faCog,
  faExclamationTriangle,
  faCheckCircle,
  faLayerGroup,
  faChartLine,
  faSyncAlt,
} from '../../../shared/icons';
import {
  ApiService,
  QueueStats,
  ReviewStreak,
  LearningGoals,
  ReviewStats,
} from '../../../core/services/api.service';
import { LearningGoalsDialogComponent } from '../learning-goals/learning-goals-dialog.component';

@Component({
  selector: 'app-daily-review',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    LearningGoalsDialogComponent,
  ],
  templateUrl: './daily-review.component.html',
  styleUrl: './daily-review.component.scss',
})
export class DailyReviewComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  @ViewChild('goalsDialog') goalsDialog!: LearningGoalsDialogComponent;

  // Icons
  faFire = faFire;
  faSpinner = faSpinner;
  faPlay = faPlay;
  faBrain = faBrain;
  faCog = faCog;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faLayerGroup = faLayerGroup;
  faChartLine = faChartLine;
  faSyncAlt = faSyncAlt;

  // State
  loading = signal(true);
  queueStats = signal<QueueStats | null>(null);
  streak = signal<ReviewStreak | null>(null);
  goals = signal<LearningGoals | null>(null);
  reviewStats = signal<ReviewStats | null>(null);
  rebuilding = signal(false);

  // Computed
  progressPercentage = computed(() => {
    const stats = this.queueStats();
    const g = this.goals();
    if (!stats || !g) return 0;
    const target = g.dailyReviews;
    return Math.min(100, Math.round((stats.completed / target) * 100));
  });

  hasDueCards = computed(() => {
    const stats = this.queueStats();
    return stats && (stats.due > 0 || stats.overdue > 0 || stats.new > 0);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Load all data in parallel
    Promise.all([
      this.apiService.getQueueStats().toPromise(),
      this.apiService.getReviewStreak().toPromise(),
      this.apiService.getLearningGoals().toPromise(),
      this.apiService.getReviewStats().toPromise(),
    ]).then(([queueStats, streak, goals, reviewStats]) => {
      this.queueStats.set(queueStats || null);
      this.streak.set(streak || null);
      this.goals.set(goals || null);
      this.reviewStats.set(reviewStats || null);
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
    });
  }

  startReview() {
    this.router.navigate(['/review/flashcard']);
  }

  rebuildQueue() {
    this.rebuilding.set(true);
    this.apiService.rebuildQueue().subscribe({
      next: (result) => {
        this.queueStats.set(result.stats);
        this.rebuilding.set(false);
      },
      error: () => {
        this.rebuilding.set(false);
      }
    });
  }

  openSettings() {
    this.goalsDialog.open();
  }

  onGoalsDialogClosed(result: LearningGoals | null) {
    if (result) {
      this.goals.set(result);
    }
  }

  viewStats() {
    this.router.navigate(['/review/stats']);
  }

  getMasteryPercentage(): number {
    const stats = this.reviewStats();
    if (!stats) return 0;
    const total = stats.masteredCount + stats.learningCount + stats.reviewingCount + stats.newAvailable;
    if (total === 0) return 0;
    return Math.round((stats.masteredCount / total) * 100);
  }

  getBarPercentage(count: number): number {
    const stats = this.reviewStats();
    if (!stats) return 0;
    const total = stats.masteredCount + stats.learningCount + stats.reviewingCount + stats.newAvailable;
    if (total === 0) return 0;
    return (count / total) * 100;
  }
}
