import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { ApiService, Vocabulary } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';

// Exercise for building practice
interface BuildingExercise {
  type: 'vocabulary' | 'grammar' | 'flashcard' | 'listening';
  question: string;
  questionVi?: string;
  options: string[];
  correctAnswer: string;
  vocabulary?: Vocabulary;
}

// Practice session state
interface PracticeSession {
  building: PlacedBuilding;
  exercises: BuildingExercise[];
  currentIndex: number;
  correctCount: number;
  totalQuestions: number;
}

// Building definition
interface BuildingDef {
  id: string;
  name: string;
  description: string;
  category: 'learning' | 'production' | 'decoration';
  icon: string;
  unlockLevel: number;
  cost: { coins: number; gems?: number };
  production: { xp?: number; coins?: number }; // per correct answer (not per hour!)
  size: { x: number; y: number };
  buildTime: number; // seconds
  exerciseType?: 'vocabulary' | 'grammar' | 'flashcard' | 'listening' | 'mixed'; // Type of exercise this building offers
  questionsPerSession: number; // How many questions per practice session
}

// Placed building on the island
interface PlacedBuilding {
  id: number;
  buildingId: string;
  position: { x: number; y: number };
  level: number;
  lastCollected: Date;
  isBuilding: boolean;
  buildCompleteAt?: Date;
}

// Island grid cell
interface GridCell {
  x: number;
  y: number;
  terrain: 'grass' | 'water' | 'sand' | 'rock';
  building?: PlacedBuilding;
  isBlocked: boolean;
}

// Building definitions - Now with exercise types!
const BUILDINGS: BuildingDef[] = [
  {
    id: 'library',
    name: 'Library',
    description: 'Practice vocabulary with multiple choice questions',
    category: 'learning',
    icon: '📚',
    unlockLevel: 1,
    cost: { coins: 100 },
    production: { xp: 10, coins: 5 }, // per correct answer
    size: { x: 2, y: 2 },
    buildTime: 5,
    exerciseType: 'vocabulary',
    questionsPerSession: 5
  },
  {
    id: 'vocabulary_garden',
    name: 'Vocabulary Garden',
    description: 'Review flashcards to grow your word garden',
    category: 'learning',
    icon: '🌸',
    unlockLevel: 2,
    cost: { coins: 300 },
    production: { xp: 15, coins: 8 },
    size: { x: 3, y: 3 },
    buildTime: 10,
    exerciseType: 'flashcard',
    questionsPerSession: 8
  },
  {
    id: 'grammar_tower',
    name: 'Grammar Tower',
    description: 'Master grammar rules with challenging exercises',
    category: 'learning',
    icon: '🗼',
    unlockLevel: 3,
    cost: { coins: 500, gems: 5 },
    production: { xp: 25 },
    size: { x: 2, y: 3 },
    buildTime: 15,
    exerciseType: 'grammar',
    questionsPerSession: 5
  },
  {
    id: 'coin_fountain',
    name: 'Coin Fountain',
    description: 'Answer mixed questions to earn coins',
    category: 'production',
    icon: '⛲',
    unlockLevel: 2,
    cost: { coins: 400 },
    production: { coins: 20 },
    size: { x: 2, y: 2 },
    buildTime: 10,
    exerciseType: 'mixed',
    questionsPerSession: 5
  },
  {
    id: 'xp_shrine',
    name: 'XP Shrine',
    description: 'Challenge yourself for bonus XP',
    category: 'production',
    icon: '⛩️',
    unlockLevel: 4,
    cost: { coins: 800, gems: 10 },
    production: { xp: 40 },
    size: { x: 2, y: 2 },
    buildTime: 15,
    exerciseType: 'mixed',
    questionsPerSession: 10
  },
  {
    id: 'palm_tree',
    name: 'Palm Tree',
    description: 'Tropical decoration',
    category: 'decoration',
    icon: '🌴',
    unlockLevel: 1,
    cost: { coins: 50 },
    production: {},
    size: { x: 1, y: 1 },
    buildTime: 5,
    questionsPerSession: 0
  },
  {
    id: 'flower_bed',
    name: 'Flower Bed',
    description: 'Beautiful flowers',
    category: 'decoration',
    icon: '🌺',
    unlockLevel: 1,
    cost: { coins: 30 },
    production: {},
    size: { x: 1, y: 1 },
    buildTime: 3,
    questionsPerSession: 0
  },
  {
    id: 'statue',
    name: 'Scholar Statue',
    description: 'A monument to learning',
    category: 'decoration',
    icon: '🗿',
    unlockLevel: 3,
    cost: { coins: 200, gems: 2 },
    production: {},
    size: { x: 1, y: 2 },
    buildTime: 10,
    questionsPerSession: 0
  },
  {
    id: 'pronunciation_lab',
    name: 'Pronunciation Lab',
    description: 'Listen and learn correct pronunciation',
    category: 'learning',
    icon: '🎙️',
    unlockLevel: 5,
    cost: { coins: 1000, gems: 15 },
    production: { xp: 30, coins: 15 },
    size: { x: 3, y: 2 },
    buildTime: 20,
    exerciseType: 'listening',
    questionsPerSession: 5
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Guides learners with quick vocabulary drills',
    category: 'decoration',
    icon: '🗼',
    unlockLevel: 4,
    cost: { coins: 600 },
    production: { xp: 8 },
    size: { x: 2, y: 2 },
    buildTime: 15,
    exerciseType: 'vocabulary',
    questionsPerSession: 3
  }
];

