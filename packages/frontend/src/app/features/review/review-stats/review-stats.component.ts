import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  faChevronLeft,
  faChevronRight,
} from '../../../shared/icons';
import {
  ApiService,
  ReviewStats,
  ReviewStreak,
  ReviewHistoryItem,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-review-stats',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './review-stats.component.html',
  styleUrl: './review-stats.component.scss',
})
export class ReviewStatsComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  Math = Math; // Expose Math for template

  // Icons
  faSpinner = faSpinner;
  faArrowLeft = faArrowLeft;
  faChartPie = faChartPie;
  faCalendarAlt = faCalendarAlt;
  faFire = faFire;
  faTrophy = faTrophy;
  faCheck = faCheck;
  faHistory = faHistory;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  // State
  loading = signal(true);
  stats = signal<ReviewStats | null>(null);
  streak = signal<ReviewStreak | null>(null);
  history = signal<ReviewHistoryItem[]>([]);
  historyTotal = signal(0);
  historyPage = signal(1);
  historyPageSize = signal(10);

  pageSizeOptions = [5, 10, 20];

  // Computed
  totalPages = computed(() => Math.ceil(this.historyTotal() / this.historyPageSize()));
  canGoPrev = computed(() => this.historyPage() > 1);
  canGoNext = computed(() => this.historyPage() < this.totalPages());

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

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.historyPageSize.set(parseInt(select.value, 10));
    this.historyPage.set(1);
    this.loadHistory();
  }

  prevPage() {
    if (this.canGoPrev()) {
      this.historyPage.update(p => p - 1);
      this.loadHistory();
    }
  }

  nextPage() {
    if (this.canGoNext()) {
      this.historyPage.update(p => p + 1);
      this.loadHistory();
    }
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
    if (!s) return 'background: #e5e7eb;';
    const total = this.getTotalVocabulary();
    if (total === 0) return 'background: #e5e7eb;';

    const masteredPct = (s.masteredCount / total) * 100;
    const reviewingPct = (s.reviewingCount / total) * 100;
    const learningPct = (s.learningCount / total) * 100;

    const p1 = masteredPct;
    const p2 = p1 + reviewingPct;
    const p3 = p2 + learningPct;

    return `background: conic-gradient(
      #111827 0% ${p1}%,
      #6b7280 ${p1}% ${p2}%,
      #f97316 ${p2}% ${p3}%,
      #9ca3af ${p3}% 100%
    );`;
  }

  getSegmentWidth(count: number): number {
    const total = this.getTotalVocabulary();
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  getQualityClass(quality: number): string {
    if (quality <= 1) return 'bg-red-700';
    if (quality === 2) return 'bg-orange-700';
    if (quality === 3) return 'bg-green-700';
    if (quality >= 4) return 'bg-blue-700';
    return 'bg-gray-500';
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
