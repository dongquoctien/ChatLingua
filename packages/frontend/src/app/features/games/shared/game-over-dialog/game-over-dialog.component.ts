import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameAchievementInfo } from '../../../../core/services/api.service';
import { AudioService } from '../../../../core/services/audio.service';
import { ShareDialogComponent, ShareableContent } from '../../../chat/components/share-dialog/share-dialog.component';
import { ChatService } from '../../../chat/services/chat.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import type { UserStatusInfo } from '../../../chat/chat.types';

export interface GameResult {
  sessionId?: number; // Game session ID for sharing
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
  victory?: boolean; // true = Victory!, false/undefined = Game Over!
}

@Component({
  selector: 'app-game-over-dialog',
  standalone: true,
  imports: [CommonModule, ShareDialogComponent],
  templateUrl: './game-over-dialog.component.html',
  styleUrls: ['./game-over-dialog.component.scss']
})
export class GameOverDialogComponent implements OnChanges {
  private chatService = inject(ChatService);
  private dialogService = inject(DialogService);

  @Input() isOpen: boolean = false;
  @Input() gameName: string = '';
  @Input() gameType: string = ''; // e.g., 'word-rush', 'anagram', etc.
  @Input() result: GameResult | null = null;

  @Output() playAgain = new EventEmitter<void>();
  @Output() backToHub = new EventEmitter<void>();

  // Share dialog state
  readonly showShareDialog = signal(false);
  readonly shareableUsers = signal<UserStatusInfo[]>([]);
  readonly shareContent = signal<ShareableContent | null>(null);

  private hasPlayedSound = false;

  constructor(private audioService: AudioService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Play sound when dialog opens
    if (changes['isOpen'] && this.isOpen && !this.hasPlayedSound) {
      this.hasPlayedSound = true;

      // Play victory sound for good performance, game-over for poor performance
      const isGoodPerformance = this.result?.victory ||
        (this.result && this.result.accuracy >= 70 && this.result.wordsCorrect > 0) ||
        (this.result && this.result.wordsWrong === 0 && this.result.wordsCorrect > 0);

      if (isGoodPerformance) {
        this.audioService.playSound('victory');
      } else {
        this.audioService.playSound('game-over');
      }

      // Play achievement sound if there are new achievements
      if (this.result?.newAchievements && this.result.newAchievements.length > 0) {
        setTimeout(() => {
          this.audioService.playSound('achievement');
        }, 1000);
      }

      // Play coin sound if earned coins
      if (this.result?.coinsEarned && this.result.coinsEarned > 0) {
        setTimeout(() => {
          this.audioService.playSound('coin');
        }, 500);
      }
    }

    // Reset flag when dialog closes
    if (changes['isOpen'] && !this.isOpen) {
      this.hasPlayedSound = false;
    }
  }

  // Icon map for FA names to emojis
  private iconMap: Record<string, string> = {
    'fa-play': '▶️',
    'fa-bolt': '⚡',
    'fa-fire': '🔥',
    'fa-link': '🔗',
    'fa-check': '✅',
    'fa-check-double': '✅',
    'fa-hundred-points': '💯',
    'fa-star': '⭐',
    'fa-trophy': '🏆',
    'fa-medal': '🎖️',
    'fa-crown': '👑',
    'fa-brain': '🧠',
    'fa-stopwatch': '⏱️',
    'fa-magnifying-glass': '🔍',
    'fa-keyboard': '⌨️',
    'fa-level-up-alt': '📈',
    'fa-repeat': '🔄',
  };

  getAchievementIcon(icon: string | null): string {
    if (!icon) return '🏆';
    return this.iconMap[icon] || '🏆';
  }

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

  get headerText(): string {
    if (!this.result) return 'Game Over!';

    // Check explicit victory flag first
    if (this.result.victory) return 'Victory!';

    // Auto-detect based on performance
    const accuracy = this.result.accuracy;
    const hasCorrectAnswers = this.result.wordsCorrect > 0;

    if (accuracy >= 90 && hasCorrectAnswers) return 'Complete!';
    if (accuracy >= 70 && hasCorrectAnswers) return 'Finished!';
    if (this.result.wordsWrong === 0 && hasCorrectAnswers) return 'Complete!';

    return 'Game Over!';
  }

  onPlayAgain(): void {
    this.audioService.playSound('select');
    this.playAgain.emit();
  }

  onBackToHub(): void {
    this.audioService.playSound('close');
    this.backToHub.emit();
  }

  // Share functionality
  openShareDialog(): void {
    if (!this.result) return;

    this.audioService.playSound('select');

    // Create shareable content for the game result
    // Use actual session ID for sharing, check if available
    const sessionId = this.result?.sessionId || 0;
    if (!sessionId) {
      console.warn('No session ID available for sharing');
      this.dialogService.alert({
        title: 'Cannot Share',
        message: 'Game session was not saved properly. Please try playing again.',
        buttonText: 'OK',
      });
      return;
    }

    this.shareContent.set({
      type: 'game',
      id: sessionId,
      title: this.gameName,
      subtitle: `Score: ${this.result.score} • ${this.result.accuracy}% accuracy`,
      icon: '🎮',
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      data: {
        gameName: this.gameName,
        gameType: this.gameType,
        score: this.result.score,
        accuracy: this.result.accuracy,
        wordsLearned: this.result.wordsCorrect,
        timeSpent: this.result.durationSeconds,
        highScore: this.result.isNewBestScore,
        maxCombo: this.result.maxCombo,
        victory: this.result.victory,
      },
    });

    // Load users for share dialog
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        this.shareableUsers.set(response.items);
        this.showShareDialog.set(true);
      },
      error: (err) => {
        console.error('Failed to load users for sharing:', err);
      },
    });
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
  }

  onShared(event: { recipientId: number; comment: string }): void {
    this.audioService.playSound('ding');
    this.showShareDialog.set(false);
  }
}