const GRID_SIZE = 8;

@Component({
  selector: 'app-language-island',
  standalone: true,
  imports: [CommonModule, GameOverDialogComponent],
  templateUrl: './language-island.component.html',
  styleUrls: ['./language-island.component.scss']
})
export class LanguageIslandComponent implements OnInit {
  // Game state
  phase = signal<'island' | 'build' | 'shop' | 'practice'>('island');
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Island data
  grid = signal<GridCell[][]>([]);
  placedBuildings = signal<PlacedBuilding[]>([]);

  // Player resources
  coins = signal(500);
  gems = signal(5);
  xp = signal(0);
  level = signal(1);
  xpToNextLevel = signal(100);

  // Shop
  availableBuildings = signal<BuildingDef[]>(BUILDINGS);
  selectedBuilding = signal<BuildingDef | null>(null);

  // Build mode
  buildMode = signal(false);
  buildPreviewPos = signal<{ x: number; y: number } | null>(null);
  canPlaceBuilding = signal(false);

  // Practice session (NEW - Learn to Earn!)
  practiceSession = signal<PracticeSession | null>(null);
  currentExercise = signal<BuildingExercise | null>(null);
  selectedAnswer = signal<string | null>(null);
  showAnswerFeedback = signal(false);
  isAnswerCorrect = signal(false);
  vocabularyCache = signal<Vocabulary[]>([]);

  // Session rewards
  sessionRewards = signal<{ xp: number; coins: number }>({ xp: 0, coins: 0 });

  // Collection (simplified - just for showing rewards)
  pendingCollection = signal<{ xp: number; coins: number }>({ xp: 0, coins: 0 });
  showCollection = signal(false);

  // Game over
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Computed
  levelProgress = computed(() => (this.xp() / this.xpToNextLevel()) * 100);

  unlockedBuildings = computed(() =>
    this.availableBuildings().filter(b => b.unlockLevel <= this.level())
  );

  // Total potential earnings from all buildings (per correct answer)
  totalPotentialEarnings = computed(() => {
    let xp = 0;
    let coins = 0;

    for (const placed of this.placedBuildings()) {
      if (placed.isBuilding) continue;
      const def = BUILDINGS.find(b => b.id === placed.buildingId);
      if (def && def.exerciseType) {
        xp += (def.production.xp || 0) * placed.level;
        coins += (def.production.coins || 0) * placed.level;
      }
    }

    return { xp, coins };
  });

  constructor(
    private router: Router,
    private apiService: ApiService,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.initializeIsland();
    this.loadVocabulary();
  }

  private loadVocabulary(): void {
    this.apiService.getVocabulary(1, 100).subscribe({
      next: (response: { data: Vocabulary[] }) => {
        if (response.data) {
          this.vocabularyCache.set(response.data);
        }
      },
      error: (err: Error) => {
        console.error('Failed to load vocabulary:', err);
        // Use fallback vocabulary if API fails
        this.vocabularyCache.set(this.getFallbackVocabulary());
      }
    });
  }

