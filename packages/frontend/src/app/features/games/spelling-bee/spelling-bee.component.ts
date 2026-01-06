import { Component, OnInit, OnDestroy, signal, computed, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { ActiveBoostersWidgetComponent } from '../shared/active-boosters-widget/active-boosters-widget.component';
import { GameStateService } from '../services/game-state.service';

@Component({
  selector: 'app-spelling-bee',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent,
    ActiveBoostersWidgetComponent
  ],
  templateUrl: './spelling-bee.component.html',
  styleUrls: ['./spelling-bee.component.scss']
})
export class SpellingBeeComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  // Game state
  sessionId = signal<number | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(true);
  gameStarted = signal(false);
  isPaused = signal(false);

  // Vocabulary
  vocabulary = signal<GameVocabulary[]>([]);
  currentIndex = signal(0);
  currentWord = computed(() => {
    const vocab = this.vocabulary();
    const idx = this.currentIndex();
    return vocab[idx] || null;
  });

  // Input
  userInput = signal('');
  showFeedback = signal(false);
  isCorrect = signal(false);
  attempts = signal(0);
  maxAttempts = 3;

  // Stats
  score = signal(0);
  wordsCorrect = signal(0);
  wordsWrong = signal(0);
  combo = signal(0);
  maxCombo = signal(0);
  timeLeft = signal(120); // 2 minutes

  // Timer
  private timerInterval: any = null;
  private startTime: number = 0;

  // Audio
  isPlaying = signal(false);

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  private dialogService = inject(DialogService);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.startNewGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.resetGame();

    this.apiService.startGame('spelling_bee').subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        // Set active boosters in GameStateService for the widget
        this.gameStateService.setActiveBoosters(response.activeBoosters || []);
        this.vocabulary.set(response.vocabulary);
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

  resetGame(): void {
    this.stopTimer();
    this.vocabulary.set([]);
    this.currentIndex.set(0);
    this.userInput.set('');
    this.showFeedback.set(false);
    this.isCorrect.set(false);
    this.attempts.set(0);
    this.score.set(0);
    this.wordsCorrect.set(0);
    this.wordsWrong.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.timeLeft.set(120);
    this.gameStarted.set(false);
    this.showGameOver.set(false);
    this.gameResult.set(null);
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startTimer();
    this.playCurrentWord();
    setTimeout(() => this.focusInput(), 100);
  }

  startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timeLeft.update(t => {
          if (t <= 1) {
            this.endGame();
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  focusInput(): void {
    if (this.inputField) {
      this.inputField.nativeElement.focus();
    }
  }

  playCurrentWord(): void {
    const word = this.currentWord();
    if (!word || this.isPlaying()) return;

    this.isPlaying.set(true);
    // Play ding sound when playing word
    this.audioService.playSound('ding');

    // Use browser speech synthesis
    const utterance = new SpeechSynthesisUtterance(word.englishWord);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.onend = () => this.isPlaying.set(false);
    utterance.onerror = () => this.isPlaying.set(false);

    speechSynthesis.speak(utterance);
  }

  submitAnswer(): void {
    if (!this.userInput().trim() || this.showFeedback()) return;

    // Play click on submit
    this.audioService.playSound('click');

    const word = this.currentWord();
    if (!word) return;

    const correct = this.userInput().trim().toLowerCase() === word.englishWord.toLowerCase();
    this.showFeedback.set(true);
    this.isCorrect.set(correct);

    if (correct) {
      // Correct answer - play combo sound
      this.audioService.playCombo(this.combo());
      this.audioService.playSound('correct');

      const attemptsBonus = (this.maxAttempts - this.attempts()) * 20;
      const comboMultiplier = Math.min(1 + this.combo() * 0.15, 2);
      const points = Math.round((100 + attemptsBonus) * comboMultiplier);

      this.score.update(s => s + points);
      this.wordsCorrect.update(c => c + 1);
      this.combo.update(c => c + 1);
      this.maxCombo.update(m => Math.max(m, this.combo()));
      this.timeLeft.update(t => t + 5); // Bonus time

      setTimeout(() => this.nextWord(), 1200);
    } else {
      // Wrong answer
      this.audioService.playSound('wrong');
      this.attempts.update(a => a + 1);

      if (this.attempts() >= this.maxAttempts) {
        // Failed word
        this.wordsWrong.update(c => c + 1);
        this.combo.set(0);
        setTimeout(() => this.nextWord(), 1500);
      } else {
        // Try again
        setTimeout(() => {
          this.showFeedback.set(false);
          this.userInput.set('');
          this.focusInput();
        }, 800);
      }
    }
  }

  nextWord(): void {
    if (this.currentIndex() < this.vocabulary().length - 1) {
      // Play whoosh for new word
      this.audioService.playSound('whoosh');
      this.currentIndex.update(i => i + 1);
      this.userInput.set('');
      this.showFeedback.set(false);
      this.isCorrect.set(false);
      this.attempts.set(0);
      this.playCurrentWord();
      setTimeout(() => this.focusInput(), 100);
    } else {
      this.endGame();
    }
  }

  skipWord(): void {
    this.audioService.playSound('close');
    this.wordsWrong.update(c => c + 1);
    this.combo.set(0);
    this.nextWord();
  }

  getHint(): string {
    const word = this.currentWord();
    if (!word) return '';

    const english = word.englishWord;
    const revealed = Math.min(this.attempts() + 1, Math.ceil(english.length / 2));

    return english
      .split('')
      .map((char, i) => (i < revealed ? char : '_'))
      .join(' ');
  }

  onPause(): void {
    this.isPaused.update(p => !p);
    if (!this.isPaused()) {
      this.focusInput();
    }
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
    this.stopTimer();

    const sessionId = this.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const total = this.wordsCorrect() + this.wordsWrong();
    const accuracy = total > 0 ? Math.round((this.wordsCorrect() / total) * 100) : 0;

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy: accuracy,
      wordsCorrect: this.wordsCorrect(),
      wordsWrong: this.wordsWrong(),
      durationSeconds: 120 - this.timeLeft()
    };

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

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submitAnswer();
    }
  }
}
