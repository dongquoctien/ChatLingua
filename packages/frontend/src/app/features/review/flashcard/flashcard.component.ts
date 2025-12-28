import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faVolumeUp,
  faArrowLeft,
  faRedo,
  faThumbsDown,
  faThumbsUp,
  faBolt,
  faCheck,
  faExchangeAlt,
  faStopwatch,
  faTrophy,
} from '../../../shared/icons';
import {
  ApiService,
  QueueItem,
  ReviewRating,
  ReviewResult,
  FlashcardDirection,
  LearningGoals,
} from '../../../core/services/api.service';

interface FlashcardState {
  item: QueueItem;
  direction: 'vi_to_en' | 'en_to_vi';
  isFlipped: boolean;
  startTime: number;
}

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    FontAwesomeModule,
  ],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.scss',
})
export class FlashcardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private sessionStartTime = 0;

  // Icons
  faSpinner = faSpinner;
  faVolumeUp = faVolumeUp;
  faArrowLeft = faArrowLeft;
  faRedo = faRedo;
  faThumbsDown = faThumbsDown;
  faThumbsUp = faThumbsUp;
  faBolt = faBolt;
  faCheck = faCheck;
  faExchangeAlt = faExchangeAlt;
  faStopwatch = faStopwatch;
  faTrophy = faTrophy;

  // State
  loading = signal(true);
  submitting = signal(false);
  queue = signal<QueueItem[]>([]);
  currentIndex = signal(0);
  currentCard = signal<FlashcardState | null>(null);
  preferredDirection = signal<FlashcardDirection>('mixed');
  speaking = signal(false);
  sessionStats = signal({ completed: 0, correct: 0 });
  lastResult = signal<ReviewResult | null>(null);
  showCompletion = signal(false);

  // Timer
  elapsedSeconds = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Computed
  progress = computed(() => {
    const q = this.queue();
    const idx = this.currentIndex();
    if (q.length === 0) return 0;
    return Math.round((idx / q.length) * 100);
  });

  remainingCards = computed(() => {
    return this.queue().length - this.currentIndex();
  });

  ngOnInit() {
    this.loadQueue();
    this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private startTimer() {
    this.sessionStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.sessionStartTime) / 1000));
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  loadQueue() {
    this.loading.set(true);

    // Load goals first to get preferred direction
    this.apiService.getLearningGoals().subscribe({
      next: (goals) => {
        this.preferredDirection.set(goals.preferredDirection);
        this.loadQueueItems();
      },
      error: () => {
        this.loadQueueItems();
      }
    });
  }

  private loadQueueItems() {
    this.apiService.getReviewQueue().subscribe({
      next: (items) => {
        this.queue.set(items);
        this.currentIndex.set(0);
        if (items.length > 0) {
          this.setupCard(items[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private setupCard(item: QueueItem) {
    const direction = this.getCardDirection();
    this.currentCard.set({
      item,
      direction,
      isFlipped: false,
      startTime: Date.now(),
    });
    this.lastResult.set(null);
  }

  private getCardDirection(): 'vi_to_en' | 'en_to_vi' {
    const pref = this.preferredDirection();
    if (pref === 'mixed') {
      return Math.random() > 0.5 ? 'vi_to_en' : 'en_to_vi';
    }
    return pref;
  }

  flipCard() {
    const card = this.currentCard();
    if (card && !card.isFlipped) {
      this.currentCard.set({ ...card, isFlipped: true });
    }
  }

  submitRating(rating: ReviewRating) {
    const card = this.currentCard();
    if (!card || this.submitting()) return;

    this.submitting.set(true);
    const timeSpent = Math.floor((Date.now() - card.startTime) / 1000);

    this.apiService.submitReview({
      vocabularyId: card.item.id,
      rating,
      direction: card.direction,
      timeSpentSeconds: timeSpent,
      reviewType: 'flashcard',
    }).subscribe({
      next: (result) => {
        this.lastResult.set(result);
        this.updateSessionStats(rating);
        this.submitting.set(false);

        // First flip the card back to front
        this.currentCard.set({ ...card, isFlipped: false });

        // Wait for flip animation to complete (600ms), then move to next card
        setTimeout(() => this.nextCard(), 650);
      },
      error: () => {
        this.submitting.set(false);
        // Flip card back and move to next on error
        this.currentCard.set({ ...card, isFlipped: false });
        setTimeout(() => this.nextCard(), 650);
      }
    });
  }

  private updateSessionStats(rating: ReviewRating) {
    const stats = this.sessionStats();
    const isCorrect = rating === 'good' || rating === 'easy';
    this.sessionStats.set({
      completed: stats.completed + 1,
      correct: stats.correct + (isCorrect ? 1 : 0),
    });
  }

  private nextCard() {
    const nextIdx = this.currentIndex() + 1;
    const q = this.queue();

    if (nextIdx >= q.length) {
      this.showCompletion.set(true);
      this.stopTimer();
    } else {
      this.currentIndex.set(nextIdx);
      this.setupCard(q[nextIdx]);
    }
  }

  speak(text: string) {
    if (this.speaking()) {
      speechSynthesis.cancel();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';

    utterance.onstart = () => this.speaking.set(true);
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => this.speaking.set(false);

    speechSynthesis.speak(utterance);
  }

  goBack() {
    this.router.navigate(['/review']);
  }

  restartSession() {
    this.showCompletion.set(false);
    this.sessionStats.set({ completed: 0, correct: 0 });
    this.elapsedSeconds.set(0);
    this.loadQueue();
    this.startTimer();
  }

  getIntervalText(rating: ReviewRating): string {
    // Approximate intervals based on SM2
    switch (rating) {
      case 'again': return '< 1d';
      case 'hard': return '~2d';
      case 'good': return '~4d';
      case 'easy': return '~7d';
    }
  }

  getAccuracy(): number {
    const stats = this.sessionStats();
    if (stats.completed === 0) return 0;
    return Math.round((stats.correct / stats.completed) * 100);
  }

  getFrontText(): string {
    const card = this.currentCard();
    if (!card) return '';
    return card.direction === 'vi_to_en' ? card.item.vietnameseWord : card.item.englishWord;
  }

  getBackText(): string {
    const card = this.currentCard();
    if (!card) return '';
    return card.direction === 'vi_to_en' ? card.item.englishWord : card.item.vietnameseWord;
  }

  getPhonetic(): string | null {
    const card = this.currentCard();
    if (!card) return null;
    return card.item.phonetic || card.item.pronunciationUk || card.item.pronunciationUs;
  }

  getFirstDefinition(): string | null {
    const card = this.currentCard();
    if (!card || !card.item.definitions || card.item.definitions.length === 0) return null;
    return card.item.definitions[0].definition;
  }
}
