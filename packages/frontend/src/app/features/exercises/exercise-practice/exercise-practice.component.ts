import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faDumbbell,
  faTrophy,
  faFrown,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faArrowLeft,
  faArrowRight,
  faClock,
  faHistory,
} from '../../../shared/icons';
import {
  ApiService,
  SessionExercise,
  SessionResult,
  SessionAnswer,
} from '../../../core/services/api.service';

type PracticeState = 'start' | 'loading' | 'practice' | 'submitting' | 'results';

@Component({
  selector: 'app-exercise-practice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDividerModule,
    FontAwesomeModule,
  ],
  templateUrl: './exercise-practice.component.html',
  styleUrl: './exercise-practice.component.scss',
})
export class ExercisePracticeComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Icons
  faDumbbell = faDumbbell;
  faTrophy = faTrophy;
  faFrown = faFrown;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faSpinner = faSpinner;
  faArrowLeft = faArrowLeft;
  faArrowRight = faArrowRight;
  faClock = faClock;
  faHistory = faHistory;

  // State
  state = signal<PracticeState>('start');
  sessionId = signal<number | null>(null);
  exercises = signal<SessionExercise[]>([]);
  currentIndex = signal(0);
  answers = signal<Record<string, string>>({});
  result = signal<SessionResult | null>(null);
  error = signal<string | null>(null);

  // Timer
  startTime = 0;
  elapsedSeconds = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Computed
  currentExercise = computed(() => this.exercises()[this.currentIndex()]);
  totalQuestions = computed(() => this.exercises().length);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  progressPercent = computed(() =>
    this.totalQuestions() > 0 ? ((this.currentIndex() + 1) / this.totalQuestions()) * 100 : 0
  );
  formattedTime = computed(() => {
    const secs = this.elapsedSeconds();
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  });
  canSubmit = computed(() => this.answeredCount() === this.totalQuestions());
  isFirstQuestion = computed(() => this.currentIndex() === 0);
  isLastQuestion = computed(() => this.currentIndex() === this.totalQuestions() - 1);

  // Current answer for the current exercise
  get currentAnswer(): string {
    const exercise = this.currentExercise();
    if (!exercise) return '';
    return this.answers()[exercise.id.toString()] || '';
  }

  set currentAnswer(value: string) {
    const exercise = this.currentExercise();
    if (!exercise) return;
    this.answers.update(ans => ({
      ...ans,
      [exercise.id.toString()]: value
    }));
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.stopTimer();
  }

  startPractice() {
    this.state.set('loading');
    this.error.set(null);

    this.apiService.startExerciseSession(10).subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        this.exercises.set(response.exercises);
        this.currentIndex.set(0);
        this.answers.set({});
        this.result.set(null);
        this.state.set('practice');
        this.startTimer();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to start practice session');
        this.state.set('start');
      }
    });
  }

  goToQuestion(index: number) {
    if (index >= 0 && index < this.totalQuestions()) {
      this.currentIndex.set(index);
    }
  }

  previousQuestion() {
    if (!this.isFirstQuestion()) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextQuestion() {
    if (!this.isLastQuestion()) {
      this.currentIndex.update(i => i + 1);
    }
  }

  submitSession() {
    const sid = this.sessionId();
    if (!sid) return;

    this.state.set('submitting');
    this.stopTimer();

    this.apiService.submitExerciseSession(sid, this.answers(), this.elapsedSeconds()).subscribe({
      next: (result) => {
        this.result.set(result);
        this.state.set('results');
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to submit session');
        this.state.set('practice');
        this.startTimer(); // Resume timer on error
      }
    });
  }

  practiceAgain() {
    this.startPractice();
  }

  viewHistory() {
    this.router.navigate(['/exercises/history']);
  }

  hasAnswer(exerciseId: number): boolean {
    return !!this.answers()[exerciseId.toString()];
  }

  getQuestionNumbers(): number[] {
    return Array.from({ length: this.totalQuestions() }, (_, i) => i + 1);
  }

  private startTimer() {
    this.startTime = Date.now();
    this.elapsedSeconds.set(0);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.startTime) / 1000));
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
