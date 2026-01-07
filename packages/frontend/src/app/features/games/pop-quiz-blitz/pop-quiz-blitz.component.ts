import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, StartGameResponse, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { ActiveBoostersWidgetComponent } from '../shared/active-boosters-widget/active-boosters-widget.component';
import { GameStateService } from '../services/game-state.service';

interface Bubble {
  id: number;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  speed: number;
  size: number;
  popped: boolean;
  color: string;
}

interface QuestionResult {
  word: GameVocabulary;
  correct: boolean;
  timeToAnswer: number;
  pointsEarned: number;
}

const BUBBLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#DDA0DD', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

@Component({
  selector: 'app-pop-quiz-blitz',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent,
    ActiveBoostersWidgetComponent
  ],
  templateUrl: './pop-quiz-blitz.component.html',
  styleUrls: ['./pop-quiz-blitz.component.scss']
})
export class PopQuizBlitzComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);

  // Game configuration
  readonly TOTAL_QUESTIONS = 15;
  readonly INITIAL_LIVES = 3;
  readonly BASE_POINTS = 100;
  readonly BUBBLE_COUNT = 5;
  readonly BUBBLE_RISE_INTERVAL = 50; // ms

  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  gameStarted = signal(false);

  // Session data
  sessionId = signal<number | null>(null);
  vocabulary = signal<GameVocabulary[]>([]);

  // Question state
  currentQuestion = signal(0);
  currentWord = signal<GameVocabulary | null>(null);
  bubbles = signal<Bubble[]>([]);
  questionActive = signal(false);
  questionStartTime = 0;

  // Player state
  score = signal(0);
  lives = signal(this.INITIAL_LIVES);
  combo = signal(0);
  maxCombo = signal(0);

  // Results
  results = signal<QuestionResult[]>([]);

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Timers
  private bubbleAnimationFrame: number | null = null;
  private questionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Computed
  progressPercent = computed(() => (this.currentQuestion() / this.TOTAL_QUESTIONS) * 100);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.loadGameData();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.bubbleAnimationFrame) {
      cancelAnimationFrame(this.bubbleAnimationFrame);
      this.bubbleAnimationFrame = null;
    }
    if (this.questionTimeout) {
      clearTimeout(this.questionTimeout);
      this.questionTimeout = null;
    }
  }

  loadGameData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.startGame('pop_quiz_blitz').subscribe({
      next: (response: StartGameResponse) => {
        this.sessionId.set(response.sessionId);
        // Set active boosters in GameStateService for the widget
        this.gameStateService.setActiveBoosters(response.activeBoosters || []);
        this.vocabulary.set(this.shuffleArray([...response.vocabulary]));
        this.isLoading.set(false);
        this.showCountdown.set(true);
      },
      error: (err) => {
        console.error('Failed to start game:', err);
        this.error.set(err.error?.message || 'Failed to load game data');
        this.isLoading.set(false);
      }
    });
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startQuestion();
  }

  startQuestion(): void {
    const vocab = this.vocabulary();
    const questionIndex = this.currentQuestion();

    if (questionIndex >= vocab.length || questionIndex >= this.TOTAL_QUESTIONS || this.lives() <= 0) {
      this.endGame();
      return;
    }

    const word = vocab[questionIndex];
    this.currentWord.set(word);
    this.generateBubbles(word);
    this.questionStartTime = Date.now();
    this.questionActive.set(true);
    this.startBubbleAnimation();
  }

  private generateBubbles(correctWord: GameVocabulary): void {
    const vocab = this.vocabulary();
    const otherWords = vocab.filter(v => v.id !== correctWord.id);
    const shuffled = this.shuffleArray([...otherWords]);
    const wrongOptions = shuffled.slice(0, this.BUBBLE_COUNT - 1);

    const allOptions = this.shuffleArray([
      { word: correctWord, isCorrect: true },
      ...wrongOptions.map(w => ({ word: w, isCorrect: false }))
    ]);

    const bubbles: Bubble[] = allOptions.map((opt, index) => ({
      id: index,
      text: opt.word.vietnameseWord,
      isCorrect: opt.isCorrect,
      x: this.getRandomX(index, allOptions.length),
      y: 100 + (Math.random() * 20), // Start below viewport
      speed: 0.3 + (Math.random() * 0.2), // Random speed between 0.3-0.5
      size: 70 + (Math.random() * 20), // Random size between 70-90px
      popped: false,
      color: BUBBLE_COLORS[index % BUBBLE_COLORS.length]
    }));

    this.bubbles.set(bubbles);
  }

  private getRandomX(index: number, total: number): number {
    // Distribute bubbles across the width with some randomness
    const sectionWidth = 100 / total;
    const baseX = index * sectionWidth + sectionWidth / 2;
    const variance = (Math.random() - 0.5) * sectionWidth * 0.6;
    return Math.max(10, Math.min(90, baseX + variance));
  }

  private startBubbleAnimation(): void {
    const animate = () => {
      if (!this.questionActive()) return;

      const currentBubbles = this.bubbles();
      let allBubblesGone = true;
      let correctBubbleEscaped = false;

      const updatedBubbles = currentBubbles.map(bubble => {
        if (bubble.popped) return bubble;

        const newY = bubble.y - bubble.speed;

        if (newY > -15) {
          allBubblesGone = false;
        }

        if (newY <= -15 && bubble.isCorrect) {
          correctBubbleEscaped = true;
        }

        return { ...bubble, y: newY };
      });

      this.bubbles.set(updatedBubbles);

      if (correctBubbleEscaped) {
        this.handleMiss();
        return;
      }

      if (!allBubblesGone) {
        this.bubbleAnimationFrame = requestAnimationFrame(animate);
      }
    };

    this.bubbleAnimationFrame = requestAnimationFrame(animate);
  }

  popBubble(bubble: Bubble): void {
    if (!this.questionActive() || bubble.popped) return;

    // Play pop sound for bubble pop
    this.audioService.playSound('pop');

    // Mark bubble as popped
    const updatedBubbles = this.bubbles().map(b =>
      b.id === bubble.id ? { ...b, popped: true } : b
    );
    this.bubbles.set(updatedBubbles);

    const answerTime = Date.now() - this.questionStartTime;

    if (bubble.isCorrect) {
      this.handleCorrect(answerTime);
    } else {
      this.handleWrong();
    }
  }

  private handleCorrect(answerTime: number): void {
    this.questionActive.set(false);
    this.clearTimers();

    // Play combo sound and correct sound
    this.audioService.playCombo(this.combo());
    this.audioService.playSound('correct');

    // Calculate points with time bonus
    const timeBonus = Math.max(0, Math.floor((5000 - answerTime) / 100));
    const comboBonus = this.combo() * 10;
    const points = this.BASE_POINTS + timeBonus + comboBonus;

    // Update combo
    const newCombo = this.combo() + 1;
    this.combo.set(newCombo);
    if (newCombo > this.maxCombo()) {
      this.maxCombo.set(newCombo);
    }

    // Update score
    this.score.update(s => s + points);

    // Record result
    const currentWord = this.currentWord();
    if (currentWord) {
      this.results.update(r => [...r, {
        word: currentWord,
        correct: true,
        timeToAnswer: answerTime,
        pointsEarned: points
      }]);
    }

    // Pop all bubbles for effect
    this.bubbles.update(bubbles => bubbles.map(b => ({ ...b, popped: true })));

    // Move to next question after delay
    setTimeout(() => {
      this.currentQuestion.update(q => q + 1);
      this.startQuestion();
    }, 800);
  }

  private handleWrong(): void {
    // Play wrong sound
    this.audioService.playSound('wrong');

    // Lose a life
    this.lives.update(l => l - 1);
    this.combo.set(0);

    // Record result
    const currentWord = this.currentWord();
    if (currentWord) {
      this.results.update(r => [...r, {
        word: currentWord,
        correct: false,
        timeToAnswer: Date.now() - this.questionStartTime,
        pointsEarned: 0
      }]);
    }

    // Check if game over
    if (this.lives() <= 0) {
      this.questionActive.set(false);
      this.clearTimers();
      this.endGame();
      return;
    }

    // Continue with current question - let other bubbles still float
    // Player can still try to get the correct one
  }

  private handleMiss(): void {
    this.questionActive.set(false);
    this.clearTimers();

    // Play close sound for missed bubble
    this.audioService.playSound('close');

    // Lose a life
    this.lives.update(l => l - 1);
    this.combo.set(0);

    // Record result
    const currentWord = this.currentWord();
    if (currentWord) {
      this.results.update(r => [...r, {
        word: currentWord,
        correct: false,
        timeToAnswer: 10000, // Max time
        pointsEarned: 0
      }]);
    }

    // Check if game over
    if (this.lives() <= 0) {
      this.endGame();
      return;
    }

    // Move to next question after delay
    setTimeout(() => {
      this.currentQuestion.update(q => q + 1);
      this.startQuestion();
    }, 1000);
  }

  private endGame(): void {
    this.clearTimers();
    this.questionActive.set(false);

    const sessionId = this.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const results = this.results();
    const correctCount = results.filter(r => r.correct).length;
    const wrongCount = results.filter(r => !r.correct).length;

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy: results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0,
      wordsCorrect: correctCount,
      wordsWrong: wrongCount,
      durationSeconds: Math.floor(results.reduce((sum, r) => sum + r.timeToAnswer, 0) / 1000),
      gameData: {
        questionsAnswered: results.length,
        livesRemaining: this.lives()
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
    this.currentQuestion.set(0);
    this.score.set(0);
    this.lives.set(this.INITIAL_LIVES);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.results.set([]);
    this.bubbles.set([]);
    this.loadGameData();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  getLivesArray(): number[] {
    return Array.from({ length: this.INITIAL_LIVES }, (_, i) => i);
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
