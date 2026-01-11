import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock } from '../../../../shared/icons';

export type TimerMode = 'countdown' | 'elapsed';

@Component({
  selector: 'app-exercise-progress-header',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './exercise-progress-header.component.html',
  styleUrl: './exercise-progress-header.component.scss',
})
export class ExerciseProgressHeaderComponent {
  // Inputs
  currentIndex = input.required<number>();
  totalQuestions = input.required<number>();
  answeredCount = input.required<number>();
  timeSeconds = input.required<number>();
  timerMode = input<TimerMode>('elapsed');
  showKeyboardHints = input<boolean>(true);
  showMobileHint = input<boolean>(true);
  warningThreshold = input<number>(60); // seconds for warning state in countdown mode

  // Icons
  faClock = faClock;

  // Computed
  progressPercent = computed(() => {
    const total = this.totalQuestions();
    return total > 0 ? ((this.currentIndex() + 1) / total) * 100 : 0;
  });

  formattedTime = computed(() => {
    const secs = this.timeSeconds();
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  });

  isWarning = computed(() => {
    return this.timerMode() === 'countdown' && this.timeSeconds() < this.warningThreshold();
  });
}
