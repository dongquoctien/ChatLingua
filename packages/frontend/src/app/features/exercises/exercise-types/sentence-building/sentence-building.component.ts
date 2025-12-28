import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowsAlt, faUndo, faCheck } from '@fortawesome/free-solid-svg-icons';

export interface SentenceBuildingData {
  words: string[];
  correctOrder?: number[];
}

@Component({
  selector: 'app-sentence-building',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="sentence-building-container">
      <p class="instruction">Drag and drop the words to form a correct sentence:</p>

      <!-- Answer area (drop zone) -->
      <div class="answer-area"
           cdkDropList
           #answerList="cdkDropList"
           [cdkDropListData]="arrangedWords()"
           [cdkDropListConnectedTo]="[wordBankList]"
           (cdkDropListDropped)="drop($event)">
        @if (arrangedWords().length === 0) {
          <div class="placeholder">Drop words here to build your sentence</div>
        }
        @for (word of arrangedWords(); track $index) {
          <div class="word-chip arranged"
               cdkDrag
               [cdkDragData]="word"
               [cdkDragDisabled]="disabled">
            <span class="word-text">{{ word }}</span>
            <fa-icon [icon]="faArrowsAlt" class="drag-handle"></fa-icon>
          </div>
        }
      </div>

      <!-- Word bank (source) -->
      <div class="word-bank"
           cdkDropList
           #wordBankList="cdkDropList"
           [cdkDropListData]="availableWords()"
           [cdkDropListConnectedTo]="[answerList]"
           (cdkDropListDropped)="drop($event)">
        <div class="bank-label">Word Bank:</div>
        @for (word of availableWords(); track $index) {
          <div class="word-chip available"
               cdkDrag
               [cdkDragData]="word"
               [cdkDragDisabled]="disabled">
            <span class="word-text">{{ word }}</span>
            <fa-icon [icon]="faArrowsAlt" class="drag-handle"></fa-icon>
          </div>
        }
        @if (availableWords().length === 0) {
          <div class="empty-bank">All words used!</div>
        }
      </div>

      <!-- Preview -->
      @if (arrangedWords().length > 0) {
        <div class="sentence-preview" [class.complete]="availableWords().length === 0">
          <strong>Your sentence:</strong>
          <span class="preview-text">{{ currentSentence() }}</span>
          @if (availableWords().length === 0) {
            <fa-icon [icon]="faCheck" class="complete-icon"></fa-icon>
          }
        </div>
      }

      <!-- Reset button only -->
      <div class="actions">
        <button mat-stroked-button (click)="reset()" [disabled]="disabled || arrangedWords().length === 0">
          <fa-icon [icon]="faUndo"></fa-icon>
          Reset
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sentence-building-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .instruction {
      font-size: 1rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .answer-area {
      min-height: 60px;
      padding: 1rem;
      border: 2px dashed #ccc;
      border-radius: 8px;
      background: #f9f9f9;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      transition: all 0.3s ease;

      &.cdk-drop-list-dragging {
        border-color: #3f51b5;
        background: #e8eaf6;
      }
    }

    .placeholder {
      color: #999;
      font-style: italic;
      width: 100%;
      text-align: center;
    }

    .word-bank {
      padding: 1rem;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      min-height: 50px;
    }

    .bank-label {
      font-weight: 500;
      color: #666;
      margin-right: 0.5rem;
      font-size: 0.9rem;
    }

    .empty-bank {
      color: #4caf50;
      font-style: italic;
    }

    .word-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      cursor: grab;
      user-select: none;
      transition: all 0.2s ease;

      &.available {
        background: #e3f2fd;
        border: 1px solid #2196f3;
        color: #1565c0;
      }

      &.arranged {
        background: #e8f5e9;
        border: 1px solid #4caf50;
        color: #2e7d32;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      &.cdk-drag-preview {
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }

      &.cdk-drag-placeholder {
        opacity: 0.3;
      }

      .drag-handle {
        font-size: 0.8rem;
        opacity: 0.5;
      }
    }

    .sentence-preview {
      padding: 1rem;
      background: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff9800;

      strong {
        color: #e65100;
        margin-right: 0.5rem;
      }

      .preview-text {
        font-style: italic;
      }
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
export class SentenceBuildingComponent implements OnInit {
  @Input() exerciseData!: SentenceBuildingData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faArrowsAlt = faArrowsAlt;
  faUndo = faUndo;
  faCheck = faCheck;

  // State
  availableWords = signal<string[]>([]);
  arrangedWords = signal<string[]>([]);

  // Computed
  currentSentence = computed(() => this.arrangedWords().join(' '));

  ngOnInit() {
    if (this.currentAnswer && this.exerciseData?.words) {
      // Restore from previous answer
      this.restoreFromAnswer(this.currentAnswer);
    } else {
      this.reset();
    }
  }

  private restoreFromAnswer(answer: string) {
    const arrangedWords = answer.split(' ').filter(w => w.trim());
    const allWords = [...this.exerciseData.words];

    // Validate that arranged words are from the word list
    const validArranged = arrangedWords.filter(w => allWords.includes(w));
    const remaining = allWords.filter(w => !validArranged.includes(w));

    this.arrangedWords.set(validArranged);
    this.availableWords.set(remaining);
  }

  drop(event: CdkDragDrop<string[]>) {
    if (this.disabled) return;

    if (event.previousContainer === event.container) {
      // Reordering within the same list
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);

      if (event.container.id === 'answerList' || event.container.data === this.arrangedWords()) {
        this.arrangedWords.set(items);
      } else {
        this.availableWords.set(items);
      }
    } else {
      // Moving between lists
      const prevItems = [...event.previousContainer.data];
      const currItems = [...event.container.data];

      transferArrayItem(prevItems, currItems, event.previousIndex, event.currentIndex);

      if (event.previousContainer.data === this.availableWords()) {
        this.availableWords.set(prevItems);
        this.arrangedWords.set(currItems);
      } else {
        this.arrangedWords.set(prevItems);
        this.availableWords.set(currItems);
      }
    }

    // Auto-emit answer when all words are arranged
    this.emitAnswer();
  }

  private emitAnswer() {
    // Always emit current state so it can be restored
    const sentence = this.currentSentence();
    if (sentence) {
      this.answerChange.emit(sentence);
    }
  }

  reset() {
    if (this.exerciseData?.words) {
      // Shuffle words for the word bank
      const shuffled = [...this.exerciseData.words].sort(() => Math.random() - 0.5);
      this.availableWords.set(shuffled);
      this.arrangedWords.set([]);
      this.answerChange.emit(''); // Clear answer
    }
  }
}
