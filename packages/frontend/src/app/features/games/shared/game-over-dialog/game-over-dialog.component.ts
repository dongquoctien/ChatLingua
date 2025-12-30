import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameAchievementInfo } from '../../../../core/services/api.service';

export interface GameResult {
  score: number;
  maxCombo: number;
  accuracy: number;
  wordsCorrect: number;
  wordsWrong: number;
  durationSeconds: number;
  xpEarned: number;
  coinsEarned: number;
  isNewBestScore: boolean;
  leaderboardPosition?: number;
  newAchievements: GameAchievementInfo[];
}

@Component({
  selector: 'app-game-over-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-over-dialog.component.html',
  styleUrls: ['./game-over-dialog.component.scss']
})
export class GameOverDialogComponent {
  @Input() isOpen: boolean = false;
  @Input() gameName: string = '';
  @Input() result: GameResult | null = null;

  @Output() playAgain = new EventEmitter<void>();
  @Output() backToHub = new EventEmitter<void>();

  get formattedDuration(): string {
    if (!this.result) return '0:00';
    const minutes = Math.floor(this.result.durationSeconds / 60);
    const seconds = this.result.durationSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get performanceGrade(): { grade: string; color: string; message: string } {
    if (!this.result) return { grade: 'C', color: 'gray', message: 'Keep trying!' };

    const accuracy = this.result.accuracy;
    if (accuracy >= 95) return { grade: 'S', color: 'purple', message: 'Perfect!' };
    if (accuracy >= 90) return { grade: 'A', color: 'green', message: 'Excellent!' };
    if (accuracy >= 80) return { grade: 'B', color: 'blue', message: 'Great job!' };
    if (accuracy >= 70) return { grade: 'C', color: 'yellow', message: 'Good effort!' };
    return { grade: 'D', color: 'red', message: 'Keep practicing!' };
  }

  onPlayAgain(): void {
    this.playAgain.emit();
  }

  onBackToHub(): void {
    this.backToHub.emit();
  }
}
