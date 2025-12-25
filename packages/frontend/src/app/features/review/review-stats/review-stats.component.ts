import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faChartPie,
  faCalendarAlt,
  faFire,
  faTrophy,
  faCheck,
  faHistory,
} from '../../../shared/icons';
import {
  ApiService,
  ReviewStats,
  ReviewStreak,
  ReviewHistoryItem,
  ReviewHistoryResponse,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-review-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatPaginatorModule,
    MatTableModule,
    MatChipsModule,
    FontAwesomeModule,
  ],
  templateUrl: './review-stats.component.html',
  styleUrl: './review-stats.component.scss',
})
export class ReviewStatsComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Icons
  faSpinner = faSpinner;
  faArrowLeft = faArrowLeft;
  faChartPie = faChartPie;
  faCalendarAlt = faCalendarAlt;
  faFire = faFire;
  faTrophy = faTrophy;
  faCheck = faCheck;
  faHistory = faHistory;

  // State
  loading = signal(true);
  stats = signal<ReviewStats | null>(null);
  streak = signal<ReviewStreak | null>(null);
  history = signal<ReviewHistoryItem[]>([]);
  historyTotal = signal(0);
  historyPage = signal(1);
  historyPageSize = signal(10);

  displayedColumns = ['word', 'quality', 'interval', 'type', 'date'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    Promise.all([
      this.apiService.getReviewStats().toPromise(),
      this.apiService.getReviewStreak().toPromise(),
      this.apiService.getReviewHistory(1, 10).toPromise(),
    ]).then(([stats, streak, history]) => {
      this.stats.set(stats || null);
      this.streak.set(streak || null);
      if (history) {
        this.history.set(history.data);
        this.historyTotal.set(history.total);
      }
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
    });
  }

  loadHistory() {
    this.apiService.getReviewHistory(this.historyPage(), this.historyPageSize()).subscribe({
      next: (response) => {
        this.history.set(response.data);
        this.historyTotal.set(response.total);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.historyPage.set(event.pageIndex + 1);
    this.historyPageSize.set(event.pageSize);
    this.loadHistory();
  }

  goBack() {
    this.router.navigate(['/review']);
  }

  getTotalVocabulary(): number {
    const s = this.stats();
    if (!s) return 0;
    return s.masteredCount + s.reviewingCount + s.learningCount + s.newAvailable;
  }

  getMasteryPercentage(): number {
    const s = this.stats();
    if (!s) return 0;
    const total = this.getTotalVocabulary();
    if (total === 0) return 0;
    return Math.round((s.masteredCount / total) * 100);
  }

  getDonutChartStyle(): string {
    const s = this.stats();
    if (!s) return 'background: #e0e0e0;';
    const total = this.getTotalVocabulary();
    if (total === 0) return 'background: #e0e0e0;';

    const masteredPct = (s.masteredCount / total) * 100;
    const reviewingPct = (s.reviewingCount / total) * 100;
    const learningPct = (s.learningCount / total) * 100;
    // newPct fills the rest

    const p1 = masteredPct;
    const p2 = p1 + reviewingPct;
    const p3 = p2 + learningPct;

    return `background: conic-gradient(
      #4caf50 0% ${p1}%,
      #2196f3 ${p1}% ${p2}%,
      #ff9800 ${p2}% ${p3}%,
      #9e9e9e ${p3}% 100%
    );`;
  }

  getQualityColor(quality: number): string {
    if (quality <= 1) return '#f44336';
    if (quality === 2) return '#ff9800';
    if (quality === 3) return '#4caf50';
    if (quality >= 4) return '#2196f3';
    return '#9e9e9e';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatInterval(days: number): string {
    if (days === 0) return 'Now';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${Math.round(days / 365)} years`;
  }
}
