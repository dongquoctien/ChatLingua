import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faUndo, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export interface ErrorCorrectionData {
  errorPosition?: number;
  errorWord?: string;
  errorType?: string;
}

@Component({
  selector: 'app-error-correction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="error-correction-container">
      <p class="instruction">
        <fa-icon [icon]="faExclamationTriangle" class="warning-icon"></fa-icon>
        Find the error in the sentence and write the correct word:
      </p>

      <!-- Sentence with clickable words -->
      <div class="sentence-display">
        @for (word of words(); track $index) {
          <span class="word"
                [class.selected]="selectedWordIndex() === $index"
                [class.error-hint]="exerciseData?.errorPosition === $index"
                (click)="selectWord($index)">
            {{ word }}
          </span>
        }
      </div>

      <!-- Error type hint if available -->
      @if (exerciseData?.errorType) {
        <div class="error-type-hint">
          <strong>Error type:</strong> {{ exerciseData.errorType }}
        </div>
      }

      <!-- Selected word and correction -->
      @if (selectedWordIndex() !== null) {
        <div class="correction-section">
          <div class="selected-word-info">
            <strong>Selected word:</strong>
            <span class="error-word">{{ words()[selectedWordIndex()!] }}</span>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Write the correct word</mat-label>
            <input matInput
                   [ngModel]="correction()"
                   (ngModelChange)="onCorrectionChange($event)"
                   [disabled]="disabled"
                   (keyup.enter)="confirmAnswer()"
                   placeholder="Type the correct spelling...">
          </mat-form-field>
        </div>
      } @else {
        <div class="select-prompt">
          Click on the word you think contains the error
        </div>
      }

      <!-- Actions -->
      <div class="actions">
        <button mat-stroked-button (click)="reset()" [disabled]="disabled">
          <fa-icon [icon]="faUndo"></fa-icon>
          Reset
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-correction-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .instruction {
      font-size: 1rem;
      color: #666;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .warning-icon {
        color: #ff9800;
      }
    }

    .sentence-display {
      padding: 1.5rem;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 1.2rem;
      line-height: 2;
      text-align: center;
    }

    .word {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      margin: 0.25rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;

      &:hover {
        background: #e3f2fd;
        border-color: #2196f3;
      }

      &.selected {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
        font-weight: 600;
      }

      &.error-hint {
        text-decoration: underline wavy #ff9800;
      }
    }

    .error-type-hint {
      padding: 0.75rem;
      background: #fff3e0;
      border-radius: 4px;
      border-left: 3px solid #ff9800;
      font-size: 0.9rem;
    }

    .correction-section {
      padding: 1rem;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;

      .selected-word-info {
        margin-bottom: 1rem;

        .error-word {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
      }
    }

    .select-prompt {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 1rem;
    }

    .full-width {
      width: 100%;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      button fa-icon {
        margin-right: 0.5rem;
      }
    }
  `]
})
export class ErrorCorrectionComponent implements OnInit {
  @Input() question!: string;
  @Input() exerciseData!: ErrorCorrectionData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faCheck = faCheck;
  faUndo = faUndo;
  faExclamationTriangle = faExclamationTriangle;

  // State
  words = signal<string[]>([]);
  selectedWordIndex = signal<number | null>(null);
  correction = signal('');

  // Computed
  canSubmit = computed(() => {
    return this.selectedWordIndex() !== null && this.correction().trim().length > 0;
  });

  ngOnInit() {
    if (this.question) {
      // Parse sentence into words (keeping punctuation attached)
      const wordList = this.question
        .replace(/^Find the error:\s*/i, '')
        .split(/\s+/)
        .filter(w => w.length > 0);
      this.words.set(wordList);
    }
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.correction.set(this.currentAnswer);
      // Auto-select error position if available
      if (this.exerciseData?.errorPosition !== undefined) {
        this.selectedWordIndex.set(this.exerciseData.errorPosition);
      }
    }
  }

  selectWord(index: number) {
    if (this.disabled) return;

    if (this.selectedWordIndex() === index) {
      this.selectedWordIndex.set(null);
      this.correction.set('');
    } else {
      this.selectedWordIndex.set(index);
      this.correction.set('');
    }
  }

  onCorrectionChange(value: string) {
    this.correction.set(value);
    // Auto-emit answer on change
    if (value.trim() && this.selectedWordIndex() !== null) {
      this.answerChange.emit(value.trim());
    }
  }

  reset() {
    this.selectedWordIndex.set(null);
    this.correction.set('');
  }

  confirmAnswer() {
    if (this.canSubmit()) {
      this.answerChange.emit(this.correction().trim());
    }
  }
}
