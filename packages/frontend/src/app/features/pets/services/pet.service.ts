import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SocketService } from '../../chat/services/socket.service';

// ============================================================
// Types
// ============================================================

export type PetEvolutionStage = 'baby' | 'juvenile' | 'adult' | 'elder';

export interface PetType {
  id: number;
  slug: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  evolutionStage: PetEvolutionStage | number; // Backend returns number (1,2,3)
  evolvesFromId: number | null;
  evolvesToId: number | null;
  evolutionLevel: number | null;
  baseHappinessDecay: number;
  baseEnergyDecay: number;
  baseHungerDecay: number;
  xpMultiplier: number;
  coinMultiplier: number;
  specialAbility: string | null;
  idleAnimation: string;
  happyAnimation: string;
  sadAnimation: string;
  eatingAnimation: string;
  playingAnimation: string;
  sleepingAnimation: string;
  isUnlockable: boolean;
  unlockCondition: string | null;
  unlockAchievementId: number | null;
  isAvailable: boolean;
  sortOrder: number;
  imageUrl: string | null;
}

export interface UserPet {
  id: number;
  userId: number;
  petTypeId: number;
  petType?: PetType & EggTypeExtras;
  imageUrl?: string | null;
  nickname: string | null;
  level: number;
  experience: number;
  happiness: number;
  energy: number;
  hunger: number;
  hp: number;
  isActive: boolean;
  adoptedAt: string;
  lastFedAt: string | null;
  lastPlayedAt: string | null;
  lastPettedAt: string | null;
  totalInteractions: number;
  totalDaysActive: number;
  // Egg-related fields
  isHatched: boolean;
  hatchXpProgress: number;
  hatchStartedAt: string | null;
}

export interface EggTypeExtras {
  isEgg?: boolean;
  hatchXpRequired?: number;
  hatchHoursMin?: number;
}

export interface EggType extends PetType, EggTypeExtras {
  // Backend returns these for shop eggs
  shopPriceCoins?: number;
  shopPriceGems?: number;
  acquisitionType?: 'shop' | 'achievement' | 'event' | 'starter_free';
}

export interface EggHatchPoolItem {
  petType: PetType;
  weight: number;
  probability: number;
}

export interface EggHatchResult {
  success: boolean;
  hatchedPet: UserPet;
  petType: PetType;
  message: string;
}

export interface PetState {
  happiness: number;
  energy: number;
  hunger: number;
  hp: number;
  mood: 'ecstatic' | 'happy' | 'content' | 'neutral' | 'sad' | 'miserable';
  animation: string;
  needsAttention: boolean;
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

export interface PetBonuses {
  xpMultiplier: number;
  coinMultiplier: number;
  specialAbility: string | null;
  happinessBonus: number;
}

export interface PetInteractionResult {
  success: boolean;
  pet: UserPet;
  state: PetState;
  xpGained?: number;
  hpRestored?: number;
  message?: string;
  levelUp?: boolean;
  newLevel?: number;
  evolved?: boolean;
  newPetType?: PetType;
}

export type PetItemCategory = 'food' | 'toy' | 'heart' | 'medicine' | 'accessory' | 'special';

export interface PetItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  itemCategory: PetItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  priceCoins: number;
  priceGems: number;
  happinessBonus: number;
  energyBonus: number;
  hungerReduction: number;
  hpBonus: number;
  experienceBonus: number;
  iconUrl: string | null;
  isAvailable: boolean;
}

export interface UserPetItem {
  id: number;
  petItemId: number;
  userId: number;
  quantity: number;
  name: string;
  slug: string;
  description?: string;
  itemCategory: PetItemCategory;
  happinessBonus: number;
  energyBonus: number;
  hungerReduction: number;
  hpBonus?: number;
  priceCoins: number;
  rarity: string;
  iconUrl: string | null;
}

export interface PetActivity {
  id: number;
  petId: number;
  activityType: 'feed' | 'play' | 'pet' | 'train' | 'evolve' | 'level_up' | 'item_used';
  details: Record<string, unknown> | null;
  happinessChange: number;
  energyChange: number;
  hungerChange: number;
  xpGained: number;
  createdAt: string;
}

export interface AdoptPetResult {
  pet: UserPet;
  state: PetState;
}

