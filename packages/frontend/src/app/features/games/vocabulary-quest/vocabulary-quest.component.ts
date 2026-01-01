import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Vocabulary } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { GameOverDialogComponent } from '../shared/game-over-dialog/game-over-dialog.component';

interface QuestMap {
  id: number;
  mapCode: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requiredLevel: number;
  totalStages: number;
  backgroundImage: string;
  isUnlocked: boolean;
  currentStage: number;
  starsEarned: number;
}

interface QuestStage {
  id: number;
  stageNumber: number;
  stageType: 'normal' | 'boss' | 'treasure' | 'rest';
  enemyName: string;
  enemyImage: string;
  enemyHp: number;
  questionsCount: number;
  timeLimitSeconds: number;
  rewards: { xp: number; coins: number; };
}

interface QuestQuestion {
  id: number;
  english: string;
  vietnamese: string;
  options: string[];
  correctIndex: number;
}

interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  currentQuestion: QuestQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  combo: number;
  damage: number;
  isPlayerTurn: boolean;
  lastAction: 'attack' | 'defend' | 'heal' | null;
  battleLog: string[];
  correctCount: number;
  wrongCount: number;
}

@Component({
  selector: 'app-vocabulary-quest',
  standalone: true,
  imports: [CommonModule, FormsModule, CountdownComponent, GameOverDialogComponent],
  templateUrl: './vocabulary-quest.component.html',
  styleUrls: ['./vocabulary-quest.component.scss']
})
export class VocabularyQuestComponent implements OnInit, OnDestroy {
  // Game phases
  phase = signal<'loading' | 'map' | 'stage-select' | 'countdown' | 'battle' | 'victory' | 'defeat' | 'rewards'>('loading');

  // Map data
  maps = signal<QuestMap[]>([]);
  selectedMap = signal<QuestMap | null>(null);
  currentStage = signal<QuestStage | null>(null);

  // Battle state
  battle = signal<BattleState>({
    playerHp: 100,
    playerMaxHp: 100,
    enemyHp: 100,
    enemyMaxHp: 100,
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: 5,
    combo: 0,
    damage: 0,
    isPlayerTurn: true,
    lastAction: null,
    battleLog: [],
    correctCount: 0,
    wrongCount: 0
  });

  // Questions pool
  questions = signal<QuestQuestion[]>([]);

  // UI state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  selectedAnswer = signal<number | null>(null);
  showFeedback = signal(false);
  feedbackCorrect = signal(false);

  // Animation states
  playerAttacking = signal(false);
  enemyAttacking = signal(false);
  playerHit = signal(false);
  enemyHit = signal(false);
  showDamageNumber = signal(false);
  damageNumber = signal(0);

  // Game over
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Session
  private sessionId: number | null = null;
  private startTime: Date | null = null;

  // Constants
  readonly PLAYER_BASE_DAMAGE = 20;
  readonly ENEMY_BASE_DAMAGE = 15;
  readonly COMBO_BONUS = 5;
  readonly HEAL_AMOUNT = 10;

  // Computed
  playerHpPercent = computed(() => {
    const b = this.battle();
    return (b.playerHp / b.playerMaxHp) * 100;
  });

  enemyHpPercent = computed(() => {
    const b = this.battle();
    return (b.enemyHp / b.enemyMaxHp) * 100;
  });

  progressPercent = computed(() => {
    const b = this.battle();
    return ((b.questionIndex) / b.totalQuestions) * 100;
  });

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.loadMaps();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadMaps(): void {
    this.isLoading.set(true);

    // Mock quest maps - in production, load from API
    setTimeout(() => {
      this.maps.set([
        {
          id: 1,
          mapCode: 'forest',
          name: 'Forest of Words',
          description: 'Begin your journey through the enchanted forest',
          difficulty: 'beginner',
          requiredLevel: 1,
          totalStages: 5,
          backgroundImage: '🌲',
          isUnlocked: true,
          currentStage: 1,
          starsEarned: 0
        },
        {
          id: 2,
          mapCode: 'mountain',
          name: 'Mountain of Grammar',
          description: 'Climb the treacherous peaks of knowledge',
          difficulty: 'intermediate',
          requiredLevel: 3,
          totalStages: 7,
          backgroundImage: '⛰️',
          isUnlocked: false,
          currentStage: 1,
          starsEarned: 0
        },
        {
          id: 3,
          mapCode: 'castle',
          name: 'Castle of Fluency',
          description: 'Conquer the final fortress',
          difficulty: 'advanced',
          requiredLevel: 5,
          totalStages: 10,
          backgroundImage: '🏰',
          isUnlocked: false,
          currentStage: 1,
          starsEarned: 0
        }
      ]);
      this.isLoading.set(false);
      this.phase.set('map');
    }, 500);
  }

