import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { ActiveBoostersWidgetComponent } from '../shared/active-boosters-widget/active-boosters-widget.component';
import { GameStateService } from '../services/game-state.service';

interface MemoryCard {
  id: number;
  pairId: number;
  text: string;
  type: 'vietnamese' | 'english';
  isFlipped: boolean;
  isMatched: boolean;
}

@Component({
  selector: 'app-memory-match',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent,
    ActiveBoostersWidgetComponent
  ],
  templateUrl: './memory-match.component.html',
  styleUrls: ['./memory-match.component.scss']
})
export class MemoryMatchComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);

  // Game settings
  gridSize = signal(4); // 4x4 = 16 cards = 8 pairs

  // Game state
  sessionId = signal<number | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(true);
  gameStarted = signal(false);
  isPaused = signal(false);

  // Cards
  cards = signal<MemoryCard[]>([]);
  flippedCards = signal<MemoryCard[]>([]);
  isProcessing = signal(false);

  // Stats
  score = signal(0);
  moves = signal(0);
  matchedPairs = signal(0);
  combo = signal(0);
  maxCombo = signal(0);
  timeElapsed = signal(0);

  // Timer
  private timerInterval: any = null;
  private startTime: number = 0;

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  totalPairs = computed(() => (this.gridSize() * this.gridSize()) / 2);

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

    const pairsNeeded = this.totalPairs();

    this.apiService.startGame('memory_match', { gridSize: this.gridSize() }).subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        // Set active boosters in GameStateService for the widget
        this.gameStateService.setActiveBoosters(response.activeBoosters || []);
        this.initializeCards(response.vocabulary.slice(0, pairsNeeded));
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
    this.cards.set([]);
    this.flippedCards.set([]);
    this.isProcessing.set(false);
    this.score.set(0);
    this.moves.set(0);
    this.matchedPairs.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.timeElapsed.set(0);
    this.gameStarted.set(false);
    this.showGameOver.set(false);
    this.gameResult.set(null);
  }

  initializeCards(vocabulary: GameVocabulary[]): void {
    const cards: MemoryCard[] = [];
    let cardId = 0;

    vocabulary.forEach((vocab, index) => {
      // Vietnamese card
      cards.push({
        id: cardId++,
        pairId: vocab.id,
        text: vocab.vietnameseWord,
        type: 'vietnamese',
        isFlipped: false,
        isMatched: false
      });

      // English card
      cards.push({
        id: cardId++,
        pairId: vocab.id,
        text: vocab.englishWord,
        type: 'english',
        isFlipped: false,
        isMatched: false
      });
    });

    // Shuffle cards
    const shuffled = cards.sort(() => Math.random() - 0.5);
    this.cards.set(shuffled);
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

  flipCard(card: MemoryCard): void {
    if (
      this.isProcessing() ||
      this.isPaused() ||
      card.isFlipped ||
      card.isMatched ||
      this.flippedCards().length >= 2
    ) {
      return;
    }

    // Play card flip sound
    this.audioService.playSound('card-flip');

    // Flip the card
    const updatedCards = this.cards().map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    this.cards.set(updatedCards);

    const newFlipped = [...this.flippedCards(), { ...card, isFlipped: true }];
    this.flippedCards.set(newFlipped);

    // Check for match if two cards are flipped
    if (newFlipped.length === 2) {
      this.moves.update(m => m + 1);
      this.isProcessing.set(true);
      this.checkMatch(newFlipped[0], newFlipped[1]);
    }
  }

  checkMatch(card1: MemoryCard, card2: MemoryCard): void {
    const isMatch = card1.pairId === card2.pairId && card1.type !== card2.type;

    setTimeout(() => {
      if (isMatch) {
        // Match found! Play match sound with combo variation
        this.audioService.playCombo(this.combo());
        this.audioService.playSound('match');

        const updatedCards = this.cards().map(c =>
          c.pairId === card1.pairId ? { ...c, isMatched: true } : c
        );
        this.cards.set(updatedCards);

        // Update score
        const comboMultiplier = Math.min(1 + this.combo() * 0.2, 2);
        const points = Math.round(100 * comboMultiplier);
        this.score.update(s => s + points);
        this.combo.update(c => c + 1);
        this.maxCombo.update(m => Math.max(m, this.combo()));
        this.matchedPairs.update(m => m + 1);

        // Check if game is complete
        if (this.matchedPairs() >= this.totalPairs()) {
          this.endGame();
        }
      } else {
        // No match - play wrong sound and flip cards back
        this.audioService.playSound('wrong');

        const updatedCards = this.cards().map(c =>
          c.id === card1.id || c.id === card2.id
            ? { ...c, isFlipped: false }
            : c
        );
        this.cards.set(updatedCards);

        // Reset combo
        this.combo.set(0);
      }

      this.flippedCards.set([]);
      this.isProcessing.set(false);
    }, 800);
  }

  onPause(): void {
    this.isPaused.update(p => !p);
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

    const accuracy = this.totalPairs() > 0
      ? Math.round((this.matchedPairs() / this.moves()) * 100)
      : 0;

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy: Math.min(accuracy, 100),
      wordsCorrect: this.matchedPairs(),
      wordsWrong: this.moves() - this.matchedPairs(),
      durationSeconds: this.timeElapsed(),
      gameData: {
        gridSize: this.gridSize(),
        totalMoves: this.moves()
      }
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

  private location = inject(Location);

  onBackToHub(): void {
    this.location.back();
  }

  getCardClass(card: MemoryCard): string {
    let classes = 'memory-card';
    if (card.isFlipped || card.isMatched) classes += ' flipped';
    if (card.isMatched) classes += ' matched';
    return classes;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
