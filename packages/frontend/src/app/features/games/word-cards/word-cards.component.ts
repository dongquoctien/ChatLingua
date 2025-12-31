import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CountdownComponent } from '../shared/countdown/countdown.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { ApiService, Vocabulary } from '../../../core/services/api.service';

// Card rarity types
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Word Card interface
interface WordCard {
  id: number;
  english: string;
  vietnamese: string;
  rarity: Rarity;
  power: number;
  defense: number;
  category: string;
  skill?: CardSkill;
  level: number;
  duplicates: number;
  isNew?: boolean;
}

interface CardSkill {
  name: string;
  description: string;
  effect: 'bonus_damage' | 'heal' | 'shield' | 'double_points';
  value: number;
}

// Battle state
interface BattleState {
  playerCards: WordCard[];
  opponentCards: WordCard[];
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  currentRound: number;
  totalRounds: number;
  playerSelectedCard: WordCard | null;
  opponentSelectedCard: WordCard | null;
  battlePhase: 'select' | 'question' | 'clash' | 'result';
  currentQuestion: CardQuestion | null;
  roundWinner: 'player' | 'opponent' | 'draw' | null;
  battleLog: string[];
  combo: number;
}

interface CardQuestion {
  english: string;
  options: string[];
  correctIndex: number;
}

// Gacha rates
const GACHA_RATES: Record<Rarity, number> = {
  common: 0.50,
  uncommon: 0.30,
  rare: 0.15,
  epic: 0.04,
  legendary: 0.01
};

// Rarity config
const RARITY_CONFIG: Record<Rarity, { color: string; powerRange: [number, number]; emoji: string }> = {
  common: { color: '#9CA3AF', powerRange: [10, 20], emoji: '⚪' },
  uncommon: { color: '#22C55E', powerRange: [20, 35], emoji: '🟢' },
  rare: { color: '#3B82F6', powerRange: [35, 50], emoji: '🔵' },
  epic: { color: '#A855F7', powerRange: [50, 70], emoji: '🟣' },
  legendary: { color: '#F59E0B', powerRange: [70, 100], emoji: '🟡' }
};

// Card categories with skills
const CATEGORY_SKILLS: Record<string, CardSkill> = {
  'Food': { name: 'Nourish', description: 'Heal 10 HP', effect: 'heal', value: 10 },
  'Travel': { name: 'Swift Strike', description: '+15 damage', effect: 'bonus_damage', value: 15 },
  'Business': { name: 'Investment', description: 'Double points', effect: 'double_points', value: 2 },
  'Technology': { name: 'Firewall', description: 'Block 20 damage', effect: 'shield', value: 20 },
  'Nature': { name: 'Regenerate', description: 'Heal 15 HP', effect: 'heal', value: 15 }
};

@Component({
  selector: 'app-word-cards',
  standalone: true,
  imports: [CommonModule, CountdownComponent, GameOverDialogComponent],
  templateUrl: './word-cards.component.html',
  styleUrls: ['./word-cards.component.scss']
})
export class WordCardsComponent implements OnInit {
  // Game phases
  phase = signal<'menu' | 'collection' | 'gacha' | 'battle' | 'victory' | 'defeat'>('menu');
  showCountdown = signal(false);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Player collection
  collection = signal<WordCard[]>([]);
  deck = signal<WordCard[]>([]);
  coins = signal(1000);
  gems = signal(10);

  // Gacha
  gachaPulling = signal(false);
  pulledCards = signal<WordCard[]>([]);
  showPullResult = signal(false);

  // Battle state
  battle = signal<BattleState>({
    playerCards: [],
    opponentCards: [],
    playerHp: 100,
    playerMaxHp: 100,
    opponentHp: 100,
    opponentMaxHp: 100,
    currentRound: 1,
    totalRounds: 5,
    playerSelectedCard: null,
    opponentSelectedCard: null,
    battlePhase: 'select',
    currentQuestion: null,
    roundWinner: null,
    battleLog: [],
    combo: 0
  });

  // Battle animations
  showClash = signal(false);
  clashResult = signal<'win' | 'lose' | 'draw'>('draw');
  selectedAnswer = signal<number | null>(null);
  showFeedback = signal(false);
  answerCorrect = signal(false);

  // Game over
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Computed
  playerHpPercent = computed(() => (this.battle().playerHp / this.battle().playerMaxHp) * 100);
  opponentHpPercent = computed(() => (this.battle().opponentHp / this.battle().opponentMaxHp) * 100);

