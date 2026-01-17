import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StudyPageExercise,
  InteractiveConfig,
  FillBlanksData,
  StudyPageMatchingData,
  TableFillData,
  MultipleChoiceData
} from '@chatlingua/shared';

@Component({
  selector: 'app-exercise-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise-popup.component.html',
  styleUrls: ['./exercise-popup.component.scss']
})
export class ExercisePopupComponent {
  @Input({ required: true }) exercise!: StudyPageExercise;
  @Output() close = new EventEmitter<void>();

  // State
  currentStep = signal(0);
  answers = signal<Map<number, string>>(new Map());
  results = signal<Map<number, boolean>>(new Map());
  showResults = signal(false);

  // Matching state
  matchingSelectedLeft = signal<number | null>(null);
  matchingSelectedRight = signal<number | null>(null);
  matchingPairs = signal<Map<number, number>>(new Map());

  // Table fill state
  tableAnswers = signal<Map<string, string>>(new Map());

  get interactive(): InteractiveConfig | undefined {
    return this.exercise.interactive;
  }

  get interactiveType(): string {
    return this.interactive?.type || 'unknown';
  }

  get totalSteps(): number {
    const data = this.interactive?.data;
    if (!data) return 1;

    switch (data.type) {
      case 'fill-blanks':
        return (data as FillBlanksData).sentences.length;
      case 'multiple-choice':
        return 1;
      case 'matching':
        return (data as StudyPageMatchingData).pairs.length;
      case 'table-fill':
        return 1;
      default:
        return 1;
    }
  }

  // Fill blanks methods
  getFillBlanksData(): FillBlanksData | null {
    if (this.interactive?.data.type === 'fill-blanks') {
      return this.interactive.data as FillBlanksData;
    }
    return null;
  }

  onFillBlankInput(sentenceIndex: number, blankIndex: number, value: string): void {
    const key = sentenceIndex * 100 + blankIndex;
    const current = new Map(this.answers());
    current.set(key, value);
    this.answers.set(current);
  }

  getFillBlankAnswer(sentenceIndex: number, blankIndex: number): string {
    const key = sentenceIndex * 100 + blankIndex;
    return this.answers().get(key) || '';
  }

  // Matching methods
  getMatchingData(): StudyPageMatchingData | null {
    if (this.interactive?.data.type === 'matching') {
      return this.interactive.data as StudyPageMatchingData;
    }
    return null;
  }

  selectMatchingLeft(index: number): void {
    if (this.showResults()) return;
    this.matchingSelectedLeft.set(index);
    this.tryMatch();
  }

  selectMatchingRight(index: number): void {
    if (this.showResults()) return;
    this.matchingSelectedRight.set(index);
    this.tryMatch();
  }

  private tryMatch(): void {
    const left = this.matchingSelectedLeft();
    const right = this.matchingSelectedRight();

    if (left !== null && right !== null) {
      const pairs = new Map(this.matchingPairs());
      pairs.set(left, right);
      this.matchingPairs.set(pairs);

      this.matchingSelectedLeft.set(null);
      this.matchingSelectedRight.set(null);
    }
  }

  isMatchingLeftMatched(index: number): boolean {
    return this.matchingPairs().has(index);
  }

  isMatchingRightMatched(index: number): boolean {
    for (const value of this.matchingPairs().values()) {
      if (value === index) return true;
    }
    return false;
  }

  // Table fill methods
  getTableFillData(): TableFillData | null {
    if (this.interactive?.data.type === 'table-fill') {
      return this.interactive.data as TableFillData;
    }
    return null;
  }

  onTableCellInput(rowIndex: number, cellIndex: number, value: string): void {
    const key = `${rowIndex}-${cellIndex}`;
    const current = new Map(this.tableAnswers());
    current.set(key, value);
    this.tableAnswers.set(current);
  }

  getTableCellAnswer(rowIndex: number, cellIndex: number): string {
    const key = `${rowIndex}-${cellIndex}`;
    return this.tableAnswers().get(key) || '';
  }

  // Multiple choice methods
  getMultipleChoiceData(): MultipleChoiceData | null {
    if (this.interactive?.data.type === 'multiple-choice') {
      return this.interactive.data as MultipleChoiceData;
    }
    return null;
  }

  selectOption(index: number): void {
    if (this.showResults()) return;
    const current = new Map(this.answers());
    current.set(0, index.toString());
    this.answers.set(current);
  }

  isOptionSelected(index: number): boolean {
    return this.answers().get(0) === index.toString();
  }

  // Actions
  checkAnswers(): void {
    this.showResults.set(true);
  }

  showNextAnswer(): void {
    // Show one answer at a time
    const step = this.currentStep();
    if (step < this.totalSteps - 1) {
      this.currentStep.set(step + 1);
    }
  }

  showAllAnswers(): void {
    this.showResults.set(true);
    this.currentStep.set(this.totalSteps - 1);
  }

  startAgain(): void {
    this.answers.set(new Map());
    this.results.set(new Map());
    this.matchingPairs.set(new Map());
    this.tableAnswers.set(new Map());
    this.matchingSelectedLeft.set(null);
    this.matchingSelectedRight.set(null);
    this.currentStep.set(0);
    this.showResults.set(false);
  }

  onClose(): void {
    this.close.emit();
  }

  prevActivity(): void {
    // Navigate to previous activity (emit event)
  }

  nextActivity(): void {
    // Navigate to next activity (emit event)
  }
}
