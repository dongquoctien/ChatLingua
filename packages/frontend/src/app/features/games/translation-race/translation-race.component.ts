import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, StartGameResponse, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { ActiveBoostersWidgetComponent } from '../shared/active-boosters-widget/active-boosters-widget.component';
import { GameStateService } from '../services/game-state.service';

interface TranslationSentence {
  id: number;
  vietnamese: string;
  english: string;
  words: GameVocabulary[];
}

interface TranslationResult {
  sentence: TranslationSentence;
  userAnswer: string;
  correct: boolean;
  accuracy: number;
  timeToAnswer: number;
  pointsEarned: number;
}

@Component({
  selector: 'app-translation-race',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent,
    ActiveBoostersWidgetComponent
  ],
  templateUrl: './translation-race.component.html',
  styleUrls: ['./translation-race.component.scss']
})
export class TranslationRaceComponent implements OnInit, OnDestroy {
  private gameStateService = inject(GameStateService);
  @ViewChild('answerInput') answerInput!: ElementRef<HTMLInputElement>;

  // Game configuration
  readonly TOTAL_SENTENCES = 10;
  readonly TIME_LIMIT = 30; // seconds per sentence
  readonly BASE_POINTS = 100;
  readonly ACCURACY_THRESHOLD = 0.7; // 70% match for partial credit

  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  gameStarted = signal(false);

  // Session data
  sessionId = signal<number | null>(null);
  vocabulary = signal<GameVocabulary[]>([]);
  sentences = signal<TranslationSentence[]>([]);

  // Current sentence state
  currentSentenceIndex = signal(0);
  currentSentence = signal<TranslationSentence | null>(null);
  userAnswer = signal('');
  timeLeft = signal(this.TIME_LIMIT);
  sentenceActive = signal(false);
  sentenceStartTime = 0;

  // Feedback state
  showFeedback = signal(false);
  feedbackCorrect = signal(false);
  feedbackAccuracy = signal(0);
  correctAnswer = signal('');

  // Player state
  score = signal(0);
  combo = signal(0);
  maxCombo = signal(0);

  // Results
  results = signal<TranslationResult[]>([]);

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Timers
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Computed
  progressPercent = computed(() => (this.currentSentenceIndex() / this.TOTAL_SENTENCES) * 100);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.loadGameData();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  loadGameData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.startGame('translation_race').subscribe({
      next: (response: StartGameResponse) => {
        this.sessionId.set(response.sessionId);
        // Set active boosters in GameStateService for the widget
        this.gameStateService.setActiveBoosters(response.activeBoosters || []);
        this.vocabulary.set(response.vocabulary);
        this.generateSentences(response.vocabulary);
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

  private generateSentences(vocab: GameVocabulary[]): void {
    // Create simple translation sentences from vocabulary
    const sentences: TranslationSentence[] = [];
    const shuffled = this.shuffleArray([...vocab]);

    for (let i = 0; i < Math.min(this.TOTAL_SENTENCES, shuffled.length); i++) {
      const word = shuffled[i];
      sentences.push({
        id: i,
        vietnamese: word.vietnameseWord,
        english: word.englishWord.toLowerCase(),
        words: [word]
      });
    }

    this.sentences.set(sentences);
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startSentence();
  }

  startSentence(): void {
    const sentences = this.sentences();
    const index = this.currentSentenceIndex();

    if (index >= sentences.length || index >= this.TOTAL_SENTENCES) {
      this.endGame();
      return;
    }

    const sentence = sentences[index];
    this.currentSentence.set(sentence);
    this.userAnswer.set('');
    this.timeLeft.set(this.TIME_LIMIT);
    this.showFeedback.set(false);
    this.sentenceActive.set(true);
    this.sentenceStartTime = Date.now();

    // Focus input
    setTimeout(() => {
      if (this.answerInput) {
        this.answerInput.nativeElement.focus();
      }
    }, 100);

    // Start timer
    this.startTimer();
  }

  private startTimer(): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const newTime = this.timeLeft() - 1;
      this.timeLeft.set(newTime);

      // Play warning sound when time is low
      if (newTime <= 5 && newTime > 0) {
        this.audioService.playSound('timer-warning');
      }

      if (newTime <= 0) {
        this.submitAnswer();
      }
    }, 1000);
  }