  selectMap(map: QuestMap): void {
    if (!map.isUnlocked) return;
    this.audioService.playSound('select');
    this.selectedMap.set(map);
    this.phase.set('stage-select');
  }

  backToMap(): void {
    this.selectedMap.set(null);
    this.phase.set('map');
  }

  selectStage(stageNumber: number): void {
    const map = this.selectedMap();
    if (!map || stageNumber > map.currentStage) return;

    this.audioService.playSound('click');

    // Create stage data
    const isBoss = stageNumber === map.totalStages;
    const stage: QuestStage = {
      id: stageNumber,
      stageNumber,
      stageType: isBoss ? 'boss' : 'normal',
      enemyName: this.getEnemyName(map.mapCode, stageNumber, isBoss),
      enemyImage: this.getEnemyEmoji(map.mapCode, stageNumber, isBoss),
      enemyHp: isBoss ? 150 : 50 + stageNumber * 20,
      questionsCount: isBoss ? 8 : 5,
      timeLimitSeconds: 0,
      rewards: {
        xp: isBoss ? 100 : 20 * stageNumber,
        coins: isBoss ? 50 : 10 * stageNumber
      }
    };

    this.currentStage.set(stage);
    this.loadQuestions(stage.questionsCount);
  }

  private getEnemyName(mapCode: string, stage: number, isBoss: boolean): string {
    const enemies: Record<string, string[]> = {
      forest: ['Rabbit', 'Fox', 'Wolf', 'Bear', 'Forest King'],
      mountain: ['Goat', 'Eagle', 'Snow Leopard', 'Yeti', 'Storm Dragon'],
      castle: ['Guard', 'Knight', 'Wizard', 'Dark Knight', 'Shadow Lord']
    };
    const list = enemies[mapCode] || enemies['forest'];
    return isBoss ? list[list.length - 1] : list[Math.min(stage - 1, list.length - 2)];
  }

  private getEnemyEmoji(mapCode: string, stage: number, isBoss: boolean): string {
    const emojis: Record<string, string[]> = {
      forest: ['🐰', '🦊', '🐺', '🐻', '👑🐻'],
      mountain: ['🐐', '🦅', '🐆', '❄️👹', '🐉'],
      castle: ['💂', '🛡️', '🧙', '⚔️🖤', '👿']
    };
    const list = emojis[mapCode] || emojis['forest'];
    return isBoss ? list[list.length - 1] : list[Math.min(stage - 1, list.length - 2)];
  }

  loadQuestions(count: number): void {
    this.isLoading.set(true);

    this.apiService.getVocabularyForReview(count * 2).subscribe({
      next: (vocab: Vocabulary[]) => {
        const shuffled = this.shuffleArray([...vocab]);
        const questions: QuestQuestion[] = shuffled.slice(0, count).map((v, i) => {
          const wrongOptions = shuffled
            .filter(w => w.id !== v.id)
            .slice(0, 3)
            .map(w => w.vietnameseWord);

          const options = this.shuffleArray([v.vietnameseWord, ...wrongOptions]);

          return {
            id: i,
            english: v.englishWord,
            vietnamese: v.vietnameseWord,
            options,
            correctIndex: options.indexOf(v.vietnameseWord)
          };
        });

        this.questions.set(questions);
        this.isLoading.set(false);
        this.showCountdown.set(true);
        this.phase.set('countdown');
      },
      error: (err: Error) => {
        console.error('Error loading vocabulary:', err);
        this.error.set('Failed to load vocabulary');
        this.isLoading.set(false);
      }
    });
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.startBattle();
  }

