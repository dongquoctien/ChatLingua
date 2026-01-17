import { Injectable, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, GameVocabulary, StartGameResponse, EndGameResponse, GameActiveBooster, StartGameOptions, GameSourceType } from '../../../core/services/api.service';
import { Observable } from 'rxjs';

export interface GameState {
  sessionId: number | null;
  gameCode: string;
  gameName: string;
  vocabulary: GameVocabulary[];
  currentIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  correctCount: number;
  wrongCount: number;
  lives: number;
  maxLives: number;
  timeLeft: number;
  totalTime: number;
  isPaused: boolean;
  isGameOver: boolean;
  isCountingDown: boolean;
  startTime: number | null;
  activeBoosters: GameActiveBooster[];
}

const initialState: GameState = {
  sessionId: null,
  gameCode: '',
  gameName: '',
  vocabulary: [],
  currentIndex: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  correctCount: 0,
  wrongCount: 0,
  lives: 3,
  maxLives: 3,
  timeLeft: 60,
  totalTime: 60,
  isPaused: false,
  isGameOver: false,
  isCountingDown: true,
  startTime: null,
  activeBoosters: [],
};

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private state = signal<GameState>({ ...initialState });
  private timerInterval: any = null;

  // Computed signals for components
  readonly sessionId = computed(() => this.state().sessionId);
  readonly gameCode = computed(() => this.state().gameCode);
  readonly gameName = computed(() => this.state().gameName);
  readonly vocabulary = computed(() => this.state().vocabulary);
  readonly currentVocabulary = computed(() => {
    const state = this.state();
    return state.vocabulary[state.currentIndex] || null;
  });
  readonly currentIndex = computed(() => this.state().currentIndex);
  readonly score = computed(() => this.state().score);
  readonly combo = computed(() => this.state().combo);
  readonly maxCombo = computed(() => this.state().maxCombo);
  readonly correctCount = computed(() => this.state().correctCount);
  readonly wrongCount = computed(() => this.state().wrongCount);
  readonly lives = computed(() => this.state().lives);
  readonly maxLives = computed(() => this.state().maxLives);
  readonly timeLeft = computed(() => this.state().timeLeft);
  readonly isPaused = computed(() => this.state().isPaused);
  readonly isGameOver = computed(() => this.state().isGameOver);
  readonly isCountingDown = computed(() => this.state().isCountingDown);
  readonly activeBoosters = computed(() => this.state().activeBoosters);

  // Computed booster multipliers
  readonly xpMultiplier = computed(() => {
    const boosters = this.state().activeBoosters;
    let multiplier = 1;
    for (const b of boosters) {
      if (b.effectType === 'xp_multiplier') {
        multiplier = Math.max(multiplier, b.multiplier);
      }
    }
    return multiplier;
  });

  readonly coinMultiplier = computed(() => {
    const boosters = this.state().activeBoosters;
    let multiplier = 1;
    for (const b of boosters) {
      if (b.effectType === 'coin_multiplier') {
        multiplier = Math.max(multiplier, b.multiplier);
      }
    }
    return multiplier;
  });

  readonly accuracy = computed(() => {
    const state = this.state();
    const total = state.correctCount + state.wrongCount;
    return total === 0 ? 0 : Math.round((state.correctCount / total) * 100);
  });

  readonly progress = computed(() => {
    const state = this.state();
    return state.vocabulary.length > 0
      ? Math.round((state.currentIndex / state.vocabulary.length) * 100)
      : 0;
  });

  constructor(private apiService: ApiService) {}

  initializeGame(response: StartGameResponse, totalTime: number = 60, maxLives: number = 3): void {
    this.stopTimer();
    this.state.set({
      ...initialState,
      sessionId: response.sessionId,
      gameCode: response.game.gameCode,
      gameName: response.game.name,
      vocabulary: response.vocabulary,
      timeLeft: totalTime,
      totalTime: totalTime,
      lives: maxLives,
      maxLives: maxLives,
      isCountingDown: true,
      activeBoosters: response.activeBoosters || [],
    });
  }

  startGame(): void {
    this.state.update(s => ({
      ...s,
      isCountingDown: false,
      startTime: Date.now(),
    }));
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const state = this.state();
      if (!state.isPaused && !state.isGameOver) {
        if (state.timeLeft <= 1) {
          // Set timeLeft to 0 first, then end game
          this.state.update(s => ({ ...s, timeLeft: 0 }));
          this.endGame();
        } else {
          this.state.update(s => ({ ...s, timeLeft: s.timeLeft - 1 }));
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  pauseGame(): void {
    this.state.update(s => ({ ...s, isPaused: true }));
  }

  resumeGame(): void {
    this.state.update(s => ({ ...s, isPaused: false }));
  }

  togglePause(): void {
    if (this.state().isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  addScore(points: number): void {
    this.state.update(s => ({
      ...s,
      score: s.score + points,
    }));
  }

  incrementCombo(): void {
    this.state.update(s => ({
      ...s,
      combo: s.combo + 1,
      maxCombo: Math.max(s.maxCombo, s.combo + 1),
    }));
  }

  resetCombo(): void {
    this.state.update(s => ({ ...s, combo: 0 }));
  }

  recordCorrect(bonusPoints: number = 10): void {
    const comboMultiplier = Math.min(1 + this.state().combo * 0.1, 2);
    const points = Math.round(bonusPoints * comboMultiplier);

    this.state.update(s => ({
      ...s,
      correctCount: s.correctCount + 1,
      score: s.score + points,
      combo: s.combo + 1,
      maxCombo: Math.max(s.maxCombo, s.combo + 1),
    }));
  }

  recordWrong(): void {
    this.state.update(s => ({
      ...s,
      wrongCount: s.wrongCount + 1,
      combo: 0,
    }));
  }

  loseLife(): boolean {
    const newLives = this.state().lives - 1;
    this.state.update(s => ({ ...s, lives: newLives }));

    if (newLives <= 0) {
      this.endGame();
      return true;
    }
    return false;
  }

  addTime(seconds: number): void {
    this.state.update(s => ({
      ...s,
      timeLeft: s.timeLeft + seconds,
    }));
  }

  nextWord(): boolean {
    const state = this.state();
    if (state.currentIndex >= state.vocabulary.length - 1) {
      return false;
    }
    this.state.update(s => ({ ...s, currentIndex: s.currentIndex + 1 }));
    return true;
  }

  setCurrentIndex(index: number): void {
    this.state.update(s => ({ ...s, currentIndex: index }));
  }

  shuffleVocabulary(): void {
    this.state.update(s => ({
      ...s,
      vocabulary: [...s.vocabulary].sort(() => Math.random() - 0.5),
    }));
  }

  endGame(): void {
    this.stopTimer();
    this.state.update(s => ({ ...s, isGameOver: true }));
  }

  getDuration(): number {
    const state = this.state();
    if (!state.startTime) return 0;
    return Math.floor((Date.now() - state.startTime) / 1000);
  }

  getEndGameData() {
    const state = this.state();
    return {
      score: state.score,
      maxCombo: state.maxCombo,
      accuracy: this.accuracy(),
      wordsCorrect: state.correctCount,
      wordsWrong: state.wrongCount,
      durationSeconds: this.getDuration(),
    };
  }

  reset(): void {
    this.stopTimer();
    this.state.set({ ...initialState });
  }

  // Set active boosters (for games that don't use full initializeGame)
  setActiveBoosters(boosters: GameActiveBooster[]): void {
    this.state.update(s => ({ ...s, activeBoosters: boosters || [] }));
  }

  /**
   * Start a game with vocabulary source options from query params
   * Components can call this instead of apiService.startGame directly
   */
  startGameWithOptions(
    gameCode: string,
    route: ActivatedRoute,
    additionalOptions?: Partial<StartGameOptions>
  ): Observable<StartGameResponse> {
    const queryParams = route.snapshot.queryParams;

    const options: StartGameOptions = {
      ...additionalOptions,
    };

    // Read vocabulary source options from query params
    if (queryParams['sourceType']) {
      options.sourceType = queryParams['sourceType'] as GameSourceType;
    }
    if (queryParams['mapId']) {
      options.mapId = parseInt(queryParams['mapId'], 10);
    }
    if (queryParams['prioritizeLowMastery'] !== undefined) {
      options.prioritizeLowMastery = queryParams['prioritizeLowMastery'] === 'true';
    }

    return this.apiService.startGame(gameCode, options);
  }
}
