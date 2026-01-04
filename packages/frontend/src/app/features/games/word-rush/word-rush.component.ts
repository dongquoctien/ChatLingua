import { Component, OnInit, OnDestroy, signal, computed, effect, untracked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { GameStateService } from '../services/game-state.service';

interface WordOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-word-rush',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent
  ],
  templateUrl: './word-rush.component.html',
  styleUrls: ['./word-rush.component.scss']
})
export class WordRushComponent implements OnInit, OnDestroy {
  // For template access
  Math = Math;

  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(true);
  gameStarted = signal(false);

  // Current word and options
  currentWord = signal<GameVocabulary | null>(null);
  options = signal<WordOption[]>([]);
  selectedOption = signal<number | null>(null);
  showFeedback = signal(false);
  feedbackCorrect = signal(false);

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Animation states
  wordAnimation = signal<'enter' | 'exit' | 'none'>('none');

  private dialogService = inject(DialogService);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService,
    public gameState: GameStateService
  ) {
    // Watch for game over state from timer expiration
    effect(() => {
      const isGameOver = this.gameState.isGameOver();
      // Use untracked to avoid circular dependencies
      const gameStarted = untracked(() => this.gameStarted());
      const alreadyShowingGameOver = untracked(() => this.showGameOver());

      if (isGameOver && gameStarted && !alreadyShowingGameOver) {
        // Timer ran out - trigger game over (use setTimeout to defer signal writes)
        setTimeout(() => this.endGame(), 0);
      }
    });
  }

  ngOnInit(): void {
    this.startNewGame();
  }

  ngOnDestroy(): void {
    this.gameState.reset();
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.gameState.reset();

    this.apiService.startGame('word_rush').subscribe({
      next: (response) => {
        this.gameState.initializeGame(response, 60, 3);
        this.gameState.shuffleVocabulary();
        this.isLoading.set(false);
        this.showCountdown.set(true);
      },
      error: (err) => {
        console.error('Failed to start game:', err);
        this.error.set(err.error?.message || 'Failed to start game');
        this.isLoading.set(false);
      }
    });
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.gameState.startGame();
    this.loadNextWord();
  }

  loadNextWord(): void {
    const vocab = this.gameState.vocabulary();
    const currentIndex = this.gameState.currentIndex();

    if (currentIndex >= vocab.length) {
      this.endGame();
      return;
    }

    // Play whoosh sound for new word
    this.audioService.playSound('whoosh');

    const word = vocab[currentIndex];
    this.currentWord.set(word);
    this.generateOptions(word);
    this.selectedOption.set(null);
    this.showFeedback.set(false);
    this.wordAnimation.set('enter');
  }

  generateOptions(correctWord: GameVocabulary): void {
    const vocab = this.gameState.vocabulary();
    const otherWords = vocab.filter(v => v.id !== correctWord.id);

    // Shuffle and pick 3 wrong answers
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled.slice(0, 3).map(w => ({
      id: w.id,
      text: w.englishWord,
      isCorrect: false
    }));

    // Add correct answer
    const correctOption: WordOption = {
      id: correctWord.id,
      text: correctWord.englishWord,
      isCorrect: true
    };

    // Shuffle all options
    const allOptions = [...wrongOptions, correctOption].sort(() => Math.random() - 0.5);
    this.options.set(allOptions);
  }

  selectOption(option: WordOption): void {
    if (this.showFeedback() || this.gameState.isPaused() || this.gameState.isGameOver()) {
      return;
    }

    this.selectedOption.set(option.id);
    this.showFeedback.set(true);
    this.feedbackCorrect.set(option.isCorrect);

    if (option.isCorrect) {
      // Correct answer - play combo sound
      this.audioService.playCombo(this.gameState.combo());
      this.audioService.playSound('correct');

      const basePoints = 100;
      const timeBonus = Math.floor(this.gameState.timeLeft() / 2);
      this.gameState.recordCorrect(basePoints + timeBonus);
      this.gameState.addTime(2); // Bonus time for correct answer
    } else {
      // Wrong answer
      this.audioService.playSound('wrong');

      this.gameState.recordWrong();
      const isGameOver = this.gameState.loseLife();
      if (isGameOver) {
        setTimeout(() => this.endGame(), 500);
        return;
      }
    }

    // Move to next word after feedback
    setTimeout(() => {
      this.wordAnimation.set('exit');
      setTimeout(() => {
        // Check if game already ended (e.g., timer ran out during feedback)
        if (this.gameState.isGameOver()) {
          if (!this.showGameOver()) {
            this.endGame();
          }
          return;
        }
        if (!this.gameState.nextWord()) {
          this.endGame();
        } else {
          this.loadNextWord();
        }
      }, 200);
    }, 800);
  }

  onPause(): void {
    this.gameState.togglePause();
  }

  async onQuit(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Quit Game',
      message: 'Are you sure you want to quit? Your progress will be saved.',
      confirmText: 'Quit',
      cancelText: 'Continue',
    });
    if (confirmed) {
      this.endGame();
    }
  }

  endGame(): void {
    this.gameState.endGame();

    const sessionId = this.gameState.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const endData = this.gameState.getEndGameData();

    this.apiService.endGame(sessionId, endData).subscribe({
      next: (response: EndGameResponse) => {
        this.gameResult.set({
          sessionId,
          score: response.session.score,
          maxCombo: response.session.maxCombo,
          accuracy: response.session.accuracy,
          wordsCorrect: response.session.wordsCorrect,
          wordsWrong: response.session.wordsWrong,
          durationSeconds: response.session.durationSeconds,
          xpEarned: response.xpEarned,
          coinsEarned: response.coinsEarned,
          isNewBestScore: response.isNewBestScore,
          leaderboardPosition: response.leaderboardPosition,
          newAchievements: response.newAchievements
        });
        this.showGameOver.set(true);
      },
      error: (err) => {
        console.error('Failed to end game:', err);
        // Still show game over with local data
        this.gameResult.set({
          ...endData,
          xpEarned: 0,
          coinsEarned: 0,
          isNewBestScore: false,
          newAchievements: []
        });
        this.showGameOver.set(true);
      }
    });
  }

  onPlayAgain(): void {
    this.showGameOver.set(false);
    this.gameResult.set(null);
    this.startNewGame();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  getOptionClass(option: WordOption): string {
    if (!this.showFeedback()) return '';
    if (option.id === this.selectedOption()) {
      return option.isCorrect ? 'correct' : 'incorrect';
    }
    if (option.isCorrect) return 'correct-highlight';
    return 'disabled';
  }
}
