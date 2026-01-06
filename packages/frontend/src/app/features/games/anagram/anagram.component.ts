import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { ActiveBoostersWidgetComponent } from '../shared/active-boosters-widget/active-boosters-widget.component';
import { GameStateService } from '../services/game-state.service';

interface AnagramWord {
  id: number;
  original: string;
  vietnamese: string;
  scrambled: string[];
  arranged: string[];
  isCompleted: boolean;
}

interface LetterTile {
  id: number;
  letter: string;
  isUsed: boolean;
  originalIndex: number;
}

@Component({
  selector: 'app-anagram',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, GameOverDialogComponent, CountdownComponent, ActiveBoostersWidgetComponent],
  templateUrl: './anagram.component.html',
  styleUrls: ['./anagram.component.scss']
})
export class AnagramComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);

  // Booster signals from GameStateService
  readonly activeBoosters = this.gameStateService.activeBoosters;
  readonly xpMultiplier = this.gameStateService.xpMultiplier;
  readonly coinMultiplier = this.gameStateService.coinMultiplier;

  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  gameStarted = signal(false);
  isPaused = signal(false);
  showGameOver = signal(false);
  sessionId = signal<number | null>(null);

  // Current word state
  currentWord = signal<AnagramWord | null>(null);
  currentWordIndex = signal(0);
  scrambledTiles = signal<LetterTile[]>([]);
  arrangedTiles = signal<LetterTile[]>([]);
  showHint = signal(false);
  isCorrect = signal<boolean | null>(null);

  // All words for the game
  words = signal<AnagramWord[]>([]);
  totalWords = 10;

  // Game stats
  score = signal(0);
  timeElapsed = signal(0);
  hintsUsed = signal(0);
  wordsCorrect = signal(0);
  wordsWrong = signal(0);
  private timerInterval: any;

  // Computed
  progress = computed(() => {
    const total = this.words().length;
    if (total === 0) return 0;
    return Math.round((this.currentWordIndex() / total) * 100);
  });

  canSubmit = computed(() => {
    const current = this.currentWord();
    if (!current) return false;
    return this.arrangedTiles().length === current.original.length;
  });

  gameResult = computed<GameResult>(() => {
    const total = this.words().length;
    const correct = this.wordsCorrect();
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      sessionId: this.sessionId() ?? undefined,
      score: this.score(),
      maxCombo: 0,
      accuracy,
      wordsCorrect: correct,
      wordsWrong: this.wordsWrong(),
      durationSeconds: this.timeElapsed(),
      xpEarned: 0,
      coinsEarned: 0,
      isNewBestScore: false,
      newAchievements: [],
    };
  });

  // Vocabulary for generating puzzle
  private vocabulary: GameVocabulary[] = [];

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
    this.score.set(0);
    this.timeElapsed.set(0);
    this.hintsUsed.set(0);
    this.wordsCorrect.set(0);
    this.wordsWrong.set(0);
    this.currentWordIndex.set(0);
    this.stopTimer();

    this.apiService.startGame('anagram').subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        // Set active boosters in GameStateService for the widget
        this.gameStateService.setActiveBoosters(response.activeBoosters || []);
        // Filter vocabulary for anagram suitability (3-10 letters, only letters)
        this.vocabulary = response.vocabulary.filter(v =>
          v.englishWord.length >= 3 &&
          v.englishWord.length <= 10 &&
          /^[a-zA-Z]+$/.test(v.englishWord)
        );

        if (this.vocabulary.length < 5) {
          this.error.set('Not enough vocabulary for the game. Please add more words.');
          this.isLoading.set(false);
          return;
        }

        this.generateWords();
        this.isLoading.set(false);
        this.showCountdown.set(true);
      },
      error: (err) => {
        console.error('Error starting game:', err);
        this.error.set(err.error?.message || 'Failed to start game');
        this.isLoading.set(false);
      }
    });
  }

  private generateWords(): void {
    // Shuffle and select words
    const shuffled = [...this.vocabulary].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(this.totalWords, shuffled.length));

    const words: AnagramWord[] = selected.map((vocab, index) => {
      const original = vocab.englishWord.toUpperCase();
      return {
        id: index,
        original,
        vietnamese: vocab.vietnameseWord,
        scrambled: this.scrambleWord(original),
        arranged: [],
        isCompleted: false,
      };
    });

    this.words.set(words);
    this.loadCurrentWord();
  }

  private scrambleWord(word: string): string[] {
    const letters = word.split('');
    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    // Make sure it's not the same as original
    if (letters.join('') === word) {
      return this.scrambleWord(word);
    }
    return letters;
  }

  private loadCurrentWord(): void {
    const words = this.words();
    const index = this.currentWordIndex();

    if (index >= words.length) {
      this.endGame(true);
      return;
    }

    const word = words[index];
    this.currentWord.set(word);
    this.showHint.set(false);
    this.isCorrect.set(null);

    // Create letter tiles
    const tiles: LetterTile[] = word.scrambled.map((letter, i) => ({
      id: i,
      letter,
      isUsed: false,
      originalIndex: i,
    }));

    this.scrambledTiles.set(tiles);
    this.arrangedTiles.set([]);
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timeElapsed.update(t => t + 1);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Select a letter from scrambled area
  selectLetter(tile: LetterTile): void {
    if (this.isPaused() || this.showGameOver() || tile.isUsed || this.isCorrect() !== null) return;

    // Play click sound for letter selection
    this.audioService.playSound('click');

    // Mark as used
    this.scrambledTiles.update(tiles =>
      tiles.map(t => t.id === tile.id ? { ...t, isUsed: true } : t)
    );

    // Add to arranged
    this.arrangedTiles.update(tiles => [...tiles, tile]);
  }

  // Remove a letter from arranged area
  removeLetter(tile: LetterTile): void {
    if (this.isPaused() || this.showGameOver() || this.isCorrect() !== null) return;

    // Play close sound for removing letter
    this.audioService.playSound('close');

    // Remove from arranged
    this.arrangedTiles.update(tiles => tiles.filter(t => t.id !== tile.id));

    // Mark as not used in scrambled
    this.scrambledTiles.update(tiles =>
      tiles.map(t => t.id === tile.id ? { ...t, isUsed: false } : t)
    );
  }

  // Shuffle the scrambled letters
  shuffleLetters(): void {
    if (this.isPaused() || this.isCorrect() !== null) return;

    // Play whoosh sound for shuffle
    this.audioService.playSound('whoosh');

    // Reset all tiles
    this.arrangedTiles.set([]);

    const currentWord = this.currentWord();
    if (!currentWord) return;

    const newScrambled = this.scrambleWord(currentWord.original);
    const tiles: LetterTile[] = newScrambled.map((letter, i) => ({
      id: i,
      letter,
      isUsed: false,
      originalIndex: i,
    }));

    this.scrambledTiles.set(tiles);
  }

  // Use hint
  useHint(): void {
    if (this.showHint()) return;

    // Play ding sound for hint usage
    this.audioService.playSound('ding');

    this.showHint.set(true);
    this.hintsUsed.update(h => h + 1);
    this.score.update(s => Math.max(0, s - 15)); // Penalty for hint
  }

  // Submit answer
  submitAnswer(): void {
    if (!this.canSubmit() || this.isCorrect() !== null) return;

    const arranged = this.arrangedTiles().map(t => t.letter).join('');
    const correct = this.currentWord()?.original;

    if (arranged === correct) {
      // Correct! - Play correct sound
      this.audioService.playSound('correct');
      this.isCorrect.set(true);
      this.wordsCorrect.update(c => c + 1);

      // Calculate score: base 100 + length bonus - hint penalty
      const lengthBonus = (correct?.length || 0) * 10;
      const hintPenalty = this.showHint() ? 25 : 0;
      this.score.update(s => s + 100 + lengthBonus - hintPenalty);

      // Auto advance after delay
      setTimeout(() => this.nextWord(), 1500);
    } else {
      // Wrong - Play wrong sound
      this.audioService.playSound('wrong');
      this.isCorrect.set(false);
      this.wordsWrong.update(w => w + 1);

      // Show correct answer briefly then move on
      setTimeout(() => this.nextWord(), 2000);
    }
  }

  // Skip current word
  skipWord(): void {
    if (this.isCorrect() !== null) return;

    // Play close sound for skip
    this.audioService.playSound('close');
    this.wordsWrong.update(w => w + 1);
    this.nextWord();
  }

  // Move to next word
  private nextWord(): void {
    // Play whoosh sound for next word transition
    this.audioService.playSound('whoosh');
    this.currentWordIndex.update(i => i + 1);
    this.loadCurrentWord();
  }

  onPause(): void {
    this.isPaused.update(p => !p);
  }

  onQuit(): void {
    this.endGame(false);
  }

  private endGame(completed: boolean): void {
    this.stopTimer();

    // Time bonus for fast completion
    if (completed) {
      const avgTimePerWord = this.timeElapsed() / this.words().length;
      if (avgTimePerWord < 10) {
        this.score.update(s => s + 100); // Speed bonus
      } else if (avgTimePerWord < 20) {
        this.score.update(s => s + 50);
      }
    }

    // Save session
    const sessionId = this.sessionId();
    if (sessionId) {
      const total = this.words().length;
      const correct = this.wordsCorrect();
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const endData = {
        score: this.score(),
        maxCombo: 0,
        accuracy,
        wordsCorrect: correct,
        wordsWrong: this.wordsWrong(),
        durationSeconds: this.timeElapsed(),
        gameData: {
          hintsUsed: this.hintsUsed(),
          completed,
        }
      };

      this.apiService.endGame(sessionId, endData).subscribe({
        next: (response: EndGameResponse) => {
          console.log('Game session saved:', response);
        },
        error: (err) => console.error('Error saving game session:', err)
      });
    }

    this.showGameOver.set(true);
  }

  onPlayAgain(): void {
    this.showGameOver.set(false);
    this.gameStarted.set(false);
    this.startNewGame();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }
}
