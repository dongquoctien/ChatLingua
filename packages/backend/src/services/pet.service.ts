import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { EventEmitter } from 'events';

// Types
export interface PetType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  evolutionChainId: number | null;
  evolutionStage: number;
  evolvesFromId: number | null;
  evolutionRequirement: Record<string, number> | null;
  spriteSheetUrl: string | null;
  xpMultiplier: number;
  coinMultiplier: number;
  specialAbility: string | null;
  abilityDescription: string | null;
}

export interface UserPet {
  id: number;
  userId: number;
  petTypeId: number;
  petType?: PetType;
  petTypeName?: string;
  petTypeSlug?: string;
  spriteSheetUrl?: string;
  imageUrl?: string;
  nickname: string | null;
  isActive: boolean;
  happiness: number;
  energy: number;
  hunger: number;
  hp: number;
  hpZeroSince: Date | null;
  isDead: boolean;
  diedAt: Date | null;
  experience: number;
  level: number;
  currentStage: number;
  evolutionProgress: Record<string, number> | null;
  lastFedAt: Date | null;
  lastPlayedAt: Date | null;
  lastInteractionAt: Date | null;
  lastCareAt: Date | null;
  totalInteractions: number;
  streakDaysTogether: number;
  adoptedAt: Date;
  xpMultiplier?: number;
  coinMultiplier?: number;
  specialAbility?: string | null;
  abilityDescription?: string | null;
  // Egg hatching fields
  isEgg?: boolean;
  isHatched?: boolean;
  hatchXpProgress?: number;
  hatchXpRequired?: number;
  hatchHoursMin?: number;
  hatchStartedAt?: Date | null;
  // Computed fields
  secondsUntilDeath?: number | null;
}

export interface PetBonuses {
  xpMultiplier: number;
  coinMultiplier: number;
  specialAbility: string | null;
  happinessBonus: number;
}

export interface PetState {
  id: number;
  happiness: number;
  energy: number;
  hunger: number;
  hp: number;
  isDead: boolean;
  secondsUntilDeath: number | null;
  currentAnimation: string;
  statusMessage: string;
  needsAttention: boolean;
  mood: 'ecstatic' | 'happy' | 'content' | 'neutral' | 'sad' | 'miserable' | 'dying' | 'dead';
  animation: string;
  canFeed: boolean;
  canPlay: boolean;
  canPet: boolean;
  canHeal: boolean;
  nextFeedTime: string | null;
  nextPlayTime: string | null;
  nextPetTime: string | null;
  nextHealTime: string | null;
  bonuses: PetBonuses;
}

export interface CareScoreTier {
  id: number;
  minScore: number;
  maxScore: number;
  careType: 'feed' | 'play' | 'heart' | 'all';
  baseCarePoints: number;
  hpBonus: number;
  happinessBonus: number;
  energyBonus: number;
  hungerReduction: number;
  xpBonus: number;
  multiplier: number;
  tierName: string;
  tierColor: string;
}

export interface CareResult {
  success: boolean;
  careType: 'feed' | 'play' | 'heart' | 'heal';
  tier: CareScoreTier | null;
  carePoints: number;
  hpChange: number;
  happinessChange: number;
  energyChange: number;
  hungerChange: number;
  xpGained: number;
  message: string;
  pet: UserPet;
}

export interface PetItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  itemCategory: 'food' | 'toy' | 'heart' | 'accessory' | 'medicine' | 'special';
  happinessBonus: number;
  energyBonus: number;
  hungerReduction: number;
  hpBonus: number;
  experienceBonus: number;
  priceCoins: number;
  priceGems: number;
  rarity: string;
  iconUrl: string | null;
  weeklyStock: number | null;
  currentStock: number | null;
  stockResetAt: string | null;
}

export interface UserPetItem {
  id: number;
  userId: number;
  petItemId: number;
  quantity: number;
  petItem?: PetItem;
  // Flattened fields from JOIN query
  name?: string;
  slug?: string;
  description?: string | null;
  itemCategory?: 'food' | 'toy' | 'heart' | 'accessory' | 'medicine' | 'special';
  happinessBonus?: number;
  energyBonus?: number;
  hungerReduction?: number;
  priceCoins?: number;
  rarity?: string;
  iconUrl?: string | null;
}

export type PetActivity = 'feed' | 'play' | 'pet' | 'train' | 'walk' | 'gift' | 'evolve' | 'learn_together' | 'heal' | 'revive' | 'death';

export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'weapon' | 'back' | 'feet';
export type AcquisitionType = 'shop' | 'achievement' | 'event' | 'starter_free';

export interface PetEquipmentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  equipmentSlot: EquipmentSlot;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  happinessBonus: number;
  energyBonus: number;
  xpBonusPercent: number;
  coinBonusPercent: number;
  spriteData: Record<string, any> | null;
  previewUrl: string | null;
  priceCoins: number;
  priceGems: number;
  requiredPetLevel: number;
  requiredEvolutionStage: number;
  isAvailable: boolean;
}

export interface UserPetEquipment {
  id: number;
  userId: number;
  equipmentTypeId: number;
  equipmentType?: PetEquipmentType;
  equippedPetId: number | null;
  equippedSlot: EquipmentSlot | null;
  acquiredAt: Date;
  equippedAt: Date | null;
}

export interface ExtendedPetType extends PetType {
  acquisitionType: AcquisitionType;
  shopPriceCoins: number;
  shopPriceGems: number;
  requiredAchievement: string | null;
  equipmentSlots: string;
  isStarter: boolean;
  isEgg: boolean;
  imageUrl: string | null;
  hatchXpRequired: number;
  hatchHoursMin: number;
}

// Daily Tasks Types
export interface DailyPetTask {
  id: number;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskType: 'exercise' | 'game' | 'review' | 'social' | 'streak' | 'challenge';
  requirementType: string;
  requirementValue: number;
  rewardItemCategory: 'food' | 'toy' | 'heart' | 'medicine' | 'random';
  rewardQuantityMin: number;
  rewardQuantityMax: number;
  rewardCoins: number;
  rewardXp: number;
  icon: string | null;
  sortOrder: number;
}

export interface UserDailyTask {
  id: number;
  taskId: number;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskType: 'exercise' | 'game' | 'review' | 'social' | 'streak' | 'challenge';
  requirementType: string;
  requirementValue: number;
  rewardItemCategory: 'food' | 'toy' | 'heart' | 'medicine' | 'random';
  rewardQuantityMin: number;
  rewardQuantityMax: number;
  rewardCoins: number;
  rewardXp: number;
  icon: string | null;
  sortOrder: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: Date | null;
  rewardClaimed: boolean;
  claimedAt: Date | null;
  itemsRewarded: Array<{ itemId: number; quantity: number }> | null;
  progressPercent: number;
}

export interface TaskClaimResult {
  success: boolean;
  message: string;
  itemsRewarded: Array<{ itemId: number; itemName: string; quantity: number }>;
  coinsRewarded: number;
  xpRewarded: number;
}

export interface EggHatchResult {
  success: boolean;
  hatchedPet: UserPet;
  petType: PetType;
  message: string;
}

// Event emitter for real-time updates
export const petEvents = new EventEmitter();

class PetService {
  // ==================== Pet Types ====================

