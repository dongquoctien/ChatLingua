import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHistory,
  faTrophy,
  faFrown,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faArrowLeft,
  faChartLine,
  faCalendarAlt,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
} from '../../../shared/icons';
import {
  ApiService,
  ExerciseSession,
  SessionResult,
  SessionAnswer,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-exercise-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
  ],
  templateUrl: './exercise-history.component.html',
  styleUrl: './exercise-history.component.scss',
})
export class ExerciseHistoryComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Icons
  faHistory = faHistory;
  faTrophy = faTrophy;
  faFrown = faFrown;
  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faSpinner = faSpinner;
  faArrowLeft = faArrowLeft;
  faChartLine = faChartLine;
  faCalendarAlt = faCalendarAlt;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  // State
  loading = signal(true);
  sessions = signal<ExerciseSession[]>([]);
  totalSessions = signal(0);
  page = signal(1);
  limit = signal(10);
  error = signal<string | null>(null);

  // Expanded session details
  expandedSessionId = signal<number | null>(null);
  sessionDetails = signal<Record<number, SessionResult>>({});
  loadingDetails = signal<Record<number, boolean>>({});

  // Computed
  isEmpty = computed(() => !this.loading() && this.sessions().length === 0);
  totalPages = computed(() => Math.ceil(this.totalSessions() / this.limit()));

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getExerciseSessionHistory(this.page(), this.limit()).subscribe({
      next: (response) => {
        this.sessions.set(response.data);
        this.totalSessions.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load history');
        this.loading.set(false);
      }
    });
  }

  onPageChange(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.loadHistory();
    }
  }

  onLimitChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.limit.set(parseInt(select.value, 10));
    this.page.set(1);
    this.loadHistory();
  }

  toggleSessionDetails(sessionId: number) {
    if (this.expandedSessionId() === sessionId) {
      this.expandedSessionId.set(null);
      return;
    }

    this.expandedSessionId.set(sessionId);

    if (!this.sessionDetails()[sessionId]) {
      this.loadSessionDetails(sessionId);
    }
  }

  loadSessionDetails(sessionId: number) {
    this.loadingDetails.update(loading => ({ ...loading, [sessionId]: true }));

    this.apiService.getExerciseSessionDetail(sessionId).subscribe({
      next: (result) => {
        this.sessionDetails.update(details => ({ ...details, [sessionId]: result }));
        this.loadingDetails.update(loading => ({ ...loading, [sessionId]: false }));
      },
      error: () => {
        this.loadingDetails.update(loading => ({ ...loading, [sessionId]: false }));
      }
    });
  }

  getSessionDetail(sessionId: number): SessionResult | null {
    return this.sessionDetails()[sessionId] || null;
  }

  isLoadingDetails(sessionId: number): boolean {
    return this.loadingDetails()[sessionId] || false;
  }

  isExpanded(sessionId: number): boolean {
    return this.expandedSessionId() === sessionId;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getScoreClasses(percentage: number): string {
    if (percentage >= 80) return 'bg-gray-100 text-gray-700';
    if (percentage >= 60) return 'bg-gray-50 text-gray-700';
    if (percentage >= 40) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'abandoned': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  goBack() {
    this.router.navigate(['/exercises/practice']);
  }

  startNewPractice() {
    this.router.navigate(['/exercises/practice']);
  }

  formatAnswerForDisplay(answer: string | null | undefined, exerciseType: string): string {
    if (!answer) return '(no answer)';

    try {
      switch (exerciseType) {
        case 'matching': {
          const parsed = typeof answer === 'string' ? JSON.parse(answer) : answer;
          if (Array.isArray(parsed)) {
            return parsed.map((p: any) => `${p.en} → ${p.vi}`).join(', ');
          } else if (typeof parsed === 'object') {
            return Object.entries(parsed).map(([en, vi]) => `${en} → ${vi}`).join(', ');
          }
          return answer;
        }

        case 'sentence_building': {
          if (answer.startsWith('[')) {
            const parsed = JSON.parse(answer);
            if (Array.isArray(parsed)) {
              return parsed.join(' ');
            }
          }
          return answer;
        }

        case 'cloze': {
          const parsed = JSON.parse(answer);
          if (Array.isArray(parsed)) {
            return parsed.map((a: any, i: number) => `[${i + 1}] ${a}`).join(', ');
          }
          return answer;
        }

        default:
          return answer;
      }
    } catch {
      return answer;
    }
  }
}
