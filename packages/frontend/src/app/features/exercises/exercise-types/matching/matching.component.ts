import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faUndo, faLink } from '@fortawesome/free-solid-svg-icons';

export interface MatchingPair {
  en: string;
  vi: string;
}

export interface MatchingData {
  pairs: MatchingPair[];
}

interface MatchItem {
  id: number;
  text: string;
  type: 'en' | 'vi';
  matched: boolean;
  matchedWith: number | null;
}

@Component({
  selector: 'app-matching',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './matching.component.html',
  styleUrl: './matching.component.scss',
})
export class MatchingComponent implements OnInit {
  @Input() exerciseData!: MatchingData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faCheck = faCheck;
  faUndo = faUndo;
  faLink = faLink;

  // State
  englishItems = signal<MatchItem[]>([]);
  vietnameseItems = signal<MatchItem[]>([]);
  selectedEnglish = signal<number | null>(null);
  selectedVietnamese = signal<number | null>(null);
  matches = signal<{ enId: number; viId: number }[]>([]);

  // Computed
  matchedCount = computed(() => this.matches().length);
  totalPairs = computed(() => this.exerciseData?.pairs?.length || 0);

  ngOnInit() {
    if (this.currentAnswer && this.exerciseData?.pairs) {
      this.restoreFromAnswer(this.currentAnswer);
    } else {
      this.reset();
    }
  }

  private restoreFromAnswer(answer: string) {
    try {
      const savedMatches = JSON.parse(answer) as { en: string; vi: string }[];

      // Initialize items
      const enItems: MatchItem[] = this.exerciseData.pairs.map((pair, idx) => ({
        id: idx,
        text: pair.en,
        type: 'en',
        matched: false,
        matchedWith: null,
      }));

      const viItems: MatchItem[] = this.exerciseData.pairs.map((pair, idx) => ({
        id: idx,
        text: pair.vi,
        type: 'vi',
        matched: false,
        matchedWith: null,
      }));

      // Shuffle Vietnamese items for consistent display
      const shuffledViItems = viItems.sort(() => Math.random() - 0.5);

      // Restore matches
      const restoredMatches: { enId: number; viId: number }[] = [];
      for (const saved of savedMatches) {
        const enItem = enItems.find(i => i.text === saved.en);
        const viItem = viItems.find(i => i.text === saved.vi);
        if (enItem && viItem) {
          enItem.matched = true;
          enItem.matchedWith = viItem.id;
          viItem.matched = true;
          viItem.matchedWith = enItem.id;
          restoredMatches.push({ enId: enItem.id, viId: viItem.id });
        }
      }

      this.englishItems.set(enItems);
      this.vietnameseItems.set(shuffledViItems);
      this.matches.set(restoredMatches);
      this.selectedEnglish.set(null);
      this.selectedVietnamese.set(null);
    } catch {
      this.reset();
    }
  }

  selectEnglish(item: MatchItem) {
    if (this.disabled || item.matched) return;

    if (this.selectedEnglish() === item.id) {
      this.selectedEnglish.set(null);
    } else {
      this.selectedEnglish.set(item.id);
      this.tryMatch();
    }
  }

  selectVietnamese(item: MatchItem) {
    if (this.disabled || item.matched) return;

    if (this.selectedVietnamese() === item.id) {
      this.selectedVietnamese.set(null);
    } else {
      this.selectedVietnamese.set(item.id);
      this.tryMatch();
    }
  }

  private tryMatch() {
    const enId = this.selectedEnglish();
    const viId = this.selectedVietnamese();

    if (enId !== null && viId !== null) {
      // Create the match
      this.matches.update(m => [...m, { enId, viId }]);

      // Update items
      this.englishItems.update(items =>
        items.map(item =>
          item.id === enId ? { ...item, matched: true, matchedWith: viId } : item
        )
      );
      this.vietnameseItems.update(items =>
        items.map(item =>
          item.id === viId ? { ...item, matched: true, matchedWith: enId } : item
        )
      );

      // Clear selections
      this.selectedEnglish.set(null);
      this.selectedVietnamese.set(null);

      // Auto-emit answer on every match
      this.emitAnswer();
    }
  }

  private emitAnswer() {
    // Emit current state so it can be restored
    const answer = this.matches().map(match => {
      const enItem = this.englishItems().find(i => i.id === match.enId);
      const viItem = this.vietnameseItems().find(i => i.id === match.viId);
      return {
        en: enItem?.text,
        vi: viItem?.text,
        correct: match.enId === match.viId, // Original indices match
      };
    });
    if (answer.length > 0) {
      this.answerChange.emit(JSON.stringify(answer));
    }
  }

  reset() {
    if (this.exerciseData?.pairs) {
      // Shuffle both columns independently
      const enItems: MatchItem[] = this.exerciseData.pairs.map((pair, idx) => ({
        id: idx,
        text: pair.en,
        type: 'en',
        matched: false,
        matchedWith: null,
      }));

      const viItems: MatchItem[] = this.exerciseData.pairs.map((pair, idx) => ({
        id: idx,
        text: pair.vi,
        type: 'vi',
        matched: false,
        matchedWith: null,
      }));

      // Shuffle Vietnamese items
      this.englishItems.set(enItems);
      this.vietnameseItems.set(viItems.sort(() => Math.random() - 0.5));
      this.matches.set([]);
      this.selectedEnglish.set(null);
      this.selectedVietnamese.set(null);
    }
  }

  confirmAnswer() {
    if (this.matchedCount() === this.totalPairs()) {
      // Build answer as JSON of matched pairs
      const answer = this.matches().map(match => {
        const enItem = this.englishItems().find(i => i.id === match.enId);
        const viItem = this.vietnameseItems().find(i => i.id === match.viId);
        return {
          en: enItem?.text,
          vi: viItem?.text,
          correct: match.enId === match.viId, // Original indices match
        };
      });
      this.answerChange.emit(JSON.stringify(answer));
    }
  }

  getConnectionTop(enId: number): number {
    const enItems = this.englishItems();
    const index = enItems.findIndex(i => i.id === enId);
    return (index / enItems.length) * 100 + (50 / enItems.length);
  }

  getConnectionHeight(enId: number, viId: number): number {
    const enItems = this.englishItems();
    const viItems = this.vietnameseItems();
    const enIndex = enItems.findIndex(i => i.id === enId);
    const viIndex = viItems.findIndex(i => i.id === viId);
    return Math.abs(viIndex - enIndex) * (100 / enItems.length);
  }
}