  submitAnswer(): void {
    if (!this.sentenceActive()) return;

    this.sentenceActive.set(false);
    this.clearTimer();

    const sentence = this.currentSentence();
    if (!sentence) return;

    const answerTime = Date.now() - this.sentenceStartTime;
    const userAnswer = this.userAnswer().trim().toLowerCase();
    const correctAnswer = sentence.english.toLowerCase();

    // Calculate accuracy using Levenshtein distance
    const accuracy = this.calculateAccuracy(userAnswer, correctAnswer);
    const isCorrect = accuracy >= this.ACCURACY_THRESHOLD;

    // Calculate points
    let points = 0;
    if (isCorrect) {
      const timeBonus = Math.floor((this.TIME_LIMIT * 1000 - answerTime) / 100);
      const accuracyBonus = Math.floor(accuracy * 50);
      const comboBonus = this.combo() * 20;
      points = this.BASE_POINTS + timeBonus + accuracyBonus + comboBonus;
    }

    // Update combo
    if (isCorrect) {
      const newCombo = this.combo() + 1;
      this.combo.set(newCombo);
      if (newCombo > this.maxCombo()) {
        this.maxCombo.set(newCombo);
      }
      // Play combo sound for streaks
      if (newCombo >= 2) {
        this.audioService.playCombo(newCombo);
      }
    } else {
      this.combo.set(0);
    }

    // Update score
    this.score.update(s => s + points);

    // Record result
    this.results.update(r => [...r, {
      sentence,
      userAnswer,
      correct: isCorrect,
      accuracy: Math.round(accuracy * 100),
      timeToAnswer: answerTime,
      pointsEarned: points
    }]);

    // Play sound based on result
    if (isCorrect) {
      this.audioService.playSound('correct');
    } else {
      this.audioService.playSound('wrong');
    }

    // Show feedback
    this.feedbackCorrect.set(isCorrect);
    this.feedbackAccuracy.set(Math.round(accuracy * 100));
    this.correctAnswer.set(sentence.english);
    this.showFeedback.set(true);

    // Move to next sentence after delay
    setTimeout(() => {
      this.currentSentenceIndex.update(i => i + 1);
      this.startSentence();
    }, 2000);
  }

  private calculateAccuracy(userAnswer: string, correctAnswer: string): number {
    if (userAnswer === correctAnswer) return 1;
    if (!userAnswer) return 0;

    // Normalize strings
    const user = userAnswer.toLowerCase().trim();
    const correct = correctAnswer.toLowerCase().trim();

    // Levenshtein distance
    const distance = this.levenshteinDistance(user, correct);
    const maxLength = Math.max(user.length, correct.length);

    // Convert distance to accuracy (0-1)
    return Math.max(0, 1 - distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      // Play click sound on submit
      this.audioService.playSound('click');
      this.submitAnswer();
    }
  }

  private endGame(): void {
    this.clearTimer();
    this.sentenceActive.set(false);

    const sessionId = this.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const results = this.results();
    const correctCount = results.filter(r => r.correct).length;
    const wrongCount = results.filter(r => !r.correct).length;
    const totalTime = results.reduce((sum, r) => sum + r.timeToAnswer, 0);

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy: results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0,
      wordsCorrect: correctCount,
      wordsWrong: wrongCount,
      durationSeconds: Math.floor(totalTime / 1000),
      gameData: {
        sentencesCompleted: results.length,
        averageAccuracy: results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length)
          : 0
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
    this.currentSentenceIndex.set(0);
    this.score.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.results.set([]);
    this.userAnswer.set('');
    this.loadGameData();
  }

  private location = inject(Location);

  onBackToHub(): void {
    this.location.back();
  }

  skipSentence(): void {
    if (!this.sentenceActive()) return;

    this.sentenceActive.set(false);
    this.clearTimer();

    const sentence = this.currentSentence();
    if (sentence) {
      // Record as wrong with no points
      this.results.update(r => [...r, {
        sentence,
        userAnswer: '',
        correct: false,
        accuracy: 0,
        timeToAnswer: Date.now() - this.sentenceStartTime,
        pointsEarned: 0
      }]);
    }

    this.combo.set(0);

    // Play skip sound
    this.audioService.playSound('wrong');

    // Show correct answer
    this.feedbackCorrect.set(false);
    this.feedbackAccuracy.set(0);
    this.correctAnswer.set(sentence?.english || '');
    this.showFeedback.set(true);

    // Move to next sentence
    setTimeout(() => {
      this.currentSentenceIndex.update(i => i + 1);
      this.startSentence();
    }, 1500);
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
