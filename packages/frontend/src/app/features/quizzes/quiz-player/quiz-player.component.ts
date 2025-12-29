import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faClock,
  faTrophy,
  faFrown,
  faCheckCircle,
  faTimesCircle,
  faArrowLeft,
  faArrowRight,
  faSpinner,
  faBolt,
  faStar,
} from '../../../shared/icons';
import { ApiService, Exercise, Quiz, QuizSubmitResponse } from '../../../core/services/api.service';

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
  ],
  templateUrl: './quiz-player.component.html',
  styleUrl: './quiz-player.component.scss',
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  // Icons
  faClock = faClock;
  faTrophy = faTrophy;
  faFrown = faFrown;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faArrowLeft = faArrowLeft;
  faArrowRight = faArrowRight;
  faSpinner = faSpinner;
  faBolt = faBolt;
  faStar = faStar;

  quiz = signal<Quiz | null>(null);
  exercises = signal<Exercise[]>([]);
  attemptId = signal(0);
  currentIndex = signal(0);
  answers = signal<Record<number, string>>({});
  loading = signal(true);
  completed = signal(false);
  result = signal<QuizSubmitResponse | null>(null);

  timeRemaining = signal(0);
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  currentExercise = computed(() => this.exercises()[this.currentIndex()]);
  progressPercent = computed(() => ((this.currentIndex() + 1) / this.exercises().length) * 100);
  correctCount = computed(() => {
    const res = this.result();
    return res ? res.results.filter(r => r.isCorrect).length : 0;
  });

  getAnswer(id: number): string {
    return this.answers()[id] || '';
  }

  setAnswer(id: number, value: string): void {
    this.answers.update(ans => ({ ...ans, [id]: value }));
  }

  hasAnswer(id: number): boolean {
    return !!this.answers()[id];
  }

  /**
   * Handle answer from exercise components (new types)
   */
  onExerciseAnswer(exerciseId: number, answer: string): void {
    this.setAnswer(exerciseId, answer);
  }

  /**
   * Parse exercise data JSON safely
   */
  parseExerciseData(exercise: Exercise): any {
    if (!exercise.exerciseData) return null;
    if (typeof exercise.exerciseData === 'object') return exercise.exerciseData;
    try {
      return JSON.parse(exercise.exerciseData);
    } catch {
      return null;
    }
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

  startQuiz(quizId: number) {
    this.apiService.getQuiz(quizId).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.apiService.startQuiz(quizId).subscribe({
          next: (response) => {
            this.attemptId.set(response.attemptId);
            // Shuffle questions and options
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

  /**
   * Shuffle questions order and multiple choice options
   */
  private shuffleExercises(exercises: Exercise[]): Exercise[] {
    // Shuffle question order
    const shuffled = this.shuffleArray([...exercises]);

    // Shuffle options for multiple choice questions
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

  /**
   * Fisher-Yates shuffle algorithm
   */
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
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextQuestion() {
    if (this.currentIndex() < this.exercises().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  goToQuestion(index: number) {
    this.currentIndex.set(index);
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

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format answer for display in results based on exercise type
   */
  formatAnswerForDisplay(answer: string | null | undefined, exerciseId: number): string {
    if (!answer) return '(no answer)';

    // Find the exercise to determine its type
    const exercise = this.exercises().find(e => e.id === exerciseId);
    if (!exercise) return answer;

    try {
      switch (exercise.exerciseType) {
        case 'matching': {
          // Parse matching answer: array of {en, vi, correct} or JSON object
          const parsed = typeof answer === 'string' ? JSON.parse(answer) : answer;
          if (Array.isArray(parsed)) {
            // User answer format: [{en, vi, correct}, ...]
            return parsed.map((p: any) => `${p.en} → ${p.vi}`).join(', ');
          } else if (typeof parsed === 'object') {
            // Correct answer format: {en: vi, ...}
            return Object.entries(parsed).map(([en, vi]) => `${en} → ${vi}`).join(', ');
          }
          return answer;
        }

        case 'sentence_building': {
          // User's constructed sentence - just show as is if it's a string
          // If it's an array of words, join them
          if (answer.startsWith('[')) {
            const parsed = JSON.parse(answer);
            if (Array.isArray(parsed)) {
              return parsed.join(' ');
            }
          }
          return answer;
        }

        case 'cloze': {
          // Cloze answers are JSON array
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
      // If parsing fails, return as-is
      return answer;
    }
  }
}