  async getPetTypes(): Promise<PetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        evolution_requirement as evolutionRequirement,
        sprite_sheet_url as spriteSheetUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription
      FROM pet_types
      WHERE is_available = TRUE
      ORDER BY evolution_chain_id, evolution_stage
    `);
    return rows as PetType[];
  }

  async getPetTypeById(id: number): Promise<PetType | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        evolution_requirement as evolutionRequirement,
        sprite_sheet_url as spriteSheetUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription
      FROM pet_types WHERE id = ?`,
      [id]
    );
    return rows[0] as PetType || null;
  }

  async getPetTypeBySlug(slug: string): Promise<PetType | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        evolution_requirement as evolutionRequirement,
        sprite_sheet_url as spriteSheetUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription
      FROM pet_types WHERE slug = ?`,
      [slug]
    );
    return rows[0] as PetType || null;
  }

  // ==================== User Pets ====================

  async getUserPets(userId: number): Promise<UserPet[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.happiness, up.energy, up.hunger,
        COALESCE(up.hp, 100) as hp,
        up.hp_zero_since as hpZeroSince,
        COALESCE(up.is_dead, FALSE) as isDead,
        up.died_at as diedAt,
        up.experience, up.level, up.current_stage as currentStage,
        up.evolution_progress as evolutionProgress,
        up.last_fed_at as lastFedAt,
        up.last_played_at as lastPlayedAt,
        up.last_interaction_at as lastInteractionAt,
        up.last_care_at as lastCareAt,
        up.total_interactions as totalInteractions,
        up.streak_days_together as streakDaysTogether,
        up.adopted_at as adoptedAt,
        up.is_hatched as isHatched,
        up.hatch_xp_progress as hatchXpProgress,
        up.hatch_started_at as hatchStartedAt,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.sprite_sheet_url as spriteSheetUrl,
        pt.image_url as imageUrl,
        pt.xp_multiplier as xpMultiplier,
        pt.coin_multiplier as coinMultiplier,
        pt.special_ability as specialAbility,
        pt.ability_description as abilityDescription,
        pt.rarity as rarity,
        pt.is_egg as isEgg,
        pt.hatch_xp_required as hatchXpRequired,
        pt.hatch_hours_min as hatchHoursMin,
        CASE
          WHEN COALESCE(up.hp, 100) = 0 AND up.hp_zero_since IS NOT NULL THEN
            GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(up.hp_zero_since, INTERVAL 24 HOUR)))
          ELSE NULL
        END as secondsUntilDeath
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND COALESCE(up.is_dead, FALSE) = FALSE
      ORDER BY up.is_active DESC, up.adopted_at DESC
    `, [userId]);
    return rows as UserPet[];
  }

  async getActivePet(userId: number): Promise<UserPet | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.happiness, up.energy, up.hunger,
        COALESCE(up.hp, 100) as hp,
        up.hp_zero_since as hpZeroSince,
        COALESCE(up.is_dead, FALSE) as isDead,
        up.died_at as diedAt,
        up.experience, up.level, up.current_stage as currentStage,
        up.evolution_progress as evolutionProgress,
        up.last_fed_at as lastFedAt,
        up.last_played_at as lastPlayedAt,
        up.last_interaction_at as lastInteractionAt,
        up.last_care_at as lastCareAt,
        up.total_interactions as totalInteractions,
        up.streak_days_together as streakDaysTogether,
        up.adopted_at as adoptedAt,
        up.is_hatched as isHatched,
        up.hatch_xp_progress as hatchXpProgress,
        up.hatch_started_at as hatchStartedAt,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.sprite_sheet_url as spriteSheetUrl,
        pt.image_url as imageUrl,
        pt.xp_multiplier as xpMultiplier,
        pt.coin_multiplier as coinMultiplier,
        pt.special_ability as specialAbility,
        pt.ability_description as abilityDescription,
        pt.rarity as rarity,
        pt.is_egg as isEgg,
        pt.hatch_xp_required as hatchXpRequired,
        pt.hatch_hours_min as hatchHoursMin,
        CASE
          WHEN COALESCE(up.hp, 100) = 0 AND up.hp_zero_since IS NOT NULL THEN
            GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(up.hp_zero_since, INTERVAL 24 HOUR)))
          ELSE NULL
        END as secondsUntilDeath
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND up.is_active = TRUE AND COALESCE(up.is_dead, FALSE) = FALSE
    `, [userId]);
    return rows[0] as UserPet || null;
  }

  async getUserPetById(userId: number, petId: number): Promise<UserPet | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.happiness, up.energy, up.hunger,
        COALESCE(up.hp, 100) as hp,
        up.hp_zero_since as hpZeroSince,
        COALESCE(up.is_dead, FALSE) as isDead,
        up.died_at as diedAt,
        up.experience, up.level, up.current_stage as currentStage,
        up.evolution_progress as evolutionProgress,
        up.last_fed_at as lastFedAt,
        up.last_played_at as lastPlayedAt,
        up.last_interaction_at as lastInteractionAt,
        up.last_care_at as lastCareAt,
        up.total_interactions as totalInteractions,
        up.streak_days_together as streakDaysTogether,
        up.adopted_at as adoptedAt,
        up.is_hatched as isHatched,
        up.hatch_xp_progress as hatchXpProgress,
        up.hatch_started_at as hatchStartedAt,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.sprite_sheet_url as spriteSheetUrl,
        pt.image_url as imageUrl,
        pt.xp_multiplier as xpMultiplier,
        pt.coin_multiplier as coinMultiplier,
        pt.special_ability as specialAbility,
        pt.ability_description as abilityDescription,
        pt.rarity as rarity,
        pt.is_egg as isEgg,
        pt.hatch_xp_required as hatchXpRequired,
        pt.hatch_hours_min as hatchHoursMin,
        CASE
          WHEN COALESCE(up.hp, 100) = 0 AND up.hp_zero_since IS NOT NULL THEN
            GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(up.hp_zero_since, INTERVAL 24 HOUR)))
          ELSE NULL
        END as secondsUntilDeath
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND up.id = ?
    `, [userId, petId]);
    return rows[0] as UserPet || null;
  }

  async adoptPet(userId: number, petTypeId: number, nickname?: string): Promise<UserPet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Deactivate current pet
      await connection.query(
        'UPDATE user_pets SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      // Create new pet
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO user_pets (user_id, pet_type_id, nickname, is_active)
        VALUES (?, ?, ?, TRUE)
      `, [userId, petTypeId, nickname || null]);

      await connection.commit();

      const pet = await this.getActivePet(userId);

      // Emit event for real-time sync
      petEvents.emit('pet:adopted', { userId, pet });

      return pet!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async setActivePet(userId: number, petId: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify pet belongs to user and is not an egg
      const [pets] = await connection.query<RowDataPacket[]>(`
        SELECT up.id, pt.is_egg as isEgg
        FROM user_pets up
        JOIN pet_types pt ON up.pet_type_id = pt.id
        WHERE up.id = ? AND up.user_id = ?
      `, [petId, userId]);

      if (pets.length === 0) {
        throw new Error('PET_NOT_FOUND');
      }

      // Check if it's an egg - eggs cannot be set as active
      if (pets[0].isEgg) {
        throw new Error('CANNOT_ACTIVATE_EGG');
      }

      // Deactivate all pets
      await connection.query(
        'UPDATE user_pets SET is_active = FALSE WHERE user_id = ?',
        [userId]
      );

      // Activate selected pet
      await connection.query(
        'UPDATE user_pets SET is_active = TRUE WHERE id = ? AND user_id = ?',
        [petId, userId]
      );

      await connection.commit();

      const pet = await this.getActivePet(userId);
      petEvents.emit('pet:switched', { userId, pet });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updatePetNickname(userId: number, petId: number, nickname: string): Promise<UserPet> {
    await pool.query(
      'UPDATE user_pets SET nickname = ? WHERE id = ? AND user_id = ?',
      [nickname, petId, userId]
    );

    const pet = await this.getUserPetById(userId, petId);
    if (!pet) throw new Error('PET_NOT_FOUND');

    petEvents.emit('pet:updated', { userId, pet });
    return pet;
  }

  // ==================== Pet State Management ====================

  async getPetState(userId: number): Promise<PetState | null> {
    const pet = await this.getActivePet(userId);
    if (!pet) return null;

    const state = await this.calculatePetState(pet);
    return state;
  }

  async calculatePetState(pet: UserPet): Promise<PetState> {
    // Calculate time-based decay
    const now = new Date();
    const hoursSinceInteraction = pet.lastInteractionAt
      ? (now.getTime() - new Date(pet.lastInteractionAt).getTime()) / (1000 * 60 * 60)
      : 24;

    const hoursSinceFed = pet.lastFedAt
      ? (now.getTime() - new Date(pet.lastFedAt).getTime()) / (1000 * 60 * 60)
      : 24;

    const hoursSincePlayed = pet.lastPlayedAt
      ? (now.getTime() - new Date(pet.lastPlayedAt).getTime()) / (1000 * 60 * 60)
      : 24;

    // Hunger increases over time (1 point per hour)
    let hunger = Math.min(100, pet.hunger + Math.floor(hoursSinceInteraction));

    // Happiness decreases if hungry or not interacted with
    let happiness = pet.happiness;
    if (hunger > 50) happiness = Math.max(0, happiness - Math.floor((hunger - 50) / 10));
    if (hoursSinceInteraction > 12) happiness = Math.max(0, happiness - 10);

    // Energy regenerates when not playing (based on time since last play, not interaction)
    // This ensures energy doesn't instantly regenerate after playing a game
    let energy = Math.min(100, pet.energy + Math.floor(hoursSincePlayed * 2));

    // HP and death state
    let hp = pet.hp ?? 100;
    const isDead = pet.isDead ?? false;
    let secondsUntilDeath: number | null = null;

    // Calculate seconds until death if HP is 0
    if (hp === 0 && pet.hpZeroSince) {
      const hpZeroTime = new Date(pet.hpZeroSince).getTime();
      const deathTime = hpZeroTime + (24 * 60 * 60 * 1000); // 24 hours
      secondsUntilDeath = Math.max(0, Math.floor((deathTime - now.getTime()) / 1000));
    }

    // Determine current animation state
    let currentAnimation = 'idle';
    let statusMessage = '';
    let needsAttention = false;

    const petName = pet.nickname || pet.petTypeName || 'Your pet';

    // Priority: dead > dying > hungry > sad > happy
    if (isDead) {
      currentAnimation = 'dead';
      statusMessage = `${petName} has passed away...`;
      needsAttention = false;
    } else if (hp === 0) {
      currentAnimation = 'dying';
      const hoursLeft = secondsUntilDeath ? Math.floor(secondsUntilDeath / 3600) : 0;
      statusMessage = `${petName} is dying! ${hoursLeft}h left to save them!`;
      needsAttention = true;
    } else if (hp < 30) {
      currentAnimation = 'sick';
      statusMessage = `${petName} is very weak! HP: ${hp}/100`;
      needsAttention = true;
    } else if (hunger > 80) {
      currentAnimation = 'sad';
      statusMessage = `${petName} is very hungry!`;
      needsAttention = true;
    } else if (happiness < 30) {
      currentAnimation = 'sad';
      statusMessage = `${petName} needs attention`;
      needsAttention = true;
    } else if (energy < 20) {
      currentAnimation = 'sleeping';
      statusMessage = `${petName} is resting`;
    } else if (happiness > 80) {
      currentAnimation = 'happy';
      statusMessage = `${petName} is very happy!`;
    }

    // Determine mood based on state
    let mood: PetState['mood'] = 'neutral';
    if (isDead) mood = 'dead';
    else if (hp === 0) mood = 'dying';
    else if (hp < 30 || happiness < 10) mood = 'miserable';
    else if (happiness >= 90) mood = 'ecstatic';
    else if (happiness >= 70) mood = 'happy';
    else if (happiness >= 50) mood = 'content';
    else if (happiness >= 30) mood = 'neutral';
    else if (happiness >= 10) mood = 'sad';
    else mood = 'miserable';

    // Cooldown calculations (1 hour between actions)
    const feedCooldownHours = 1;
    const playCooldownHours = 1;
    const petCooldownHours = 0.5;

    // Can't do anything if dead
    const canFeed = !isDead && hoursSinceFed >= feedCooldownHours;
    const canPlay = !isDead && hoursSincePlayed >= playCooldownHours && energy >= 20;
    const canPet = !isDead && hoursSinceInteraction >= petCooldownHours;
    const canHeal = !isDead && hp < 100;

    const getNextTime = (lastTime: Date | null, cooldownHours: number): string | null => {
      if (!lastTime) return null;
      const nextTime = new Date(new Date(lastTime).getTime() + cooldownHours * 60 * 60 * 1000);
      if (nextTime <= now) return null;
      return nextTime.toISOString();
    };

    // Get bonuses from pet type
    const [bonusRows] = await pool.query<RowDataPacket[]>(`
      SELECT xp_multiplier, coin_multiplier, special_ability
      FROM pet_types WHERE id = ?
    `, [pet.petTypeId]);

    // Bonuses scale with happiness (0.5-1.0), but 0 if dead/dying
    const happinessMultiplier = isDead || hp === 0 ? 0 : (0.5 + (happiness / 200));
    const baseXpMultiplier = bonusRows[0]?.xp_multiplier ?? 1;
    const baseCoinMultiplier = bonusRows[0]?.coin_multiplier ?? 1;

    const bonuses: PetBonuses = {
      xpMultiplier: baseXpMultiplier * happinessMultiplier,
      coinMultiplier: baseCoinMultiplier * happinessMultiplier,
      specialAbility: isDead ? null : (bonusRows[0]?.special_ability ?? null),
      happinessBonus: isDead ? 0 : Math.floor(happiness / 10)
    };

    return {
      id: pet.id,
      happiness,
      energy,
      hunger,
      hp,
      isDead,
      secondsUntilDeath,
      currentAnimation,
      statusMessage,
      needsAttention,
      mood,
      animation: currentAnimation,
      canFeed,
      canPlay,
      canPet,
      canHeal,
      nextFeedTime: canFeed ? null : getNextTime(pet.lastFedAt, feedCooldownHours),
      nextPlayTime: canPlay ? null : getNextTime(pet.lastPlayedAt, playCooldownHours),
      nextPetTime: canPet ? null : getNextTime(pet.lastInteractionAt, petCooldownHours),
      nextHealTime: null, // Heal has no cooldown, just requires HP < 100
      bonuses
    };
  }

  /**
   * Update HP zero tracking for death mechanic.
   * - When HP reaches 0: set hp_zero_since = NOW() (only if not already set)
   * - When HP recovers from 0: clear hp_zero_since = NULL
   * - Check if pet should die (HP=0 for 24 hours)
   */
  async updateHpZeroTracking(petId: number, currentHp: number, previousHp?: number): Promise<{ isDead: boolean; shouldNotify: boolean }> {
    const [pets] = await pool.query<RowDataPacket[]>(
      'SELECT hp, hp_zero_since, is_dead FROM user_pets WHERE id = ?',
      [petId]
    );

    if (pets.length === 0) {
      return { isDead: false, shouldNotify: false };
    }

    const pet = pets[0];
    const wasZero = previousHp === 0 || pet.hp === 0;
    const isNowZero = currentHp === 0;
    let isDead = pet.is_dead;
    let shouldNotify = false;

    if (isNowZero && !pet.hp_zero_since && !isDead) {
      // HP just reached 0, start the death timer
      await pool.query(
        'UPDATE user_pets SET hp_zero_since = NOW() WHERE id = ? AND hp_zero_since IS NULL',
        [petId]
      );
      shouldNotify = true;
    } else if (!isNowZero && pet.hp_zero_since) {
      // HP recovered, clear the death timer
      await pool.query(
        'UPDATE user_pets SET hp_zero_since = NULL WHERE id = ?',
        [petId]
      );
    }

    // Check if 24 hours have passed with HP at 0
    if (isNowZero && pet.hp_zero_since && !isDead) {
      const hpZeroTime = new Date(pet.hp_zero_since).getTime();
      const now = Date.now();
      const hoursSinceZero = (now - hpZeroTime) / (1000 * 60 * 60);

      if (hoursSinceZero >= 24) {
        // Pet dies
        await pool.query(
          'UPDATE user_pets SET is_dead = TRUE, died_at = NOW(), is_active = FALSE WHERE id = ?',
          [petId]
        );
        isDead = true;
        shouldNotify = true;
      }
    }

    return { isDead, shouldNotify };
  }

  // ==================== Pet Interactions ====================

  /**
   * UNIFIED method to use any pet item.
   * Automatically detects item category and calls appropriate handler.
   * This is the recommended endpoint for frontend - no need to know which API to call.
   */
  async useItem(userId: number, itemId: number): Promise<{ pet: UserPet; state: PetState; message: string; action: string }> {
    if (!itemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);
    if (!pet) throw new Error('NO_ACTIVE_PET');

    // Get item info to determine category
    // Query by user_pet_items.id (the inventory entry ID that frontend sends)
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity, upi.pet_item_id
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.id = ? AND upi.quantity > 0
    `, [userId, itemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');

    const item = items[0];
    const category = item.item_category;

    // Route to appropriate handler based on category
    let result: { pet: UserPet; message: string };
    let action: string;

    // Pass pet_item_id to sub-methods (they expect pet_item_id, not user_pet_items.id)
    const petItemId = item.pet_item_id;

    switch (category) {
      case 'food':
        result = await this.feedPet(userId, petItemId);
        action = 'feed';
        break;
      case 'toy':
        result = await this.playWithPet(userId, petItemId);
        action = 'play';
        break;
      case 'heart':
        result = await this.petThePet(userId, petItemId);
        action = 'pet';
        break;
      case 'medicine':
        result = await this.healPet(userId, petItemId);
        action = 'heal';
        break;
      case 'special':
        result = await this.useSpecialItem(userId, petItemId);
        action = 'special';
        break;
      default:
        throw new Error(`UNSUPPORTED_CATEGORY: ${category}`);
    }

    // Get the updated pet state to return to frontend
    const state = await this.calculatePetState(result.pet);

    return { ...result, state, action };
  }

  /**
   * Use a special item (XP Booster, Evolution Stone, etc.)
   */
  async useSpecialItem(userId: number, itemId: number): Promise<{ pet: UserPet; message: string }> {
    if (!itemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);
    if (!pet) throw new Error('NO_ACTIVE_PET');

    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.pet_item_id = ? AND upi.quantity > 0
    `, [userId, itemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');
    const item = items[0];

    if (item.item_category !== 'special') {
      throw new Error('WRONG_ITEM_CATEGORY');
    }

    const happinessBonus = item.happiness_bonus || 0;
    const experienceBonus = item.experience_bonus || 0;
    const itemName = item.name;

    // Consume item
    await pool.query(
      'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
      [userId, itemId]
    );

    // Update pet stats
    await pool.query(`
      UPDATE user_pets SET
        happiness = LEAST(100, happiness + ?),
        experience = experience + ?,
        last_interaction_at = NOW(),
        total_interactions = total_interactions + 1
      WHERE id = ?
    `, [happinessBonus, experienceBonus, pet.id]);

    // Log activity
    await this.logActivity(pet.id, 'gift', { itemId, itemName, happinessBonus, experienceBonus }, 'user');

    // Check for level up after XP gain
    await this.checkLevelUp(pet.id);

    const updatedPet = await this.getActivePet(userId);

    // Emit real-time update
    petEvents.emit('pet:updated', { userId, pet: updatedPet });

    return {
      pet: updatedPet!,
      message: `Used ${itemName} on ${pet.nickname}! +${experienceBonus} XP, +${happinessBonus} happiness`
    };
  }

  /**
   * Feed the pet using a food item from inventory.
   * REQUIRES a food item - no free feeding allowed.
   */
  async feedPet(userId: number, petItemId: number): Promise<{ pet: UserPet; message: string }> {
    if (!petItemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);
    if (!pet) throw new Error('NO_ACTIVE_PET');

    // Get and validate the food item from inventory
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.pet_item_id = ? AND upi.quantity > 0
    `, [userId, petItemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');

    const item = items[0];

    // Validate item is food category
    if (item.item_category !== 'food') {
      throw new Error('ITEM_WRONG_CATEGORY');
    }

    const hungerReduction = item.hunger_reduction || 0;
    const happinessBonus = item.happiness_bonus || 0;
    const hpBonus = item.hp_bonus || 0;
    const energyBonus = item.energy_bonus || 0;
    const itemName = item.name;

    // Consume item
    await pool.query(
      'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
      [userId, petItemId]
    );

    // Update pet stats
    await pool.query(`
      UPDATE user_pets SET
        hunger = GREATEST(0, hunger - ?),
        happiness = LEAST(100, happiness + ?),
        hp = LEAST(100, hp + ?),
        energy = LEAST(100, GREATEST(0, energy + ?)),
        last_fed_at = NOW(),
        last_interaction_at = NOW(),
        total_interactions = total_interactions + 1
      WHERE id = ?
    `, [hungerReduction, happinessBonus, hpBonus, energyBonus, pet.id]);

    // Log activity
    await this.logActivity(pet.id, 'feed', { itemId: petItemId, itemName, happinessBonus, hungerReduction, hpBonus }, 'user');

    const updatedPet = await this.getActivePet(userId);
    const state = await this.calculatePetState(updatedPet!);

    // Track HP changes for death mechanic
    await this.updateHpZeroTracking(pet.id, state.hp, pet.hp);

    // Emit real-time update
    petEvents.emit('pet:updated', { userId, pet: updatedPet, state });

    const petName = pet.nickname || pet.petTypeName || 'your pet';
    return {
      pet: updatedPet!,
      message: `Fed ${petName} a ${itemName}! -${hungerReduction} hunger, +${happinessBonus} happiness${hpBonus > 0 ? `, +${hpBonus} HP` : ''}`
    };
  }

  /**
   * Play with the pet using a toy item from inventory.
   * REQUIRES a toy item - no free playing allowed.
   */
  async playWithPet(userId: number, petItemId: number): Promise<{ pet: UserPet; xpGained: number; message: string }> {
    if (!petItemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);
    if (!pet) throw new Error('NO_ACTIVE_PET');

    const state = await this.calculatePetState(pet);
    if (state.energy < 10) {
      throw new Error('PET_TOO_TIRED');
    }

    // Get and validate the toy item from inventory
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.pet_item_id = ? AND upi.quantity > 0
    `, [userId, petItemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');

    const item = items[0];

    // Validate item is toy category
    if (item.item_category !== 'toy') {
      throw new Error('ITEM_WRONG_CATEGORY');
    }

    const happinessGain = item.happiness_bonus || 15;
    const xpGain = item.experience_bonus || 5;
    const energyCost = Math.abs(item.energy_bonus) || 15; // energy_bonus is negative for toys
    const itemName = item.name;

    // Consume item
    await pool.query(
      'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
      [userId, petItemId]
    );

    await pool.query(`
      UPDATE user_pets SET
        happiness = LEAST(100, happiness + ?),
        energy = GREATEST(0, energy - ?),
        experience = experience + ?,
        last_played_at = NOW(),
        last_interaction_at = NOW(),
        total_interactions = total_interactions + 1
      WHERE id = ?
    `, [happinessGain, energyCost, xpGain, pet.id]);

    await this.logActivity(pet.id, 'play', { itemId: petItemId, itemName, happinessGain, xpGain, energyCost }, 'user');

    // Check for level up
    await this.checkLevelUp(pet.id);

    const updatedPet = await this.getActivePet(userId);
    const newState = await this.calculatePetState(updatedPet!);

    petEvents.emit('pet:updated', { userId, pet: updatedPet, state: newState });

    const petName = pet.nickname || pet.petTypeName || 'your pet';
    return {
      pet: updatedPet!,
      xpGained: xpGain,
      message: `Played with ${petName} using ${itemName}! +${happinessGain} happiness, +${xpGain} XP`
    };
  }

  /**
   * Show love to the pet using a heart item from inventory.
   * REQUIRES a heart item - no free petting allowed.
   */
  async petThePet(userId: number, petItemId: number): Promise<{ pet: UserPet; message: string }> {
    if (!petItemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);
    if (!pet) throw new Error('NO_ACTIVE_PET');

    // Get and validate the heart item from inventory
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.pet_item_id = ? AND upi.quantity > 0
    `, [userId, petItemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');

    const item = items[0];

    // Validate item is heart category
    if (item.item_category !== 'heart') {
      throw new Error('ITEM_WRONG_CATEGORY');
    }

    const happinessGain = item.happiness_bonus || 15;
    const energyBonus = item.energy_bonus || 0;
    const hpBonus = item.hp_bonus || 0;
    const xpGain = item.experience_bonus || 0;
    const itemName = item.name;

    // Consume item
    await pool.query(
      'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
      [userId, petItemId]
    );

    await pool.query(`
      UPDATE user_pets SET
        happiness = LEAST(100, happiness + ?),
        energy = LEAST(100, energy + ?),
        hp = LEAST(100, hp + ?),
        experience = experience + ?,
        last_interaction_at = NOW(),
        total_interactions = total_interactions + 1
      WHERE id = ?
    `, [happinessGain, energyBonus, hpBonus, xpGain, pet.id]);

    await this.logActivity(pet.id, 'pet', { itemId: petItemId, itemName, happinessGain, energyBonus, hpBonus }, 'user');

    // Check for level up if XP was gained
    if (xpGain > 0) {
      await this.checkLevelUp(pet.id);
    }

    const updatedPet = await this.getActivePet(userId);
    const state = await this.calculatePetState(updatedPet!);

    // Track HP changes for death mechanic
    await this.updateHpZeroTracking(pet.id, state.hp, pet.hp);

    petEvents.emit('pet:updated', { userId, pet: updatedPet, state });

    const petName = pet.nickname || pet.petTypeName || 'Your pet';
    const bonuses = [];
    if (happinessGain > 0) bonuses.push(`+${happinessGain} happiness`);
    if (energyBonus > 0) bonuses.push(`+${energyBonus} energy`);
    if (hpBonus > 0) bonuses.push(`+${hpBonus} HP`);
    if (xpGain > 0) bonuses.push(`+${xpGain} XP`);

    return {
      pet: updatedPet!,
      message: `${petName} loves the ${itemName}! ${bonuses.join(', ')}`
    };
  }

  /**
   * Heal the pet using a medicine item from inventory.
   * REQUIRES a medicine item.
   */
  async healPet(userId: number, petItemId: number): Promise<{ pet: UserPet; message: string; revived?: boolean }> {
    if (!petItemId) throw new Error('ITEM_REQUIRED');

    const pet = await this.getActivePet(userId);

    // For resurrection scroll, allow healing dead pets
    const [items] = await pool.query<RowDataPacket[]>(`
      SELECT pi.*, upi.quantity
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.pet_item_id = ? AND upi.quantity > 0
    `, [userId, petItemId]);

    if (items.length === 0) throw new Error('ITEM_NOT_FOUND');

    const item = items[0];

    // Validate item is medicine category
    if (item.item_category !== 'medicine') {
      throw new Error('ITEM_WRONG_CATEGORY');
    }

    const isResurrectionScroll = item.slug === 'resurrection-scroll';
    let revived = false;

    // Check if we need to revive a dead pet
    if (isResurrectionScroll) {
      // Find user's most recently dead pet (within 12 hours)
      const [deadPets] = await pool.query<RowDataPacket[]>(`
        SELECT up.*, pt.name as petTypeName
        FROM user_pets up
        JOIN pet_types pt ON up.pet_type_id = pt.id
        WHERE up.user_id = ? AND up.is_dead = TRUE
          AND up.died_at > DATE_SUB(NOW(), INTERVAL 12 HOUR)
        ORDER BY up.died_at DESC
        LIMIT 1
      `, [userId]);

      if (deadPets.length === 0) {
        throw new Error('NO_DEAD_PET_TO_REVIVE');
      }

      const deadPet = deadPets[0];

      // Consume item first
      await pool.query(
        'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
        [userId, petItemId]
      );

      // Revive the pet
      await pool.query(`
        UPDATE user_pets SET
          is_dead = FALSE,
          died_at = NULL,
          hp_zero_since = NULL,
          hp = ?,
          happiness = LEAST(100, happiness + ?),
          energy = LEAST(100, energy + ?),
          hunger = GREATEST(0, hunger - ?),
          is_active = TRUE,
          last_interaction_at = NOW()
        WHERE id = ?
      `, [item.hp_bonus, item.happiness_bonus, item.energy_bonus, item.hunger_reduction, deadPet.id]);

      await this.logActivity(deadPet.id, 'revive', { itemId: petItemId, itemName: item.name }, 'user');

      const revivedPet = await this.getUserPetById(deadPet.id, userId);
      petEvents.emit('pet:revived', { userId, pet: revivedPet });

      return {
        pet: revivedPet!,
        message: `${deadPet.nickname || deadPet.petTypeName} has been revived from the dead!`,
        revived: true
      };
    }

    // Normal healing for alive pets
    if (!pet) throw new Error('NO_ACTIVE_PET');

    const hpBonus = item.hp_bonus || 0;
    const happinessBonus = item.happiness_bonus || 0;
    const energyBonus = item.energy_bonus || 0;
    const hungerReduction = item.hunger_reduction || 0;
    const xpGain = item.experience_bonus || 0;
    const itemName = item.name;

    // Consume item
    await pool.query(
      'UPDATE user_pet_items SET quantity = quantity - 1 WHERE user_id = ? AND pet_item_id = ?',
      [userId, petItemId]
    );

    await pool.query(`
      UPDATE user_pets SET
        hp = LEAST(100, hp + ?),
        happiness = LEAST(100, happiness + ?),
        energy = LEAST(100, energy + ?),
        hunger = GREATEST(0, hunger - ?),
        experience = experience + ?,
        last_interaction_at = NOW(),
        total_interactions = total_interactions + 1
      WHERE id = ?
    `, [hpBonus, happinessBonus, energyBonus, hungerReduction, xpGain, pet.id]);

    await this.logActivity(pet.id, 'heal', { itemId: petItemId, itemName, hpBonus, happinessBonus, energyBonus }, 'user');

    // Check for level up if XP was gained
    if (xpGain > 0) {
      await this.checkLevelUp(pet.id);
    }

    const updatedPet = await this.getActivePet(userId);
    const state = await this.calculatePetState(updatedPet!);

    // Track HP changes for death mechanic
    await this.updateHpZeroTracking(pet.id, state.hp, pet.hp);

    petEvents.emit('pet:updated', { userId, pet: updatedPet, state });

    const petName = pet.nickname || pet.petTypeName || 'Your pet';
    const bonuses = [];
    if (hpBonus > 0) bonuses.push(`+${hpBonus} HP`);
    if (happinessBonus > 0) bonuses.push(`+${happinessBonus} happiness`);
    if (energyBonus > 0) bonuses.push(`+${energyBonus} energy`);
    if (hungerReduction > 0) bonuses.push(`-${hungerReduction} hunger`);

    return {
      pet: updatedPet!,
      message: `Healed ${petName} with ${itemName}! ${bonuses.join(', ')}`
    };
  }

  // ==================== Learning Integration ====================

  async onLearningActivity(userId: number, activityType: string, xpEarned: number): Promise<void> {
    const pet = await this.getActivePet(userId);
    if (!pet) return;

    // Pet gains XP when user learns (3% of user XP - reduced for harder progression)
    const petXpGain = Math.floor(xpEarned * 0.03);
    // Happiness gain reduced (max 2, requires 20+ XP to get 1 happiness)
    const happinessGain = Math.min(2, Math.floor(xpEarned / 20));

    await pool.query(`
      UPDATE user_pets SET
        experience = experience + ?,
        happiness = LEAST(100, happiness + ?),
        last_interaction_at = NOW()
      WHERE id = ?
    `, [petXpGain, happinessGain, pet.id]);

    await this.logActivity(pet.id, 'learn_together', {
      activityType,
      userXp: xpEarned,
      petXp: petXpGain
    }, 'system');

    // Check for level up and evolution
    await this.checkLevelUp(pet.id);
    await this.checkEvolution(pet.id, userId);

    const updatedPet = await this.getActivePet(userId);
    petEvents.emit('pet:xp', { userId, pet: updatedPet, xpGained: petXpGain });
  }

  // ==================== Evolution System ====================

  private async checkLevelUp(petId: number): Promise<{ leveledUp: boolean; newLevel: number; levelsGained: number }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT experience, level FROM user_pets WHERE id = ?',
      [petId]
    );

    if (rows.length === 0) return { leveledUp: false, newLevel: 0, levelsGained: 0 };

    const { experience, level } = rows[0];
    let currentLevel = level;
    let levelsGained = 0;

    // Loop to handle multiple level ups at once
    // (e.g., if pet has 1954 XP but is level 1, should jump to level 7)
    while (true) {
      const xpForNextLevel = this.calculateXpForLevel(currentLevel + 1);
      if (experience >= xpForNextLevel) {
        currentLevel++;
        levelsGained++;
      } else {
        break;
      }
      // Safety: max level 100
      if (currentLevel >= 100) break;
    }

    if (levelsGained > 0) {
      await pool.query(
        'UPDATE user_pets SET level = ? WHERE id = ?',
        [currentLevel, petId]
      );
      console.log(`[Pet Level Up] Pet ${petId}: Level ${level} -> ${currentLevel} (+${levelsGained} levels)`);
      return { leveledUp: true, newLevel: currentLevel, levelsGained };
    }
    return { leveledUp: false, newLevel: level, levelsGained: 0 };
  }

  calculateXpForLevel(level: number): number {
    // XP curve: 100, 250, 500, 850, 1300, ...
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  async checkEvolution(petId: number, userId: number): Promise<{ evolved: boolean; newPetType?: PetType }> {
    const [petRows] = await pool.query<RowDataPacket[]>(`
      SELECT up.*, pt.evolution_chain_id, pt.evolution_stage
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.id = ?
    `, [petId]);

    if (petRows.length === 0) return { evolved: false };

    const pet = petRows[0];

    // Find next evolution
    const [nextEvolution] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM pet_types
      WHERE evolution_chain_id = ? AND evolution_stage = ?
    `, [pet.evolution_chain_id, pet.evolution_stage + 1]);

    if (nextEvolution.length === 0) return { evolved: false };

    const nextPetType = nextEvolution[0];
    const requirements = nextPetType.evolution_requirement || {};

    // Check requirements
    let canEvolve = true;

    if (requirements.level && pet.level < requirements.level) canEvolve = false;
    if (requirements.days_active && pet.streak_days_together < requirements.days_active) canEvolve = false;
    if (requirements.total_interactions && pet.total_interactions < requirements.total_interactions) canEvolve = false;

    if (canEvolve) {
      await pool.query(`
        UPDATE user_pets SET
          pet_type_id = ?,
          current_stage = ?,
          evolved_at = NOW()
        WHERE id = ?
      `, [nextPetType.id, nextPetType.evolution_stage, petId]);

      await this.logActivity(petId, 'evolve', {
        fromType: pet.pet_type_id,
        toType: nextPetType.id
      }, 'system');

      const newType = await this.getPetTypeById(nextPetType.id);
      petEvents.emit('pet:evolved', { userId, petId, newPetType: newType });

      return { evolved: true, newPetType: newType! };
    }

    return { evolved: false };
  }

  // ==================== Pet Bonuses ====================

  async getActivePetBonuses(userId: number): Promise<{
    xpMultiplier: number;
    coinMultiplier: number;
    specialAbility: string | null;
    abilityDescription: string | null;
  }> {
    const pet = await this.getActivePet(userId);

    if (!pet) {
      return { xpMultiplier: 1, coinMultiplier: 1, specialAbility: null, abilityDescription: null };
    }

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT xp_multiplier, coin_multiplier, special_ability, ability_description
      FROM pet_types WHERE id = ?
    `, [pet.petTypeId]);

    if (rows.length === 0) {
      return { xpMultiplier: 1, coinMultiplier: 1, specialAbility: null, abilityDescription: null };
    }

    // Bonuses scale with happiness
    const state = await this.calculatePetState(pet);
    const happinessMultiplier = 0.5 + (state.happiness / 200); // 0.5-1.0

    return {
      xpMultiplier: rows[0].xp_multiplier * happinessMultiplier,
      coinMultiplier: rows[0].coin_multiplier * happinessMultiplier,
      specialAbility: rows[0].special_ability,
      abilityDescription: rows[0].ability_description
    };
  }

  // ==================== Pet Items ====================

  async getPetItems(category?: string): Promise<PetItem[]> {
    let sql = `
      SELECT
        id, name, slug, description,
        item_category as itemCategory,
        happiness_bonus as happinessBonus,
        energy_bonus as energyBonus,
        hunger_reduction as hungerReduction,
        hp_bonus as hpBonus,
        experience_bonus as experienceBonus,
        price_coins as priceCoins,
        price_gems as priceGems,
        rarity, icon_url as iconUrl,
        weekly_stock as weeklyStock,
        current_stock as currentStock,
        stock_reset_at as stockResetAt
      FROM pet_items
      WHERE is_available = TRUE
    `;
    const params: any[] = [];

    if (category) {
      sql += ` AND item_category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY item_category, price_coins`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows as PetItem[];
  }

  async getUserPetItems(userId: number): Promise<UserPetItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        upi.id, upi.user_id as userId, upi.pet_item_id as petItemId, upi.quantity,
        pi.name, pi.slug, pi.description,
        pi.item_category as itemCategory,
        pi.happiness_bonus as happinessBonus,
        pi.energy_bonus as energyBonus,
        pi.hunger_reduction as hungerReduction,
        pi.price_coins as priceCoins,
        pi.rarity, pi.icon_url as iconUrl
      FROM user_pet_items upi
      JOIN pet_items pi ON upi.pet_item_id = pi.id
      WHERE upi.user_id = ? AND upi.quantity > 0
      ORDER BY pi.item_category, pi.name
    `, [userId]);
    return rows as UserPetItem[];
  }

  async buyPetItem(userId: number, petItemId: number, quantity: number = 1): Promise<{
    success: boolean;
    message: string;
    remainingStock?: number | null;
  }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get item details with stock info (FOR UPDATE to prevent race condition)
      const [items] = await connection.query<RowDataPacket[]>(
        'SELECT price_coins, name, weekly_stock, current_stock FROM pet_items WHERE id = ? FOR UPDATE',
        [petItemId]
      );

      if (items.length === 0) {
        throw new Error('ITEM_NOT_FOUND');
      }

      const item = items[0];
      const totalCost = item.price_coins * quantity;

      // Check stock availability (if weekly_stock is not null, it's limited)
      if (item.weekly_stock !== null) {
        if (item.current_stock === null || item.current_stock < quantity) {
          throw new Error('OUT_OF_STOCK');
        }
      }

      // Check user balance (use user_currency with FOR UPDATE to prevent race condition)
      const [userCurrency] = await connection.query<RowDataPacket[]>(
        'SELECT coins FROM user_currency WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (userCurrency.length === 0 || userCurrency[0].coins < totalCost) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Deduct coins from user_currency
      await connection.query(
        'UPDATE user_currency SET coins = coins - ?, total_coins_spent = total_coins_spent + ? WHERE user_id = ?',
        [totalCost, totalCost, userId]
      );

      // Reduce stock if limited
      let remainingStock: number | null = null;
      if (item.weekly_stock !== null) {
        await connection.query(
          'UPDATE pet_items SET current_stock = current_stock - ? WHERE id = ?',
          [quantity, petItemId]
        );
        remainingStock = item.current_stock - quantity;
      }

      // Add to inventory
      await connection.query(`
        INSERT INTO user_pet_items (user_id, pet_item_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
      `, [userId, petItemId, quantity, quantity]);

      await connection.commit();

      return {
        success: true,
        message: `Purchased ${quantity}x ${item.name} for ${totalCost} coins`,
        remainingStock
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== Pet Equipment ====================

  async getEquipmentTypes(): Promise<PetEquipmentType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        equipment_slot as equipmentSlot,
        rarity,
        happiness_bonus as happinessBonus,
        energy_bonus as energyBonus,
        xp_bonus_percent as xpBonusPercent,
        coin_bonus_percent as coinBonusPercent,
        sprite_data as spriteData,
        preview_url as previewUrl,
        price_coins as priceCoins,
        price_gems as priceGems,
        required_pet_level as requiredPetLevel,
        required_evolution_stage as requiredEvolutionStage,
        is_available as isAvailable
      FROM pet_equipment_types
      WHERE is_available = TRUE
      ORDER BY equipment_slot, price_coins
    `);
    return rows as PetEquipmentType[];
  }

  async getEquipmentBySlot(slot: EquipmentSlot): Promise<PetEquipmentType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        equipment_slot as equipmentSlot,
        rarity,
        happiness_bonus as happinessBonus,
        energy_bonus as energyBonus,
        xp_bonus_percent as xpBonusPercent,
        coin_bonus_percent as coinBonusPercent,
        sprite_data as spriteData,
        preview_url as previewUrl,
        price_coins as priceCoins,
        price_gems as priceGems,
        required_pet_level as requiredPetLevel,
        required_evolution_stage as requiredEvolutionStage,
        is_available as isAvailable
      FROM pet_equipment_types
      WHERE is_available = TRUE AND equipment_slot = ?
      ORDER BY price_coins
    `, [slot]);
    return rows as PetEquipmentType[];
  }

  async getUserEquipment(userId: number): Promise<UserPetEquipment[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        upe.id,
        upe.user_id as userId,
        upe.equipment_type_id as equipmentTypeId,
        upe.equipped_pet_id as equippedPetId,
        upe.equipped_slot as equippedSlot,
        upe.acquired_at as acquiredAt,
        upe.equipped_at as equippedAt,
        pet.name as equipmentName,
        pet.slug as equipmentSlug,
        pet.description as equipmentDescription,
        pet.equipment_slot as equipmentSlotType,
        pet.rarity,
        pet.happiness_bonus as happinessBonus,
        pet.energy_bonus as energyBonus,
        pet.xp_bonus_percent as xpBonusPercent,
        pet.coin_bonus_percent as coinBonusPercent,
        pet.sprite_data as spriteData,
        pet.preview_url as previewUrl
      FROM user_pet_equipment upe
      JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
      WHERE upe.user_id = ?
      ORDER BY pet.equipment_slot, upe.acquired_at DESC
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      equipmentTypeId: row.equipmentTypeId,
      equippedPetId: row.equippedPetId,
      equippedSlot: row.equippedSlot,
      acquiredAt: row.acquiredAt,
      equippedAt: row.equippedAt,
      equipmentType: {
        id: row.equipmentTypeId,
        name: row.equipmentName,
        slug: row.equipmentSlug,
        description: row.equipmentDescription,
        equipmentSlot: row.equipmentSlotType,
        rarity: row.rarity,
        happinessBonus: row.happinessBonus,
        energyBonus: row.energyBonus,
        xpBonusPercent: row.xpBonusPercent,
        coinBonusPercent: row.coinBonusPercent,
        spriteData: row.spriteData,
        previewUrl: row.previewUrl,
        priceCoins: 0,
        priceGems: 0,
        requiredPetLevel: 0,
        requiredEvolutionStage: 0,
        isAvailable: true
      }
    })) as UserPetEquipment[];
  }

  async getPetEquipment(userId: number, petId: number): Promise<UserPetEquipment[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        upe.id,
        upe.user_id as userId,
        upe.equipment_type_id as equipmentTypeId,
        upe.equipped_pet_id as equippedPetId,
        upe.equipped_slot as equippedSlot,
        upe.acquired_at as acquiredAt,
        upe.equipped_at as equippedAt,
        pet.name as equipmentName,
        pet.slug as equipmentSlug,
        pet.description as equipmentDescription,
        pet.equipment_slot as equipmentSlotType,
        pet.rarity,
        pet.happiness_bonus as happinessBonus,
        pet.energy_bonus as energyBonus,
        pet.xp_bonus_percent as xpBonusPercent,
        pet.coin_bonus_percent as coinBonusPercent,
        pet.sprite_data as spriteData,
        pet.preview_url as previewUrl
      FROM user_pet_equipment upe
      JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
      WHERE upe.user_id = ? AND upe.equipped_pet_id = ?
      ORDER BY pet.equipment_slot
    `, [userId, petId]);

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      equipmentTypeId: row.equipmentTypeId,
      equippedPetId: row.equippedPetId,
      equippedSlot: row.equippedSlot,
      acquiredAt: row.acquiredAt,
      equippedAt: row.equippedAt,
      equipmentType: {
        id: row.equipmentTypeId,
        name: row.equipmentName,
        slug: row.equipmentSlug,
        description: row.equipmentDescription,
        equipmentSlot: row.equipmentSlotType,
        rarity: row.rarity,
        happinessBonus: row.happinessBonus,
        energyBonus: row.energyBonus,
        xpBonusPercent: row.xpBonusPercent,
        coinBonusPercent: row.coinBonusPercent,
        spriteData: row.spriteData,
        previewUrl: row.previewUrl,
        priceCoins: 0,
        priceGems: 0,
        requiredPetLevel: 0,
        requiredEvolutionStage: 0,
        isAvailable: true
      }
    })) as UserPetEquipment[];
  }

  async buyEquipment(userId: number, equipmentTypeId: number): Promise<{ success: boolean; equipment: UserPetEquipment; message: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get equipment details
      const [equipment] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM pet_equipment_types WHERE id = ? AND is_available = TRUE',
        [equipmentTypeId]
      );

      if (equipment.length === 0) {
        throw new Error('EQUIPMENT_NOT_FOUND');
      }

      const equipItem = equipment[0];

      // Check user balance (use user_currency with FOR UPDATE to prevent race condition)
      const [userCurrency] = await connection.query<RowDataPacket[]>(
        'SELECT coins, gems FROM user_currency WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (userCurrency.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      if (userCurrency[0].coins < equipItem.price_coins) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Deduct coins from user_currency
      await connection.query(
        'UPDATE user_currency SET coins = coins - ?, total_coins_spent = total_coins_spent + ? WHERE user_id = ?',
        [equipItem.price_coins, equipItem.price_coins, userId]
      );

      // Add to user's equipment inventory
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO user_pet_equipment (user_id, equipment_type_id)
        VALUES (?, ?)
      `, [userId, equipmentTypeId]);

      await connection.commit();

      // Get the created equipment
      const userEquipment = await this.getUserEquipmentById(result.insertId);

      return {
        success: true,
        equipment: userEquipment!,
        message: `Purchased ${equipItem.name} for ${equipItem.price_coins} coins`
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUserEquipmentById(equipmentId: number): Promise<UserPetEquipment | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        upe.id,
        upe.user_id as userId,
        upe.equipment_type_id as equipmentTypeId,
        upe.equipped_pet_id as equippedPetId,
        upe.equipped_slot as equippedSlot,
        upe.acquired_at as acquiredAt,
        upe.equipped_at as equippedAt,
        pet.name as equipmentName,
        pet.slug as equipmentSlug,
        pet.description as equipmentDescription,
        pet.equipment_slot as equipmentSlotType,
        pet.rarity,
        pet.happiness_bonus as happinessBonus,
        pet.energy_bonus as energyBonus,
        pet.xp_bonus_percent as xpBonusPercent,
        pet.coin_bonus_percent as coinBonusPercent,
        pet.sprite_data as spriteData,
        pet.preview_url as previewUrl
      FROM user_pet_equipment upe
      JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
      WHERE upe.id = ?
    `, [equipmentId]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      userId: row.userId,
      equipmentTypeId: row.equipmentTypeId,
      equippedPetId: row.equippedPetId,
      equippedSlot: row.equippedSlot,
      acquiredAt: row.acquiredAt,
      equippedAt: row.equippedAt,
      equipmentType: {
        id: row.equipmentTypeId,
        name: row.equipmentName,
        slug: row.equipmentSlug,
        description: row.equipmentDescription,
        equipmentSlot: row.equipmentSlotType,
        rarity: row.rarity,
        happinessBonus: row.happinessBonus,
        energyBonus: row.energyBonus,
        xpBonusPercent: row.xpBonusPercent,
        coinBonusPercent: row.coinBonusPercent,
        spriteData: row.spriteData,
        previewUrl: row.previewUrl,
        priceCoins: 0,
        priceGems: 0,
        requiredPetLevel: 0,
        requiredEvolutionStage: 0,
        isAvailable: true
      }
    };
  }

  async equipItemToPet(userId: number, petId: number, userEquipmentId: number): Promise<{ success: boolean; message: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify pet belongs to user
      const [pets] = await connection.query<RowDataPacket[]>(
        'SELECT id, level, current_stage FROM user_pets WHERE id = ? AND user_id = ?',
        [petId, userId]
      );

      if (pets.length === 0) {
        throw new Error('PET_NOT_FOUND');
      }

      const pet = pets[0];

      // Get equipment details
      const [equipments] = await connection.query<RowDataPacket[]>(`
        SELECT upe.*, pet.equipment_slot, pet.required_pet_level, pet.required_evolution_stage, pet.name
        FROM user_pet_equipment upe
        JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
        WHERE upe.id = ? AND upe.user_id = ?
      `, [userEquipmentId, userId]);

      if (equipments.length === 0) {
        throw new Error('EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipments[0];

      // Check if already equipped to another pet
      if (equipment.equipped_pet_id !== null) {
        throw new Error('EQUIPMENT_ALREADY_EQUIPPED');
      }

      // Check pet level requirement
      if (equipment.required_pet_level > pet.level) {
        throw new Error('PET_LEVEL_TOO_LOW');
      }

      // Check evolution stage requirement
      if (equipment.required_evolution_stage > pet.current_stage) {
        throw new Error('PET_EVOLUTION_TOO_LOW');
      }

      // Unequip any existing item in the same slot
      await connection.query(`
        UPDATE user_pet_equipment
        SET equipped_pet_id = NULL, equipped_slot = NULL, equipped_at = NULL
        WHERE user_id = ? AND equipped_pet_id = ? AND equipped_slot = ?
      `, [userId, petId, equipment.equipment_slot]);

      // Equip the new item
      await connection.query(`
        UPDATE user_pet_equipment
        SET equipped_pet_id = ?, equipped_slot = ?, equipped_at = NOW()
        WHERE id = ?
      `, [petId, equipment.equipment_slot, userEquipmentId]);

      await connection.commit();

      const updatedPet = await this.getUserPetById(userId, petId);
      petEvents.emit('pet:equipment_changed', { userId, pet: updatedPet });

      return {
        success: true,
        message: `Equipped ${equipment.name} to your pet`
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async unequipItem(userId: number, userEquipmentId: number): Promise<{ success: boolean; message: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get equipment details
      const [equipments] = await connection.query<RowDataPacket[]>(`
        SELECT upe.*, pet.name
        FROM user_pet_equipment upe
        JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
        WHERE upe.id = ? AND upe.user_id = ?
      `, [userEquipmentId, userId]);

      if (equipments.length === 0) {
        throw new Error('EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipments[0];
      const petId = equipment.equipped_pet_id;

      if (!petId) {
        throw new Error('EQUIPMENT_NOT_EQUIPPED');
      }

      // Unequip the item
      await connection.query(`
        UPDATE user_pet_equipment
        SET equipped_pet_id = NULL, equipped_slot = NULL, equipped_at = NULL
        WHERE id = ?
      `, [userEquipmentId]);

      await connection.commit();

      const updatedPet = await this.getUserPetById(userId, petId);
      petEvents.emit('pet:equipment_changed', { userId, pet: updatedPet });

      return {
        success: true,
        message: `Unequipped ${equipment.name}`
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getEquipmentBonuses(userId: number, petId: number): Promise<{
    totalHappinessBonus: number;
    totalEnergyBonus: number;
    totalXpBonusPercent: number;
    totalCoinBonusPercent: number;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        SUM(pet.happiness_bonus) as totalHappinessBonus,
        SUM(pet.energy_bonus) as totalEnergyBonus,
        SUM(pet.xp_bonus_percent) as totalXpBonusPercent,
        SUM(pet.coin_bonus_percent) as totalCoinBonusPercent
      FROM user_pet_equipment upe
      JOIN pet_equipment_types pet ON upe.equipment_type_id = pet.id
      WHERE upe.user_id = ? AND upe.equipped_pet_id = ?
    `, [userId, petId]);

    return {
      totalHappinessBonus: rows[0]?.totalHappinessBonus || 0,
      totalEnergyBonus: rows[0]?.totalEnergyBonus || 0,
      totalXpBonusPercent: rows[0]?.totalXpBonusPercent || 0,
      totalCoinBonusPercent: rows[0]?.totalCoinBonusPercent || 0
    };
  }

  // ==================== Pet Acquisition (Shop/Achievement) ====================

  async getExtendedPetTypes(): Promise<ExtendedPetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        evolution_requirement as evolutionRequirement,
        sprite_sheet_url as spriteSheetUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription,
        acquisition_type as acquisitionType,
        shop_price_coins as shopPriceCoins,
        shop_price_gems as shopPriceGems,
        required_achievement as requiredAchievement,
        equipment_slots as equipmentSlots,
        is_starter as isStarter
      FROM pet_types
      WHERE is_available = TRUE
      ORDER BY acquisition_type, evolution_chain_id, evolution_stage
    `);
    return rows as ExtendedPetType[];
  }

  async getShopPets(): Promise<ExtendedPetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        sprite_sheet_url as spriteSheetUrl,
        image_url as imageUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription,
        acquisition_type as acquisitionType,
        shop_price_coins as shopPriceCoins,
        shop_price_gems as shopPriceGems,
        equipment_slots as equipmentSlots,
        is_starter as isStarter
      FROM pet_types
      WHERE is_available = TRUE
        AND is_egg = FALSE
        AND (acquisition_type = 'shop' OR acquisition_type = 'starter_free')
        AND (shop_price_coins > 0 OR shop_price_gems > 0 OR acquisition_type = 'starter_free')
        AND evolves_from_id IS NULL
      ORDER BY shop_price_coins
    `);
    return rows as ExtendedPetType[];
  }

  async getAchievementPets(): Promise<ExtendedPetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        evolution_chain_id as evolutionChainId,
        evolution_stage as evolutionStage,
        evolves_from_id as evolvesFromId,
        sprite_sheet_url as spriteSheetUrl,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription,
        acquisition_type as acquisitionType,
        required_achievement as requiredAchievement,
        equipment_slots as equipmentSlots
      FROM pet_types
      WHERE is_available = TRUE
        AND acquisition_type = 'achievement'
        AND evolves_from_id IS NULL
      ORDER BY name
    `);
    return rows as ExtendedPetType[];
  }

  /**
   * Purchase a pet directly - uses user_currency for unified currency
   */
  async purchasePet(userId: number, petTypeId: number, nickname?: string): Promise<UserPet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get pet type details
      const [petTypes] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM pet_types WHERE id = ? AND is_available = TRUE`,
        [petTypeId]
      );

      if (petTypes.length === 0) {
        throw new Error('PET_TYPE_NOT_FOUND');
      }

      const petType = petTypes[0];

      // Verify acquisition type allows purchase
      if (petType.acquisition_type === 'achievement') {
        throw new Error('PET_REQUIRES_ACHIEVEMENT');
      }

      // Check if user already has this pet type (allow multiple of same type now)
      // We removed the unique constraint for multi-pet system

      // Helper function to deduct coins using user_currency
      const deductCoins = async (amount: number) => {
        // Check coins from user_currency
        const [currencyRows] = await connection.query<RowDataPacket[]>(
          'SELECT coins, gems FROM user_currency WHERE user_id = ? FOR UPDATE',
          [userId]
        );

        if (currencyRows.length === 0) {
          throw new Error('CURRENCY_NOT_FOUND');
        }

        const currency = currencyRows[0];
        if (currency.coins < amount) {
          throw new Error('INSUFFICIENT_COINS');
        }

        // Deduct coins from user_currency
        await connection.query(`
          UPDATE user_currency
          SET coins = coins - ?,
              total_coins_spent = total_coins_spent + ?,
              updated_at = NOW()
          WHERE user_id = ?
        `, [amount, amount, userId]);
      };

      // Check coins for shop pets
      if (petType.acquisition_type === 'shop' && petType.shop_price_coins > 0) {
        await deductCoins(petType.shop_price_coins);
      }

      // Check for free starter pet eligibility
      if (petType.acquisition_type === 'starter_free') {
        const [users] = await connection.query<RowDataPacket[]>(
          'SELECT has_free_starter_pet FROM users WHERE id = ?',
          [userId]
        );

        if (users.length > 0 && users[0].has_free_starter_pet) {
          // User already claimed free starter, must pay
          if (petType.shop_price_coins > 0) {
            await deductCoins(petType.shop_price_coins);
          }
        } else {
          // Mark as claimed free starter
          await connection.query(
            'UPDATE users SET has_free_starter_pet = TRUE WHERE id = ?',
            [userId]
          );
        }
      }

      // Deactivate current pet
      await connection.query(
        'UPDATE user_pets SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      // Map acquisition_type to acquisition_source enum
      let acquisitionSource: string;
      if (petType.acquisition_type === 'starter_free') {
        acquisitionSource = 'free_starter';
      } else if (petType.shop_price_gems > 0) {
        acquisitionSource = 'shop_gems';
      } else {
        acquisitionSource = 'shop_coins';
      }

      // Create new pet with HP initialized
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO user_pets (user_id, pet_type_id, nickname, is_active, is_hatched, acquisition_source, acquisition_price, hp)
        VALUES (?, ?, ?, TRUE, TRUE, ?, ?, 100)
      `, [userId, petTypeId, nickname || null, acquisitionSource, petType.shop_price_coins || 0]);

      // Record transaction if coins were spent
      if (petType.shop_price_coins > 0) {
        const [newBalance] = await connection.query<RowDataPacket[]>(
          'SELECT coins FROM user_currency WHERE user_id = ?',
          [userId]
        );

        await connection.query(`
          INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
          VALUES (?, 'coins', ?, ?, 'pet_purchase', 'pet', ?, ?)
        `, [userId, -petType.shop_price_coins, newBalance[0]?.coins || 0, result.insertId, `Purchased pet: ${petType.name}`]);
      }

      await connection.commit();

      const pet = await this.getActivePet(userId);
      petEvents.emit('pet:adopted', { userId, pet });

      return pet!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async claimAchievementPet(userId: number, petTypeId: number, achievementCode: string, nickname?: string): Promise<UserPet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get pet type details
      const [petTypes] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM pet_types WHERE id = ? AND is_available = TRUE AND acquisition_type = 'achievement'`,
        [petTypeId]
      );

      if (petTypes.length === 0) {
        throw new Error('PET_TYPE_NOT_FOUND');
      }

      const petType = petTypes[0];

      // Verify achievement matches
      if (petType.required_achievement !== achievementCode) {
        throw new Error('WRONG_ACHIEVEMENT');
      }

      // Verify user has the achievement
      const [achievements] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM user_achievements WHERE user_id = ? AND achievement_code = ?`,
        [userId, achievementCode]
      );

      if (achievements.length === 0) {
        throw new Error('ACHIEVEMENT_NOT_UNLOCKED');
      }

      // Check if user already has this pet type
      const [existingPets] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM user_pets WHERE user_id = ? AND pet_type_id = ?',
        [userId, petTypeId]
      );

      if (existingPets.length > 0) {
        throw new Error('PET_ALREADY_OWNED');
      }

      // Deactivate current pet
      await connection.query(
        'UPDATE user_pets SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      // Create new pet
      await connection.query<ResultSetHeader>(`
        INSERT INTO user_pets (user_id, pet_type_id, nickname, is_active, acquisition_source)
        VALUES (?, ?, ?, TRUE, 'achievement')
      `, [userId, petTypeId, nickname || null]);

      await connection.commit();

      const pet = await this.getActivePet(userId);
      petEvents.emit('pet:adopted', { userId, pet });

      return pet!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async canUserClaimFreePet(userId: number): Promise<boolean> {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT has_free_starter_pet FROM users WHERE id = ?',
      [userId]
    );
    return users.length > 0 && !users[0].has_free_starter_pet;
  }

  // ==================== Activity Logging ====================

  private async logActivity(
    petId: number,
    activityType: PetActivity,
    details: Record<string, any>,
    triggerSource: string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO pet_activities (user_pet_id, activity_type, details, trigger_source)
      VALUES (?, ?, ?, ?)
    `, [petId, activityType, JSON.stringify(details), triggerSource]);
  }

  async getPetActivityHistory(petId: number, limit: number = 20): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        activity_type as activityType,
        happiness_change as happinessChange,
        energy_change as energyChange,
        hunger_change as hungerChange,
        experience_gained as experienceGained,
        trigger_source as triggerSource,
        details,
        created_at as createdAt
      FROM pet_activities
      WHERE user_pet_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [petId, limit]);
    return rows;
  }

  // ==================== Background Jobs ====================

  async processHourlyDecay(): Promise<void> {
    // Increase hunger for all active pets
    await pool.query(`
      UPDATE user_pets SET hunger = LEAST(100, hunger + 1)
      WHERE is_active = TRUE
    `);

    // Find pets that need attention
    const [needyPets] = await pool.query<RowDataPacket[]>(`
      SELECT user_id FROM user_pets
      WHERE is_active = TRUE AND (hunger > 80 OR happiness < 20)
    `);

    for (const pet of needyPets) {
      petEvents.emit('pet:needs_attention', { userId: pet.user_id });
    }
  }

  async processDailyStreak(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Update streak for active pets that were interacted with today
    await pool.query(`
      UPDATE user_pets SET
        streak_days_together = streak_days_together + 1
      WHERE is_active = TRUE
        AND DATE(last_interaction_at) = ?
    `, [today]);

    // Reset streak for pets not interacted with
    await pool.query(`
      UPDATE user_pets SET
        streak_days_together = 0
      WHERE is_active = TRUE
        AND DATE(last_interaction_at) < DATE_SUB(?, INTERVAL 1 DAY)
    `, [today]);
  }

  // ==================== Egg System ====================

  /**
   * Get all available egg types for purchase in shop
   * Only returns eggs with acquisition_type = 'shop' and price > 0
   */
  async getEggTypes(): Promise<ExtendedPetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        is_egg as isEgg,
        hatch_xp_required as hatchXpRequired,
        hatch_hours_min as hatchHoursMin,
        image_url as imageUrl,
        acquisition_type as acquisitionType,
        shop_price_coins as shopPriceCoins,
        shop_price_gems as shopPriceGems
      FROM pet_types
      WHERE is_available = TRUE
        AND is_egg = TRUE
        AND acquisition_type = 'shop'
        AND (shop_price_coins > 0 OR shop_price_gems > 0)
      ORDER BY shop_price_coins
    `);
    return rows as ExtendedPetType[];
  }

  /**
   * Alias for getEggTypes() - used by shop routes
   */
  async getAvailableEggs(): Promise<ExtendedPetType[]> {
    return this.getEggTypes();
  }

  /**
   * Get egg type by slug
   */
  async getEggTypeBySlug(slug: string): Promise<ExtendedPetType | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        is_egg as isEgg,
        hatch_xp_required as hatchXpRequired,
        hatch_hours_min as hatchHoursMin,
        image_url as imageUrl,
        acquisition_type as acquisitionType,
        shop_price_coins as shopPriceCoins,
        shop_price_gems as shopPriceGems
      FROM pet_types
      WHERE slug = ? AND is_egg = TRUE
    `, [slug]);
    return rows.length > 0 ? (rows[0] as ExtendedPetType) : null;
  }

  /**
   * Get all available pets for direct purchase (non-eggs)
   * Only returns pets with acquisition_type = 'shop' or 'starter_free' and price > 0
   */
  async getAvailablePets(): Promise<ExtendedPetType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id, name, slug, description,
        rarity as rarity,
        is_egg as isEgg,
        xp_multiplier as xpMultiplier,
        coin_multiplier as coinMultiplier,
        special_ability as specialAbility,
        ability_description as abilityDescription,
        image_url as imageUrl,
        acquisition_type as acquisitionType,
        shop_price_coins as shopPriceCoins,
        shop_price_gems as shopPriceGems
      FROM pet_types
      WHERE is_available = TRUE
        AND is_egg = FALSE
        AND (acquisition_type = 'shop' OR acquisition_type = 'starter_free')
        AND (shop_price_coins > 0 OR shop_price_gems > 0 OR acquisition_type = 'starter_free')
      ORDER BY rarity, shop_price_coins
    `);
    return rows as ExtendedPetType[];
  }

  /**
   * Purchase an egg - uses user_currency for unified currency
   */
  async purchaseEgg(userId: number, eggTypeId: number): Promise<UserPet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get egg type details
      const [eggTypes] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM pet_types WHERE id = ? AND is_available = TRUE AND is_egg = TRUE`,
        [eggTypeId]
      );

      if (eggTypes.length === 0) {
        throw new Error('EGG_TYPE_NOT_FOUND');
      }

      const eggType = eggTypes[0];

      // Check acquisition type
      if (eggType.acquisition_type === 'achievement') {
        throw new Error('EGG_REQUIRES_ACHIEVEMENT');
      }

      // Check coins from user_currency (unified currency system)
      const [currencyRows] = await connection.query<RowDataPacket[]>(
        'SELECT coins, gems FROM user_currency WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (currencyRows.length === 0) {
        throw new Error('CURRENCY_NOT_FOUND');
      }

      const currency = currencyRows[0];
      if (currency.coins < eggType.shop_price_coins) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Deduct coins from user_currency
      await connection.query(`
        UPDATE user_currency
        SET coins = coins - ?,
            total_coins_spent = total_coins_spent + ?,
            updated_at = NOW()
        WHERE user_id = ?
      `, [eggType.shop_price_coins, eggType.shop_price_coins, userId]);

      // Create egg in user_pets with HP initialized
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO user_pets (user_id, pet_type_id, is_active, is_hatched, hatch_xp_progress, hatch_started_at, hp)
        VALUES (?, ?, FALSE, FALSE, 0, NOW(), 100)
      `, [userId, eggTypeId]);

      // Get new balance for transaction log
      const [newBalance] = await connection.query<RowDataPacket[]>(
        'SELECT coins FROM user_currency WHERE user_id = ?',
        [userId]
      );

      // Record transaction
      await connection.query(`
        INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (?, 'coins', ?, ?, 'egg_purchase', 'pet_egg', ?, ?)
      `, [userId, -eggType.shop_price_coins, newBalance[0]?.coins || 0, result.insertId, `Purchased egg: ${eggType.name}`]);

      await connection.commit();

      const egg = await this.getUserPetById(userId, result.insertId);
      petEvents.emit('egg:purchased', { userId, egg });

      return egg!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addHatchXp(userId: number, userPetId: number, xpAmount: number, source: string): Promise<UserPet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get the egg
      const [eggs] = await connection.query<RowDataPacket[]>(`
        SELECT up.*, pt.hatch_xp_required, pt.is_egg
        FROM user_pets up
        JOIN pet_types pt ON up.pet_type_id = pt.id
        WHERE up.id = ? AND up.user_id = ?
      `, [userPetId, userId]);

      if (eggs.length === 0) {
        throw new Error('EGG_NOT_FOUND');
      }

      const egg = eggs[0];

      if (!egg.is_egg || egg.is_hatched) {
        throw new Error('NOT_AN_EGG');
      }

      // Add XP to egg
      const newXp = Math.min(egg.hatch_xp_progress + xpAmount, egg.hatch_xp_required);
      await connection.query(`
        UPDATE user_pets SET hatch_xp_progress = ? WHERE id = ?
      `, [newXp, userPetId]);

      await connection.commit();

      const updatedEgg = await this.getUserPetById(userId, userPetId);
      petEvents.emit('egg:xp_added', { userId, egg: updatedEgg, xpAdded: xpAmount, source });

      return updatedEgg!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addHatchXpToActiveEgg(userId: number, xpAmount: number, source: string): Promise<UserPet | null> {
    // Find the first unhatched egg
    const [eggs] = await pool.query<RowDataPacket[]>(`
      SELECT up.id
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND pt.is_egg = TRUE AND up.is_hatched = FALSE
      ORDER BY up.adopted_at ASC
      LIMIT 1
    `, [userId]);

    if (eggs.length === 0) {
      return null;
    }

    return this.addHatchXp(userId, eggs[0].id, xpAmount, source);
  }

  async canHatchEgg(userId: number, userPetId: number): Promise<{ canHatch: boolean; reason?: string }> {
    const [eggs] = await pool.query<RowDataPacket[]>(`
      SELECT up.*, pt.hatch_xp_required, pt.hatch_hours_min, pt.is_egg
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.id = ? AND up.user_id = ?
    `, [userPetId, userId]);

    if (eggs.length === 0) {
      return { canHatch: false, reason: 'EGG_NOT_FOUND' };
    }

    const egg = eggs[0];

    if (!egg.is_egg) {
      return { canHatch: false, reason: 'NOT_AN_EGG' };
    }

    if (egg.is_hatched) {
      return { canHatch: false, reason: 'ALREADY_HATCHED' };
    }

    // Check XP requirement
    if (egg.hatch_xp_progress < egg.hatch_xp_required) {
      return { canHatch: false, reason: 'INSUFFICIENT_XP' };
    }

    // Check time requirement
    if (egg.hatch_started_at) {
      const hoursElapsed = (Date.now() - new Date(egg.hatch_started_at).getTime()) / (1000 * 60 * 60);
      if (hoursElapsed < egg.hatch_hours_min) {
        return { canHatch: false, reason: 'TIME_NOT_MET' };
      }
    }

    return { canHatch: true };
  }

  async hatchEgg(userId: number, userPetId: number): Promise<EggHatchResult> {
    const canHatch = await this.canHatchEgg(userId, userPetId);
    if (!canHatch.canHatch) {
      throw new Error(canHatch.reason);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get the egg details
      const [eggs] = await connection.query<RowDataPacket[]>(`
        SELECT up.*, pt.id as eggTypeId
        FROM user_pets up
        JOIN pet_types pt ON up.pet_type_id = pt.id
        WHERE up.id = ? AND up.user_id = ?
      `, [userPetId, userId]);

      const egg = eggs[0];

      // Get random pet from hatch pool
      const newPetType = await this.getRandomPetFromEgg(egg.eggTypeId);

      if (!newPetType) {
        throw new Error('NO_PETS_IN_POOL');
      }

      // Update the user_pet to be the new hatched pet
      await connection.query(`
        UPDATE user_pets SET
          pet_type_id = ?,
          is_hatched = TRUE,
          happiness = 80,
          energy = 100,
          hunger = 0,
          level = 1,
          experience = 0,
          last_interaction_at = NOW()
        WHERE id = ?
      `, [newPetType.id, userPetId]);

      await connection.commit();

      const hatchedPet = await this.getUserPetById(userId, userPetId);

      petEvents.emit('egg:hatched', { userId, pet: hatchedPet, petType: newPetType });

      return {
        success: true,
        hatchedPet: hatchedPet!,
        petType: newPetType,
        message: `Your egg hatched into a ${newPetType.name}!`
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getRandomPetFromEgg(eggTypeId: number): Promise<PetType | null> {
    // Get all pets in the hatch pool for this egg with weights
    const [pool_entries] = await pool.query<RowDataPacket[]>(`
      SELECT ehp.pet_type_id, ehp.weight,
        pt.id, pt.name, pt.slug, pt.description,
        pt.rarity as rarity,
        pt.image_url as imageUrl,
        pt.xp_multiplier as xpMultiplier,
        pt.coin_multiplier as coinMultiplier,
        pt.special_ability as specialAbility,
        pt.ability_description as abilityDescription
      FROM egg_hatch_pool ehp
      JOIN pet_types pt ON ehp.pet_type_id = pt.id
      WHERE ehp.egg_type_id = ? AND pt.is_available = TRUE
    `, [eggTypeId]);

    if (pool_entries.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = pool_entries.reduce((sum, entry) => sum + entry.weight, 0);

    // Random selection based on weight
    let random = Math.random() * totalWeight;
    for (const entry of pool_entries) {
      random -= entry.weight;
      if (random <= 0) {
        return {
          id: entry.id,
          name: entry.name,
          slug: entry.slug,
          description: entry.description,
          rarity: entry.rarity,
          evolutionChainId: null,
          evolutionStage: 1,
          evolvesFromId: null,
          evolutionRequirement: null,
          spriteSheetUrl: entry.imageUrl,
          xpMultiplier: entry.xpMultiplier,
          coinMultiplier: entry.coinMultiplier,
          specialAbility: entry.specialAbility,
          abilityDescription: entry.abilityDescription
        };
      }
    }

    // Fallback to first entry
    const first = pool_entries[0];
    return {
      id: first.id,
      name: first.name,
      slug: first.slug,
      description: first.description,
      rarity: first.rarity,
      evolutionChainId: null,
      evolutionStage: 1,
      evolvesFromId: null,
      evolutionRequirement: null,
      spriteSheetUrl: first.imageUrl,
      xpMultiplier: first.xpMultiplier,
      coinMultiplier: first.coinMultiplier,
      specialAbility: first.specialAbility,
      abilityDescription: first.abilityDescription
    };
  }

  async getEggHatchPool(eggTypeId: number): Promise<{ petType: PetType; weight: number; probability: number }[]> {
    const [pool_entries] = await pool.query<RowDataPacket[]>(`
      SELECT ehp.weight,
        pt.id, pt.name, pt.slug, pt.description,
        pt.rarity as rarity,
        pt.image_url as imageUrl
      FROM egg_hatch_pool ehp
      JOIN pet_types pt ON ehp.pet_type_id = pt.id
      WHERE ehp.egg_type_id = ? AND pt.is_available = TRUE
      ORDER BY ehp.weight DESC
    `, [eggTypeId]);

    const totalWeight = pool_entries.reduce((sum, entry) => sum + entry.weight, 0);

    return pool_entries.map(entry => ({
      petType: {
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        description: entry.description,
        rarity: entry.rarity,
        evolutionChainId: null,
        evolutionStage: 1,
        evolvesFromId: null,
        evolutionRequirement: null,
        spriteSheetUrl: entry.imageUrl,
        xpMultiplier: 1,
        coinMultiplier: 1,
        specialAbility: null,
        abilityDescription: null
      },
      weight: entry.weight,
      probability: Math.round((entry.weight / totalWeight) * 100)
    }));
  }

  async getUserEggs(userId: number): Promise<UserPet[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.adopted_at as adoptedAt,
        up.is_hatched as isHatched,
        up.hatch_xp_progress as hatchXpProgress,
        up.hatch_started_at as hatchStartedAt,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.image_url as imageUrl,
        pt.rarity as rarity,
        pt.is_egg as isEgg,
        pt.hatch_xp_required as hatchXpRequired,
        pt.hatch_hours_min as hatchHoursMin
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND pt.is_egg = TRUE AND up.is_hatched = FALSE
      ORDER BY up.adopted_at ASC
    `, [userId]);
    return rows as UserPet[];
  }

  async getUserHatchedPets(userId: number): Promise<UserPet[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.happiness, up.energy, up.hunger,
        up.experience, up.level, up.current_stage as currentStage,
        up.evolution_progress as evolutionProgress,
        up.last_fed_at as lastFedAt,
        up.last_played_at as lastPlayedAt,
        up.last_interaction_at as lastInteractionAt,
        up.total_interactions as totalInteractions,
        up.streak_days_together as streakDaysTogether,
        up.adopted_at as adoptedAt,
        up.is_hatched as isHatched,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.image_url as imageUrl,
        pt.xp_multiplier as xpMultiplier,
        pt.coin_multiplier as coinMultiplier,
        pt.special_ability as specialAbility,
        pt.ability_description as abilityDescription,
        pt.rarity as rarity
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND (pt.is_egg = FALSE OR up.is_hatched = TRUE)
      ORDER BY up.is_active DESC, up.adopted_at DESC
    `, [userId]);
    return rows as UserPet[];
  }

  async grantEgg(userId: number, eggTypeId: number): Promise<UserPet> {
    // Grant an egg to user (for achievements/rewards)
    const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO user_pets (user_id, pet_type_id, is_active, is_hatched, hatch_xp_progress, hatch_started_at)
      VALUES (?, ?, FALSE, FALSE, 0, NOW())
    `, [userId, eggTypeId]);

    const egg = await this.getUserPetById(userId, result.insertId);
    petEvents.emit('egg:granted', { userId, egg });

    return egg!;
  }

  // ==================== Score-Based Care System ====================
  // Care actions are tied to exercise/game performance

  async getScoreTier(score: number, careType: 'feed' | 'play' | 'heart' | 'all' = 'all'): Promise<CareScoreTier | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id,
        min_score as minScore,
        max_score as maxScore,
        care_type as careType,
        base_care_points as baseCarePoints,
        hp_bonus as hpBonus,
        happiness_bonus as happinessBonus,
        energy_bonus as energyBonus,
        hunger_reduction as hungerReduction,
        xp_bonus as xpBonus,
        multiplier,
        tier_name as tierName,
        tier_color as tierColor
      FROM care_score_tiers
      WHERE ? >= min_score AND ? <= max_score
        AND (care_type = ? OR care_type = 'all')
      ORDER BY min_score DESC
      LIMIT 1
    `, [score, score, careType]);

    return rows[0] as CareScoreTier || null;
  }

  async getAllScoreTiers(): Promise<CareScoreTier[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        id,
        min_score as minScore,
        max_score as maxScore,
        care_type as careType,
        base_care_points as baseCarePoints,
        hp_bonus as hpBonus,
        happiness_bonus as happinessBonus,
        energy_bonus as energyBonus,
        hunger_reduction as hungerReduction,
        xp_bonus as xpBonus,
        multiplier,
        tier_name as tierName,
        tier_color as tierColor
      FROM care_score_tiers
      ORDER BY min_score ASC
    `);
    return rows as CareScoreTier[];
  }

  /**
   * Consume energy when starting a game
   * Called at game start, returns false if pet doesn't have enough energy
   * Default cost: 5 energy per game (range: 5-10)
   */
  async consumeEnergyForGame(userId: number, energyCost: number = 5): Promise<{ success: boolean; currentEnergy: number; message: string }> {
    const pet = await this.getActivePet(userId);
    if (!pet) {
      return { success: true, currentEnergy: 0, message: 'No active pet' };
    }

    // Check if pet has enough energy
    if (pet.energy < energyCost) {
      return {
        success: false,
        currentEnergy: pet.energy,
        message: `Not enough energy! Need ${energyCost}, have ${pet.energy}. Wait for energy to regenerate.`
      };
    }

    // Deduct energy
    await pool.query(`
      UPDATE user_pets SET
        energy = GREATEST(0, energy - ?),
        last_played_at = NOW(),
        last_interaction_at = NOW()
      WHERE id = ?
    `, [energyCost, pet.id]);

    const newEnergy = Math.max(0, pet.energy - energyCost);
    console.log(`[Pet Energy] userId=${userId}, petId=${pet.id}, consumed=${energyCost}, before=${pet.energy}, after=${newEnergy}`);

    // Emit event for real-time update
    petEvents.emit('pet:energy', { userId, pet: { ...pet, energy: newEnergy }, energyChange: -energyCost });

    return {
      success: true,
      currentEnergy: newEnergy,
      message: `Used ${energyCost} energy to play`
    };
  }

  /**
   * Process pet care based on activity score (0-100)
   * Called after completing exercises or games
   */
  async processCareFromActivity(
    userId: number,
    careType: 'feed' | 'play' | 'heart',
    sourceType: 'exercise' | 'game' | 'review',
    score: number,
    sourceId?: number
  ): Promise<CareResult> {
    console.log(`[Pet Care START] userId=${userId}, careType=${careType}, sourceType=${sourceType}, score=${score}`);

    const pet = await this.getActivePet(userId);
    if (!pet) {
      console.log(`[Pet Care] No active pet for user ${userId}`);
      throw new Error('NO_ACTIVE_PET');
    }

    console.log(`[Pet Care] Found pet: id=${pet.id}, energy=${pet.energy}, happiness=${pet.happiness}`);

    if (pet.isDead) {
      console.log(`[Pet Care] Pet ${pet.id} is dead`);
      throw new Error('PET_IS_DEAD');
    }

    // Get tier based on score
    const tier = await this.getScoreTier(score, careType);
    if (!tier) {
      console.log(`[Pet Care] No tier found, using fallback`);
      // Fallback minimum values
      return this.applyCareWithoutTier(userId, pet, careType, score, sourceType, sourceId);
    }

    // Calculate care effects with tier multiplier
    const hpChange = Math.round(tier.hpBonus * tier.multiplier);
    const happinessChange = Math.round(tier.happinessBonus * tier.multiplier);
    // Energy: only for feed/heart activities (games consume energy at start, not here)
    const energyChange = careType === 'play' ? null : Math.round(tier.energyBonus * tier.multiplier);
    const hungerChange = -Math.round(tier.hungerReduction * tier.multiplier);
    const xpGained = Math.round(tier.xpBonus * tier.multiplier);
    const carePoints = Math.round(tier.baseCarePoints * tier.multiplier);

    console.log(`[Pet Care] userId=${userId}, petId=${pet.id}, careType=${careType}, score=${score}, tier=${tier.tierName}`);

    // Track previous HP for death mechanic
    const previousHp = pet.hp ?? 100;
    const newHp = Math.min(100, Math.max(0, previousHp + hpChange));

    // Build dynamic update based on care type
    const updateFields = [
      'hp = LEAST(100, GREATEST(0, COALESCE(hp, 100) + ?))',
      'happiness = LEAST(100, GREATEST(0, happiness + ?))',
      'hunger = LEAST(100, GREATEST(0, hunger + ?))',
      'experience = experience + ?',
      'last_care_at = NOW()',
      'last_interaction_at = NOW()',
      'total_interactions = total_interactions + 1'
    ];
    const params: number[] = [hpChange, happinessChange, hungerChange, xpGained];

    // Only update energy for non-play activities (games handle energy at start)
    if (careType !== 'play' && energyChange !== null) {
      updateFields.splice(2, 0, 'energy = LEAST(100, GREATEST(0, energy + ?))');
      params.splice(2, 0, energyChange);
    }

    // Update last_played_at when careType is 'play'
    if (careType === 'play') {
      updateFields.push('last_played_at = NOW()');
    }

    await pool.query(`
      UPDATE user_pets SET
        ${updateFields.join(',\n        ')}
      WHERE id = ?
    `, [...params, pet.id]);

    console.log(`[Pet Care UPDATE] petId=${pet.id}, hpChange=${hpChange}, happinessChange=${happinessChange}, xpGained=${xpGained}`);

    // Update HP zero tracking for death mechanic
    await this.updateHpZeroTracking(pet.id, newHp, previousHp);

    // Log the care action (use 0 for energyChange if null - games handle energy at start)
    const logEnergyChange = energyChange ?? 0;
    await this.logCareAction(pet.id, userId, careType, sourceType, sourceId, score, carePoints, {
      hpChange, happinessChange, energyChange: logEnergyChange, hungerChange, xpGained
    });

    await this.checkLevelUp(pet.id);

    const updatedPet = await this.getActivePet(userId);
    petEvents.emit('pet:care', { userId, pet: updatedPet, careType, tier, score });

    const petName = pet.nickname || pet.petTypeName || 'Your pet';
    let message = '';
    switch (careType) {
      case 'feed':
        message = `Fed ${petName}! ${tier.tierName} score (+${hpChange} HP, +${happinessChange} happiness)`;
        break;
      case 'play':
        message = `Played with ${petName}! ${tier.tierName} score (+${happinessChange} happiness, +${xpGained} XP)`;
        break;
      case 'heart':
        message = `Showed ${petName} love! ${tier.tierName} score (+${hpChange} HP, +${happinessChange} happiness)`;
        break;
    }

    return {
      success: true,
      careType,
      tier,
      carePoints,
      hpChange,
      happinessChange,
      energyChange: logEnergyChange,
      hungerChange,
      xpGained,
      message,
      pet: updatedPet!
    };
  }

  private async applyCareWithoutTier(
    userId: number,
    pet: UserPet,
    careType: 'feed' | 'play' | 'heart',
    score: number,
    sourceType: 'exercise' | 'game' | 'review',
    sourceId?: number
  ): Promise<CareResult> {
    // Minimal care when no tier found (reduced for harder progression)
    const hpChange = 2;
    const happinessChange = 1;
    // Energy: only for feed/heart activities (games consume energy at start, not here)
    const energyChange = careType === 'play' ? null : 0;
    const hungerChange = -2;
    const xpGained = 2;
    const carePoints = 1;

    console.log(`[Pet Care NoTier] careType=${careType}, score=${score}, energyChange=${energyChange}`);

    // Track previous HP for death mechanic
    const previousHp = pet.hp ?? 100;
    const newHp = Math.min(100, Math.max(0, previousHp + hpChange));

    // Build dynamic update - add last_played_at for play care type
    const updateFields = [
      'hp = LEAST(100, GREATEST(0, COALESCE(hp, 100) + ?))',
      'happiness = LEAST(100, GREATEST(0, happiness + ?))',
      'hunger = LEAST(100, GREATEST(0, hunger + ?))',
      'experience = experience + ?',
      'last_care_at = NOW()',
      'last_interaction_at = NOW()',
      'total_interactions = total_interactions + 1'
    ];
    const params: (number | null)[] = [hpChange, happinessChange, hungerChange, xpGained];

    // Only update energy for non-play activities (games handle energy at start)
    if (careType !== 'play' && energyChange !== null) {
      updateFields.splice(2, 0, 'energy = LEAST(100, GREATEST(0, energy + ?))');
      params.splice(2, 0, energyChange);
    }

    // Update last_played_at when careType is 'play' (games consume energy at start)
    if (careType === 'play') {
      updateFields.push('last_played_at = NOW()');
    }

    await pool.query(`
      UPDATE user_pets SET
        ${updateFields.join(',\n        ')}
      WHERE id = ?
    `, [...params, pet.id]);

    // Update HP zero tracking for death mechanic
    await this.updateHpZeroTracking(pet.id, newHp, previousHp);

    // Log with 0 for energyChange since games handle energy at start
    const logEnergyChange = energyChange ?? 0;
    await this.logCareAction(pet.id, userId, careType, sourceType, sourceId, score, carePoints, {
      hpChange, happinessChange, energyChange: logEnergyChange, hungerChange, xpGained
    });

    const updatedPet = await this.getActivePet(userId);
    const petName = pet.nickname || pet.petTypeName || 'Your pet';

    return {
      success: true,
      careType,
      tier: null,
      carePoints,
      hpChange,
      happinessChange,
      energyChange: logEnergyChange,
      hungerChange,
      xpGained,
      message: `Cared for ${petName}! Keep practicing for better rewards!`,
      pet: updatedPet!
    };
  }

  private async logCareAction(
    petId: number,
    userId: number,
    careType: 'feed' | 'play' | 'heart' | 'heal',
    sourceType: 'exercise' | 'game' | 'review' | 'daily_bonus' | 'item',
    sourceId: number | undefined,
    score: number,
    carePoints: number,
    effects: { hpChange: number; happinessChange: number; energyChange: number; hungerChange: number; xpGained: number }
  ): Promise<void> {
    // Log to pet_care_log table
    await pool.query(`
      INSERT INTO pet_care_log (user_pet_id, user_id, care_type, source_type, source_id, activity_score, care_points, hp_change, happiness_change, energy_change, hunger_change, xp_gained)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [petId, userId, careType, sourceType, sourceId || null, score, carePoints, effects.hpChange, effects.happinessChange, effects.energyChange, effects.hungerChange, effects.xpGained]);

    // Also log to pet_activities
    await this.logActivity(petId, careType as PetActivity, {
      sourceType,
      sourceId,
      score,
      carePoints,
      ...effects
    }, 'user');
  }

  /**
   * Get care history for user's active pet
   */
  async getCareHistory(userId: number, limit: number = 20): Promise<any[]> {
    const pet = await this.getActivePet(userId);
    if (!pet) return [];

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        care_type as careType,
        source_type as sourceType,
        source_id as sourceId,
        activity_score as activityScore,
        care_points as carePoints,
        hp_change as hpChange,
        happiness_change as happinessChange,
        energy_change as energyChange,
        hunger_change as hungerChange,
        xp_gained as xpGained,
        created_at as createdAt
      FROM pet_care_log
      WHERE user_pet_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [pet.id, limit]);

    return rows;
  }

  /**
   * Get user's dead pets (for memorial/graveyard feature)
   */
  async getDeadPets(userId: number): Promise<UserPet[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        up.id, up.user_id as userId, up.pet_type_id as petTypeId,
        up.nickname, up.is_active as isActive,
        up.happiness, up.energy, up.hunger,
        COALESCE(up.hp, 0) as hp,
        up.hp_zero_since as hpZeroSince,
        TRUE as isDead,
        up.died_at as diedAt,
        up.experience, up.level, up.current_stage as currentStage,
        up.adopted_at as adoptedAt,
        pt.name as petTypeName,
        pt.slug as petTypeSlug,
        pt.image_url as imageUrl,
        pt.rarity as rarity
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.user_id = ? AND up.is_dead = TRUE
      ORDER BY up.died_at DESC
    `, [userId]);
    return rows as UserPet[];
  }

  /**
   * Check and mark pets as dead if HP has been 0 for 24+ hours
   * Called periodically by a scheduled job
   */
  async processDeadPets(): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(`
      UPDATE user_pets
      SET
        is_dead = TRUE,
        died_at = NOW(),
        is_active = FALSE
      WHERE
        hp = 0
        AND hp_zero_since IS NOT NULL
        AND hp_zero_since <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND is_dead = FALSE
    `);

    // Emit events for dead pets
    if (result.affectedRows > 0) {
      const [deadPets] = await pool.query<RowDataPacket[]>(`
        SELECT user_id, id FROM user_pets
        WHERE is_dead = TRUE AND died_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
      `);

      for (const pet of deadPets) {
        petEvents.emit('pet:died', { userId: pet.user_id, petId: pet.id });

        // Log death activity
        await this.logActivity(pet.id, 'death', { reason: 'hp_zero_24h' }, 'system');
      }
    }

    return result.affectedRows;
  }

  /**
   * HP decay over time - reduce HP based on inactivity
   * Called periodically by a scheduled job
   */
  async processHpDecay(): Promise<void> {
    // Reduce HP by 1 for every hour of inactivity (max 5 per run)
    await pool.query(`
      UPDATE user_pets
      SET hp = GREATEST(0, COALESCE(hp, 100) - LEAST(5, TIMESTAMPDIFF(HOUR, COALESCE(last_care_at, adopted_at), NOW())))
      WHERE is_dead = FALSE
        AND is_hatched = TRUE
        AND TIMESTAMPDIFF(HOUR, COALESCE(last_care_at, adopted_at), NOW()) > 6
    `);
  }

  // ==================== Currency Integration (use user_currency) ====================

  async getUserCurrency(userId: number): Promise<{ coins: number; gems: number }> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT coins, gems FROM user_currency WHERE user_id = ?
    `, [userId]);

    if (rows.length === 0) {
      // Initialize if not exists
      await pool.query(`
        INSERT INTO user_currency (user_id, coins, gems)
        VALUES (?, 0, 0)
        ON DUPLICATE KEY UPDATE user_id = user_id
      `, [userId]);
      return { coins: 0, gems: 0 };
    }

    return { coins: rows[0].coins, gems: rows[0].gems };
  }

  async deductCurrency(userId: number, coins: number, gems: number = 0): Promise<boolean> {
    const currency = await this.getUserCurrency(userId);

    if (currency.coins < coins || currency.gems < gems) {
      return false;
    }

    await pool.query(`
      UPDATE user_currency
      SET coins = coins - ?, gems = gems - ?,
          total_coins_spent = total_coins_spent + ?,
          total_gems_spent = total_gems_spent + ?
      WHERE user_id = ?
    `, [coins, gems, coins, gems, userId]);

    return true;
  }

  async addCurrency(userId: number, coins: number, gems: number = 0, transactionType: string = 'pet_care_reward'): Promise<void> {
    await pool.query(`
      UPDATE user_currency
      SET coins = coins + ?, gems = gems + ?,
          total_coins_earned = total_coins_earned + ?,
          total_gems_earned = total_gems_earned + ?
      WHERE user_id = ?
    `, [coins, gems, coins, gems, userId]);

    // Log transaction
    if (coins > 0) {
      const [currencyRows] = await pool.query<RowDataPacket[]>(
        'SELECT coins FROM user_currency WHERE user_id = ?',
        [userId]
      );
      await pool.query(`
        INSERT INTO currency_transactions (user_id, currency_type, amount, balance_after, transaction_type)
        VALUES (?, 'coins', ?, ?, ?)
      `, [userId, coins, currencyRows[0]?.coins || coins, transactionType]);
    }
  }

  // ============================================
  // Daily Pet Tasks Methods
  // ============================================

  /**
   * Generate a seeded random number for reproducible randomization
   * Same user + same date = same random selection
   */
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  /**
   * Weighted random selection using exponential distribution
   * Higher weight = more likely to be selected
   */
  private weightedRandomSelect<T extends { weight: number; id: number }>(
    items: T[],
    count: number,
    random: () => number,
    excludeIds: Set<number>
  ): T[] {
    const available = items.filter(item => !excludeIds.has(item.id) && item.weight > 0);
    const selected: T[] = [];

    for (let i = 0; i < count && available.length > 0; i++) {
      // Calculate selection scores using weighted random
      const scores = available.map(item => ({
        item,
        score: -Math.log(1 - random()) / item.weight
      }));

      // Sort by score (lower = selected first due to inverse relationship)
      scores.sort((a, b) => a.score - b.score);

      if (scores.length > 0) {
        const selectedItem = scores[0].item;
        selected.push(selectedItem);
        excludeIds.add(selectedItem.id);
        // Remove from available
        const idx = available.findIndex(item => item.id === selectedItem.id);
        if (idx >= 0) available.splice(idx, 1);
      }
    }

    return selected;
  }

  /**
   * Initialize daily tasks for user with random selection
   * - Always-shown tasks are always included
   * - Remaining slots filled with weighted random selection
   * - Same user + same date = same tasks (reproducible)
   */
  private async initDailyTasksRandom(userId: number, date: string): Promise<void> {
    const TARGET_TASK_COUNT = 8; // Target number of daily tasks

    // Check if tasks already exist for this date
    const [existingRows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM user_daily_pet_tasks
      WHERE user_id = ? AND task_date = ?
    `, [userId, date]);

    if (existingRows[0].count > 0) {
      return; // Tasks already initialized
    }

    // Get all available tasks with their randomization settings
    const [allTasks] = await pool.query<RowDataPacket[]>(`
      SELECT id, task_code, difficulty, weight, is_always_shown
      FROM daily_pet_tasks
      WHERE is_active = TRUE
      ORDER BY sort_order
    `);

    // Generate reproducible seed from userId + date
    const dateDiff = Math.floor((new Date(date).getTime() - new Date('2020-01-01').getTime()) / (1000 * 60 * 60 * 24));
    const seed = userId * 10000 + dateDiff;
    const random = this.seededRandom(seed);

    const selectedTaskIds = new Set<number>();
    const tasksToInsert: number[] = [];

    // Step 1: Add all always-shown tasks
    const alwaysShown = allTasks.filter(t => t.is_always_shown);
    for (const task of alwaysShown) {
      tasksToInsert.push(task.id);
      selectedTaskIds.add(task.id);
    }

    // Step 2: Add one task from each difficulty if not already included
    const difficulties = ['easy', 'medium', 'hard'] as const;
    for (const difficulty of difficulties) {
      const tasksOfDifficulty = allTasks.filter(
        t => t.difficulty === difficulty && !selectedTaskIds.has(t.id) && t.weight > 0
      );
      if (tasksOfDifficulty.length > 0) {
        const selected = this.weightedRandomSelect(
          tasksOfDifficulty.map(t => ({ id: t.id, weight: t.weight })),
          1,
          random,
          selectedTaskIds
        );
        for (const task of selected) {
          tasksToInsert.push(task.id);
        }
      }
    }

    // Step 3: Fill remaining slots with weighted random selection
    const remainingSlots = TARGET_TASK_COUNT - tasksToInsert.length;
    if (remainingSlots > 0) {
      const remainingTasks = allTasks.filter(
        t => !selectedTaskIds.has(t.id) && t.weight > 0 && t.task_code !== 'complete_all_daily'
      );
      const selected = this.weightedRandomSelect(
        remainingTasks.map(t => ({ id: t.id, weight: t.weight })),
        remainingSlots,
        random,
        selectedTaskIds
      );
      for (const task of selected) {
        tasksToInsert.push(task.id);
      }
    }

    // Step 4: Always add the "complete_all_daily" bonus task at the end
    const bonusTask = allTasks.find(t => t.task_code === 'complete_all_daily');
    if (bonusTask && !selectedTaskIds.has(bonusTask.id)) {
      tasksToInsert.push(bonusTask.id);
    }

    // Insert all selected tasks
    if (tasksToInsert.length > 0) {
      const values = tasksToInsert.map(taskId => `(${userId}, ${taskId}, '${date}')`).join(',');
      await pool.query(`
        INSERT IGNORE INTO user_daily_pet_tasks (user_id, task_id, task_date)
        VALUES ${values}
      `);
    }

    console.log(`[Pet Tasks] Initialized ${tasksToInsert.length} random daily tasks for user ${userId} on ${date}`);
  }

  async getDailyTasks(userId: number): Promise<UserDailyTask[]> {
    const today = new Date().toISOString().split('T')[0];

    // Initialize tasks for today with random selection
    await this.initDailyTasksRandom(userId, today);

    // Get user's tasks with progress (only tasks assigned to this user today)
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        udpt.id,
        dpt.id AS task_id,
        dpt.task_code,
        dpt.task_name,
        dpt.description,
        dpt.task_type,
        dpt.requirement_type,
        dpt.requirement_value,
        dpt.reward_item_category,
        dpt.reward_quantity_min,
        dpt.reward_quantity_max,
        dpt.reward_coins,
        dpt.reward_xp,
        dpt.icon,
        dpt.sort_order,
        dpt.difficulty,
        COALESCE(udpt.current_progress, 0) AS current_progress,
        COALESCE(udpt.is_completed, FALSE) AS is_completed,
        udpt.completed_at,
        COALESCE(udpt.reward_claimed, FALSE) AS reward_claimed,
        udpt.claimed_at,
        udpt.items_rewarded,
        CASE
          WHEN dpt.requirement_value > 0 THEN ROUND((COALESCE(udpt.current_progress, 0) / dpt.requirement_value) * 100, 1)
          ELSE 100
        END AS progress_percent
      FROM user_daily_pet_tasks udpt
      JOIN daily_pet_tasks dpt ON udpt.task_id = dpt.id
      WHERE udpt.user_id = ? AND udpt.task_date = ? AND dpt.is_active = TRUE
      ORDER BY dpt.sort_order
    `, [userId, today]);

    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskCode: row.task_code,
      taskName: row.task_name,
      description: row.description,
      taskType: row.task_type,
      requirementType: row.requirement_type,
      requirementValue: row.requirement_value,
      rewardItemCategory: row.reward_item_category,
      rewardQuantityMin: row.reward_quantity_min,
      rewardQuantityMax: row.reward_quantity_max,
      rewardCoins: row.reward_coins,
      rewardXp: row.reward_xp,
      icon: row.icon,
      sortOrder: row.sort_order,
      currentProgress: row.current_progress,
      isCompleted: !!row.is_completed,
      completedAt: row.completed_at,
      rewardClaimed: !!row.reward_claimed,
      claimedAt: row.claimed_at,
      itemsRewarded: row.items_rewarded
        ? (typeof row.items_rewarded === 'string' ? JSON.parse(row.items_rewarded) : row.items_rewarded)
        : null,
      progressPercent: row.progress_percent
    }));
  }

  async updateTaskProgress(
    userId: number,
    taskCode: string,
    incrementBy: number = 1,
    setValue?: number
  ): Promise<{ updated: boolean; completed: boolean }> {
    const today = new Date().toISOString().split('T')[0];

    // Get task info
    const [taskRows] = await pool.query<RowDataPacket[]>(`
      SELECT id, requirement_value FROM daily_pet_tasks
      WHERE task_code = ? AND is_active = TRUE
    `, [taskCode]);

    if (taskRows.length === 0) {
      return { updated: false, completed: false };
    }

    const task = taskRows[0];

    // Initialize task for user if not exists
    await pool.query(`
      INSERT IGNORE INTO user_daily_pet_tasks (user_id, task_id, task_date)
      VALUES (?, ?, ?)
    `, [userId, task.id, today]);

    // Update progress
    let newProgress: number;
    if (setValue !== undefined) {
      newProgress = Math.min(setValue, task.requirement_value);
      await pool.query(`
        UPDATE user_daily_pet_tasks
        SET current_progress = ?,
            is_completed = (? >= ?),
            completed_at = IF(? >= ? AND completed_at IS NULL, NOW(), completed_at)
        WHERE user_id = ? AND task_id = ? AND task_date = ?
      `, [newProgress, newProgress, task.requirement_value, newProgress, task.requirement_value, userId, task.id, today]);
    } else {
      await pool.query(`
        UPDATE user_daily_pet_tasks
        SET current_progress = LEAST(current_progress + ?, ?),
            is_completed = (current_progress + ? >= ?),
            completed_at = IF(current_progress + ? >= ? AND completed_at IS NULL, NOW(), completed_at)
        WHERE user_id = ? AND task_id = ? AND task_date = ?
      `, [incrementBy, task.requirement_value, incrementBy, task.requirement_value, incrementBy, task.requirement_value, userId, task.id, today]);
    }

    // Check if now completed
    const [progressRows] = await pool.query<RowDataPacket[]>(`
      SELECT is_completed FROM user_daily_pet_tasks
      WHERE user_id = ? AND task_id = ? AND task_date = ?
    `, [userId, task.id, today]);

    return {
      updated: true,
      completed: progressRows.length > 0 && !!progressRows[0].is_completed
    };
  }

  async claimTaskReward(userId: number, taskId: number): Promise<TaskClaimResult> {
    const today = new Date().toISOString().split('T')[0];

    // Get task and progress info
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        udpt.id,
        udpt.is_completed,
        udpt.reward_claimed,
        dpt.reward_item_category,
        dpt.reward_quantity_min,
        dpt.reward_quantity_max,
        dpt.reward_coins,
        dpt.reward_xp
      FROM user_daily_pet_tasks udpt
      JOIN daily_pet_tasks dpt ON udpt.task_id = dpt.id
      WHERE udpt.user_id = ? AND udpt.task_id = ? AND udpt.task_date = ?
    `, [userId, taskId, today]);

    if (rows.length === 0) {
      return {
        success: false,
        message: 'Task not found',
        itemsRewarded: [],
        coinsRewarded: 0,
        xpRewarded: 0
      };
    }

    const taskProgress = rows[0];

    if (!taskProgress.is_completed) {
      return {
        success: false,
        message: 'Task not completed yet',
        itemsRewarded: [],
        coinsRewarded: 0,
        xpRewarded: 0
      };
    }

    if (taskProgress.reward_claimed) {
      return {
        success: false,
        message: 'Reward already claimed',
        itemsRewarded: [],
        coinsRewarded: 0,
        xpRewarded: 0
      };
    }

    // Calculate random quantity
    const quantity = Math.floor(
      Math.random() * (taskProgress.reward_quantity_max - taskProgress.reward_quantity_min + 1)
    ) + taskProgress.reward_quantity_min;

    // Get random item from category
    let itemCategory = taskProgress.reward_item_category;
    if (itemCategory === 'random') {
      const categories = ['food', 'toy', 'heart', 'medicine'];
      itemCategory = categories[Math.floor(Math.random() * categories.length)];
    }

    // Get available items from the category
    const [itemRows] = await pool.query<RowDataPacket[]>(`
      SELECT id, name FROM pet_items
      WHERE item_category = ? AND is_available = TRUE
      ORDER BY RAND()
      LIMIT 1
    `, [itemCategory]);

    const itemsRewarded: Array<{ itemId: number; itemName: string; quantity: number }> = [];

    if (itemRows.length > 0) {
      const item = itemRows[0];

      // Add item to user's inventory
      await pool.query(`
        INSERT INTO user_pet_items (user_id, pet_item_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
      `, [userId, item.id, quantity, quantity]);

      itemsRewarded.push({
        itemId: item.id,
        itemName: item.name,
        quantity
      });
    }

    // Add coins if any
    if (taskProgress.reward_coins > 0) {
      await this.addCurrency(userId, taskProgress.reward_coins, 0, 'daily_task_reward');
    }

    // Add XP if any (to user's gamification)
    if (taskProgress.reward_xp > 0) {
      await pool.query(`
        UPDATE user_xp SET total_xp = total_xp + ? WHERE user_id = ?
      `, [taskProgress.reward_xp, userId]);
    }

    // Mark reward as claimed
    await pool.query(`
      UPDATE user_daily_pet_tasks
      SET reward_claimed = TRUE,
          claimed_at = NOW(),
          items_rewarded = ?,
          coins_rewarded = ?,
          xp_rewarded = ?
      WHERE id = ?
    `, [JSON.stringify(itemsRewarded.map(i => ({ itemId: i.itemId, quantity: i.quantity }))),
        taskProgress.reward_coins, taskProgress.reward_xp, taskProgress.id]);

    return {
      success: true,
      message: 'Reward claimed successfully!',
      itemsRewarded,
      coinsRewarded: taskProgress.reward_coins,
      xpRewarded: taskProgress.reward_xp
    };
  }

  async getDailyTasksSummary(userId: number): Promise<{
    totalTasks: number;
    completedTasks: number;
    claimedTasks: number;
    totalCoinsAvailable: number;
    totalXpAvailable: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN udpt.is_completed THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN udpt.reward_claimed THEN 1 ELSE 0 END) AS claimed_tasks,
        SUM(CASE WHEN NOT udpt.reward_claimed THEN dpt.reward_coins ELSE 0 END) AS total_coins_available,
        SUM(CASE WHEN NOT udpt.reward_claimed THEN dpt.reward_xp ELSE 0 END) AS total_xp_available
      FROM daily_pet_tasks dpt
      LEFT JOIN user_daily_pet_tasks udpt ON dpt.id = udpt.task_id
        AND udpt.user_id = ? AND udpt.task_date = ?
      WHERE dpt.is_active = TRUE
    `, [userId, today]);

    const summary = rows[0];
    return {
      totalTasks: summary.total_tasks || 0,
      completedTasks: summary.completed_tasks || 0,
      claimedTasks: summary.claimed_tasks || 0,
      totalCoinsAvailable: summary.total_coins_available || 0,
      totalXpAvailable: summary.total_xp_available || 0
    };
  }

  // Helper method to update task progress based on activity type
  async recordActivityForTasks(
    userId: number,
    activityType: 'review' | 'exercise' | 'game' | 'challenge' | 'social',
    data: {
      count?: number;
      scorePercent?: number;
      scorePoints?: number;
      won?: boolean;
      timeMinutes?: number;
      streakDays?: number;
    }
  ): Promise<void> {
    switch (activityType) {
      case 'review':
        if (data.count) {
          await this.updateTaskProgress(userId, 'complete_5_reviews', data.count);
          await this.updateTaskProgress(userId, 'complete_10_reviews', data.count);
        }
        break;

      case 'exercise':
        if (data.scorePercent !== undefined) {
          if (data.scorePercent >= 70) {
            await this.updateTaskProgress(userId, 'score_70_exercise', undefined, 1);
          }
          if (data.scorePercent >= 90) {
            await this.updateTaskProgress(userId, 'score_90_exercise', undefined, 1);
          }
          if (data.scorePercent === 100) {
            await this.updateTaskProgress(userId, 'perfect_exercise', undefined, 1);
          }
        }
        break;

      case 'game':
        if (data.won) {
          await this.updateTaskProgress(userId, 'win_1_game', 1);
          await this.updateTaskProgress(userId, 'win_3_games', 1);
        }
        if (data.scorePoints && data.scorePoints >= 500) {
          await this.updateTaskProgress(userId, 'high_score_game', undefined, 1);
        }
        break;

      case 'challenge':
        await this.updateTaskProgress(userId, 'daily_challenge', 1);
        break;

      case 'social':
        await this.updateTaskProgress(userId, 'help_sync', 1);
        break;
    }

    // Handle streak tasks
    if (data.streakDays !== undefined) {
      if (data.streakDays >= 3) {
        await this.updateTaskProgress(userId, 'login_streak_3', undefined, 1);
      }
      if (data.streakDays >= 7) {
        await this.updateTaskProgress(userId, 'login_streak_7', undefined, 1);
      }
    }

    // Handle learning time
    if (data.timeMinutes !== undefined && data.timeMinutes >= 10) {
      await this.updateTaskProgress(userId, 'learning_10min', undefined, 1);
    }

    // Check if all tasks completed for "complete_all_daily" task
    const summary = await this.getDailyTasksSummary(userId);
    // Exclude the "complete_all_daily" task itself from the count
    if (summary.completedTasks >= summary.totalTasks - 1) {
      await this.updateTaskProgress(userId, 'complete_all_daily', undefined, 1);
    }
  }

  // ==================== Admin / Fix Methods ====================

  /**
   * Fix levels for all pets based on their current XP.
   * This corrects any pets that have accumulated XP but didn't level up properly.
   */
  async fixAllPetLevels(): Promise<{ fixed: number; details: Array<{ petId: number; oldLevel: number; newLevel: number; experience: number }> }> {
    const [pets] = await pool.query<RowDataPacket[]>(
      'SELECT id, experience, level FROM user_pets'
    );

    const details: Array<{ petId: number; oldLevel: number; newLevel: number; experience: number }> = [];
    let fixed = 0;

    for (const pet of pets) {
      const result = await this.checkLevelUp(pet.id);
      if (result.leveledUp) {
        fixed++;
        details.push({
          petId: pet.id,
          oldLevel: pet.level,
          newLevel: result.newLevel,
          experience: pet.experience
        });
      }
    }

    console.log(`[Pet Level Fix] Fixed ${fixed} pets:`, details);
    return { fixed, details };
  }

  /**
   * Fix level for a specific pet based on current XP.
   */
  async fixPetLevel(petId: number): Promise<{ leveledUp: boolean; newLevel: number; levelsGained: number }> {
    return await this.checkLevelUp(petId);
  }

  // ==================== Stock Management ====================

  /**
   * Reset weekly stock for all pet items.
   * Should be called by a scheduled job every Monday.
   */
  async resetWeeklyStock(): Promise<{ resetCount: number }> {
    const [result] = await pool.query<ResultSetHeader>(`
      UPDATE pet_items
      SET current_stock = weekly_stock, stock_reset_at = NOW()
      WHERE weekly_stock IS NOT NULL
    `);

    console.log(`[Stock Reset] Reset stock for ${result.affectedRows} items`);
    return { resetCount: result.affectedRows };
  }

  /**
   * Get stock status for all items
   */
  async getStockStatus(): Promise<Array<{
    id: number;
    name: string;
    weeklyStock: number | null;
    currentStock: number | null;
    stockResetAt: string | null;
  }>> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, name, weekly_stock as weeklyStock, current_stock as currentStock, stock_reset_at as stockResetAt
      FROM pet_items
      WHERE weekly_stock IS NOT NULL
      ORDER BY rarity, item_category
    `);
    return rows as any[];
  }
}

export const petService = new PetService();