  private getFallbackVocabulary(): Vocabulary[] {
    // Fallback vocabulary for when API is not available
    return [
      { id: 1, vietnameseWord: 'xin chào', englishWord: 'hello', partOfSpeech: 'interjection', phonetic: '/həˈloʊ/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 2, vietnameseWord: 'cảm ơn', englishWord: 'thank you', partOfSpeech: 'phrase', phonetic: '/θæŋk juː/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 3, vietnameseWord: 'tạm biệt', englishWord: 'goodbye', partOfSpeech: 'interjection', phonetic: '/ɡʊdˈbaɪ/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 4, vietnameseWord: 'bạn', englishWord: 'friend', partOfSpeech: 'noun', phonetic: '/frend/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 5, vietnameseWord: 'nhà', englishWord: 'house', partOfSpeech: 'noun', phonetic: '/haʊs/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 6, vietnameseWord: 'ăn', englishWord: 'eat', partOfSpeech: 'verb', phonetic: '/iːt/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 7, vietnameseWord: 'uống', englishWord: 'drink', partOfSpeech: 'verb', phonetic: '/drɪŋk/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 8, vietnameseWord: 'đọc', englishWord: 'read', partOfSpeech: 'verb', phonetic: '/riːd/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 9, vietnameseWord: 'viết', englishWord: 'write', partOfSpeech: 'verb', phonetic: '/raɪt/', difficultyLevel: 'beginner' } as Vocabulary,
      { id: 10, vietnameseWord: 'học', englishWord: 'learn', partOfSpeech: 'verb', phonetic: '/lɜːrn/', difficultyLevel: 'beginner' } as Vocabulary,
    ];
  }

