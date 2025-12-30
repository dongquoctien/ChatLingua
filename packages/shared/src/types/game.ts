// Game System Types
// Games, Sessions, Leaderboards, Achievements, Power-ups, Currency

// ============================================================
// Game Definitions
// ============================================================

export type GameCategory = 'speed' | 'puzzle' | 'adventure' | 'competitive' | 'audio' | 'collection';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Game {
  id: number;
  gameCode: string;
  name: string;
  description: string | null;
  category: GameCategory;
  difficulty: GameDifficulty;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  minVocabularyRequired: number;
  unlockLevel: number;
  config: GameConfig | null;
  createdAt: Date;
}

export interface GameConfig {
  // Word Rush config
  timeLimit?: number;
  questionsPerRound?: number;
  comboMultiplier?: boolean;
  // Memory Match config
  gridSizes?: number[];
  timeBonus?: boolean;
  // Hangman config
  maxMistakes?: number;
  hintCost?: number;
  // Spelling Bee config
  timePerWord?: number;
  repeatAllowed?: boolean;
  // Generic config
  [key: string]: unknown;
}

export interface GameWithStats extends Game {
  totalPlays: number;
  bestScore: number;
  isUnlocked: boolean;
}

// ============================================================
// Game Sessions
// ============================================================

export interface GameSession {
  id: number;
  userId: number;
  gameId: number;
  score: number;
  maxCombo: number;
  accuracy: number | null;
  wordsCorrect: number;
  wordsWrong: number;
  wordsTotal: number;
  durationSeconds: number | null;
  startedAt: Date;
  endedAt: Date | null;
  xpEarned: number;
  coinsEarned: number;
  gameData: GameSessionData | null;
  status: GameStatus;
}

export interface GameSessionData {
  // Word Rush specific
  questions?: QuestionResult[];
  finalCombo?: number;
  // Memory Match specific
  gridSize?: number;
  moves?: number;
  matchedPairs?: number;
  // Hangman specific
  word?: string;
  guessedLetters?: string[];
  mistakes?: number;
  hintsUsed?: number;
  // Spelling Bee specific
  wordsAttempted?: SpellingAttempt[];
  // Power-ups used
  powerUpsUsed?: string[];
  [key: string]: unknown;
}

