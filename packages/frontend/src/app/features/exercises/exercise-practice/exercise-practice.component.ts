import { Component, inject, OnInit, OnDestroy, signal, computed, HostListener, ElementRef, ViewChild } from '@angular/core';
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
  faBolt,
} from '../../../shared/icons';
import {
  ApiService,
  SessionExercise,
  SessionResult,
  SessionAnswer,
} from '../../../core/services/api.service';

// New exercise type components
import { SentenceBuildingComponent, SentenceBuildingData } from '../exercise-types/sentence-building/sentence-building.component';
import { MatchingComponent, MatchingData } from '../exercise-types/matching/matching.component';
import { SpellingComponent, SpellingData } from '../exercise-types/spelling/spelling.component';
import { ListeningComponent, ListeningData } from '../exercise-types/listening/listening.component';
import { ErrorCorrectionComponent, ErrorCorrectionData } from '../exercise-types/error-correction/error-correction.component';
import { VerbConjugationComponent, VerbConjugationData } from '../exercise-types/verb-conjugation/verb-conjugation.component';
import { ClozeComponent, ClozeData } from '../exercise-types/cloze/cloze.component';

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
    // New exercise type components
    SentenceBuildingComponent,
    MatchingComponent,
    SpellingComponent,
    ListeningComponent,
    ErrorCorrectionComponent,
    VerbConjugationComponent,
    ClozeComponent,
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
  faBolt = faBolt;

  // State
  state = signal<PracticeState>('start');
  sessionId = signal<number | null>(null);
  exercises = signal<SessionExercise[]>([]);
  currentIndex = signal(0);
  answers = signal<Record<string, string>>({});
  result = signal<SessionResult | null>(null);
  error = signal<string | null>(null);

  // Animation state
  slideDirection = signal<'left' | 'right' | 'none'>('none');
  isAnimating = signal(false);
  showCelebration = signal(false);

  // Touch gesture state
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for swipe
  private readonly SWIPE_ANGLE_LIMIT = 30; // Maximum vertical angle for horizontal swipe

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

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    // Only handle keys during practice mode
    if (this.state() !== 'practice' || this.isAnimating()) return;

    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Allow Enter to move to next question from input
      if (event.key === 'Enter' && !event.shiftKey && !this.isLastQuestion()) {
        event.preventDefault();
        this.nextQuestion();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previousQuestion();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextQuestion();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        // Quick select options for multiple choice (1-4)
        const exercise = this.currentExercise();
        if (exercise?.exerciseType === 'multiple_choice' && exercise.options) {
          const optionIndex = parseInt(event.key) - 1;
          if (optionIndex < exercise.options.length) {
            this.currentAnswer = exercise.options[optionIndex];
          }
        }
        break;
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          // Ctrl+Enter or Cmd+Enter to submit
          if (this.canSubmit()) {
            event.preventDefault();
            this.submitSession();
          }
        }
        break;
    }
  }

  // Touch gesture handlers for swipe navigation
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.state() !== 'practice') return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.state() !== 'practice') return;
    this.touchEndX = event.touches[0].clientX;
    this.touchEndY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.state() !== 'practice' || this.isAnimating()) return;

    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;

    // Check if this is a valid horizontal swipe
    if (Math.abs(deltaX) < this.SWIPE_THRESHOLD) return;

    // Calculate angle - reject if too vertical
    const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);
    if (angle > this.SWIPE_ANGLE_LIMIT && angle < 180 - this.SWIPE_ANGLE_LIMIT) return;

    if (deltaX > 0) {
      // Swipe right -> go to previous question
      this.previousQuestion();
    } else {
      // Swipe left -> go to next question
      this.nextQuestion();
    }

    // Reset touch positions
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
  }

  startPractice() {
    this.state.set('loading');
    this.error.set(null);

    this.apiService.startExerciseSession(10).subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        // Shuffle exercises and their options
        const shuffledExercises = this.shuffleExercises(response.exercises);
        this.exercises.set(shuffledExercises);
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

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Shuffle exercises and their options
  private shuffleExercises(exercises: SessionExercise[]): SessionExercise[] {
    // Shuffle the order of exercises
    const shuffledExercises = this.shuffleArray(exercises);

    // Shuffle options for each multiple_choice exercise
    return shuffledExercises.map((exercise, index) => ({
      ...exercise,
      questionOrder: index + 1, // Update question order after shuffle
      options: exercise.exerciseType === 'multiple_choice' && exercise.options
        ? this.shuffleArray(exercise.options)
        : exercise.options,
    }));
  }

  goToQuestion(index: number) {
    if (index >= 0 && index < this.totalQuestions() && !this.isAnimating()) {
      const direction = index > this.currentIndex() ? 'left' : 'right';
      this.animateToQuestion(index, direction);
    }
  }

  previousQuestion() {
    if (!this.isFirstQuestion() && !this.isAnimating()) {
      this.animateToQuestion(this.currentIndex() - 1, 'right');
    }
  }

  nextQuestion() {
    if (!this.isLastQuestion() && !this.isAnimating()) {
      this.animateToQuestion(this.currentIndex() + 1, 'left');
    }
  }

  private animateToQuestion(newIndex: number, direction: 'left' | 'right') {
    this.isAnimating.set(true);
    this.slideDirection.set(direction);

    // Wait for exit animation, then change question
    setTimeout(() => {
      this.currentIndex.set(newIndex);
      this.slideDirection.set('none');

      // Allow enter animation to complete
      setTimeout(() => {
        this.isAnimating.set(false);
      }, 250);
    }, 200);
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

        // Trigger celebration for good scores
        if (result.percentage >= 70) {
          this.triggerCelebration();
        }
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

  // Handler for new exercise type components
  onExerciseAnswerChange(answer: string) {
    const exercise = this.currentExercise();
    if (!exercise) return;
    this.answers.update(ans => ({
      ...ans,
      [exercise.id.toString()]: answer
    }));
  }

  // Helper to get exercise-specific data
  getExerciseData<T>(exercise: SessionExercise): T | null {
    return (exercise.exerciseData as T) || null;
  }

  // Get exercise type display name
  getExerciseTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'multiple_choice': 'Multiple Choice',
      'fill_blank': 'Fill in the Blank',
      'translation': 'Translation',
      'sentence_building': 'Sentence Building',
      'matching': 'Matching',
      'spelling': 'Spelling',
      'listening': 'Listening',
      'error_correction': 'Error Correction',
      'verb_conjugation': 'Verb Conjugation',
      'cloze': 'Cloze Test',
    };
    return labels[type] || type;
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

  private triggerCelebration() {
    this.showCelebration.set(true);
    // Hide celebration after animation completes
    setTimeout(() => {
      this.showCelebration.set(false);
    }, 3000);
  }
}
