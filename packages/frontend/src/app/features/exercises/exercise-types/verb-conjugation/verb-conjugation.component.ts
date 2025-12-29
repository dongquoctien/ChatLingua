import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FontAwesomeModule,
  ],
  templateUrl: './verb-conjugation.component.html',
  styleUrl: './verb-conjugation.component.scss',
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
