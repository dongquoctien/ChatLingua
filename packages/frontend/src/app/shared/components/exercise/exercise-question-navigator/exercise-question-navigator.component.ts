import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavigatorQuestion {
  id: number;
  hasAnswer: boolean;
}

@Component({
  selector: 'app-exercise-question-navigator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercise-question-navigator.component.html',
  styleUrl: './exercise-question-navigator.component.scss',
})
export class ExerciseQuestionNavigatorComponent {
  // Inputs
  questions = input.required<NavigatorQuestion[]>();
  currentIndex = input.required<number>();
  showLabel = input<boolean>(true);
  labelText = input<string>('Jump to:');

  // Outputs
  questionSelect = output<number>();

  // Methods
  onSelectQuestion(index: number): void {
    this.questionSelect.emit(index);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
