import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faGraduationCap, faSpinner, faCheckCircle, faTimes,
  faArrowRight, faRedo, faLightbulb, faPen, faBook
} from '../../../shared/icons';
import {
  ApiService,
  GrammarExerciseInfo,
  GrammarExerciseResult,
  GrammarExerciseType
} from '../../../core/services/api.service';

interface ExerciseSession {
  total: number;
  completed: number;
  correct: number;
  xpEarned: number;
}

@Component({
  selector: 'app-grammar-exercise-practice',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './grammar-exercise-practice.component.html',
  styleUrl: './grammar-exercise-practice.component.scss',
})
export class GrammarExercisePracticeComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Icons
  faGraduationCap = faGraduationCap;
  faSpinner = faSpinner;
  faCheckCircle = faCheckCircle;
  faTimes = faTimes;
  faArrowRight = faArrowRight;
  faRedo = faRedo;
  faLightbulb = faLightbulb;
  faPen = faPen;
  faBook = faBook;

  // State
  loading = signal(true);
  submitting = signal(false);
  exercises = signal<GrammarExerciseInfo[]>([]);
  currentIndex = signal(0);
  userAnswer = signal<string>('');
  selectedOption = signal<string>('');
  showResult = signal(false);
  lastResult = signal<GrammarExerciseResult | null>(null);
  sessionComplete = signal(false);

  // Session tracking
  session = signal<ExerciseSession>({
    total: 0,
    completed: 0,
    correct: 0,
    xpEarned: 0
  });

  // Computed
  currentExercise = computed(() => {
    const items = this.exercises();
    const index = this.currentIndex();
    return items[index] || null;
  });

  progress = computed(() => {
    const s = this.session();
    return s.total > 0 ? (s.completed / s.total) * 100 : 0;
  });

  exerciseTypeLabels: Record<GrammarExerciseType, string> = {
    'error_correction': 'Error Correction',
    'verb_conjugation': 'Verb Conjugation',
    'tense_selection': 'Tense Selection',
    'article_usage': 'Article Usage',
    'preposition_fill': 'Preposition Fill',
    'sentence_transformation': 'Sentence Transformation',
    'word_order': 'Word Order',
  };

  ngOnInit() {
    const grammarPointId = this.route.snapshot.queryParams['grammarPointId'];
    const exerciseType = this.route.snapshot.queryParams['type'];
    this.loadExercises(grammarPointId, exerciseType);
  }

  loadExercises(grammarPointId?: string, exerciseType?: string) {
    this.loading.set(true);

    const filters: any = { limit: 10 };
    if (grammarPointId) filters.grammarPointId = parseInt(grammarPointId);
    if (exerciseType) filters.exerciseType = exerciseType as GrammarExerciseType;

    this.apiService.getGrammarExercises(filters).subscribe({
      next: (exercises) => {
        this.exercises.set(exercises);
        this.session.update(s => ({ ...s, total: exercises.length }));
        this.loading.set(false);

        if (exercises.length === 0) {
          this.sessionComplete.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getExerciseTypeLabel(type: GrammarExerciseType): string {
    return this.exerciseTypeLabels[type] || type;
  }

  isMultipleChoice(): boolean {
    const ex = this.currentExercise();
    return !!(ex && ex.options && ex.options.length > 0);
  }

  submitAnswer() {
    const exercise = this.currentExercise();
    if (!exercise || this.submitting()) return;

    const answer = this.isMultipleChoice() ? this.selectedOption() : this.userAnswer();
    if (!answer.trim()) return;

    this.submitting.set(true);
    this.apiService.submitGrammarExercise(exercise.id, answer).subscribe({
      next: (result) => {
        this.lastResult.set(result);
        this.showResult.set(true);
        this.submitting.set(false);

        // Update session stats
        this.session.update(s => ({
          ...s,
          completed: s.completed + 1,
          correct: result.isCorrect ? s.correct + 1 : s.correct,
          xpEarned: s.xpEarned + (result.xpEarned || 0)
        }));
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  nextExercise() {
    this.showResult.set(false);
    this.lastResult.set(null);
    this.userAnswer.set('');
    this.selectedOption.set('');

    if (this.currentIndex() < this.exercises().length - 1) {
      this.currentIndex.update(i => i + 1);
    } else {
      this.sessionComplete.set(true);
    }
  }

  restartSession() {
    this.currentIndex.set(0);
    this.showResult.set(false);
    this.lastResult.set(null);
    this.userAnswer.set('');
    this.selectedOption.set('');
    this.sessionComplete.set(false);
    this.session.set({
      total: this.exercises().length,
      completed: 0,
      correct: 0,
      xpEarned: 0
    });
  }

  goToGrammarList() {
    this.router.navigate(['/grammar']);
  }

  goToReview() {
    this.router.navigate(['/grammar/review']);
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'bg-gray-100 text-gray-700';
      case 'intermediate': return 'bg-orange-50 text-orange-700';
      case 'advanced': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  }

  getAccuracyPercentage(): number {
    const s = this.session();
    return s.completed > 0 ? Math.round((s.correct / s.completed) * 100) : 0;
  }
}
