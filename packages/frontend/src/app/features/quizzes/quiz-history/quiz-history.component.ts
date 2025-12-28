import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faHistory,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faTrophy,
  faFrown,
  faClock,
  faCalendarAlt,
  faListOl,
  faPlay,
} from '../../../shared/icons';
import {
  ApiService,
  QuizAttempt,
  QuizAttemptDetail,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-quiz-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    FontAwesomeModule,
  ],
  templateUrl: './quiz-history.component.html',
  styleUrl: './quiz-history.component.scss',
})
export class QuizHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  // Icons
  faArrowLeft = faArrowLeft;
  faHistory = faHistory;
  faSpinner = faSpinner;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faTrophy = faTrophy;
  faFrown = faFrown;
  faClock = faClock;
  faCalendarAlt = faCalendarAlt;
  faListOl = faListOl;
  faPlay = faPlay;

  quizId = signal<number>(0);
  attempts = signal<QuizAttempt[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Expandable details
  expandedAttempts = signal<Set<number>>(new Set());
  attemptDetails = signal<Map<number, QuizAttemptDetail>>(new Map());
  loadingDetails = signal<Set<number>>(new Set());

  // Computed
  completedAttempts = computed(() =>
    this.attempts().filter(a => a.completedAt !== null)
  );

  isEmpty = computed(() => !this.loading() && !this.error() && this.completedAttempts().length === 0);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.quizId.set(parseInt(id, 10));
      this.loadAttempts();
    }
  }

  loadAttempts() {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getQuizAttempts(this.quizId()).subscribe({
      next: (attempts) => {
        this.attempts.set(attempts);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load quiz history');
        this.loading.set(false);
      },
    });
  }

  toggleAttemptDetails(attemptId: number) {
    const expanded = this.expandedAttempts();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(attemptId)) {
      newExpanded.delete(attemptId);
      this.expandedAttempts.set(newExpanded);
    } else {
      newExpanded.add(attemptId);
      this.expandedAttempts.set(newExpanded);

      // Load details if not already loaded
      if (!this.attemptDetails().has(attemptId)) {
        this.loadAttemptDetail(attemptId);
      }
    }
  }

  loadAttemptDetail(attemptId: number) {
    const loading = new Set(this.loadingDetails());
    loading.add(attemptId);
    this.loadingDetails.set(loading);

    this.apiService.getQuizAttemptDetail(this.quizId(), attemptId).subscribe({
      next: (detail) => {
        const details = new Map(this.attemptDetails());
        details.set(attemptId, detail);
        this.attemptDetails.set(details);

        const newLoading = new Set(this.loadingDetails());
        newLoading.delete(attemptId);
        this.loadingDetails.set(newLoading);
      },
      error: () => {
        const newLoading = new Set(this.loadingDetails());
        newLoading.delete(attemptId);
        this.loadingDetails.set(newLoading);
      },
    });
  }

  isExpanded(attemptId: number): boolean {
    return this.expandedAttempts().has(attemptId);
  }

  isLoadingDetails(attemptId: number): boolean {
    return this.loadingDetails().has(attemptId);
  }

  getAttemptDetail(attemptId: number): QuizAttemptDetail | undefined {
    return this.attemptDetails().get(attemptId);
  }

  goBack() {
    this.router.navigate(['/quizzes']);
  }

  startNewQuiz() {
    this.router.navigate(['/quizzes', this.quizId(), 'play']);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'needs-work';
  }

  formatExerciseType(type: string): string {
    const labels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      fill_blank: 'Fill in the Blank',
      translation: 'Translation',
      sentence_building: 'Sentence Building',
      matching: 'Matching',
      spelling: 'Spelling',
      listening: 'Listening',
      error_correction: 'Error Correction',
      verb_conjugation: 'Verb Conjugation',
      cloze: 'Cloze Test',
    };
    return labels[type] || type;
  }

  /**
   * Format answer for display based on exercise type
   */
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
