import { Component, inject, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faDumbbell,
  faSpinner,
} from '../../../shared/icons';
import { ApiService, Exercise, Quiz, QuizSubmitResponse } from '../../../core/services/api.service';
import { ShareDialogComponent, ShareableContent } from '../../chat/components/share-dialog/share-dialog.component';
import { ChatService } from '../../chat/services/chat.service';
import type { UserStatusInfo } from '../../chat/chat.types';

// Import new exercise type components
import {
  SentenceBuildingComponent,
  MatchingComponent,
  SpellingComponent,
  ListeningComponent,
  ErrorCorrectionComponent,
  VerbConjugationComponent,
  ClozeComponent,
} from '../../exercises/exercise-types';

// Import shared exercise components
import {
  ExerciseProgressHeaderComponent,
  ExerciseQuestionCardComponent,
  ExerciseQuestionNavigatorComponent,
  ExerciseResultScreenComponent,
  SlideDirection,
  NavigatorQuestion,
  ExerciseResult,
  ResultAnswer,
} from '../../../shared/components/exercise';

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FontAwesomeModule,
    // New exercise type components
    SentenceBuildingComponent,
    MatchingComponent,
    SpellingComponent,
    ListeningComponent,
    ErrorCorrectionComponent,
    VerbConjugationComponent,
    ClozeComponent,
    ShareDialogComponent,
    // Shared exercise components
    ExerciseProgressHeaderComponent,
    ExerciseQuestionCardComponent,
    ExerciseQuestionNavigatorComponent,
    ExerciseResultScreenComponent,
  ],
  templateUrl: './quiz-player.component.html',
  styleUrl: './quiz-player.component.scss',
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private chatService = inject(ChatService);

  // Icons
  faDumbbell = faDumbbell;
  faSpinner = faSpinner;

  quiz = signal<Quiz | null>(null);
  exercises = signal<Exercise[]>([]);
  attemptId = signal(0);
  currentIndex = signal(0);
  answers = signal<Record<number, string>>({});
  loading = signal(true);
  completed = signal(false);
  result = signal<QuizSubmitResponse | null>(null);

  // Animation state
  slideDirection = signal<SlideDirection>('none');
  isAnimating = signal(false);

  timeRemaining = signal(0);
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  // Touch gesture state
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private readonly SWIPE_THRESHOLD = 50;
  private readonly SWIPE_ANGLE_LIMIT = 30;

  // Share dialog state
  showShareDialog = signal(false);
  shareableUsers = signal<UserStatusInfo[]>([]);
  shareContent = signal<ShareableContent | null>(null);

  currentExercise = computed(() => this.exercises()[this.currentIndex()]);
  progressPercent = computed(() => ((this.currentIndex() + 1) / this.exercises().length) * 100);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  totalQuestions = computed(() => this.exercises().length);
  canSubmit = computed(() => this.answeredCount() === this.totalQuestions());
  isFirstQuestion = computed(() => this.currentIndex() === 0);
  isLastQuestion = computed(() => this.currentIndex() === this.totalQuestions() - 1);

  // Computed for navigator
  navigatorQuestions = computed<NavigatorQuestion[]>(() =>
    this.exercises().map(ex => ({
      id: ex.id,
      hasAnswer: this.hasAnswer(ex.id),
    }))
  );

  // Computed for result screen
  exerciseResult = computed<ExerciseResult | null>(() => {
    const res = this.result();
    if (!res) return null;

    const resultAnswers: ResultAnswer[] = res.results.map((r, i) => {
      const exercise = this.exercises().find(e => e.id === r.exerciseId);
      return {
        exerciseId: r.exerciseId,
        questionOrder: i + 1,
        questionText: exercise?.questionText || '',
        exerciseType: exercise?.exerciseType || 'multiple_choice',
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect,
      };
    });

    return {
      score: res.results.filter(r => r.isCorrect).length,
      total: res.totalQuestions,
      percentage: res.score,
      xpAwarded: res.xpAwarded,
      isPerfect: res.isPerfect,
      results: resultAnswers,
    };
  });

  formattedTime = computed(() => {
    const secs = this.timeSpent();
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  });

  get currentAnswer(): string {
    const exercise = this.currentExercise();
    if (!exercise) return '';
    return this.answers()[exercise.id] || '';
  }

  set currentAnswer(value: string) {
    const exercise = this.currentExercise();
    if (!exercise) return;
    this.setAnswer(exercise.id, value);
  }

  getAnswer(id: number): string {
    return this.answers()[id] || '';
  }

  setAnswer(id: number, value: string): void {
    this.answers.update(ans => ({ ...ans, [id]: value }));
  }

  hasAnswer(id: number): boolean {
    return !!this.answers()[id];
  }

  onExerciseAnswer(exerciseId: number, answer: string): void {
    this.setAnswer(exerciseId, answer);
  }

  parseExerciseData(exercise: Exercise): any {
    let data: any = null;

    if (exercise.exerciseData) {
      if (typeof exercise.exerciseData === 'object') {
        data = { ...exercise.exerciseData };
      } else {
        try {
          data = JSON.parse(exercise.exerciseData);
        } catch {
          data = null;
        }
      }
    }

    if (exercise.exerciseType === 'listening' && exercise.options?.length) {
      data = data || { questionType: 'comprehension' };
      data.comprehensionOptions = exercise.options;
      data.comprehensionQuestion = exercise.questionText;
    }

    return data;
  }

  ngOnInit() {
    const quizId = parseInt(this.route.snapshot.params['id']);
    this.startQuiz(quizId);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (this.loading() || this.completed() || this.isAnimating()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
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
          if (this.canSubmit()) {
            event.preventDefault();
            this.submitQuiz();
          }
        }
        break;
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.loading() || this.completed()) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.loading() || this.completed()) return;
    this.touchEndX = event.touches[0].clientX;
    this.touchEndY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.loading() || this.completed() || this.isAnimating()) return;

    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;

    if (Math.abs(deltaX) < this.SWIPE_THRESHOLD) return;

    const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);
    if (angle > this.SWIPE_ANGLE_LIMIT && angle < 180 - this.SWIPE_ANGLE_LIMIT) return;

    if (deltaX > 0) {
      this.previousQuestion();
    } else {
      this.nextQuestion();
    }

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
  }

  startQuiz(quizId: number) {
    this.apiService.getQuiz(quizId).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.apiService.startQuiz(quizId).subscribe({
          next: (response) => {
            this.attemptId.set(response.attemptId);
            const shuffledExercises = this.shuffleExercises(response.exercises);
            this.exercises.set(shuffledExercises);
            this.startTime = Date.now();

            if (quiz.timeLimitMinutes) {
              this.timeRemaining.set(quiz.timeLimitMinutes * 60);
              this.startTimer();
            }

            this.loading.set(false);
          },
          error: () => {
            this.router.navigate(['/quizzes']);
          }
        });
      },
      error: () => {
        this.router.navigate(['/quizzes']);
      }
    });
  }

  private shuffleExercises(exercises: Exercise[]): Exercise[] {
    const shuffled = this.shuffleArray([...exercises]);
    return shuffled.map(exercise => {
      if (exercise.exerciseType === 'multiple_choice' && exercise.options) {
        return {
          ...exercise,
          options: this.shuffleArray([...exercise.options])
        };
      }
      return exercise;
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.submitQuiz();
      }
    }, 1000);
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

  goToQuestion(index: number) {
    if (index >= 0 && index < this.totalQuestions() && !this.isAnimating()) {
      const direction = index > this.currentIndex() ? 'left' : 'right';
      this.animateToQuestion(index, direction);
    }
  }

  private animateToQuestion(newIndex: number, direction: SlideDirection) {
    this.isAnimating.set(true);
    this.slideDirection.set(direction);

    setTimeout(() => {
      this.currentIndex.set(newIndex);
      this.slideDirection.set('none');

      setTimeout(() => {
        this.isAnimating.set(false);
      }, 250);
    }, 200);
  }

  submitQuiz() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    this.timeSpent.set(timeSpent);

    const quizId = this.quiz()!.id;
    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.answers())) {
      answers[key] = value || '';
    }

    this.loading.set(true);
    this.apiService.submitQuiz(quizId, this.attemptId(), answers, timeSpent).subscribe({
      next: (result) => {
        this.result.set(result);
        this.completed.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getExerciseTypeLabel = (type: string): string => {
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
  };

  formatAnswerForDisplay = (answer: string | null, exerciseType: string): string => {
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
          const parsed = typeof answer === 'string' ? JSON.parse(answer) : answer;

          const extractValue = (item: any): string => {
            if (item === null || item === undefined) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'number') return String(item);
            if (typeof item === 'object') {
              const val = item.answer ?? item.value ?? item.text;
              if (typeof val === 'string') return val;
              if (typeof val === 'number') return String(val);
              return JSON.stringify(item);
            }
            return String(item);
          };

          if (Array.isArray(parsed)) {
            return parsed.map((a: any, i: number) => `[${i + 1}] ${extractValue(a)}`).join(', ');
          } else if (typeof parsed === 'object' && parsed !== null) {
            return Object.entries(parsed)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([key, val]) => `[${key}] ${extractValue(val)}`)
              .join(', ');
          }
          return answer;
        }

        default:
          return answer;
      }
    } catch {
      return answer;
    }
  };

  onResultBack(): void {
    this.router.navigate(['/quizzes']);
  }

  onResultHistory(): void {
    this.router.navigate(['/quizzes/history']);
  }

  // Share functionality
  openShareDialog(): void {
    const res = this.result();
    const quizData = this.quiz();
    if (!res || !quizData) return;

    const score = res.score;
    let performanceText = '';
    if (score >= 90) {
      performanceText = 'Excellent!';
    } else if (score >= 70) {
      performanceText = 'Great Job!';
    } else if (score >= 50) {
      performanceText = 'Good Effort!';
    } else {
      performanceText = 'Keep Practicing!';
    }

    const correctCount = res.results.filter(r => r.isCorrect).length;

    this.shareContent.set({
      type: 'quiz',
      id: quizData.id,
      title: quizData.title,
      subtitle: `${score}% • ${correctCount}/${res.totalQuestions} correct • ${performanceText}`,
      icon: '📋',
      iconBgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      data: {
        quizId: quizData.id,
        quizTitle: quizData.title,
        score: score,
        correctCount: correctCount,
        totalQuestions: res.totalQuestions,
        timeSpent: this.formattedTime(),
        xpAwarded: res.xpAwarded || 0,
        isPerfect: res.isPerfect || false,
      },
    });

    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        this.shareableUsers.set(response.items);
        this.showShareDialog.set(true);
      },
      error: (err) => {
        console.error('Failed to load users for sharing:', err);
      },
    });
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
  }

  onShared(event: { recipientId: number; comment: string }): void {
    this.showShareDialog.set(false);
  }
}
