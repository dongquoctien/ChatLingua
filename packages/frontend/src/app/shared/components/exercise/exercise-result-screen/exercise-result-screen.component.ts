import { Component, input, output, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy,
  faFrown,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faBolt,
  faHistory,
  faShare,
} from '../../../../shared/icons';

export type ResultRank = 'iron' | 'bronze' | 'silver' | 'gold';

export interface ResultAnswer {
  exerciseId: number;
  questionOrder: number;
  questionText: string;
  exerciseType: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ExerciseResult {
  score: number;
  total: number;
  percentage: number;
  xpAwarded?: number;
  isPerfect?: boolean;
  results: ResultAnswer[];
}

@Component({
  selector: 'app-exercise-result-screen',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './exercise-result-screen.component.html',
  styleUrl: './exercise-result-screen.component.scss',
})
export class ExerciseResultScreenComponent implements OnInit {
  // Inputs
  result = input.required<ExerciseResult>();
  timeSpent = input.required<string>();
  title = input<string>('Practice Complete');
  showCelebration = input<boolean>(true);
  backButtonText = input<string>('Practice Again');
  backButtonRoute = input<string | null>(null);
  historyButtonText = input<string>('View History');
  historyRoute = input<string>('/exercises/history');
  showShareButton = input<boolean>(true);
  formatAnswerFn = input<(answer: string | null, exerciseType: string) => string>((a, _) => a || '(no answer)');
  getTypeLabelFn = input<(type: string) => string>((t) => t);

  // Outputs
  backClick = output<void>();
  shareClick = output<void>();
  historyClick = output<void>();

  // Icons
  faTrophy = faTrophy;
  faFrown = faFrown;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faClock = faClock;
  faBolt = faBolt;
  faHistory = faHistory;
  faShare = faShare;

  // Internal state
  showConfetti = signal(false);

  // Computed
  rank = computed<ResultRank>(() => {
    const pct = this.result().percentage;
    if (pct >= 90) return 'gold';
    if (pct >= 70) return 'silver';
    if (pct >= 50) return 'bronze';
    return 'iron';
  });

  rankLabel = computed(() => {
    const r = this.rank();
    switch (r) {
      case 'gold': return 'Gold Rank';
      case 'silver': return 'Silver Rank';
      case 'bronze': return 'Bronze Rank';
      default: return 'Iron Rank';
    }
  });

  congratsMessage = computed(() => {
    const pct = this.result().percentage;
    if (pct >= 90) return 'Excellent!';
    if (pct >= 70) return 'Great Job!';
    if (pct >= 50) return 'Good Effort!';
    return 'Keep Practicing!';
  });

  confettiItems = computed(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      delay: (i * 0.1) + 's',
      x: ((i * 17) % 100) + '%',
    }));
  });

  ngOnInit() {
    if (this.showCelebration() && this.result().percentage >= 70) {
      this.triggerCelebration();
    }
  }

  private triggerCelebration() {
    this.showConfetti.set(true);
    setTimeout(() => {
      this.showConfetti.set(false);
    }, 3000);
  }

  onBack(): void {
    this.backClick.emit();
  }

  onShare(): void {
    this.shareClick.emit();
  }

  onHistory(): void {
    this.historyClick.emit();
  }

  formatAnswer(answer: string | null, exerciseType: string): string {
    return this.formatAnswerFn()(answer, exerciseType);
  }

  getTypeLabel(type: string): string {
    return this.getTypeLabelFn()(type);
  }
}
