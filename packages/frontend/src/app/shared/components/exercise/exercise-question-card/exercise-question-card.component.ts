import { Component, input, output, computed, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faArrowRight } from '../../../../shared/icons';

export type SlideDirection = 'left' | 'right' | 'none';

export interface ExerciseTypeLabels {
  [key: string]: string;
}

const DEFAULT_TYPE_LABELS: ExerciseTypeLabels = {
  'multiple_choice': 'Multiple Choice',
  'fill_blank': 'Fill in the Blank',
  'translation': 'Translation',
  'sentence_building': 'Sentence Building',
  'matching': 'Matching',
  'spelling': 'Spelling',
  'listening': 'Listening',
  'error_correction': 'Error Correction',
  'verb_conjugation': 'Verb Conjugation',
  'cloze': 'Cloze Test',
};

@Component({
  selector: 'app-exercise-question-card',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './exercise-question-card.component.html',
  styleUrl: './exercise-question-card.component.scss',
})
export class ExerciseQuestionCardComponent {
  // Inputs
  exerciseType = input.required<string>();
  questionNumber = input.required<number>();
  questionText = input<string>('');
  slideDirection = input<SlideDirection>('none');
  isFirstQuestion = input<boolean>(false);
  isLastQuestion = input<boolean>(false);
  canSubmit = input<boolean>(false);
  answeredCount = input<number>(0);
  totalQuestions = input<number>(0);
  submitButtonText = input<string>('Submit');
  typeLabels = input<ExerciseTypeLabels>(DEFAULT_TYPE_LABELS);

  // Outputs
  previousClick = output<void>();
  nextClick = output<void>();
  submitClick = output<void>();

  // Template for custom content
  @ContentChild('exerciseContent') exerciseContent!: TemplateRef<any>;

  // Icons
  faArrowLeft = faArrowLeft;
  faArrowRight = faArrowRight;

  // Methods
  getTypeLabel(): string {
    const labels = this.typeLabels();
    return labels[this.exerciseType()] || this.exerciseType();
  }

  onPrevious(): void {
    this.previousClick.emit();
  }

  onNext(): void {
    this.nextClick.emit();
  }

  onSubmit(): void {
    this.submitClick.emit();
  }
}