  startBattle(): void {
    const stage = this.currentStage();
    if (!stage) return;

    this.startTime = new Date();

    // Initialize battle state
    this.battle.set({
      playerHp: 100,
      playerMaxHp: 100,
      enemyHp: stage.enemyHp,
      enemyMaxHp: stage.enemyHp,
      currentQuestion: this.questions()[0] || null,
      questionIndex: 0,
      totalQuestions: stage.questionsCount,
      combo: 0,
      damage: 0,
      isPlayerTurn: true,
      lastAction: null,
      battleLog: [`A wild ${stage.enemyName} appears!`],
      correctCount: 0,
      wrongCount: 0
    });

    this.phase.set('battle');

    // Start session
    this.apiService.startGame('vocabulary_quest').subscribe({
      next: (session) => {
        this.sessionId = session.sessionId;
      },
      error: (err) => console.error('Failed to start session:', err)
    });
  }

  selectAnswer(index: number): void {
    if (this.selectedAnswer() !== null || !this.battle().isPlayerTurn) return;

    this.audioService.playSound('click');
    this.selectedAnswer.set(index);
    const question = this.battle().currentQuestion;
    if (!question) return;

    const isCorrect = index === question.correctIndex;
    this.feedbackCorrect.set(isCorrect);
    this.showFeedback.set(true);

    // Play feedback sound
    if (isCorrect) {
      this.audioService.playSound('correct');
      this.playerAttack();
    } else {
      this.audioService.playSound('wrong');
      this.enemyAttack();
    }
  }

  private playerAttack(): void {
    this.playerAttacking.set(true);

    setTimeout(() => {
      this.playerAttacking.set(false);
      this.enemyHit.set(true);

      // Play attack hit sound
      this.audioService.playSound('whoosh');

      const combo = this.battle().combo + 1;
      const damage = this.PLAYER_BASE_DAMAGE + (combo - 1) * this.COMBO_BONUS;
      this.damageNumber.set(damage);
      this.showDamageNumber.set(true);

      // Play combo sound for streaks
      if (combo >= 2) {
        this.audioService.playCombo(combo);
      }

      this.battle.update(b => {
        const newEnemyHp = Math.max(0, b.enemyHp - damage);
        return {
          ...b,
          enemyHp: newEnemyHp,
          combo,
          damage: b.damage + damage,
          lastAction: 'attack',
          battleLog: [...b.battleLog, `You deal ${damage} damage! (${combo}x combo)`],
          correctCount: b.correctCount + 1
        };
      });

      setTimeout(() => {
        this.enemyHit.set(false);
        this.showDamageNumber.set(false);
        this.checkBattleEnd();
      }, 500);
    }, 300);
  }

  private enemyAttack(): void {
    this.battle.update(b => ({
      ...b,
      combo: 0,
      lastAction: 'defend'
    }));

    setTimeout(() => {
      this.enemyAttacking.set(true);

      setTimeout(() => {
        this.enemyAttacking.set(false);
        this.playerHit.set(true);

        // Play enemy hit sound
        this.audioService.playSound('whoosh');

        const damage = this.ENEMY_BASE_DAMAGE;
        this.damageNumber.set(damage);
        this.showDamageNumber.set(true);

        this.battle.update(b => {
          const newPlayerHp = Math.max(0, b.playerHp - damage);
          return {
            ...b,
            playerHp: newPlayerHp,
            battleLog: [...b.battleLog, `${this.currentStage()?.enemyName} deals ${damage} damage!`],
            wrongCount: b.wrongCount + 1
          };
        });

        setTimeout(() => {
          this.playerHit.set(false);
          this.showDamageNumber.set(false);
          this.checkBattleEnd();
        }, 500);
      }, 300);
    }, 500);
  }

