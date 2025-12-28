import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faUndo, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';

export interface ClozeBlank {
  index: number;
  answer: string;
}

export interface ClozeData {
  passage: string;
  blanks: ClozeBlank[];
}

interface PassagePart {
  type: 'text' | 'blank';
  content: string;
  blankIndex?: number;
}

@Component({
  selector: 'app-cloze',
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
    <div class="cloze-container">
      <p class="instruction">
        <fa-icon [icon]="faPuzzlePiece"></fa-icon>
        Fill in all the blanks in the passage:
      </p>

      <!-- Passage with blanks -->
      <div class="passage">
        @for (part of passageParts(); track $index) {
          @if (part.type === 'text') {
            <span class="text-part">{{ part.content }}</span>
          } @else {
            <span class="blank-wrapper">
              <input type="text"
                     class="blank-input"
                     [class.filled]="userAnswers()[part.blankIndex!]"
                     [class.focused]="focusedBlank() === part.blankIndex"
                     [value]="userAnswers()[part.blankIndex!] || ''"
                     (input)="onBlankInput($event, part.blankIndex!)"
                     (focus)="focusedBlank.set(part.blankIndex!)"
                     (blur)="focusedBlank.set(null)"
                     [disabled]="disabled"
                     [placeholder]="'[' + part.blankIndex + ']'"
                     [style.width.ch]="getInputWidth(part.blankIndex!)">
              <span class="blank-number">({{ part.blankIndex }})</span>
            </span>
          }
        }
      </div>

      <!-- Progress -->
      <div class="progress-info">
        <span>Filled: {{ filledCount() }} / {{ totalBlanks() }}</span>
      </div>

      <!-- Answer Summary -->
      @if (filledCount() > 0) {
        <div class="answer-summary">
          <strong>Your answers:</strong>
          <div class="answers-list">
            @for (blank of exerciseData?.blanks; track blank.index) {
              <div class="answer-item" [class.filled]="userAnswers()[blank.index]">
                <span class="blank-num">[{{ blank.index }}]</span>
                <span class="blank-answer">{{ userAnswers()[blank.index] || '___' }}</span>
              </div>
            }
          </div>
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
    .cloze-container {
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

      fa-icon {
        color: #9c27b0;
      }
    }

    .passage {
      padding: 1.5rem;
      background: #fafafa;
      border-radius: 8px;
      font-size: 1.1rem;
      line-height: 2.2;
      border: 1px solid #e0e0e0;
    }

    .text-part {
      white-space: pre-wrap;
    }

    .blank-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0 0.25rem;
    }

    .blank-input {
      border: none;
      border-bottom: 2px solid #9c27b0;
      background: transparent;
      font-size: 1rem;
      font-family: inherit;
      padding: 0.25rem 0.5rem;
      text-align: center;
      min-width: 60px;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-bottom-color: #7b1fa2;
        background: #f3e5f5;
      }

      &.filled {
        color: #7b1fa2;
        font-weight: 500;
      }

      &::placeholder {
        color: #bbb;
        font-size: 0.85rem;
      }
    }

    .blank-number {
      font-size: 0.75rem;
      color: #9c27b0;
      opacity: 0.7;
    }

    .progress-info {
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }

    .answer-summary {
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;

      strong {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
      }

      .answers-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .answer-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.75rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 0.9rem;

        &.filled {
          border-color: #9c27b0;
          background: #f3e5f5;
        }

        .blank-num {
          font-weight: 600;
          color: #9c27b0;
        }
      }
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
export class ClozeComponent implements OnInit {
  @Input() exerciseData!: ClozeData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faCheck = faCheck;
  faUndo = faUndo;
  faPuzzlePiece = faPuzzlePiece;

  // State
  passageParts = signal<PassagePart[]>([]);
  userAnswers = signal<Record<number, string>>({});
  focusedBlank = signal<number | null>(null);

  // Computed
  totalBlanks = computed(() => this.exerciseData?.blanks?.length || 0);
  filledCount = computed(() =>
    Object.values(this.userAnswers()).filter(v => v && v.trim()).length
  );
  allFilled = computed(() => this.filledCount() === this.totalBlanks());

  ngOnInit() {
    this.parsePassage();
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.restoreFromAnswer(this.currentAnswer);
    }
  }

  private restoreFromAnswer(answer: string) {
    try {
      const savedAnswers = JSON.parse(answer) as { index: number; answer: string }[];
      const restored: Record<number, string> = {};
      for (const item of savedAnswers) {
        restored[item.index] = item.answer;
      }
      this.userAnswers.set(restored);
    } catch {
      // Invalid JSON, ignore
    }
  }

  private parsePassage() {
    if (!this.exerciseData?.passage) return;

    const parts: PassagePart[] = [];
    const passage = this.exerciseData.passage;

    // Pattern matches [1], [2], etc.
    const blankPattern = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = blankPattern.exec(passage)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: passage.slice(lastIndex, match.index),
        });
      }

      // Add the blank
      parts.push({
        type: 'blank',
        content: '',
        blankIndex: parseInt(match[1], 10),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < passage.length) {
      parts.push({
        type: 'text',
        content: passage.slice(lastIndex),
      });
    }

    this.passageParts.set(parts);
  }

  onBlankInput(event: Event, blankIndex: number) {
    const input = event.target as HTMLInputElement;
    this.userAnswers.update(answers => ({
      ...answers,
      [blankIndex]: input.value,
    }));
    // Auto-emit answer on change
    this.emitAnswer();
  }

  private emitAnswer() {
    // Emit current state so it can be restored
    const answers = this.exerciseData?.blanks?.map(blank => ({
      index: blank.index,
      answer: this.userAnswers()[blank.index]?.trim() || '',
    })) || [];
    if (answers.some(a => a.answer)) {
      this.answerChange.emit(JSON.stringify(answers));
    }
  }

  getInputWidth(blankIndex: number): number {
    const answer = this.userAnswers()[blankIndex];
    const expectedAnswer = this.exerciseData?.blanks?.find(b => b.index === blankIndex)?.answer;
    const minWidth = Math.max(expectedAnswer?.length || 5, 5);
    return Math.max(answer?.length || 0, minWidth) + 2;
  }

  reset() {
    this.userAnswers.set({});
  }

  confirmAnswer() {
    if (this.allFilled()) {
      // Build answer as JSON of blank answers
      const answers = this.exerciseData.blanks.map(blank => ({
        index: blank.index,
        answer: this.userAnswers()[blank.index]?.trim() || '',
      }));
      this.answerChange.emit(JSON.stringify(answers));
    }
  }
}
