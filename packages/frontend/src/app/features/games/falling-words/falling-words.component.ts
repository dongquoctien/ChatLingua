import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed, effect, untracked, HostListener, AfterViewInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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

interface FallingWord {
  id: number;
  word: string;
  translation: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  width: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

@Component({
  selector: 'app-falling-words',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent,
    ActiveBoostersWidgetComponent
  ],
  templateUrl: './falling-words.component.html',
  styleUrls: ['./falling-words.component.scss']
})
export class FallingWordsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inputField') inputRef!: ElementRef<HTMLInputElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId: number = 0;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private levelTimer: number = 0;
  private vocabularyPool: GameVocabulary[] = [];
  private usedVocabularyIds: Set<number> = new Set();

  // Canvas dimensions
  canvasWidth = 800;
  canvasHeight = 500;

  // Game state signals
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(true);
  gameStarted = signal(false);
  isPaused = signal(false);
  isFrozen = signal(false);
  isSlowMo = signal(false);

  // Falling words
  words = signal<FallingWord[]>([]);
  particles = signal<Particle[]>([]);

  // Game stats
  score = signal(0);
  lives = signal(3);
  maxLives = signal(3);
  combo = signal(0);
  maxCombo = signal(0);
  level = signal(1);
  correctCount = signal(0);
  wrongCount = signal(0);

  // User input
  userInput = signal('');

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Game settings
  readonly BASE_SPEED = 40; // pixels per second
  readonly SPAWN_INTERVAL = 2500; // ms between spawns (gets faster)
  readonly DANGER_ZONE = 60; // pixels from bottom
  readonly MAX_WORDS = 6; // max words on screen

  // Power-ups
  freezeCount = signal(1);
  slowCount = signal(1);
  bombCount = signal(1);
  freezeActive = signal(false);
  slowActive = signal(false);

  // Colors for words
  private wordColors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#10b981', // green
    '#06b6d4', // cyan
  ];

  private dialogService = inject(DialogService);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService,
    public gameState: GameStateService
  ) {
    // Watch for game over state
    effect(() => {
      const lives = this.lives();
      const gameStarted = untracked(() => this.gameStarted());
      const alreadyShowingGameOver = untracked(() => this.showGameOver());

      if (lives <= 0 && gameStarted && !alreadyShowingGameOver) {
        setTimeout(() => this.endGame(), 0);
      }
    });
  }

  ngOnInit(): void {
    this.startNewGame();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateCanvasSize();
  }

  private setupCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.updateCanvasSize();
  }

  private updateCanvasSize(): void {
    if (!this.canvasRef) return;
    const container = this.canvasRef.nativeElement.parentElement;
    if (container) {
      this.canvasWidth = Math.min(container.clientWidth - 32, 900);
      this.canvasHeight = Math.min(window.innerHeight - 300, 500);
    }
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.cleanup();

    this.apiService.startGame('falling_words').subscribe({
      next: (response) => {
        this.vocabularyPool = response.vocabulary;
        this.usedVocabularyIds.clear();
        this.gameState.initializeGame(response, 0, 3); // No timer, 3 lives

        // Reset state
        this.words.set([]);
        this.particles.set([]);
        this.score.set(0);
        this.lives.set(3);
        this.combo.set(0);
        this.maxCombo.set(0);
        this.level.set(1);
        this.correctCount.set(0);
        this.wrongCount.set(0);
        this.userInput.set('');
        this.freezeCount.set(1);
        this.slowCount.set(1);
        this.bombCount.set(1);
        this.freezeActive.set(false);
        this.slowActive.set(false);

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

    // Setup canvas after DOM updates (canvas is now visible)
    setTimeout(() => {
      this.setupCanvas();
      this.focusInput();
      this.startGameLoop();
    }, 50);
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.levelTimer = 0;
    this.gameLoop(this.lastTime);
  }

  private gameLoop(timestamp: number): void {
    if (!this.gameStarted() || this.showGameOver()) {
      return;
    }

    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (!this.isPaused()) {
      this.update(deltaTime);
      this.render();
    }

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(deltaTime: number): void {
    // Update particles
    this.updateParticles(deltaTime);

    // Don't update words if frozen
    if (this.freezeActive()) {
      return;
    }

    const speedMultiplier = this.slowActive() ? 0.5 : 1;

    // Update spawn timer
    this.spawnTimer += deltaTime * 1000;
    const spawnInterval = Math.max(1000, this.SPAWN_INTERVAL - (this.level() - 1) * 200);
    if (this.spawnTimer >= spawnInterval && this.words().length < this.MAX_WORDS) {
      this.spawnWord();
      this.spawnTimer = 0;
    }

    // Update level timer
    this.levelTimer += deltaTime * 1000;
    if (this.levelTimer >= 15000) { // Level up every 15 seconds
      this.level.update(l => l + 1);
      this.levelTimer = 0;
    }

    // Move words down
    const currentWords = this.words();
    const updatedWords: FallingWord[] = [];
    const hitBottom: FallingWord[] = [];

    for (const word of currentWords) {
      const newY = word.y + word.speed * deltaTime * speedMultiplier;
      if (newY >= this.canvasHeight - this.DANGER_ZONE) {
        hitBottom.push(word);
      } else {
        updatedWords.push({ ...word, y: newY });
      }
    }

    this.words.set(updatedWords);

    // Handle words hitting bottom
    if (hitBottom.length > 0) {
      // Play wrong sound for missed words
      this.audioService.playSound('wrong');
      this.lives.update(l => l - hitBottom.length);
      this.combo.set(0);
      this.wrongCount.update(c => c + hitBottom.length);
    }
  }

  private updateParticles(deltaTime: number): void {
    const currentParticles = this.particles();
    const updatedParticles = currentParticles
      .map(p => ({
        ...p,
        x: p.x + p.vx * deltaTime,
        y: p.y + p.vy * deltaTime,
        vy: p.vy + 200 * deltaTime, // gravity
        life: p.life - deltaTime
      }))
      .filter(p => p.life > 0);
    this.particles.set(updatedParticles);
  }

  private spawnWord(): void {
    // Get unused vocabulary
    const available = this.vocabularyPool.filter(v => !this.usedVocabularyIds.has(v.id));
    if (available.length === 0) {
      // Reset used IDs if all vocabulary has been used
      this.usedVocabularyIds.clear();
    }
    const pool = available.length > 0 ? available : this.vocabularyPool;

    const vocab = pool[Math.floor(Math.random() * pool.length)];
    this.usedVocabularyIds.add(vocab.id);

    // Calculate word width for positioning
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = 'bold 24px Inter, system-ui, sans-serif';
    const wordWidth = tempCtx.measureText(vocab.englishWord).width + 40;

    // Random position (avoid edges)
    const minX = wordWidth / 2 + 10;
    const maxX = this.canvasWidth - wordWidth / 2 - 10;
    const x = Math.random() * (maxX - minX) + minX;

    // Speed increases with level
    const baseSpeed = this.BASE_SPEED + (this.level() - 1) * 8;
    const speed = baseSpeed + Math.random() * 15;

    const newWord: FallingWord = {
      id: vocab.id,
      word: vocab.englishWord,
      translation: vocab.vietnameseWord,
      x,
      y: -30,
      speed,
      color: this.wordColors[Math.floor(Math.random() * this.wordColors.length)],
      width: wordWidth,
      opacity: 1
    };

    this.words.update(words => [...words, newWord]);
  }

  private render(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    bgGradient.addColorStop(0, '#f8fafc');
    bgGradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw danger zone
    const dangerGradient = ctx.createLinearGradient(0, this.canvasHeight - this.DANGER_ZONE, 0, this.canvasHeight);
    dangerGradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
    dangerGradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
    ctx.fillStyle = dangerGradient;
    ctx.fillRect(0, this.canvasHeight - this.DANGER_ZONE, this.canvasWidth, this.DANGER_ZONE);

    // Draw danger line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, this.canvasHeight - this.DANGER_ZONE);
    ctx.lineTo(this.canvasWidth, this.canvasHeight - this.DANGER_ZONE);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw particles
    this.particles().forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw words
    this.words().forEach(word => {
      // Draw word background (pill shape)
      const padding = 16;
      const height = 36;
      const radius = height / 2;

      ctx.beginPath();
      ctx.roundRect(
        word.x - word.width / 2,
        word.y - height / 2,
        word.width,
        height,
        radius
      );
      ctx.fillStyle = word.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw word text
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(word.word, word.x, word.y);
    });

    // Draw freeze effect
    if (this.freezeActive()) {
      ctx.fillStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      ctx.font = 'bold 48px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️ FROZEN', this.canvasWidth / 2, this.canvasHeight / 2);
    }

    // Draw slow-mo effect
    if (this.slowActive()) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, this.canvasWidth - 8, this.canvasHeight - 8);
    }

    // Draw paused overlay
    if (this.isPaused()) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      ctx.font = 'bold 48px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', this.canvasWidth / 2, this.canvasHeight / 2);
    }

    // Draw level indicator
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${this.level()}`, this.canvasWidth - 10, 10);
  }

  onInputChange(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.userInput.set(input);
  }

  checkAnswer(): void {
    const input = this.userInput().trim().toLowerCase();
    if (!input) return;

    const currentWords = this.words();
    const matchedWord = currentWords.find(w =>
      this.normalizeVietnamese(w.translation.toLowerCase()) === this.normalizeVietnamese(input) ||
      w.translation.toLowerCase() === input
    );

    if (matchedWord) {
      // Correct answer! Play combo sound
      this.audioService.playCombo(this.combo());
      this.audioService.playSound('correct');

      this.words.update(words => words.filter(w => w.id !== matchedWord.id));

      // Calculate score with combo
      const comboMultiplier = 1 + this.combo() * 0.1;
      const levelBonus = this.level() * 5;
      const points = Math.round((20 + levelBonus) * comboMultiplier);
      this.score.update(s => s + points);

      // Update combo
      this.combo.update(c => c + 1);
      if (this.combo() > this.maxCombo()) {
        this.maxCombo.set(this.combo());
      }

      this.correctCount.update(c => c + 1);

      // Create explosion particles
      this.createExplosion(matchedWord.x, matchedWord.y, matchedWord.color);
    }

    this.userInput.set('');
    this.focusInput();
  }

  private normalizeVietnamese(text: string): string {
    // Normalize Vietnamese characters for matching
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private createExplosion(x: number, y: number, color: string): void {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 100 + Math.random() * 100;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.8 + Math.random() * 0.4,
        color,
        size: 3 + Math.random() * 4
      });
    }
    this.particles.update(p => [...p, ...newParticles]);
  }

  private focusInput(): void {
    setTimeout(() => {
      if (this.inputRef) {
        this.inputRef.nativeElement.focus();
      }
    }, 10);
  }

  // Power-ups
  usePowerUp(type: 'freeze' | 'slow' | 'bomb'): void {
    switch (type) {
      case 'freeze':
        if (this.freezeCount() > 0) {
          this.audioService.playSound('ding');
          this.freezeCount.update(c => c - 1);
          this.freezeActive.set(true);
          setTimeout(() => this.freezeActive.set(false), 5000);
        }
        break;
      case 'slow':
        if (this.slowCount() > 0) {
          this.audioService.playSound('whoosh');
          this.slowCount.update(c => c - 1);
          this.slowActive.set(true);
          setTimeout(() => this.slowActive.set(false), 8000);
        }
        break;
      case 'bomb':
        if (this.bombCount() > 0) {
          this.audioService.playSound('victory');
          this.bombCount.update(c => c - 1);
          // Create explosions for all words
          this.words().forEach(w => {
            this.createExplosion(w.x, w.y, w.color);
          });
          // Clear all words (count as correct)
          const clearedCount = this.words().length;
          this.correctCount.update(c => c + clearedCount);
          this.score.update(s => s + clearedCount * 10);
          this.words.set([]);
        }
        break;
    }
    this.focusInput();
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
    cancelAnimationFrame(this.animationId);
    this.gameState.endGame();

    const sessionId = this.gameState.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const total = this.correctCount() + this.wrongCount();
    const accuracy = total > 0 ? Math.round((this.correctCount() / total) * 100) : 0;
    const duration = this.gameState.getDuration();

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy,
      wordsCorrect: this.correctCount(),
      wordsWrong: this.wrongCount(),
      durationSeconds: duration
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

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.gameState.reset();
  }
}
