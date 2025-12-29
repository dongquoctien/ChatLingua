import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FontAwesomeModule,
  ],
  templateUrl: './error-correction.component.html',
  styleUrl: './error-correction.component.scss',
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