  // Score tracking
  private score = 0;
  private roundsWon = 0;
  private roundsLost = 0;
  private startTime = 0;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadCollection();
  }

  private loadCollection(): void {
    this.isLoading.set(true);

    // Fetch vocabulary from API to generate random starter deck
    this.apiService.getVocabularyForReview(20).subscribe({
      next: (vocabularies: Vocabulary[]) => {
        if (vocabularies.length >= 8) {
          // Use random vocabulary from database
          const starterCards = this.generateStarterDeckFromVocabulary(vocabularies);
          this.collection.set(starterCards);
          this.deck.set(starterCards.slice(0, 5));

          // Update Vietnamese pool from fetched vocabulary
          this.allVietnamesePool = [
            ...this.allVietnamesePool,
            ...vocabularies.map(v => v.vietnameseWord)
          ];
        } else {
          // Fallback to static words if not enough vocabulary
          const starterCards = this.generateFallbackDeck();
          this.collection.set(starterCards);
          this.deck.set(starterCards.slice(0, 5));
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback on error
        const starterCards = this.generateFallbackDeck();
        this.collection.set(starterCards);
        this.deck.set(starterCards.slice(0, 5));
        this.isLoading.set(false);
      }
    });
  }

  private generateStarterDeckFromVocabulary(vocabularies: Vocabulary[]): WordCard[] {
    // Shuffle vocabularies for randomization
    const shuffled = [...vocabularies].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 8);
    const categories = Object.keys(CATEGORY_SKILLS);

    return selected.map((vocab, idx) => {
      const category = categories[idx % categories.length];
      const rarity = this.getRandomStarterRarity();
      return this.createCard(
        vocab.id,
        vocab.englishWord,
        vocab.vietnameseWord,
        category,
        rarity
      );
    });
  }

  private getRandomStarterRarity(): Rarity {
    // Starter deck has mostly common/uncommon cards
    const rand = Math.random();
    if (rand < 0.6) return 'common';
    if (rand < 0.9) return 'uncommon';
    return 'rare';
  }

  private generateFallbackDeck(): WordCard[] {
    // Fallback with randomized static words
    const categories = Object.keys(CATEGORY_SKILLS);
    const words = [
      { en: 'Apple', vi: 'Quả táo' },
      { en: 'Travel', vi: 'Du lịch' },
      { en: 'Money', vi: 'Tiền' },
      { en: 'Computer', vi: 'Máy tính' },
      { en: 'Tree', vi: 'Cây' },
      { en: 'Water', vi: 'Nước' },
      { en: 'Book', vi: 'Sách' },
      { en: 'Phone', vi: 'Điện thoại' },
      { en: 'Sun', vi: 'Mặt trời' },
      { en: 'Moon', vi: 'Mặt trăng' },
      { en: 'Star', vi: 'Ngôi sao' },
      { en: 'Sea', vi: 'Biển' }
    ];

    // Shuffle and pick 8 random words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 8);

    return selected.map((word, idx) => {
      const category = categories[idx % categories.length];
      const rarity = this.getRandomStarterRarity();
      return this.createCard(idx + 1, word.en, word.vi, category, rarity);
    });
  }

  private createCard(id: number, english: string, vietnamese: string, category: string, rarity: Rarity): WordCard {
    const config = RARITY_CONFIG[rarity];
    const power = Math.floor(Math.random() * (config.powerRange[1] - config.powerRange[0])) + config.powerRange[0];
    const defense = Math.floor(power * 0.8);

    return {
      id,
      english,
      vietnamese,
      rarity,
      power,
      defense,
      category,
      skill: CATEGORY_SKILLS[category],
      level: 1,
      duplicates: 0
    };
  }

  // Navigation
  onBackToHub(): void {
    this.resetBattleAnimationState();
    this.router.navigate(['/games']);
  }

  goToMenu(): void {
    this.resetBattleAnimationState();
    this.phase.set('menu');
  }

  // Reset all battle animation signals to prevent state carryover
  private resetBattleAnimationState(): void {
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);
    this.answerCorrect.set(false);
    this.showClash.set(false);
    this.clashResult.set('draw');
    this.showCountdown.set(false);
    this.showGameOver.set(false);
  }

  // Collection
  openCollection(): void {
    this.resetBattleAnimationState();
    this.phase.set('collection');
  }

  selectForDeck(card: WordCard): void {
    const currentDeck = this.deck();
    if (currentDeck.includes(card)) {
      this.deck.set(currentDeck.filter(c => c.id !== card.id));
    } else if (currentDeck.length < 5) {
      this.deck.set([...currentDeck, card]);
    }
  }

  isInDeck(card: WordCard): boolean {
    return this.deck().some(c => c.id === card.id);
  }

  getRarityColor(rarity: Rarity): string {
    return RARITY_CONFIG[rarity].color;
  }

  getRarityEmoji(rarity: Rarity): string {
    return RARITY_CONFIG[rarity].emoji;
  }

  // Gacha
  openGacha(): void {
    this.resetBattleAnimationState();
    this.phase.set('gacha');
    this.showPullResult.set(false);
    this.pulledCards.set([]);
  }

  canAffordSinglePull(): boolean {
    return this.coins() >= 100;
  }

  canAffordMultiPull(): boolean {
    return this.gems() >= 10;
  }

  singlePull(): void {
    if (!this.canAffordSinglePull()) return;

    this.coins.update(c => c - 100);
    this.gachaPulling.set(true);

    setTimeout(() => {
      const card = this.generateRandomCard();
      card.isNew = true;
      this.pulledCards.set([card]);
      this.addToCollection(card);
      this.gachaPulling.set(false);
      this.showPullResult.set(true);
    }, 1500);
  }

  multiPull(): void {
    if (!this.canAffordMultiPull()) return;

    this.gems.update(g => g - 10);
    this.gachaPulling.set(true);

    setTimeout(() => {
      const cards: WordCard[] = [];
      for (let i = 0; i < 10; i++) {
        const card = this.generateRandomCard();
        card.isNew = true;
        cards.push(card);
        this.addToCollection(card);
      }
      this.pulledCards.set(cards);
      this.gachaPulling.set(false);
      this.showPullResult.set(true);
    }, 2500);
  }

  private generateRandomCard(): WordCard {
    const rand = Math.random();
    let rarity: Rarity = 'common';
    let cumulative = 0;

    for (const [r, rate] of Object.entries(GACHA_RATES) as [Rarity, number][]) {
      cumulative += rate;
      if (rand <= cumulative) {
        rarity = r;
        break;
      }
    }

    const categories = Object.keys(CATEGORY_SKILLS);
    const category = categories[Math.floor(Math.random() * categories.length)];

    const words = [
      { en: 'Mountain', vi: 'Núi' },
      { en: 'Ocean', vi: 'Đại dương' },
      { en: 'Success', vi: 'Thành công' },
      { en: 'Journey', vi: 'Hành trình' },
      { en: 'Wisdom', vi: 'Trí tuệ' },
      { en: 'Courage', vi: 'Dũng cảm' },
      { en: 'Harmony', vi: 'Hòa hợp' },
      { en: 'Adventure', vi: 'Phiêu lưu' },
      { en: 'Discovery', vi: 'Khám phá' },
      { en: 'Challenge', vi: 'Thử thách' }
    ];
    const word = words[Math.floor(Math.random() * words.length)];

    return this.createCard(
      Date.now() + Math.random(),
      word.en,
      word.vi,
      category,
      rarity
    );
  }

  private addToCollection(card: WordCard): void {
    const existing = this.collection().find(c => c.english === card.english);
    if (existing) {
      existing.duplicates++;
      if (existing.duplicates >= 3) {
        existing.level++;
        existing.power = Math.floor(existing.power * 1.1);
        existing.defense = Math.floor(existing.defense * 1.1);
        existing.duplicates = 0;
      }
    } else {
      this.collection.update(c => [...c, card]);
    }
  }

  closePullResult(): void {
    this.showPullResult.set(false);
    this.pulledCards.set([]);
  }

  // Battle
  startBattle(): void {
    if (this.deck().length < 5) {
      this.error.set('You need 5 cards in your deck to battle!');
      return;
    }

    // Reset all battle state before starting new battle
    this.resetBattleAnimationState();
    this.phase.set('battle');
    this.showCountdown.set(true);
    this.score = 0;
    this.roundsWon = 0;
    this.roundsLost = 0;
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.startTime = Date.now();
    this.initializeBattle();
  }

  private initializeBattle(): void {
    // Generate opponent deck
    const opponentCards = this.generateOpponentDeck();

    this.battle.set({
      playerCards: [...this.deck()],
      opponentCards,
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
      currentRound: 1,
      totalRounds: 5,
      playerSelectedCard: null,
      opponentSelectedCard: null,
      battlePhase: 'select',
      currentQuestion: null,
      roundWinner: null,
      battleLog: ['Battle Start! Select a card to play.'],
      combo: 0
    });
  }

  private generateOpponentDeck(): WordCard[] {
    const cards: WordCard[] = [];
    const categories = Object.keys(CATEGORY_SKILLS);
    const words = [
      { en: 'Fire', vi: 'Lửa' },
      { en: 'Ice', vi: 'Băng' },
      { en: 'Wind', vi: 'Gió' },
      { en: 'Earth', vi: 'Đất' },
      { en: 'Light', vi: 'Ánh sáng' }
    ];

    for (let i = 0; i < 5; i++) {
      const rarity = this.getRandomRarity();
      const category = categories[Math.floor(Math.random() * categories.length)];
      cards.push(this.createCard(
        1000 + i,
        words[i].en,
        words[i].vi,
        category,
        rarity
      ));
    }

    return cards;
  }

  private getRandomRarity(): Rarity {
    const rand = Math.random();
    if (rand < 0.5) return 'common';
    if (rand < 0.8) return 'uncommon';
    if (rand < 0.95) return 'rare';
    if (rand < 0.99) return 'epic';
    return 'legendary';
  }

  selectCard(card: WordCard): void {
    const current = this.battle();
    if (current.battlePhase !== 'select') return;
    if (!current.playerCards.includes(card)) return;

    // Select opponent card randomly
    const opponentCard = current.opponentCards[Math.floor(Math.random() * current.opponentCards.length)];

    // Generate question
    const question = this.generateQuestion(card);

    this.battle.update(b => ({
      ...b,
      playerSelectedCard: card,
      opponentSelectedCard: opponentCard,
      battlePhase: 'question',
      currentQuestion: question,
      battleLog: [...b.battleLog, `You played ${card.english}! Opponent played ${opponentCard.english}!`]
    }));
  }

  private generateQuestion(card: WordCard): CardQuestion {
    const correct = card.vietnamese;
    const options = [correct];

    // Get all Vietnamese words from collection and opponent cards as wrong options pool
    const allVietnameseWords = [
      ...this.collection().map(c => c.vietnamese),
      ...this.battle().opponentCards.map(c => c.vietnamese),
      ...this.allVietnamesePool
    ].filter(w => w !== correct && w.length > 0);

    // Shuffle and pick 3 unique wrong options
    const shuffled = [...new Set(allVietnameseWords)].sort(() => Math.random() - 0.5);
    for (const word of shuffled) {
      if (options.length >= 4) break;
      if (!options.includes(word)) {
        options.push(word);
      }
    }

    // Fallback if not enough words - use category-related words
    const fallbackWords = [
      'Quả táo', 'Du lịch', 'Tiền', 'Máy tính', 'Cây', 'Nước', 'Sách', 'Điện thoại',
      'Núi', 'Đại dương', 'Thành công', 'Hành trình', 'Trí tuệ', 'Dũng cảm',
      'Lửa', 'Băng', 'Gió', 'Đất', 'Ánh sáng', 'Mặt trời', 'Mặt trăng', 'Ngôi sao'
    ];
    while (options.length < 4) {
      const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      if (!options.includes(fallback)) {
        options.push(fallback);
      }
    }

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      english: card.english,
      options,
      correctIndex: options.indexOf(correct)
    };
  }

  // Pool of Vietnamese words for question options
  private allVietnamesePool: string[] = [
    'Quả táo', 'Du lịch', 'Tiền', 'Máy tính', 'Cây', 'Nước', 'Sách', 'Điện thoại',
    'Núi', 'Đại dương', 'Thành công', 'Hành trình', 'Trí tuệ', 'Dũng cảm', 'Hòa hợp',
    'Phiêu lưu', 'Khám phá', 'Thử thách', 'Lửa', 'Băng', 'Gió', 'Đất', 'Ánh sáng',
    'Mặt trời', 'Mặt trăng', 'Ngôi sao', 'Biển', 'Rừng', 'Hoa', 'Chim', 'Cá',
    'Học sinh', 'Giáo viên', 'Bác sĩ', 'Kỹ sư', 'Nghệ sĩ', 'Nhà văn', 'Ca sĩ',
    'Xe đạp', 'Ô tô', 'Máy bay', 'Tàu hỏa', 'Thuyền', 'Con đường', 'Cầu',
    'Nhà', 'Trường học', 'Bệnh viện', 'Công viên', 'Thư viện', 'Nhà hàng', 'Khách sạn'
  ];

  selectAnswer(index: number): void {
    if (this.selectedAnswer() !== null) return;

    const current = this.battle();
    if (!current.currentQuestion) return;

    this.selectedAnswer.set(index);
    this.answerCorrect.set(index === current.currentQuestion.correctIndex);
    this.showFeedback.set(true);

    setTimeout(() => {
      this.resolveClash();
    }, 1000);
  }

  private resolveClash(): void {
    const current = this.battle();
    const playerCard = current.playerSelectedCard!;
    const opponentCard = current.opponentSelectedCard!;
    const correct = this.answerCorrect();

    let playerPower = playerCard.power;
    let opponentPower = opponentCard.power;

    // Correct answer bonus
    if (correct) {
      playerPower *= 1.5;
      this.score += 100;
    } else {
      opponentPower *= 1.2;
    }

    // Apply skills
    if (playerCard.skill && correct) {
      switch (playerCard.skill.effect) {
        case 'bonus_damage':
          playerPower += playerCard.skill.value;
          break;
        case 'heal':
          this.battle.update(b => ({
            ...b,
            playerHp: Math.min(b.playerMaxHp, b.playerHp + playerCard.skill!.value)
          }));
          break;
        case 'shield':
          opponentPower = Math.max(0, opponentPower - playerCard.skill.value);
          break;
        case 'double_points':
          this.score += 100;
          break;
      }
    }

    // Determine winner
    let winner: 'player' | 'opponent' | 'draw' = 'draw';
    let damage = 0;

    if (playerPower > opponentPower) {
      winner = 'player';
      damage = Math.floor((playerPower - opponentCard.defense) * 0.5);
      this.roundsWon++;
      this.score += 50;
      this.battle.update(b => ({
        ...b,
        opponentHp: Math.max(0, b.opponentHp - damage),
        combo: b.combo + 1
      }));
    } else if (opponentPower > playerPower) {
      winner = 'opponent';
      damage = Math.floor((opponentPower - playerCard.defense) * 0.5);
      this.roundsLost++;
      this.battle.update(b => ({
        ...b,
        playerHp: Math.max(0, b.playerHp - damage),
        combo: 0
      }));
    }

    // Show clash animation
    this.clashResult.set(winner === 'player' ? 'win' : winner === 'opponent' ? 'lose' : 'draw');
    this.showClash.set(true);

    // Update battle log
    const logMessage = winner === 'player'
      ? `You win the clash! Dealt ${damage} damage!`
      : winner === 'opponent'
        ? `Opponent wins! You take ${damage} damage!`
        : 'Draw! No damage dealt.';

    this.battle.update(b => ({
      ...b,
      battlePhase: 'clash',
      roundWinner: winner,
      battleLog: [...b.battleLog, logMessage]
    }));

    // Remove used cards
    this.battle.update(b => ({
      ...b,
      playerCards: b.playerCards.filter(c => c.id !== playerCard.id),
      opponentCards: b.opponentCards.filter(c => c.id !== opponentCard.id)
    }));

    setTimeout(() => {
      this.showClash.set(false);
      this.nextRound();
    }, 2000);
  }

  private nextRound(): void {
    const current = this.battle();

    // Check for game end
    if (current.playerHp <= 0) {
      this.endBattle('defeat');
      return;
    }

    if (current.opponentHp <= 0) {
      this.endBattle('victory');
      return;
    }

    if (current.currentRound >= current.totalRounds || current.playerCards.length === 0 || current.opponentCards.length === 0) {
      // Determine winner by HP
      if (current.playerHp > current.opponentHp) {
        this.endBattle('victory');
      } else if (current.opponentHp > current.playerHp) {
        this.endBattle('defeat');
      } else {
        // Draw goes to player with more rounds won
        this.endBattle(this.roundsWon >= this.roundsLost ? 'victory' : 'defeat');
      }
      return;
    }

    // Next round
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);

    this.battle.update(b => ({
      ...b,
      currentRound: b.currentRound + 1,
      playerSelectedCard: null,
      opponentSelectedCard: null,
      battlePhase: 'select',
      currentQuestion: null,
      roundWinner: null,
      battleLog: [...b.battleLog, `Round ${b.currentRound + 1}! Select a card.`]
    }));
  }

  private endBattle(result: 'victory' | 'defeat'): void {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);

    // Calculate rewards
    const xpEarned = result === 'victory' ? this.score + 200 : Math.floor(this.score * 0.5);
    const coinsEarned = result === 'victory' ? 150 : 50;

    this.coins.update(c => c + coinsEarned);
    this.phase.set(result);

    setTimeout(() => {
      this.gameResult.set({
        score: this.score,
        xpEarned,
        coinsEarned,
        accuracy: this.roundsWon > 0 ? Math.round((this.roundsWon / (this.roundsWon + this.roundsLost)) * 100) : 0,
        wordsCorrect: this.roundsWon,
        wordsWrong: this.roundsLost,
        maxCombo: this.battle().combo,
        durationSeconds: duration,
        newAchievements: [],
        isNewBestScore: false
      });
      this.showGameOver.set(true);
    }, 2000);
  }

  onPlayAgain(): void {
    this.resetBattleAnimationState();
    this.phase.set('menu');
  }
}