export interface BuyItemResult {
  success: boolean;
  item: UserPetItem;
  newBalance: number;
  message?: string;
}

// ============================================================
// Equipment Types
// ============================================================

export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'weapon' | 'back' | 'feet';
export type AcquisitionType = 'shop' | 'achievement' | 'event' | 'starter_free';

export interface PetEquipmentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  equipmentSlot: EquipmentSlot;
  slot: EquipmentSlot; // Alias for equipmentSlot (backend sends both)
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  happinessBonus: number;
  energyBonus: number;
  xpBonusPercent: number;
  coinBonusPercent: number;
  // Alias properties for template convenience
  bonusXp?: number;
  bonusCoins?: number;
  bonusHappiness?: number;
  iconEmoji?: string;
  spriteData: Record<string, unknown> | null;
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
  acquiredAt: string;
  equippedAt: string | null;
  isEquipped?: boolean; // Computed from equippedPetId != null
}

export interface EquipmentBonuses {
  totalHappinessBonus: number;
  totalEnergyBonus: number;
  totalXpBonusPercent: number;
  totalCoinBonusPercent: number;
}

export interface ExtendedPetType extends PetType {
  acquisitionType: AcquisitionType;
  shopPriceCoins: number;
  shopPriceGems: number;
  requiredAchievement: string | null;
  equipmentSlots: string;
  isStarter: boolean;
}

export interface ShopPetsResponse {
  pets: ExtendedPetType[];
  canClaimFree: boolean;
}

// ============================================================
// Daily Tasks Types
// ============================================================

export type DailyTaskType = 'exercise' | 'game' | 'review' | 'social' | 'streak' | 'challenge';
export type RewardItemCategory = 'food' | 'toy' | 'heart' | 'medicine' | 'random';

export interface DailyPetTask {
  id: number;
  taskId: number;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskType: DailyTaskType;
  requirementType: string;
  requirementValue: number;
  rewardItemCategory: RewardItemCategory;
  rewardQuantityMin: number;
  rewardQuantityMax: number;
  rewardCoins: number;
  rewardXp: number;
  icon: string | null;
  sortOrder: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: string | null;
  rewardClaimed: boolean;
  claimedAt: string | null;
  itemsRewarded: Array<{ itemId: number; quantity: number }> | null;
  progressPercent: number;
}

export interface DailyTasksSummary {
  totalTasks: number;
  completedTasks: number;
  claimedTasks: number;
  totalCoinsAvailable: number;
  totalXpAvailable: number;
}

export interface DailyTasksResponse {
  tasks: DailyPetTask[];
  summary: DailyTasksSummary;
}

export interface TaskClaimResult {
  success: boolean;
  message: string;
  itemsRewarded: Array<{ itemId: number; itemName: string; quantity: number }>;
  coinsRewarded: number;
  xpRewarded: number;
}

export interface PurchasePetResult {
  pet: UserPet;
  state: PetState;
  success: boolean;
}

export interface BuyEquipmentResult {
  success: boolean;
  equipment: UserPetEquipment;
  message: string;
}

export interface EquipItemResult {
  success: boolean;
  message: string;
  equipment: UserPetEquipment[];
  bonuses: EquipmentBonuses;
}