export interface QuestionResult {
  vocabularyId: number;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface SpellingAttempt {
  vocabularyId: number;
  word: string;
  userSpelling: string;
  isCorrect: boolean;
  attemptsCount: number;
}

// Request/Response types
export interface StartGameRequest {
  gameCode: string;
  difficulty?: GameDifficulty;
  gridSize?: number; // For Memory Match
}

export interface StartGameResponse {
  sessionId: number;
  game: Game;
  vocabulary: GameVocabulary[];
  config: GameConfig;
}

export interface GameVocabulary {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  audioUrl?: string;
  hint?: string; // For Hangman
}

export interface SubmitAnswerRequest {
  sessionId: number;
  vocabularyId: number;
  answer: string;
  timeSpent: number;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: string;
  currentScore: number;
  currentCombo: number;
  xpEarned: number;
}

export interface EndGameRequest {
  sessionId: number;
  gameData?: GameSessionData;
}

export interface EndGameResponse {
  session: GameSession;
  xpEarned: number;
  coinsEarned: number;
  newAchievements: GameAchievement[];
  leaderboardPosition?: number;
  isNewBestScore: boolean;
}

// ============================================================
// Game Leaderboards
// ============================================================

export interface GameLeaderboard {
  id: number;
  userId: number;
  gameId: number;
  bestScore: number;
  bestCombo: number;
  bestAccuracy: number | null;
  totalPlays: number;
  totalTimeSeconds: number;
  weeklyScore: number;
  weeklyPlays: number;
  weekStart: Date | null;
  dailyScore: number;
  dailyPlays: number;
  playDate: Date | null;
  allTimeRank: number | null;
  weeklyRank: number | null;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  displayName?: string;
  score: number;
  combo?: number;
  accuracy?: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  gameCode: string;
  gameName: string;
  period: 'daily' | 'weekly' | 'all_time';
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
}

// ============================================================
// Game Achievements
// ============================================================

export type AchievementRequirementType = 'score' | 'combo' | 'accuracy' | 'plays' | 'streak' | 'special';

export interface GameAchievement {
  id: number;
  gameId: number;
  achievementCode: string;
  name: string;
  description: string | null;
  icon: string | null;
  xpReward: number;
  requirementType: AchievementRequirementType;
  requirementValue: number;
  isHidden: boolean;
}

export interface UserGameAchievement {
  id: number;
  userId: number;
  achievementId: number;
  achievement: GameAchievement;
  unlockedAt: Date;
  sessionId: number | null;
}

// ============================================================
// Power-ups System
// ============================================================

export type PowerUpEffectType = 'freeze' | 'slow' | 'clear' | 'hint' | 'skip' | 'double_xp' | 'shield' | 'extra_time';

export interface PowerUp {
  id: number;
  powerUpCode: string;
  name: string;
  description: string | null;
  icon: string | null;
  effectType: PowerUpEffectType;
  effectValue: number | null;
  coinCost: number;
  applicableGames: string[] | null;
}

export interface UserPowerUp {
  id: number;
  userId: number;
  powerUpId: number;
  powerUp: PowerUp;
  quantity: number;
}

export interface UsePowerUpRequest {
  sessionId: number;
  powerUpCode: string;
}

export interface UsePowerUpResponse {
  success: boolean;
  remainingQuantity: number;
  effect: {
    type: PowerUpEffectType;
    value: number;
    duration?: number;
  };
}

// ============================================================
// Currency System
// ============================================================

export type CurrencyType = 'coins' | 'gems';
export type CurrencySource = 'game' | 'achievement' | 'daily_bonus' | 'purchase' | 'power_up' | 'gacha';

export interface UserCurrency {
  userId: number;
  coins: number;
  gems: number;
  updatedAt: Date;
}

export interface CurrencyTransaction {
  id: number;
  userId: number;
  currencyType: CurrencyType;
  amount: number;
  source: CurrencySource;
  sourceId: number | null;
  description: string | null;
  createdAt: Date;
}

export interface PurchasePowerUpRequest {
  powerUpCode: string;
  quantity: number;
}

export interface PurchasePowerUpResponse {
  success: boolean;
  newBalance: number;
  newQuantity: number;
  transaction: CurrencyTransaction;
}

// ============================================================
// Game Hub Types
// ============================================================

export interface GamesHubData {
  games: GameWithStats[];
  userCurrency: UserCurrency;
  recentSessions: GameSession[];
  dailyBonusClaimed: boolean;
}

export interface GameStatsResponse {
  gameCode: string;
  totalPlays: number;
  bestScore: number;
  bestCombo: number;
  bestAccuracy: number | null;
  averageScore: number;
  totalXpEarned: number;
  achievements: UserGameAchievement[];
}

// ============================================================
// Word Rush Specific Types
// ============================================================

export interface WordRushQuestion {
  vocabularyId: number;
  question: string; // Vietnamese word
  correctAnswer: string; // English word
  options: string[]; // 4 options including correct answer
}

export interface WordRushState {
  questions: WordRushQuestion[];
  currentQuestionIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  correctCount: number;
  wrongCount: number;
  timeRemaining: number;
  isActive: boolean;
}

// ============================================================
// Memory Match Specific Types
// ============================================================

export interface MemoryCard {
  id: number;
  vocabularyId: number;
  content: string;
  type: 'english' | 'vietnamese';
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryMatchState {
  cards: MemoryCard[];
  gridSize: number;
  flippedCards: number[];
  matchedPairs: number;
  totalPairs: number;
  moves: number;
  timeElapsed: number;
  isComplete: boolean;
}

// ============================================================
// Hangman Specific Types
// ============================================================

export interface HangmanState {
  vocabularyId: number;
  word: string;
  displayWord: string; // With underscores for unguessed letters
  hint: string; // Vietnamese translation or definition
  guessedLetters: string[];
  mistakes: number;
  maxMistakes: number;
  isWon: boolean;
  isLost: boolean;
  hintsUsed: number;
}

// ============================================================
// Spelling Bee Specific Types
// ============================================================

export interface SpellingBeeWord {
  vocabularyId: number;
  word: string;
  audioUrl: string;
  hint: string; // Vietnamese meaning
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SpellingBeeState {
  words: SpellingBeeWord[];
  currentWordIndex: number;
  userInput: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  currentAttempts: number;
  maxAttempts: number;
  timeRemaining: number;
  isComplete: boolean;
}

// ============================================================
// XP Rewards Constants
// ============================================================

export const GAME_XP_REWARDS = {
  // Base rewards
  CORRECT_ANSWER: 5,
  WRONG_ANSWER: 1,
  COMBO_BONUS: 2, // Per combo level
  PERFECT_GAME_BONUS: 50,

  // Time bonuses
  FAST_ANSWER: 3, // Under 3 seconds
  SPEED_CLEAR: 25, // Finish quickly

  // Game-specific
  WORD_RUSH_BASE: 10,
  MEMORY_MATCH_BASE: 15,
  HANGMAN_BASE: 20,
  SPELLING_BEE_BASE: 15,

  // Achievements vary by definition
} as const;

export const GAME_COIN_REWARDS = {
  GAME_COMPLETE: 10,
  PERFECT_GAME: 25,
  NEW_BEST_SCORE: 15,
  ACHIEVEMENT_UNLOCK: 50,
  DAILY_FIRST_GAME: 20,
} as const;