  private initializeIsland(): void {
    this.isLoading.set(true);

    // Generate island grid
    const newGrid: GridCell[][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        // Create varied terrain
        let terrain: GridCell['terrain'] = 'grass';

        // Border water
        if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) {
          terrain = 'water';
        }
        // Some sand near water
        else if (x === 1 || y === 1 || x === GRID_SIZE - 2 || y === GRID_SIZE - 2) {
          terrain = Math.random() > 0.5 ? 'sand' : 'grass';
        }
        // Random rocks
        else if (Math.random() < 0.05) {
          terrain = 'rock';
        }

        row.push({
          x,
          y,
          terrain,
          isBlocked: terrain === 'water' || terrain === 'rock'
        });
      }
      newGrid.push(row);
    }

    this.grid.set(newGrid);

    // Place starter buildings
    const starterBuildings: PlacedBuilding[] = [
      {
        id: 1,
        buildingId: 'library',
        position: { x: 3, y: 3 },
        level: 1,
        lastCollected: new Date(),
        isBuilding: false
      }
    ];

    this.placedBuildings.set(starterBuildings);
    this.updateGridWithBuildings();

    this.isLoading.set(false);
  }

  private updateGridWithBuildings(): void {
    const newGrid: GridCell[][] = this.grid().map(row =>
      row.map(cell => ({ ...cell, building: undefined as PlacedBuilding | undefined }))
    );

    for (const building of this.placedBuildings()) {
      const def = BUILDINGS.find(b => b.id === building.buildingId);
      if (!def) continue;

      for (let dy = 0; dy < def.size.y; dy++) {
        for (let dx = 0; dx < def.size.x; dx++) {
          const y = building.position.y + dy;
          const x = building.position.x + dx;
          if (y < GRID_SIZE && x < GRID_SIZE) {
            newGrid[y][x].building = building;
            newGrid[y][x].isBlocked = true;
          }
        }
      }
    }

    this.grid.set(newGrid);
  }

  // ========== PRACTICE SESSION METHODS (Learn to Earn!) ==========

  // Start practice session for a building
  startPractice(building: PlacedBuilding): void {
    const def = this.getBuildingDef(building.buildingId);
    if (!def || !def.exerciseType || def.questionsPerSession === 0) {
      return; // Decoration buildings can't be practiced
    }

    // Generate exercises
    const exercises = this.generateExercises(def.exerciseType, def.questionsPerSession);

    if (exercises.length === 0) {
      this.error.set('No vocabulary available. Please learn some words first!');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    // Play start practice sound
    this.audioService.playSound('game-start');

    // Start session
    this.practiceSession.set({
      building,
      exercises,
      currentIndex: 0,
      correctCount: 0,
      totalQuestions: exercises.length
    });

    this.currentExercise.set(exercises[0]);
    this.selectedAnswer.set(null);
    this.showAnswerFeedback.set(false);
    this.sessionRewards.set({ xp: 0, coins: 0 });
    this.phase.set('practice');
    this.closeBuildingInfo();
  }

  // Generate exercises based on type
  private generateExercises(type: string, count: number): BuildingExercise[] {
    const vocabulary = this.vocabularyCache();
    if (vocabulary.length < 4) return []; // Need at least 4 words for multiple choice

    const exercises: BuildingExercise[] = [];
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const word = shuffled[i];
      const exercise = this.createExerciseForWord(word, type, vocabulary);
      if (exercise) exercises.push(exercise);
    }

    return exercises;
  }

  private createExerciseForWord(word: Vocabulary, type: string, allWords: Vocabulary[]): BuildingExercise | null {
    // Get 3 wrong answers
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (wrongAnswers.length < 3) return null;

    switch (type) {
      case 'vocabulary':
      case 'mixed':
        // Vietnamese -> English multiple choice
        return {
          type: 'vocabulary',
          question: `What is the English word for "${word.vietnameseWord}"?`,
          questionVi: `"${word.vietnameseWord}" tiếng Anh là gì?`,
          options: this.shuffleArray([word.englishWord, ...wrongAnswers.map(w => w.englishWord)]),
          correctAnswer: word.englishWord,
          vocabulary: word
        };

      case 'flashcard':
        // English -> Vietnamese
        return {
          type: 'flashcard',
          question: `What is the meaning of "${word.englishWord}"?`,
          questionVi: `"${word.englishWord}" nghĩa là gì?`,
          options: this.shuffleArray([word.vietnameseWord, ...wrongAnswers.map(w => w.vietnameseWord)]),
          correctAnswer: word.vietnameseWord,
          vocabulary: word
        };

      case 'grammar':
        // Part of speech identification
        const posOptions = ['noun', 'verb', 'adjective', 'adverb'];
        const correctPos = word.partOfSpeech || 'noun';
        return {
          type: 'grammar',
          question: `What part of speech is "${word.englishWord}"?`,
          questionVi: `"${word.englishWord}" thuộc loại từ nào?`,
          options: posOptions,
          correctAnswer: correctPos,
          vocabulary: word
        };

      case 'listening':
        // Hear the word, identify Vietnamese meaning
        return {
          type: 'listening',
          question: `🔊 Listen: "${word.englishWord}" [${word.phonetic || ''}]`,
          questionVi: `Nghe và chọn nghĩa đúng`,
          options: this.shuffleArray([word.vietnameseWord, ...wrongAnswers.map(w => w.vietnameseWord)]),
          correctAnswer: word.vietnameseWord,
          vocabulary: word
        };

      default:
        return null;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
  }

  // Handle answer selection
  selectAnswer(answer: string): void {
    if (this.showAnswerFeedback()) return; // Already answered

    this.audioService.playSound('click');
    this.selectedAnswer.set(answer);
    const exercise = this.currentExercise();
    if (!exercise) return;

    const isCorrect = answer === exercise.correctAnswer;
    this.isAnswerCorrect.set(isCorrect);
    this.showAnswerFeedback.set(true);

    // Play feedback sound
    if (isCorrect) {
      this.audioService.playSound('correct');
    } else {
      this.audioService.playSound('wrong');
    }

    // Update session
    const session = this.practiceSession();
    if (session && isCorrect) {
      this.practiceSession.update(s => s ? { ...s, correctCount: s.correctCount + 1 } : null);

      // Calculate rewards
      const def = this.getBuildingDef(session.building.buildingId);
      if (def) {
        const multiplier = session.building.level;
        const xpReward = (def.production.xp || 0) * multiplier;
        const coinReward = (def.production.coins || 0) * multiplier;
        this.sessionRewards.update(r => ({
          xp: r.xp + xpReward,
          coins: r.coins + coinReward
        }));
      }
    }
  }

  // Move to next question
  nextQuestion(): void {
    const session = this.practiceSession();
    if (!session) return;

    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= session.exercises.length) {
      // Session complete!
      this.completePracticeSession();
    } else {
      // Next question
      this.practiceSession.update(s => s ? { ...s, currentIndex: nextIndex } : null);
      this.currentExercise.set(session.exercises[nextIndex]);
      this.selectedAnswer.set(null);
      this.showAnswerFeedback.set(false);
    }
  }

  // Complete practice session
  private completePracticeSession(): void {
    const session = this.practiceSession();
    const rewards = this.sessionRewards();

    if (session && rewards) {
      // Play completion sound
      if (session.correctCount === session.totalQuestions) {
        this.audioService.playSound('victory');
      } else if (session.correctCount >= session.totalQuestions / 2) {
        this.audioService.playSound('level-up');
      } else {
        this.audioService.playSound('ding');
      }

      // Add rewards to player
      this.xp.update(x => x + rewards.xp);
      this.coins.update(c => c + rewards.coins);

      // Check level up
      const prevLevel = this.level();
      while (this.xp() >= this.xpToNextLevel()) {
        this.xp.update(x => x - this.xpToNextLevel());
        this.level.update(l => l + 1);
        this.xpToNextLevel.update(x => Math.floor(x * 1.5));
      }
      if (this.level() > prevLevel) {
        this.audioService.playSound('achievement');
      }

      // Show results
      this.pendingCollection.set(rewards);
      this.showCollection.set(true);
    }

    // Reset practice state
    this.practiceSession.set(null);
    this.currentExercise.set(null);
    this.phase.set('island');

    setTimeout(() => {
      this.showCollection.set(false);
      this.pendingCollection.set({ xp: 0, coins: 0 });
    }, 2500);
  }

  // Cancel practice session
  cancelPractice(): void {
    this.practiceSession.set(null);
    this.currentExercise.set(null);
    this.sessionRewards.set({ xp: 0, coins: 0 });
    this.phase.set('island');
  }

  // Check if building can be practiced
  canPractice(building: PlacedBuilding): boolean {
    if (building.isBuilding) return false;
    const def = this.getBuildingDef(building.buildingId);
    return !!(def && def.exerciseType && def.questionsPerSession > 0);
  }

  // Navigation
  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  // Shop
  openShop(): void {
    this.audioService.playSound('open');
    this.phase.set('shop');
  }

  closeShop(): void {
    this.audioService.playSound('close');
    this.phase.set('island');
    this.selectedBuilding.set(null);
  }

  selectBuildingToBuy(building: BuildingDef): void {
    this.audioService.playSound('select');
    this.selectedBuilding.set(building);
  }

  canAffordBuilding(building: BuildingDef): boolean {
    if (this.coins() < building.cost.coins) return false;
    if (building.cost.gems && this.gems() < building.cost.gems) return false;
    return true;
  }

  buyBuilding(): void {
    const building = this.selectedBuilding();
    if (!building || !this.canAffordBuilding(building)) return;

    // Play purchase sound
    this.audioService.playSound('coin');

    // Deduct cost
    this.coins.update(c => c - building.cost.coins);
    if (building.cost.gems) {
      this.gems.update(g => g - building.cost.gems!);
    }

    // Enter build mode
    this.buildMode.set(true);
    this.phase.set('build');
  }

  // Build mode
  onGridCellHover(cell: GridCell): void {
    if (!this.buildMode()) return;

    const building = this.selectedBuilding();
    if (!building) return;

    this.buildPreviewPos.set({ x: cell.x, y: cell.y });
    this.canPlaceBuilding.set(this.checkCanPlace(cell.x, cell.y, building));
  }

  private checkCanPlace(startX: number, startY: number, building: BuildingDef): boolean {
    for (let dy = 0; dy < building.size.y; dy++) {
      for (let dx = 0; dx < building.size.x; dx++) {
        const x = startX + dx;
        const y = startY + dy;

        if (x >= GRID_SIZE || y >= GRID_SIZE) return false;

        const cell = this.grid()[y]?.[x];
        if (!cell || cell.isBlocked) return false;
      }
    }
    return true;
  }

  onGridCellClick(cell: GridCell): void {
    if (!this.buildMode()) {
      // Select existing building
      if (cell.building) {
        this.selectPlacedBuilding(cell.building);
      }
      return;
    }

    if (!this.canPlaceBuilding()) return;

    const building = this.selectedBuilding();
    if (!building) return;

    // Play building placement sound
    this.audioService.playSound('pop');

    // Place building
    const newBuilding: PlacedBuilding = {
      id: Date.now(),
      buildingId: building.id,
      position: { x: cell.x, y: cell.y },
      level: 1,
      lastCollected: new Date(),
      isBuilding: building.buildTime > 0,
      buildCompleteAt: building.buildTime > 0
        ? new Date(Date.now() + building.buildTime * 1000)
        : undefined
    };

    this.placedBuildings.update(b => [...b, newBuilding]);
    this.updateGridWithBuildings();

    // Exit build mode
    this.buildMode.set(false);
    this.selectedBuilding.set(null);
    this.buildPreviewPos.set(null);
    this.phase.set('island');

    // Start build timer if needed
    if (building.buildTime > 0) {
      setTimeout(() => {
        this.completeBuild(newBuilding.id);
      }, building.buildTime * 1000);
    }
  }

  cancelBuild(): void {
    const building = this.selectedBuilding();
    if (building) {
      // Refund
      this.coins.update(c => c + building.cost.coins);
      if (building.cost.gems) {
        this.gems.update(g => g + building.cost.gems!);
      }
    }

    this.buildMode.set(false);
    this.selectedBuilding.set(null);
    this.buildPreviewPos.set(null);
    this.phase.set('island');
  }

  private completeBuild(buildingId: number): void {
    this.placedBuildings.update(buildings =>
      buildings.map(b =>
        b.id === buildingId
          ? { ...b, isBuilding: false, buildCompleteAt: undefined }
          : b
      )
    );
  }

  // Building interaction
  selectedPlacedBuilding = signal<PlacedBuilding | null>(null);

  selectPlacedBuilding(building: PlacedBuilding): void {
    this.audioService.playSound('click');
    this.selectedPlacedBuilding.set(building);
  }

  closeBuildingInfo(): void {
    this.selectedPlacedBuilding.set(null);
  }

  getBuildingDef(buildingId: string): BuildingDef | undefined {
    return BUILDINGS.find(b => b.id === buildingId);
  }

  // Upgrade building
  canUpgradeBuilding(building: PlacedBuilding): boolean {
    const def = this.getBuildingDef(building.buildingId);
    if (!def) return false;

    const upgradeCost = def.cost.coins * building.level;
    return this.coins() >= upgradeCost && building.level < 5;
  }

  upgradeBuilding(building: PlacedBuilding): void {
    if (!this.canUpgradeBuilding(building)) return;

    const def = this.getBuildingDef(building.buildingId);
    if (!def) return;

    // Play upgrade sound
    this.audioService.playSound('level-up');

    const upgradeCost = def.cost.coins * building.level;
    this.coins.update(c => c - upgradeCost);

    this.placedBuildings.update(buildings =>
      buildings.map(b =>
        b.id === building.id
          ? { ...b, level: b.level + 1 }
          : b
      )
    );

    this.closeBuildingInfo();
  }

  // Helper methods
  getTerrainEmoji(terrain: string): string {
    switch (terrain) {
      case 'water': return '🌊';
      case 'sand': return '🏖️';
      case 'rock': return '🪨';
      default: return '🌿';
    }
  }

  getBuildingIcon(buildingId: string): string {
    const def = BUILDINGS.find(b => b.id === buildingId);
    return def?.icon || '🏠';
  }

  isPreviewCell(x: number, y: number): boolean {
    const preview = this.buildPreviewPos();
    const building = this.selectedBuilding();
    if (!preview || !building) return false;

    return (
      x >= preview.x &&
      x < preview.x + building.size.x &&
      y >= preview.y &&
      y < preview.y + building.size.y
    );
  }

  getBuildTimeRemaining(building: PlacedBuilding): string {
    if (!building.buildCompleteAt) return '';

    const remaining = new Date(building.buildCompleteAt).getTime() - Date.now();
    if (remaining <= 0) return 'Done!';

    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
