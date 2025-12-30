import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, StartGameResponse, EndGameResponse } from '../../../core/services/api.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';

interface AIOpponent {
  name: string;
  avatar: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  baseAccuracy: number;
  baseReactionTime: number;
  reactionVariance: number;
  description: string;
}

interface WordOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface RoundResult {
  round: number;
  word: GameVocabulary;
  playerCorrect: boolean;
  aiCorrect: boolean;
  playerTime: number | null;
  aiTime: number;
  winner: 'player' | 'ai' | 'draw';
  pointsPlayer: number;
  pointsAi: number;
}

const AI_OPPONENTS: AIOpponent[] = [
  {
    name: 'Rookie Bot',
    avatar: '🤖',
    difficulty: 'easy',
    baseAccuracy: 0.55,
    baseReactionTime: 5000,
    reactionVariance: 2000,
    description: 'A beginner-friendly opponent. Perfect for warming up!'
  },
  {
    name: 'Study Buddy',
    avatar: '📚',
    difficulty: 'medium',
    baseAccuracy: 0.70,
    baseReactionTime: 3500,
    reactionVariance: 1500,
    description: 'A balanced opponent that will challenge your skills.'
  },
  {
    name: 'Word Master',
    avatar: '🎓',
    difficulty: 'hard',
    baseAccuracy: 0.85,
    baseReactionTime: 2000,
    reactionVariance: 800,
    description: 'An experienced opponent. Only the skilled can win!'
  },
  {
    name: 'Linguist Pro',
    avatar: '👨‍🏫',
    difficulty: 'expert',
    baseAccuracy: 0.95,
    baseReactionTime: 1200,
    reactionVariance: 400,
    description: 'The ultimate challenge. Are you ready?'
  }
];

@Component({
  selector: 'app-word-duel',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent
  ],
  templateUrl: './word-duel.component.html',
  styleUrls: ['./word-duel.component.scss']
})
export class WordDuelComponent implements OnInit, OnDestroy {
  // Game configuration
  readonly TOTAL_ROUNDS = 10;
  readonly ROUND_TIME = 10; // seconds per round
  readonly BASE_POINTS = 100;

  // AI Opponents
  aiOpponents = AI_OPPONENTS;
  selectedOpponent = signal<AIOpponent | null>(null);

  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  gameStarted = signal(false);
  showOpponentSelect = signal(true);

  // Session data
  sessionId = signal<number | null>(null);
  vocabulary = signal<GameVocabulary[]>([]);

  // Round state
  currentRound = signal(1);
  currentWord = signal<GameVocabulary | null>(null);
  options = signal<WordOption[]>([]);
  roundTimeLeft = signal(this.ROUND_TIME);
  roundActive = signal(false);
  showingResult = signal(false);

  // Player state
  playerScore = signal(0);
  playerWins = signal(0);
  playerAnswered = signal(false);
  playerCorrect = signal<boolean | null>(null);
  playerTime = signal<number | null>(null);
  selectedOption = signal<number | null>(null);

  // AI state
  aiScore = signal(0);
  aiWins = signal(0);
  aiAnswered = signal(false);
  aiCorrect = signal<boolean | null>(null);
  aiTime = signal<number | null>(null);
  aiThinking = signal(false);

  // Round results
  roundResults = signal<RoundResult[]>([]);
  roundWinner = signal<'player' | 'ai' | 'draw' | null>(null);

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Timers
  private roundTimer: ReturnType<typeof setInterval> | null = null;
  private aiAnswerTimeout: ReturnType<typeof setTimeout> | null = null;
  private roundStartTime = 0;

