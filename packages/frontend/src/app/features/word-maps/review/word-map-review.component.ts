import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WordMapService, CEFRLevel } from '../word-map.service';

interface VocabularyReviewItem {
  id: number;
  masterVocabularyId: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  partOfSpeech: string;
  masteryLevel: number;
  nextReviewAt: string;
  reviewStatus: string;
}

interface GrammarReviewItem {
  id: number;
  masterGrammarId: number;
  grammarRule: string;
  category: string;
  explanation: string;
  explanationVi: string;
  formula?: string;
  examples: { en: string; vi: string }[];
  masteryLevel: number;
  nextReviewAt: string;
  reviewStatus: string;
}

type ReviewItem = VocabularyReviewItem | GrammarReviewItem;
type ReviewMode = 'vocabulary' | 'grammar' | 'mixed';

@Component({
  selector: 'app-word-map-review',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './word-map-review.component.html',
  styleUrls: ['./word-map-review.component.scss']
})
export class WordMapReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private wordMapService = inject(WordMapService);

  // State
  mapId = signal<number | null>(null);
  mode = signal<ReviewMode>('vocabulary');
  vocabularyQueue = signal<VocabularyReviewItem[]>([]);
  grammarQueue = signal<GrammarReviewItem[]>([]);
  currentIndex = signal(0);
  isFlipped = signal(false);
  loading = signal(true);
  submitting = signal(false);
  sessionComplete = signal(false);

  // Session stats
  reviewedCount = signal(0);
  correctCount = signal(0);
  xpEarned = signal(0);

  // Computed
  currentItem = computed(() => {
    const items = this.currentQueue();
    const index = this.currentIndex();
    return index < items.length ? items[index] : null;
  });

  currentQueue = computed(() => {
    const mode = this.mode();
    if (mode === 'vocabulary') return this.vocabularyQueue() as ReviewItem[];
    if (mode === 'grammar') return this.grammarQueue() as ReviewItem[];
    // Mixed mode: interleave both queues
    const vocab = this.vocabularyQueue() as ReviewItem[];
    const grammar = this.grammarQueue() as ReviewItem[];
    const mixed: ReviewItem[] = [];
    const maxLen = Math.max(vocab.length, grammar.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < vocab.length) mixed.push(vocab[i]);
      if (i < grammar.length) mixed.push(grammar[i]);
    }
    return mixed;
  });

  totalDue = computed(() => {
    const mode = this.mode();
    if (mode === 'vocabulary') return this.vocabularyQueue().length;
    if (mode === 'grammar') return this.grammarQueue().length;
    return this.vocabularyQueue().length + this.grammarQueue().length;
  });

  progressPercent = computed(() => {
    const total = this.totalDue();
    if (total === 0) return 100;
    return Math.round((this.currentIndex() / total) * 100);
  });

  isVocabularyItem(item: ReviewItem): item is VocabularyReviewItem {
    return 'englishWord' in item;
  }

  isGrammarItem(item: ReviewItem): item is GrammarReviewItem {
    return 'grammarRule' in item;
  }

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    if (mapId) {
      this.mapId.set(+mapId);
    }
    this.loadReviewQueue();
  }

  loadReviewQueue(): void {
    this.loading.set(true);

    // Load vocabulary review queue
    this.wordMapService.getVocabularyReviewQueue(50).subscribe({
      next: (response) => {
        this.vocabularyQueue.set(response.items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading vocabulary queue:', err);
        this.loading.set(false);
      }
    });

    // Load grammar review queue
    this.wordMapService.getGrammarReviewQueue(50).subscribe({
      next: (response) => {
        this.grammarQueue.set(response.items);
      },
      error: (err) => {
        console.error('Error loading grammar queue:', err);
      }
    });
  }

  setMode(mode: ReviewMode): void {
    this.mode.set(mode);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.sessionComplete.set(false);
  }

  flipCard(): void {
    this.isFlipped.update(v => !v);
  }

  submitReview(quality: number): void {
    const item = this.currentItem();
    if (!item || this.submitting()) return;

    this.submitting.set(true);

    const isVocab = this.isVocabularyItem(item);
    const submitFn = isVocab
      ? this.wordMapService.submitVocabularyReview(item.id, quality)
      : this.wordMapService.submitGrammarReview(item.id, quality);

    submitFn.subscribe({
      next: (response) => {
        this.reviewedCount.update(c => c + 1);
        if (quality >= 3) {
          this.correctCount.update(c => c + 1);
        }
        this.xpEarned.update(xp => xp + response.xpEarned);

        this.submitting.set(false);
        this.nextCard();
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        this.submitting.set(false);
      }
    });
  }

  nextCard(): void {
    this.isFlipped.set(false);
    const nextIndex = this.currentIndex() + 1;

    if (nextIndex >= this.totalDue()) {
      this.sessionComplete.set(true);
    } else {
      this.currentIndex.set(nextIndex);
    }
  }

  getQualityLabel(quality: number): string {
    switch (quality) {
      case 1: return 'Again';
      case 2: return 'Hard';
      case 3: return 'Good';
      case 5: return 'Easy';
      default: return '';
    }
  }

  getQualityClass(quality: number): string {
    switch (quality) {
      case 1: return 'bg-red-500 hover:bg-red-600';
      case 2: return 'bg-orange-500 hover:bg-orange-600';
      case 3: return 'bg-blue-500 hover:bg-blue-600';
      case 5: return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500';
    }
  }

  getMasteryColor(level: number): string {
    if (level >= 80) return 'text-green-600';
    if (level >= 50) return 'text-blue-600';
    if (level >= 20) return 'text-yellow-600';
    return 'text-gray-400';
  }

  // Helper to get grammar item as typed (for template use)
  getGrammarItem(): GrammarReviewItem | null {
    const item = this.currentItem();
    if (item && this.isGrammarItem(item)) {
      return item;
    }
    return null;
  }

  // Helper to get vocabulary item as typed (for template use)
  getVocabularyItem(): VocabularyReviewItem | null {
    const item = this.currentItem();
    if (item && this.isVocabularyItem(item)) {
      return item;
    }
    return null;
  }

  restartSession(): void {
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.sessionComplete.set(false);
    this.reviewedCount.set(0);
    this.correctCount.set(0);
    this.xpEarned.set(0);
    this.loadReviewQueue();
  }
}
