import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    MatButtonModule,
    MatCardModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="matching-container">
      <p class="instruction">Match the English words with their Vietnamese translations:</p>

      <div class="matching-grid">
        <!-- English Column -->
        <div class="column english-column">
          <div class="column-header">English</div>
          @for (item of englishItems(); track item.id) {
            <div class="match-item"
                 [class.selected]="selectedEnglish() === item.id"
                 [class.matched]="item.matched"
                 [class.disabled]="disabled || item.matched"
                 (click)="selectEnglish(item)">
              <span class="item-text">{{ item.text }}</span>
              @if (item.matched) {
                <fa-icon [icon]="faLink" class="link-icon"></fa-icon>
              }
            </div>
          }
        </div>

        <!-- Connection Lines (visual feedback) -->
        <div class="connections">
          @for (match of matches(); track match.enId) {
            <div class="connection-line"
                 [style.top.%]="getConnectionTop(match.enId)"
                 [style.height.%]="getConnectionHeight(match.enId, match.viId)">
            </div>
          }
        </div>

        <!-- Vietnamese Column -->
        <div class="column vietnamese-column">
          <div class="column-header">Tiếng Việt</div>
          @for (item of vietnameseItems(); track item.id) {
            <div class="match-item"
                 [class.selected]="selectedVietnamese() === item.id"
                 [class.matched]="item.matched"
                 [class.disabled]="disabled || item.matched"
                 (click)="selectVietnamese(item)">
              <span class="item-text">{{ item.text }}</span>
              @if (item.matched) {
                <fa-icon [icon]="faLink" class="link-icon"></fa-icon>
              }
            </div>
          }
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-info">
        <span>Matched: {{ matchedCount() }} / {{ totalPairs() }}</span>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button mat-stroked-button (click)="reset()" [disabled]="disabled || matchedCount() === 0">
          <fa-icon [icon]="faUndo"></fa-icon>
          Reset
        </button>
      </div>
    </div>
  `,
  styles: [`
    .matching-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .instruction {
      font-size: 1rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .matching-grid {
      display: grid;
      grid-template-columns: 1fr 40px 1fr;
      gap: 1rem;
      align-items: start;
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .column-header {
      font-weight: 600;
      padding: 0.5rem;
      text-align: center;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .english-column .column-header {
      background: #e3f2fd;
      color: #1565c0;
    }

    .vietnamese-column .column-header {
      background: #fce4ec;
      color: #c2185b;
    }

    .match-item {
      padding: 0.75rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: white;

      &:hover:not(.disabled) {
        border-color: #3f51b5;
        transform: translateX(4px);
      }

      &.selected {
        border-color: #3f51b5;
        background: #e8eaf6;
        box-shadow: 0 2px 8px rgba(63, 81, 181, 0.3);
      }

      &.matched {
        border-color: #4caf50;
        background: #e8f5e9;

        .link-icon {
          color: #4caf50;
        }
      }

      &.disabled {
        cursor: default;
        opacity: 0.7;
      }
    }

    .connections {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
    }

    .connection-line {
      position: absolute;
      left: 50%;
      width: 2px;
      background: #4caf50;
      transform: translateX(-50%);
    }

    .progress-info {
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 0.5rem;

      button fa-icon {
        margin-right: 0.5rem;
      }
    }
  `]
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
