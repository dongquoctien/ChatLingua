import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FontAwesomeModule,
  ],
  templateUrl: './cloze.component.html',
  styleUrl: './cloze.component.scss',
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