// ============================================================
// Service
// ============================================================

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);
  private apiUrl = `${environment.apiUrl}/pets`;

  // Reactive state
  private _activePet = signal<UserPet | null>(null);
  private _petState = signal<PetState | null>(null);
  private _inventory = signal<UserPetItem[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly activePet = this._activePet.asReadonly();
  readonly petState = this._petState.asReadonly();
  readonly inventory = this._inventory.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly hasPet = computed(() => this._activePet() !== null);
  readonly petMood = computed(() => this._petState()?.mood ?? 'neutral');
  readonly needsAttention = computed(() => this._petState()?.needsAttention ?? false);
  readonly petAnimation = computed(() => this._petState()?.animation ?? 'idle');

  // Event callbacks for socket events
  private petStateCallbacks: ((data: { pet: UserPet; state: PetState }) => void)[] = [];
  private petXpCallbacks: ((data: { pet: UserPet; xpGained: number }) => void)[] = [];
  private petEvolvedCallbacks: ((data: { petId: number; newPetType: PetType }) => void)[] = [];
  private petNeedsAttentionCallbacks: ((data: { message: string }) => void)[] = [];

  constructor() {
    // Set up socket event listeners when socket connects
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Listen for pet events from socket
    this.socketService.onPetState((data) => {
      const pet = data.pet as UserPet;
      const state = data.state as PetState;
      this._activePet.set(pet);
      this._petState.set(state);
      this.petStateCallbacks.forEach(cb => cb({ pet, state }));
    });

    this.socketService.onPetNotifications((data) => {
      // Emit to all registered callbacks
      data.notifications.forEach(notification => {
        console.log('[Pet] Notification:', notification.message, notification.urgency);
        // Could trigger a toast/notification here
      });
    });

    this.socketService.onPetDied((data) => {
      console.log(`[Pet] ${data.petName} has died!`, data);
      // Trigger death notification to registered callbacks
    });

    this.socketService.onPetNeedsAttention((data) => {
      console.log('[Pet] Needs attention:', data.message);
      this.petNeedsAttentionCallbacks.forEach(cb => cb(data));
    });
  }

  // ==================== Pet Types ====================

  getPetTypes(): Observable<PetType[]> {
    return this.http.get<PetType[]>(`${this.apiUrl}/types`);
  }

  getPetTypeBySlug(slug: string): Observable<PetType> {
    return this.http.get<PetType>(`${this.apiUrl}/types/${slug}`);
  }

  // ==================== User Pets ====================

  // Helper to map flat API response to nested petType structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPetResponse(pet: any): UserPet {
    // If petType already exists as nested object, return as-is
    if (pet.petType && typeof pet.petType === 'object') {
      return pet as UserPet;
    }
    // Build nested petType from flat fields
    const mappedPet = {
      ...pet,
      petType: {
        id: pet.petTypeId,
        slug: pet.petTypeSlug,
        name: pet.petTypeName,
        imageUrl: pet.imageUrl,
        rarity: pet.rarity,
        xpMultiplier: pet.xpMultiplier,
        coinMultiplier: pet.coinMultiplier,
        specialAbility: pet.specialAbility,
        abilityDescription: pet.abilityDescription,
        spriteSheetUrl: pet.spriteSheetUrl,
        // Egg-related extras
        isEgg: pet.isEgg,
        hatchXpRequired: pet.hatchXpRequired,
        hatchHoursMin: pet.hatchHoursMin,
      }
    };
    return mappedPet as UserPet;
  }

  // Helper to map interaction result (also has flat pet data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapInteractionResult(result: any): any {
    return {
      ...result,
      pet: this.mapPetResponse(result.pet)
    };
  }

  getMyPets(): Observable<UserPet[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<any[]>(`${this.apiUrl}/my-pets`).pipe(
      map(pets => pets.map(pet => this.mapPetResponse(pet)))
    );
  }

  getActivePet(): Observable<{ pet: UserPet | null; state: PetState | null }> {
    this._isLoading.set(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<{ pet: any | null; state: PetState | null }>(`${this.apiUrl}/active`).pipe(
      map(data => ({
        pet: data.pet ? this.mapPetResponse(data.pet) : null,
        state: data.state
      })),
      tap({
        next: (data) => {
          this._activePet.set(data.pet);
          this._petState.set(data.state);
          this._isLoading.set(false);
          this._error.set(null);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.message ?? 'Failed to get active pet');
        },
      })
    );
  }

  adoptPet(petTypeId: number, nickname?: string): Observable<AdoptPetResult> {
    this._isLoading.set(true);
    return this.http.post<AdoptPetResult>(`${this.apiUrl}/adopt`, { petTypeId, nickname }).pipe(
      tap({
        next: (result) => {
          this._activePet.set(result.pet);
          this._petState.set(result.state);
          this._isLoading.set(false);
          this._error.set(null);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.message ?? 'Failed to adopt pet');
        },
      })
    );
  }

  setActivePet(petId: number): Observable<{ pet: UserPet; state: PetState; success: boolean }> {
    this._isLoading.set(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<{ pet: any; state: PetState; success: boolean }>(`${this.apiUrl}/${petId}/activate`, {}).pipe(
      map(result => ({
        ...result,
        pet: this.mapPetResponse(result.pet)
      })),
      tap({
        next: (result) => {
          this._activePet.set(result.pet);
          this._petState.set(result.state);
          this._isLoading.set(false);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.message ?? 'Failed to activate pet');
        },
      })
    );
  }

  updateNickname(petId: number, nickname: string): Observable<UserPet> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.patch<any>(`${this.apiUrl}/${petId}/nickname`, { nickname }).pipe(
      map(pet => this.mapPetResponse(pet)),
      tap((pet) => {
        if (this._activePet()?.id === pet.id) {
          this._activePet.set(pet);
        }
      })
    );
  }

  // ==================== Pet Interactions ====================

  /**
   * UNIFIED method to use any pet item.
   * Automatically detects item category on backend and performs appropriate action.
   * This is the RECOMMENDED method - no need to know item category beforehand.
   *
   * @param itemId - The pet item ID from inventory
   * @returns Observable with pet state, message, and action performed
   */
  useItem(itemId: number): Observable<PetInteractionResult & { action: string }> {
    this._isLoading.set(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${this.apiUrl}/use-item`, { itemId }).pipe(
      map(result => this.mapInteractionResult(result) as PetInteractionResult & { action: string }),
      tap({
        next: (result) => {
          this._activePet.set(result.pet);
          this._petState.set(result.state);
          this._isLoading.set(false);
          // Refresh inventory after using an item
          this.refreshInventory();
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.error ?? 'Failed to use item');
        },
      })
    );
  }

  /**
   * Feed the pet using a food item from inventory.
   * @deprecated Use useItem() instead - it automatically handles all item categories
   */
  feedPet(itemId: number): Observable<PetInteractionResult> {
    return this.useItem(itemId).pipe(
      map(result => result as PetInteractionResult)
    );
  }

  /**
   * Play with the pet using a toy item from inventory.
   * @deprecated Use useItem() instead - it automatically handles all item categories
   */
  playWithPet(itemId: number): Observable<PetInteractionResult> {
    return this.useItem(itemId).pipe(
      map(result => result as PetInteractionResult)
    );
  }

  /**
   * Pet/love the pet using a heart item from inventory.
   * @deprecated Use useItem() instead - it automatically handles all item categories
   */
  petThePet(itemId: number): Observable<PetInteractionResult> {
    return this.useItem(itemId).pipe(
      map(result => result as PetInteractionResult)
    );
  }

  /**
   * Heal the pet using a medicine item from inventory.
   * @deprecated Use useItem() instead - it automatically handles all item categories
   */
  healPet(itemId: number): Observable<PetInteractionResult & { revived?: boolean }> {
    return this.useItem(itemId).pipe(
      map(result => result as PetInteractionResult & { revived?: boolean })
    );
  }

  // ==================== Pet Bonuses ====================

  getPetBonuses(): Observable<PetBonuses> {
    return this.http.get<PetBonuses>(`${this.apiUrl}/bonuses`);
  }

  // ==================== Pet Items ====================

  getItems(): Observable<PetItem[]> {
    return this.http.get<PetItem[]>(`${this.apiUrl}/items`);
  }

  getInventory(): Observable<UserPetItem[]> {
    return this.http.get<UserPetItem[]>(`${this.apiUrl}/items/inventory`).pipe(
      tap(items => this._inventory.set(items))
    );
  }

  /**
   * Refresh inventory and update the signal.
   * Use this after buying items or using items.
   */
  refreshInventory(): void {
    this.getInventory().subscribe();
  }

  buyItem(itemId: number, quantity: number = 1): Observable<BuyItemResult> {
    return this.http.post<BuyItemResult>(`${this.apiUrl}/items/buy`, { itemId, quantity }).pipe(
      tap(() => this.refreshInventory())
    );
  }

  // ==================== Pet History ====================

  getPetHistory(petId: number, limit: number = 20): Observable<PetActivity[]> {
    return this.http.get<PetActivity[]>(`${this.apiUrl}/${petId}/history`, {
      params: { limit: limit.toString() },
    });
  }

  // ==================== Pet Shop & Acquisition ====================

  getShopPets(): Observable<ShopPetsResponse> {
    return this.http.get<ShopPetsResponse>(`${this.apiUrl}/shop`);
  }

  getAchievementPets(): Observable<ExtendedPetType[]> {
    return this.http.get<ExtendedPetType[]>(`${this.apiUrl}/achievement-pets`);
  }

  canClaimFreePet(): Observable<{ canClaimFree: boolean }> {
    return this.http.get<{ canClaimFree: boolean }>(`${this.apiUrl}/can-claim-free`);
  }

  purchasePet(petTypeId: number, nickname?: string): Observable<PurchasePetResult> {
    this._isLoading.set(true);
    return this.http.post<PurchasePetResult>(`${this.apiUrl}/purchase`, { petTypeId, nickname }).pipe(
      tap({
        next: (result) => {
          this._activePet.set(result.pet);
          this._petState.set(result.state);
          this._isLoading.set(false);
          this._error.set(null);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.error ?? 'Failed to purchase pet');
        },
      })
    );
  }

  claimAchievementPet(petTypeId: number, achievementCode: string, nickname?: string): Observable<PurchasePetResult> {
    this._isLoading.set(true);
    return this.http.post<PurchasePetResult>(`${this.apiUrl}/claim`, { petTypeId, achievementCode, nickname }).pipe(
      tap({
        next: (result) => {
          this._activePet.set(result.pet);
          this._petState.set(result.state);
          this._isLoading.set(false);
          this._error.set(null);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err.error?.error ?? 'Failed to claim pet');
        },
      })
    );
  }

  // ==================== Egg System ====================

  getEggTypes(): Observable<EggType[]> {
    return this.http.get<EggType[]>(`${this.apiUrl}/eggs`);
  }

  getMyEggs(): Observable<UserPet[]> {
    return this.http.get<UserPet[]>(`${this.apiUrl}/eggs/my`);
  }

  getHatchedPets(): Observable<UserPet[]> {
    return this.http.get<UserPet[]>(`${this.apiUrl}/hatched`);
  }

  getEggHatchPool(eggTypeId: number): Observable<EggHatchPoolItem[]> {
    return this.http.get<EggHatchPoolItem[]>(`${this.apiUrl}/eggs/${eggTypeId}/pool`);
  }

  purchaseEgg(eggTypeId: number): Observable<{ success: boolean; egg: UserPet; message: string }> {
    return this.http.post<{ success: boolean; egg: UserPet; message: string }>(`${this.apiUrl}/eggs/purchase`, { eggTypeId });
  }

  addHatchXp(eggId: number, xpAmount: number): Observable<{ success: boolean; egg: UserPet; message: string }> {
    return this.http.post<{ success: boolean; egg: UserPet; message: string }>(`${this.apiUrl}/eggs/${eggId}/add-xp`, { xpAmount });
  }

  canHatchEgg(eggId: number): Observable<{ canHatch: boolean; reason?: string; xpProgress: number; xpRequired: number; hoursElapsed: number; hoursRequired: number }> {
    return this.http.get<{ canHatch: boolean; reason?: string; xpProgress: number; xpRequired: number; hoursElapsed: number; hoursRequired: number }>(`${this.apiUrl}/eggs/${eggId}/can-hatch`);
  }

  hatchEgg(eggId: number): Observable<EggHatchResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${this.apiUrl}/eggs/${eggId}/hatch`, {}).pipe(
      map(result => ({
        ...result,
        hatchedPet: this.mapPetResponse(result.hatchedPet)
      }))
    );
  }

  // ==================== Pet Equipment ====================

  getEquipmentTypes(slot?: EquipmentSlot): Observable<PetEquipmentType[]> {
    const params: Record<string, string> = slot ? { slot } : {};
    return this.http.get<PetEquipmentType[]>(`${this.apiUrl}/equipment/types`, { params });
  }

  getEquipmentInventory(): Observable<UserPetEquipment[]> {
    return this.http.get<UserPetEquipment[]>(`${this.apiUrl}/equipment/inventory`);
  }

  getPetEquipment(petId: number): Observable<{ equipment: UserPetEquipment[]; bonuses: EquipmentBonuses }> {
    return this.http.get<{ equipment: UserPetEquipment[]; bonuses: EquipmentBonuses }>(`${this.apiUrl}/${petId}/equipment`);
  }

  buyEquipment(equipmentTypeId: number): Observable<BuyEquipmentResult> {
    return this.http.post<BuyEquipmentResult>(`${this.apiUrl}/equipment/buy`, { equipmentTypeId });
  }

  equipItem(petId: number, userEquipmentId: number): Observable<EquipItemResult> {
    return this.http.post<EquipItemResult>(`${this.apiUrl}/${petId}/equipment/equip`, { userEquipmentId });
  }

  unequipItem(equipmentId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/equipment/${equipmentId}/unequip`, {});
  }

  // ==================== Socket Event Subscriptions ====================

  onPetState(callback: (data: { pet: UserPet; state: PetState }) => void): () => void {
    this.petStateCallbacks.push(callback);
    return () => {
      this.petStateCallbacks = this.petStateCallbacks.filter((cb) => cb !== callback);
    };
  }

  onPetXp(callback: (data: { pet: UserPet; xpGained: number }) => void): () => void {
    this.petXpCallbacks.push(callback);
    return () => {
      this.petXpCallbacks = this.petXpCallbacks.filter((cb) => cb !== callback);
    };
  }

  onPetEvolved(callback: (data: { petId: number; newPetType: PetType }) => void): () => void {
    this.petEvolvedCallbacks.push(callback);
    return () => {
      this.petEvolvedCallbacks = this.petEvolvedCallbacks.filter((cb) => cb !== callback);
    };
  }

  onPetNeedsAttention(callback: (data: { message: string }) => void): () => void {
    this.petNeedsAttentionCallbacks.push(callback);
    return () => {
      this.petNeedsAttentionCallbacks = this.petNeedsAttentionCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ==================== Helpers ====================

  getMoodEmoji(mood: string): string {
    const moodEmojis: Record<string, string> = {
      ecstatic: '🤩',
      happy: '😊',
      content: '🙂',
      neutral: '😐',
      sad: '😢',
      miserable: '😭',
    };
    return moodEmojis[mood] ?? '😐';
  }

  getMoodColor(mood: string): string {
    const moodColors: Record<string, string> = {
      ecstatic: 'text-yellow-500',
      happy: 'text-green-500',
      content: 'text-green-400',
      neutral: 'text-gray-500',
      sad: 'text-blue-400',
      miserable: 'text-blue-600',
    };
    return moodColors[mood] ?? 'text-gray-500';
  }

  getStatColor(value: number): string {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-green-400';
    if (value >= 40) return 'bg-yellow-400';
    if (value >= 20) return 'bg-orange-400';
    return 'bg-red-500';
  }

  getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: 'text-gray-500',
      uncommon: 'text-green-500',
      rare: 'text-blue-500',
      epic: 'text-purple-500',
      legendary: 'text-yellow-500',
    };
    return colors[rarity] ?? 'text-gray-500';
  }

  getRarityBgColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: 'bg-gray-100',
      uncommon: 'bg-green-50',
      rare: 'bg-blue-50',
      epic: 'bg-purple-50',
      legendary: 'bg-gradient-to-r from-yellow-50 to-orange-50',
    };
    return colors[rarity] ?? 'bg-gray-100';
  }

  getEvolutionStageLabel(stage: PetEvolutionStage | number | undefined): string {
    // Handle number-based stages from backend (1=baby, 2=juvenile, 3=adult, 4=elder)
    if (typeof stage === 'number') {
      const numLabels: Record<number, string> = { 1: 'Baby', 2: 'Juvenile', 3: 'Adult', 4: 'Elder' };
      return numLabels[stage] ?? `Stage ${stage}`;
    }
    const labels: Record<PetEvolutionStage, string> = {
      baby: 'Baby',
      juvenile: 'Juvenile',
      adult: 'Adult',
      elder: 'Elder',
    };
    return labels[stage ?? 'baby'] ?? String(stage);
  }

  getEvolutionStageEmoji(stage: PetEvolutionStage): string {
    const emojis: Record<PetEvolutionStage, string> = {
      baby: '🥚',
      juvenile: '🐣',
      adult: '🐾',
      elder: '👑',
    };
    return emojis[stage] ?? '🐾';
  }

  getEquipmentSlotIcon(slot: EquipmentSlot): string {
    const icons: Record<EquipmentSlot, string> = {
      head: '🎩',
      body: '👕',
      accessory: '💍',
      weapon: '⚔️',
      back: '🎒',
      feet: '👟',
    };
    return icons[slot] ?? '📦';
  }

  getEquipmentSlotName(slot: EquipmentSlot): string {
    const names: Record<EquipmentSlot, string> = {
      head: 'Head',
      body: 'Body',
      accessory: 'Accessory',
      weapon: 'Weapon',
      back: 'Back',
      feet: 'Feet',
    };
    return names[slot] ?? slot;
  }

  getAcquisitionTypeLabel(type: AcquisitionType): string {
    const labels: Record<AcquisitionType, string> = {
      shop: 'Shop',
      achievement: 'Achievement',
      event: 'Event',
      starter_free: 'Free Starter',
    };
    return labels[type] ?? type;
  }

  getAcquisitionTypeBadgeClass(type: AcquisitionType): string {
    const classes: Record<AcquisitionType, string> = {
      shop: 'bg-blue-100 text-blue-700',
      achievement: 'bg-purple-100 text-purple-700',
      event: 'bg-orange-100 text-orange-700',
      starter_free: 'bg-green-100 text-green-700',
    };
    return classes[type] ?? 'bg-gray-100 text-gray-700';
  }

  getEggImageUrl(rarity: string): string {
    return `/assets/eggs/egg-${rarity}.svg`;
  }

  getHatchProgress(egg: UserPet): { xpPercent: number; timePercent: number; overallPercent: number } {
    const xpRequired = egg.petType?.hatchXpRequired ?? 100;
    const hoursRequired = egg.petType?.hatchHoursMin ?? 0;

    const xpPercent = Math.min(100, (egg.hatchXpProgress / xpRequired) * 100);

    let timePercent = 100;
    if (hoursRequired > 0 && egg.hatchStartedAt) {
      const hoursElapsed = (Date.now() - new Date(egg.hatchStartedAt).getTime()) / (1000 * 60 * 60);
      timePercent = Math.min(100, (hoursElapsed / hoursRequired) * 100);
    }

    const overallPercent = Math.min(xpPercent, timePercent);

    return { xpPercent, timePercent, overallPercent };
  }

  canEggHatch(egg: UserPet): boolean {
    const progress = this.getHatchProgress(egg);
    return progress.xpPercent >= 100 && progress.timePercent >= 100;
  }

  formatTimeRemaining(isoDate: string | null): string {
    if (!isoDate) return 'Ready';

    const now = new Date();
    const target = new Date(isoDate);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) return 'Ready';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffHour > 0) {
      return `${diffHour}h ${diffMin % 60}m`;
    }
    if (diffMin > 0) {
      return `${diffMin}m ${diffSec % 60}s`;
    }
    return `${diffSec}s`;
  }

  // Update local state from socket events
  updatePetState(pet: UserPet, state: PetState): void {
    this._activePet.set(pet);
    this._petState.set(state);
    this.petStateCallbacks.forEach((cb) => cb({ pet, state }));
  }

  // Clear state (e.g., on logout)
  clearState(): void {
    this._activePet.set(null);
    this._petState.set(null);
    this._error.set(null);
  }

  // ==================== Daily Tasks ====================

  getDailyTasks(): Observable<DailyTasksResponse> {
    return this.http.get<DailyTasksResponse>(`${this.apiUrl}/daily-tasks`);
  }

  claimTaskReward(taskId: number): Observable<TaskClaimResult> {
    return this.http.post<TaskClaimResult>(`${this.apiUrl}/daily-tasks/${taskId}/claim`, {});
  }

  recordActivity(activityType: 'review' | 'exercise' | 'game' | 'challenge' | 'social', data: {
    count?: number;
    scorePercent?: number;
    scorePoints?: number;
    won?: boolean;
    timeMinutes?: number;
    streakDays?: number;
  }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/daily-tasks/record-activity`, {
      activityType,
      data
    });
  }

  // Helper to get category icon
  getRewardCategoryIcon(category: RewardItemCategory): string {
    const icons: Record<RewardItemCategory, string> = {
      food: '🍎',
      toy: '🎾',
      heart: '💕',
      medicine: '💊',
      random: '🎁'
    };
    return icons[category] || '🎁';
  }

  // Helper to get task type icon
  getTaskTypeIcon(taskType: DailyTaskType): string {
    const icons: Record<DailyTaskType, string> = {
      exercise: '📝',
      game: '🎮',
      review: '📚',
      social: '🤝',
      streak: '🔥',
      challenge: '⭐'
    };
    return icons[taskType] || '📋';
  }
}