  // Computed
  progressPercent = computed(() => ((this.currentRound() - 1) / this.TOTAL_ROUNDS) * 100);

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGameData();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.aiAnswerTimeout) {
      clearTimeout(this.aiAnswerTimeout);
      this.aiAnswerTimeout = null;
    }
  }

  loadGameData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.startGame('word_duel').subscribe({
      next: (response: StartGameResponse) => {
        this.sessionId.set(response.sessionId);
        this.vocabulary.set(this.shuffleArray([...response.vocabulary]));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to start game:', err);
        this.error.set(err.error?.message || 'Failed to load game data');
        this.isLoading.set(false);
      }
    });
  }

  selectOpponent(opponent: AIOpponent): void {
    this.selectedOpponent.set(opponent);
  }

  startGame(): void {
    if (!this.selectedOpponent()) return;

    this.showOpponentSelect.set(false);
    this.showCountdown.set(true);
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startRound();
  }

  startRound(): void {
    const vocab = this.vocabulary();
    const roundIndex = this.currentRound() - 1;

    if (roundIndex >= vocab.length || roundIndex >= this.TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    // Reset round state
    const word = vocab[roundIndex];
    this.currentWord.set(word);
    this.generateOptions(word);
    this.roundTimeLeft.set(this.ROUND_TIME);
    this.playerAnswered.set(false);
    this.playerCorrect.set(null);
    this.playerTime.set(null);
    this.selectedOption.set(null);
    this.aiAnswered.set(false);
    this.aiCorrect.set(null);
    this.aiTime.set(null);
    this.aiThinking.set(true);
    this.roundWinner.set(null);
    this.showingResult.set(false);
    this.roundActive.set(true);
    this.roundStartTime = Date.now();

    // Start round timer
    this.startRoundTimer();

    // Schedule AI answer
    this.scheduleAiAnswer();
  }

  private generateOptions(correctWord: GameVocabulary): void {
    const vocab = this.vocabulary();
    const otherWords = vocab.filter(v => v.id !== correctWord.id);

    // Shuffle and pick 3 wrong answers
    const shuffled = this.shuffleArray([...otherWords]);
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
    const allOptions = this.shuffleArray([...wrongOptions, correctOption]);
    this.options.set(allOptions);
  }

  private startRoundTimer(): void {
    this.clearTimers();
    this.roundTimer = setInterval(() => {
      const newTime = this.roundTimeLeft() - 1;
      this.roundTimeLeft.set(newTime);

      if (newTime <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  private scheduleAiAnswer(): void {
    const opponent = this.selectedOpponent();
    if (!opponent) return;

    // Calculate AI reaction time
    const variance = (Math.random() - 0.5) * 2 * opponent.reactionVariance;
    let reactionTime = opponent.baseReactionTime + variance;

    // Determine if AI answers correctly
    const isCorrect = Math.random() < opponent.baseAccuracy;

    // AI is slower when wrong (simulating hesitation)
    if (!isCorrect) {
      reactionTime *= 1.4;
    }

    // Ensure AI doesn't answer faster than 800ms or slower than round time
    reactionTime = Math.max(800, Math.min(reactionTime, (this.ROUND_TIME - 1) * 1000));

    this.aiAnswerTimeout = setTimeout(() => {
      if (!this.roundActive()) return;

      this.aiThinking.set(false);
      this.aiAnswered.set(true);
      this.aiCorrect.set(isCorrect);
      this.aiTime.set(Math.round(reactionTime));

      // Check if round should end
      if (this.playerAnswered()) {
        this.endRound();
      }
    }, reactionTime);
  }

  selectAnswer(option: WordOption): void {
    if (this.playerAnswered() || !this.roundActive()) return;

    const answerTime = Date.now() - this.roundStartTime;
    this.playerAnswered.set(true);
    this.playerCorrect.set(option.isCorrect);
    this.playerTime.set(answerTime);
    this.selectedOption.set(option.id);

    // Check if round should end
    if (this.aiAnswered()) {
      this.endRound();
    }
  }

  private endRound(): void {
    if (!this.roundActive()) return;

    this.roundActive.set(false);
    this.clearTimers();

    // Force AI to not answer if round timed out and they haven't answered
    if (!this.aiAnswered()) {
      this.aiThinking.set(false);
      this.aiAnswered.set(true);
      this.aiCorrect.set(false);
      this.aiTime.set(this.ROUND_TIME * 1000);
    }

    // Calculate winner and points
    const playerCorrect = this.playerCorrect() === true;
    const aiCorrect = this.aiCorrect() === true;
    const playerTime = this.playerTime() || (this.ROUND_TIME * 1000);
    const aiTime = this.aiTime() || (this.ROUND_TIME * 1000);

    let winner: 'player' | 'ai' | 'draw' = 'draw';
    let playerPoints = 0;
    let aiPoints = 0;

    if (playerCorrect && aiCorrect) {
      // Both correct - faster wins
      if (playerTime < aiTime) {
        winner = 'player';
        playerPoints = this.BASE_POINTS + Math.floor((this.ROUND_TIME * 1000 - playerTime) / 100);
      } else if (aiTime < playerTime) {
        winner = 'ai';
        aiPoints = this.BASE_POINTS + Math.floor((this.ROUND_TIME * 1000 - aiTime) / 100);
      } else {
        winner = 'draw';
        playerPoints = Math.floor(this.BASE_POINTS / 2);
        aiPoints = Math.floor(this.BASE_POINTS / 2);
      }
    } else if (playerCorrect) {
      winner = 'player';
      playerPoints = this.BASE_POINTS + Math.floor((this.ROUND_TIME * 1000 - playerTime) / 100);
    } else if (aiCorrect) {
      winner = 'ai';
      aiPoints = this.BASE_POINTS + Math.floor((this.ROUND_TIME * 1000 - aiTime) / 100);
    }

    // Update scores
    this.roundWinner.set(winner);
    this.playerScore.update(s => s + playerPoints);
    this.aiScore.update(s => s + aiPoints);

    if (winner === 'player') {
      this.playerWins.update(w => w + 1);
    } else if (winner === 'ai') {
      this.aiWins.update(w => w + 1);
    }

    // Record round result
    const currentWord = this.currentWord();
    if (currentWord) {
      this.roundResults.update(results => [...results, {
        round: this.currentRound(),
        word: currentWord,
        playerCorrect,
        aiCorrect,
        playerTime: this.playerTime(),
        aiTime: aiTime,
        winner,
        pointsPlayer: playerPoints,
        pointsAi: aiPoints
      }]);
    }

    this.showingResult.set(true);

    // Move to next round after delay
    setTimeout(() => {
      if (this.currentRound() >= this.TOTAL_ROUNDS) {
        this.endGame();
      } else {
        this.currentRound.update(r => r + 1);
        this.startRound();
      }
    }, 2000);
  }

  private endGame(): void {
    this.clearTimers();
    this.roundActive.set(false);

    const sessionId = this.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const results = this.roundResults();
    const correctCount = results.filter(r => r.playerCorrect).length;
    const wrongCount = results.filter(r => !r.playerCorrect).length;
    const winsCount = results.filter(r => r.winner === 'player').length;

    const endData = {
      score: this.playerScore(),
      maxCombo: winsCount, // Use wins as combo for this game
      accuracy: results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0,
      wordsCorrect: correctCount,
      wordsWrong: wrongCount,
      durationSeconds: this.TOTAL_ROUNDS * this.ROUND_TIME,
      gameData: {
        opponent: this.selectedOpponent()?.name,
        playerWins: this.playerWins(),
        aiWins: this.aiWins(),
        rounds: results
      }
    };

    this.apiService.endGame(sessionId, endData).subscribe({
      next: (response: EndGameResponse) => {
        this.gameResult.set({
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
    // Reset all state
    this.showGameOver.set(false);
    this.gameResult.set(null);
    this.currentRound.set(1);
    this.playerScore.set(0);
    this.playerWins.set(0);
    this.aiScore.set(0);
    this.aiWins.set(0);
    this.roundResults.set([]);
    this.gameStarted.set(false);
    this.showOpponentSelect.set(true);
    this.selectedOpponent.set(null);
    this.loadGameData();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  getOptionClass(option: WordOption): string {
    if (!this.playerAnswered() || this.roundActive()) return '';

    if (option.id === this.selectedOption()) {
      return option.isCorrect ? 'correct' : 'incorrect';
    }
    if (option.isCorrect) return 'correct-highlight';
    return 'disabled';
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      case 'expert': return 'difficulty-expert';
      default: return '';
    }
  }

  getWinnerMessage(): string {
    const playerWins = this.playerWins();
    const aiWins = this.aiWins();

    if (playerWins > aiWins) {
      return 'You Won the Duel!';
    } else if (aiWins > playerWins) {
      return `${this.selectedOpponent()?.name} Won!`;
    }
    return "It's a Draw!";
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
