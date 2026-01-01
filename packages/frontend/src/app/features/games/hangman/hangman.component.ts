import { Component, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';

@Component({
  selector: 'app-hangman',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent
  ],
  templateUrl: './hangman.component.html',
  styleUrls: ['./hangman.component.scss']
})
export class HangmanComponent implements OnInit, OnDestroy {
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

  // Game mechanics
  guessedLetters = signal<Set<string>>(new Set());
  wrongGuesses = signal(0);
  maxWrongGuesses = 6; // Head, body, left arm, right arm, left leg, right leg

  // Stats
  score = signal(0);
  wordsCorrect = signal(0);
  wordsWrong = signal(0);
  combo = signal(0);
  maxCombo = signal(0);
  timeElapsed = signal(0);

  // Timer
  private timerInterval: any = null;
  private startTime: number = 0;

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Word display
  displayWord = computed(() => {
    const word = this.currentWord();
    if (!word) return [];
    const guessed = this.guessedLetters();
    return word.englishWord.toUpperCase().split('').map(letter => {
      if (letter === ' ') return ' ';
      return guessed.has(letter) ? letter : '_';
    });
  });

  isWordComplete = computed(() => {
    const display = this.displayWord();
    return display.length > 0 && !display.includes('_');
  });

  // Keyboard
  keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

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

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.gameStarted() || this.isPaused() || this.showGameOver()) return;

    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      this.guessLetter(key);
    }
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.resetGame();

    this.apiService.startGame('hangman').subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
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
    this.guessedLetters.set(new Set());
    this.wrongGuesses.set(0);
    this.score.set(0);
    this.wordsCorrect.set(0);
    this.wordsWrong.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.timeElapsed.set(0);
    this.gameStarted.set(false);
    this.showGameOver.set(false);
    this.gameResult.set(null);
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startTimer();
  }

  startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timeElapsed.set(Math.floor((Date.now() - this.startTime) / 1000));
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  guessLetter(letter: string): void {
    if (this.guessedLetters().has(letter)) return;

    // Play key click sound
    this.audioService.playSound('click');

    const newGuessed = new Set(this.guessedLetters());
    newGuessed.add(letter);
    this.guessedLetters.set(newGuessed);

    const word = this.currentWord();
    if (!word) return;

    const wordUpper = word.englishWord.toUpperCase();
    if (wordUpper.includes(letter)) {
      // Correct guess - play correct sound with combo
      this.audioService.playCombo(this.combo());
      this.audioService.playSound('correct');

      const occurrences = (wordUpper.match(new RegExp(letter, 'g')) || []).length;
      const points = occurrences * 20;
      this.score.update(s => s + points);
      this.combo.update(c => c + 1);
      this.maxCombo.update(m => Math.max(m, this.combo()));

      // Check if word is complete
      if (this.isWordComplete()) {
        this.wordCompleted(true);
      }
    } else {
      // Wrong guess - play wrong sound
      this.audioService.playSound('wrong');
      this.wrongGuesses.update(w => w + 1);
      this.combo.set(0);

      if (this.wrongGuesses() >= this.maxWrongGuesses) {
        this.wordCompleted(false);
      }
    }
  }

  wordCompleted(success: boolean): void {
    if (success) {
      // Play level up sound for word completion
      this.audioService.playSound('level-up');
      this.wordsCorrect.update(c => c + 1);
      // Bonus points for completing word
      const remainingGuesses = this.maxWrongGuesses - this.wrongGuesses();
      const bonus = remainingGuesses * 50;
      this.score.update(s => s + bonus);
    } else {
      // Play game over sound for failed word
      this.audioService.playSound('game-over');
      this.wordsWrong.update(c => c + 1);
    }

    // Move to next word after delay
    setTimeout(() => {
      if (this.currentIndex() < this.vocabulary().length - 1) {
        this.nextWord();
      } else {
        this.endGame();
      }
    }, 1500);
  }

  nextWord(): void {
    // Play whoosh for new word
    this.audioService.playSound('whoosh');
    this.currentIndex.update(i => i + 1);
    this.guessedLetters.set(new Set());
    this.wrongGuesses.set(0);
  }

  isLetterGuessed(letter: string): boolean {
    return this.guessedLetters().has(letter);
  }

  isLetterCorrect(letter: string): boolean {
    const word = this.currentWord();
    if (!word) return false;
    return word.englishWord.toUpperCase().includes(letter);
  }

  getLetterClass(letter: string): string {
    if (!this.isLetterGuessed(letter)) return '';
    return this.isLetterCorrect(letter) ? 'correct' : 'incorrect';
  }

  onPause(): void {
    this.isPaused.update(p => !p);
  }

  onQuit(): void {
    if (confirm('Are you sure you want to quit? Your progress will be saved.')) {
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
      durationSeconds: this.timeElapsed()
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

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
