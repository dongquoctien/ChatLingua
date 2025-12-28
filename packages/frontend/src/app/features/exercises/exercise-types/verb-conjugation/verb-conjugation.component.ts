import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faUndo, faBook } from '@fortawesome/free-solid-svg-icons';

export interface VerbConjugationData {
  verb: string;
  tense: string;
  subject?: string;
  hint?: string;
}

const TENSE_INFO: Record<string, { description: string; example: string }> = {
  'present simple': {
    description: 'Used for habits, routines, and general truths',
    example: 'I work / She works',
  },
  'past simple': {
    description: 'Used for completed actions in the past',
    example: 'I worked / She worked',
  },
  'present perfect': {
    description: 'Used for past actions with present relevance',
    example: 'I have worked / She has worked',
  },
  'past perfect': {
    description: 'Used for actions completed before another past action',
    example: 'I had worked / She had worked',
  },
  'future simple': {
    description: 'Used for predictions and spontaneous decisions',
    example: 'I will work / She will work',
  },
  'present continuous': {
    description: 'Used for actions happening now or temporary situations',
    example: 'I am working / She is working',
  },
  'past continuous': {
    description: 'Used for ongoing actions in the past',
    example: 'I was working / She was working',
  },
  'present perfect continuous': {
    description: 'Used for actions that started in the past and continue',
    example: 'I have been working / She has been working',
  },
};

@Component({
  selector: 'app-verb-conjugation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="verb-conjugation-container">
      <p class="instruction">
        <fa-icon [icon]="faBook"></fa-icon>
        Conjugate the verb in the correct form:
      </p>

      <!-- Verb Info Card -->
      <div class="verb-info-card">
        <div class="verb-display">
          <span class="label">Verb:</span>
          <span class="verb">{{ exerciseData?.verb }}</span>
        </div>

        <div class="tense-display">
          <span class="label">Tense:</span>
          <span class="tense">{{ exerciseData?.tense }}</span>
        </div>

        @if (exerciseData?.subject) {
          <div class="subject-display">
            <span class="label">Subject:</span>
            <span class="subject">{{ exerciseData.subject }}</span>
          </div>
        }
      </div>

      <!-- Tense Helper -->
      @if (tenseInfo()) {
        <div class="tense-helper">
          <div class="helper-description">{{ tenseInfo()!.description }}</div>
          <div class="helper-example">
            <strong>Example:</strong> {{ tenseInfo()!.example }}
          </div>
        </div>
      }

      <!-- Sentence Frame -->
      @if (exerciseData?.subject) {
        <div class="sentence-frame">
          <span class="subject-text">{{ exerciseData.subject }}</span>
          <mat-form-field appearance="outline" class="verb-input">
            <input matInput
                   [ngModel]="userAnswer()"
                   (ngModelChange)="onAnswerChange($event)"
                   [disabled]="disabled"
                   (keyup.enter)="confirmAnswer()"
                   placeholder="conjugated verb">
          </mat-form-field>
          <span class="ellipsis">...</span>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Conjugated form of "{{ exerciseData?.verb }}"</mat-label>
          <input matInput
                 [ngModel]="userAnswer()"
                 (ngModelChange)="onAnswerChange($event)"
                 [disabled]="disabled"
                 (keyup.enter)="confirmAnswer()">
        </mat-form-field>
      }

      <!-- Hint -->
      @if (exerciseData?.hint) {
        <div class="hint">
          <strong>Hint:</strong> {{ exerciseData.hint }}
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
    .verb-conjugation-container {
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
        color: #3f51b5;
      }
    }

    .verb-info-card {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;

      > div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .label {
        opacity: 0.8;
        font-size: 0.85rem;
      }

      .verb {
        font-size: 1.5rem;
        font-weight: 700;
        font-style: italic;
      }

      .tense {
        padding: 0.25rem 0.75rem;
        background: rgba(255,255,255,0.2);
        border-radius: 20px;
        font-weight: 500;
      }

      .subject {
        font-weight: 600;
      }
    }

    .tense-helper {
      padding: 0.75rem;
      background: #e8f5e9;
      border-radius: 4px;
      border-left: 3px solid #4caf50;
      font-size: 0.9rem;

      .helper-description {
        margin-bottom: 0.5rem;
      }

      .helper-example {
        color: #2e7d32;
      }
    }

    .sentence-frame {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;

      .subject-text {
        font-weight: 600;
      }

      .verb-input {
        flex: 0 0 200px;
      }

      .ellipsis {
        color: #999;
      }
    }

    .full-width {
      width: 100%;
    }

    .hint {
      padding: 0.75rem;
      background: #fff3e0;
      border-radius: 4px;
      border-left: 3px solid #ff9800;
      font-size: 0.9rem;
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
export class VerbConjugationComponent implements OnInit {
  @Input() exerciseData!: VerbConjugationData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faCheck = faCheck;
  faUndo = faUndo;
  faBook = faBook;

  // State
  userAnswer = signal('');

  // Computed
  tenseInfo = computed(() => {
    const tense = this.exerciseData?.tense?.toLowerCase();
    return tense ? TENSE_INFO[tense] || null : null;
  });

  ngOnInit() {
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.userAnswer.set(this.currentAnswer);
    }
  }

  onAnswerChange(value: string) {
    this.userAnswer.set(value);
    // Auto-emit answer on change
    if (value.trim()) {
      this.answerChange.emit(value.trim().toLowerCase());
    }
  }

  reset() {
    this.userAnswer.set('');
  }

  confirmAnswer() {
    if (this.userAnswer()) {
      this.answerChange.emit(this.userAnswer().trim().toLowerCase());
    }
  }
}