  private checkBattleEnd(): void {
    const b = this.battle();

    if (b.enemyHp <= 0) {
      this.handleVictory();
      return;
    }

    if (b.playerHp <= 0) {
      this.handleDefeat();
      return;
    }

    // Next question
    this.nextQuestion();
  }

  private nextQuestion(): void {
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);

    const nextIndex = this.battle().questionIndex + 1;
    const questions = this.questions();

    if (nextIndex >= questions.length) {
      // No more questions, check if enemy still alive
      if (this.battle().enemyHp > 0) {
        // Enemy survives - continue with recycled questions
        this.battle.update(b => ({
          ...b,
          questionIndex: 0,
          currentQuestion: questions[0]
        }));
      }
      return;
    }

    this.battle.update(b => ({
      ...b,
      questionIndex: nextIndex,
      currentQuestion: questions[nextIndex]
    }));
  }

  private handleVictory(): void {
    this.phase.set('victory');
    this.audioService.playSound('victory');
    const stage = this.currentStage();
    const b = this.battle();

    // Calculate stars (based on remaining HP)
    const hpPercent = b.playerHp / b.playerMaxHp;
    let stars = 1;
    if (hpPercent >= 0.8) stars = 3;
    else if (hpPercent >= 0.5) stars = 2;

    setTimeout(() => {
      this.endGame(true, stars, stage?.rewards || { xp: 0, coins: 0 });
    }, 2000);
  }

  private handleDefeat(): void {
    this.phase.set('defeat');
    this.audioService.playSound('game-over');

    setTimeout(() => {
      this.endGame(false, 0, { xp: 0, coins: 0 });
    }, 2000);
  }

  private endGame(victory: boolean, stars: number, rewards: { xp: number; coins: number }): void {
    if (!this.sessionId || !this.startTime) {
      this.showResults(victory, stars, rewards);
      return;
    }

    const b = this.battle();
    const duration = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    const totalAnswered = b.correctCount + b.wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((b.correctCount / totalAnswered) * 100) : 0;

    this.apiService.endGame(this.sessionId, {
      score: b.damage,
      accuracy,
      maxCombo: b.combo,
      wordsCorrect: b.correctCount,
      wordsWrong: b.wrongCount,
      durationSeconds: duration,
      gameData: { stars, stageId: this.currentStage()?.id, completed: victory }
    }).subscribe({
      next: (result) => {
        this.showResults(victory, stars, {
          xp: result.xpEarned,
          coins: result.coinsEarned
        });
      },
      error: () => this.showResults(victory, stars, rewards)
    });
  }

  private showResults(victory: boolean, stars: number, rewards: { xp: number; coins: number }): void {
    const b = this.battle();
    const totalAnswered = b.correctCount + b.wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((b.correctCount / totalAnswered) * 100) : 0;

    this.gameResult.set({
      sessionId: this.sessionId ?? undefined,
      score: b.damage,
      accuracy,
      maxCombo: b.combo,
      wordsCorrect: b.correctCount,
      wordsWrong: b.wrongCount,
      durationSeconds: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      xpEarned: rewards.xp,
      coinsEarned: rewards.coins,
      isNewBestScore: false,
      newAchievements: [],
      victory: victory
    });

    this.showGameOver.set(true);
  }

  onPlayAgain(): void {
    this.showGameOver.set(false);
    this.phase.set('stage-select');
    this.resetBattle();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  private resetBattle(): void {
    this.battle.set({
      playerHp: 100,
      playerMaxHp: 100,
      enemyHp: 100,
      enemyMaxHp: 100,
      currentQuestion: null,
      questionIndex: 0,
      totalQuestions: 5,
      combo: 0,
      damage: 0,
      isPlayerTurn: true,
      lastAction: null,
      battleLog: [],
      correctCount: 0,
      wrongCount: 0
    });
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);
    this.currentStage.set(null);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getStageArray(): number[] {
    const map = this.selectedMap();
    if (!map) return [];
    return Array.from({ length: map.totalStages }, (_, i) => i + 1);
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'difficulty-beginner';
      case 'intermediate': return 'difficulty-intermediate';
      case 'advanced': return 'difficulty-advanced';
      default: return '';
    }
  }
}
