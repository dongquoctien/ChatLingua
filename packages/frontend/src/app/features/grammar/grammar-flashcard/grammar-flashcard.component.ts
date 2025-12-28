import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBook, faSpinner, faLightbulb, faRedo,
  faCheckCircle, faTimes, faArrowRight, faArrowLeft,
  faFire, faClock, faStar, faGraduationCap
} from '@fortawesome/free-solid-svg-icons';
import {
  ApiService,
  GrammarQueueItem,
  GrammarReviewQueueResponse,
  GrammarReviewResult
} from '../../../core/services/api.service';

interface ReviewSession {
  total: number;
  completed: number;
  correct: number;
  xpEarned: number;
}

@Component({
  selector: 'app-grammar-flashcard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDialogModule,
    FontAwesomeModule,
  ],
  templateUrl: './grammar-flashcard.component.html',
  styleUrl: './grammar-flashcard.component.scss',
})
export class GrammarFlashcardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Icons
  faBook = faBook;
  faSpinner = faSpinner;
  faLightbulb = faLightbulb;
  faRedo = faRedo;
  faCheckCircle = faCheckCircle;
  faTimes = faTimes;
  faArrowRight = faArrowRight;
  faArrowLeft = faArrowLeft;
  faFire = faFire;
  faClock = faClock;
  faStar = faStar;
  faGraduationCap = faGraduationCap;

  // State
  loading = signal(true);
  submitting = signal(false);
  queue = signal<GrammarQueueItem[]>([]);
  currentIndex = signal(0);
  showAnswer = signal(false);
  sessionComplete = signal(false);

  // Session tracking
  session = signal<ReviewSession>({
    total: 0,
    completed: 0,
    correct: 0,
    xpEarned: 0
  });

  // Computed
  currentItem = computed(() => {
    const items = this.queue();
    const index = this.currentIndex();
    return items[index] || null;
  });

  progress = computed(() => {
    const s = this.session();
    return s.total > 0 ? (s.completed / s.total) * 100 : 0;
  });

  hasNext = computed(() => this.currentIndex() < this.queue().length - 1);
  hasPrevious = computed(() => this.currentIndex() > 0);

  // Rating options
  ratings = [
    { quality: 1, label: 'Again', shortcut: '1', color: '#f44336', description: "Didn't remember" },
    { quality: 2, label: 'Hard', shortcut: '2', color: '#ff9800', description: 'Remembered with difficulty' },
    { quality: 3, label: 'Good', shortcut: '3', color: '#4caf50', description: 'Remembered correctly' },
    { quality: 5, label: 'Easy', shortcut: '4', color: '#2196f3', description: 'Very easy to recall' },
  ];

  ngOnInit() {
    this.loadQueue();
    this.setupKeyboardShortcuts();
  }

  loadQueue() {
    this.loading.set(true);
    this.apiService.getGrammarReviewQueue().subscribe({
      next: (response: GrammarReviewQueueResponse) => {
        const allItems = [
          ...response.overdue,
          ...response.due,
          ...response.newItems
        ];
        this.queue.set(allItems);
        this.session.update(s => ({ ...s, total: allItems.length }));
        this.loading.set(false);

        if (allItems.length === 0) {
          this.sessionComplete.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.sessionComplete() || this.loading() || this.submitting()) return;

      // Space to reveal answer
      if (e.code === 'Space' && !this.showAnswer()) {
        e.preventDefault();
        this.revealAnswer();
        return;
      }

      // Number keys for rating (1-4)
      if (this.showAnswer() && e.key >= '1' && e.key <= '4') {
        const ratingIndex = parseInt(e.key) - 1;
        if (ratingIndex < this.ratings.length) {
          this.submitRating(this.ratings[ratingIndex].quality);
        }
      }
    });
  }

  revealAnswer() {
    this.showAnswer.set(true);
  }

  submitRating(quality: number) {
    const item = this.currentItem();
    if (!item || this.submitting()) return;

    this.submitting.set(true);
    this.apiService.submitGrammarReview(item.grammarPointId, quality).subscribe({
      next: (result: GrammarReviewResult) => {
        // Update session stats
        this.session.update(s => ({
          ...s,
          completed: s.completed + 1,
          correct: quality >= 3 ? s.correct + 1 : s.correct,
          xpEarned: s.xpEarned + (result.xpEarned || 0)
        }));

        this.submitting.set(false);
        this.moveToNext();
      },
      error: () => {
        this.submitting.set(false);
        // Move to next anyway to not block the session
        this.moveToNext();
      }
    });
  }

  moveToNext() {
    this.showAnswer.set(false);

    if (this.hasNext()) {
      this.currentIndex.update(i => i + 1);
    } else {
      this.sessionComplete.set(true);
    }
  }

  moveToPrevious() {
    if (this.hasPrevious()) {
      this.currentIndex.update(i => i - 1);
      this.showAnswer.set(false);
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'overdue': return 'Overdue';
      case 'due': return 'Due Today';
      case 'new': return 'New';
      default: return priority;
    }
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  restartSession() {
    this.currentIndex.set(0);
    this.showAnswer.set(false);
    this.sessionComplete.set(false);
    this.session.set({
      total: this.queue().length,
      completed: 0,
      correct: 0,
      xpEarned: 0
    });
  }

  goToGrammarList() {
    this.router.navigate(['/grammar']);
  }

  goToExercises() {
    this.router.navigate(['/grammar/exercises']);
  }
}
