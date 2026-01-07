import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  PetService,
  UserPet,
  PetState,
  PetActivity,
  UserPetItem,
  PetItem,
  PetItemCategory,
  EquipmentSlot,
  PetEquipmentType,
  UserPetEquipment,
  PetEvolutionStage,
  EggHatchResult,
  EggHatchPoolItem,
  TaskClaimResult,
} from '../../services/pet.service';
import { PetSpriteComponent, PetAnimation } from '../../components/pet-sprite/pet-sprite.component';
import { DailyTasksComponent } from '../../components/daily-tasks/daily-tasks.component';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PetSpriteComponent, DailyTasksComponent],
  templateUrl: './pet-detail.component.html',
  styleUrls: ['./pet-detail.component.scss'],
})
export class PetDetailComponent implements OnInit {
  private petService = inject(PetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Expose Math for template use
  Math = Math;

  petId = signal<number | null>(null);
  pet = signal<UserPet | null>(null);
  petState = signal<PetState | null>(null);
  history = signal<PetActivity[]>([]);
  inventory = signal<UserPetItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Tab management
  activeTab = signal<'stats' | 'equipment' | 'history' | 'inventory' | 'tasks'>('stats');

  // Equipment
  petEquipment = signal<UserPetEquipment[]>([]);
  equipmentInventory = signal<UserPetEquipment[]>([]);
  equipmentSlots: EquipmentSlot[] = ['head', 'body', 'accessory', 'weapon', 'back', 'feet'];
  equipping = signal(false);
  unequipping = signal(false);

  // Nickname editing
  isEditingNickname = signal(false);
  newNickname = signal('');
  savingNickname = signal(false);

  // Interaction states
  feeding = signal(false);
  playing = signal(false);
  petting = signal(false);
  healing = signal(false);
  currentAnimation = signal<PetAnimation>('idle');

  // Item selection for actions
  showItemSelector = signal(false);
  itemSelectorAction = signal<'feed' | 'play' | 'pet' | 'heal' | null>(null);
  selectedItemId = signal<number | null>(null);

  // Egg-related states
  hatchPool = signal<EggHatchPoolItem[]>([]);
  hatchingEgg = signal(false);
  hatchResult = signal<EggHatchResult | null>(null);

  // Computed
  isActive = computed(() => this.petService.activePet()?.id === this.petId());
  petSlug = computed(() => this.pet()?.petType?.slug ?? 'kitten');
  // Check if pet is an egg: petType.isEgg is truthy (true or 1) OR isHatched is falsy (0, false, null)
  isEgg = computed(() => {
    const pet = this.pet();
    if (!pet) return false;
    // Backend returns isEgg from pet_types (mapped to petType.isEgg), or isHatched from user_pets
    // Using !! to convert number to boolean (API returns 0/1)
    return !!pet.petType?.isEgg || !pet.isHatched;
  });
  hatchProgress = computed(() => {
    const pet = this.pet();
    if (!pet) return { xpPercent: 0, timePercent: 0, overallPercent: 0 };
    return this.petService.getHatchProgress(pet);
  });
  canHatch = computed(() => {
    const pet = this.pet();
    if (!pet) return false;
    return this.petService.canEggHatch(pet);
  });

  // XP calculations for current level
  // Backend formula: XP needed to reach level N = floor(100 * N^1.5)
  // Level 1: 100, Level 2: 282, Level 3: 519, Level 4: 800, Level 5: 1118, Level 6: 1469, Level 7: 1852, ...
  calculateXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  xpToReachCurrentLevel = computed(() => {
    const pet = this.pet();
    if (!pet || pet.level <= 1) return 0;
    return this.calculateXpForLevel(pet.level);
  });

  xpForNextLevel = computed(() => {
    const pet = this.pet();
    if (!pet) return 100;
    // XP needed to go from current level to next level
    const xpCurrentLevel = this.calculateXpForLevel(pet.level);
    const xpNextLevel = this.calculateXpForLevel(pet.level + 1);
    return xpNextLevel - xpCurrentLevel;
  });

  currentLevelXp = computed(() => {
    const pet = this.pet();
    if (!pet) return 0;
    // XP progress within current level
    const xpForCurrentLevel = this.calculateXpForLevel(pet.level);
    return Math.max(0, pet.experience - xpForCurrentLevel);
  });

  xpProgressPercent = computed(() => {
    const current = this.currentLevelXp();
    const needed = this.xpForNextLevel();
    if (needed <= 0) return 0;
    return Math.min((current / needed) * 100, 100);
  });

  // Computed inventory filters by category
  foodItems = computed(() => this.inventory().filter(i => i.itemCategory === 'food' && i.quantity > 0));
  toyItems = computed(() => this.inventory().filter(i => i.itemCategory === 'toy' && i.quantity > 0));
  heartItems = computed(() => this.inventory().filter(i => i.itemCategory === 'heart' && i.quantity > 0));
  medicineItems = computed(() => this.inventory().filter(i => i.itemCategory === 'medicine' && i.quantity > 0));

  // Total quantity for each category (sum of all item quantities)
  totalFoodQuantity = computed(() => this.foodItems().reduce((sum, i) => sum + i.quantity, 0));
  totalToyQuantity = computed(() => this.toyItems().reduce((sum, i) => sum + i.quantity, 0));
  totalHeartQuantity = computed(() => this.heartItems().reduce((sum, i) => sum + i.quantity, 0));
  totalMedicineQuantity = computed(() => this.medicineItems().reduce((sum, i) => sum + i.quantity, 0));

  // Get items for current action
  itemsForCurrentAction = computed(() => {
    const action = this.itemSelectorAction();
    switch (action) {
      case 'feed': return this.foodItems();
      case 'play': return this.toyItems();
      case 'pet': return this.heartItems();
      case 'heal': return this.medicineItems();
      default: return [];
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.petId.set(parseInt(id, 10));
      this.loadPetData();
    } else {
      this.error.set('Invalid pet ID');
      this.loading.set(false);
    }
  }

  loadPetData(): void {
    const id = this.petId();
    if (!id) return;

    this.loading.set(true);

    // Load pet details via my-pets and find the one
    this.petService.getMyPets().subscribe({
      next: (pets) => {
        const pet = pets.find((p) => p.id === id);
        if (pet) {
          this.pet.set(pet);

          // If this is active pet, load state
          if (pet.isActive) {
            this.petService.getActivePet().subscribe({
              next: (data) => {
                this.petState.set(data.state);
              },
            });
          }

          // If this is an egg, load the hatch pool
          if (!pet.isHatched && pet.petTypeId) {
            this.petService.getEggHatchPool(pet.petTypeId).subscribe({
              next: (pool) => this.hatchPool.set(pool),
            });
          }

          // Load history
          this.petService.getPetHistory(id).subscribe({
            next: (h) => this.history.set(h),
          });

          // Load inventory
          this.petService.getInventory().subscribe({
            next: (items) => this.inventory.set(items),
          });

          // Load pet equipment
          this.loadPetEquipment(id);

          // Load equipment inventory
          this.petService.getEquipmentInventory().subscribe({
            next: (items) => this.equipmentInventory.set(items),
          });

          this.loading.set(false);
        } else {
          this.error.set('Pet not found');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Failed to load pet');
        this.loading.set(false);
      },
    });
  }

  setActiveTab(tab: 'stats' | 'equipment' | 'history' | 'inventory' | 'tasks'): void {
    this.activeTab.set(tab);
  }

  loadPetEquipment(petId: number): void {
    this.petService.getPetEquipment(petId).subscribe({
      next: (response) => this.petEquipment.set(response.equipment),
    });
  }

  getEquippedItem(slot: EquipmentSlot): UserPetEquipment | null {
    return this.petEquipment().find((e) => e.equipmentType?.equipmentSlot === slot && e.equippedPetId !== null) ?? null;
  }

  getUnequippedItems(slot: EquipmentSlot): UserPetEquipment[] {
    return this.equipmentInventory().filter(
      (e) => e.equipmentType?.equipmentSlot === slot && e.equippedPetId === null
    );
  }

  equipItem(equipmentId: number): void {
    const petId = this.petId();
    if (!petId) return;

    this.equipping.set(true);
    this.petService.equipItem(petId, equipmentId).subscribe({
      next: () => {
        this.equipping.set(false);
        this.loadPetEquipment(petId);
        this.petService.getEquipmentInventory().subscribe({
          next: (items) => this.equipmentInventory.set(items),
        });
      },
      error: () => this.equipping.set(false),
    });
  }

  unequipItem(equipmentId: number): void {
    this.unequipping.set(true);
    this.petService.unequipItem(equipmentId).subscribe({
      next: () => {
        this.unequipping.set(false);
        const petId = this.petId();
        if (petId) {
          this.loadPetEquipment(petId);
          this.petService.getEquipmentInventory().subscribe({
            next: (items) => this.equipmentInventory.set(items),
          });
        }
      },
      error: () => this.unequipping.set(false),
    });
  }

  getEquipmentSlotIcon(slot: EquipmentSlot): string {
    return this.petService.getEquipmentSlotIcon(slot);
  }

  getEquipmentSlotName(slot: EquipmentSlot): string {
    return this.petService.getEquipmentSlotName(slot);
  }

  setActivePet(): void {
    const id = this.petId();
    if (!id) return;

    this.petService.setActivePet(id).subscribe({
      next: (data) => {
        this.pet.update((p) => (p ? { ...p, isActive: true } : null));
        this.petState.set(data.state);
      },
    });
  }

  startEditNickname(): void {
    this.newNickname.set(this.pet()?.nickname ?? '');
    this.isEditingNickname.set(true);
  }

  cancelEditNickname(): void {
    this.isEditingNickname.set(false);
    this.newNickname.set('');
  }

  saveNickname(): void {
    const id = this.petId();
    const nickname = this.newNickname().trim();
    if (!id || !nickname) return;

    this.savingNickname.set(true);
    this.petService.updateNickname(id, nickname).subscribe({
      next: (updatedPet) => {
        this.pet.set(updatedPet);
        this.isEditingNickname.set(false);
        this.savingNickname.set(false);
      },
      error: () => {
        this.savingNickname.set(false);
      },
    });
  }

  // === Item Selection Methods ===

  openItemSelector(action: 'feed' | 'play' | 'pet' | 'heal'): void {
    this.itemSelectorAction.set(action);
    this.selectedItemId.set(null);
    this.showItemSelector.set(true);
  }

  closeItemSelector(): void {
    this.showItemSelector.set(false);
    this.itemSelectorAction.set(null);
    this.selectedItemId.set(null);
  }

  selectItem(itemId: number): void {
    this.selectedItemId.set(itemId);
  }

  confirmAction(): void {
    const action = this.itemSelectorAction();
    const itemId = this.selectedItemId();
    if (!action || !itemId) return;

    this.closeItemSelector();

    switch (action) {
      case 'feed':
        this.feedPet(itemId);
        break;
      case 'play':
        this.playWithPet(itemId);
        break;
      case 'pet':
        this.petThePet(itemId);
        break;
      case 'heal':
        this.healPet(itemId);
        break;
    }
  }

  getActionTitle(): string {
    const action = this.itemSelectorAction();
    switch (action) {
      case 'feed': return 'Select Food';
      case 'play': return 'Select Toy';
      case 'pet': return 'Select Gift';
      case 'heal': return 'Select Medicine';
      default: return 'Select Item';
    }
  }

  getActionEmoji(): string {
    const action = this.itemSelectorAction();
    switch (action) {
      case 'feed': return '🍖';
      case 'play': return '🎾';
      case 'pet': return '❤️';
      case 'heal': return '💊';
      default: return '📦';
    }
  }

  // === Pet Actions ===

  feedPet(itemId: number): void {
    if (!this.isActive()) return;
    this.feeding.set(true);
    this.currentAnimation.set('eating');
    this.petService.feedPet(itemId).subscribe({
      next: () => {
        this.feeding.set(false);
        this.currentAnimation.set('idle');
        this.loadPetData();
      },
      error: () => {
        this.feeding.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  playWithPet(itemId: number): void {
    if (!this.isActive()) return;
    this.playing.set(true);
    this.currentAnimation.set('playing');
    this.petService.playWithPet(itemId).subscribe({
      next: () => {
        this.playing.set(false);
        this.currentAnimation.set('idle');
        this.loadPetData();
      },
      error: () => {
        this.playing.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  petThePet(itemId: number): void {
    if (!this.isActive()) return;
    this.petting.set(true);
    this.currentAnimation.set('happy');
    this.petService.petThePet(itemId).subscribe({
      next: () => {
        this.petting.set(false);
        this.currentAnimation.set('idle');
        this.loadPetData();
      },
      error: () => {
        this.petting.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  healPet(itemId: number): void {
    if (!this.isActive()) return;
    this.healing.set(true);
    this.petService.healPet(itemId).subscribe({
      next: () => {
        this.healing.set(false);
        this.loadPetData();
      },
      error: () => this.healing.set(false),
    });
  }

  // === Helpers for inventory ===

  hasItemsForAction(action: 'feed' | 'play' | 'pet' | 'heal'): boolean {
    switch (action) {
      case 'feed': return this.foodItems().length > 0;
      case 'play': return this.toyItems().length > 0;
      case 'pet': return this.heartItems().length > 0;
      case 'heal': return this.medicineItems().length > 0;
      default: return false;
    }
  }

  // Check if action is available (from petState)
  canDoAction(action: 'feed' | 'play' | 'pet' | 'heal'): boolean {
    const state = this.petState();
    if (!state) return false;
    switch (action) {
      case 'feed': return state.canFeed ?? false;
      case 'play': return state.canPlay ?? false;
      case 'pet': return state.canPet ?? false;
      case 'heal': return state.canHeal ?? false;
      default: return false;
    }
  }

  // Get time remaining for action (from petState)
  getActionTimeRemaining(action: 'feed' | 'play' | 'pet' | 'heal'): string {
    const state = this.petState();
    if (!state) return '';
    let nextTime: string | null = null;
    switch (action) {
      case 'feed': nextTime = state.nextFeedTime; break;
      case 'play': nextTime = state.nextPlayTime; break;
      case 'pet': nextTime = state.nextPetTime; break;
      case 'heal': nextTime = state.nextHealTime; break;
    }
    return this.petService.formatTimeRemaining(nextTime);
  }

  getItemCategoryIcon(category: PetItemCategory): string {
    const icons: Record<PetItemCategory, string> = {
      food: '🍖',
      toy: '🎾',
      heart: '❤️',
      medicine: '💊',
      accessory: '🎀',
      special: '✨',
    };
    return icons[category] ?? '📦';
  }

  // === Egg Methods ===

  getEggImageUrl(rarity: string): string {
    return this.petService.getEggImageUrl(rarity);
  }

  getTimeRemaining(): string {
    const pet = this.pet();
    if (!pet || !pet.hatchStartedAt || !pet.petType?.hatchHoursMin) return 'Ready';

    const hoursRequired = pet.petType.hatchHoursMin;
    const startTime = new Date(pet.hatchStartedAt).getTime();
    const now = Date.now();
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
    const hoursRemaining = hoursRequired - hoursElapsed;

    if (hoursRemaining <= 0) return 'Ready';

    if (hoursRemaining >= 24) {
      const days = Math.floor(hoursRemaining / 24);
      const hours = Math.floor(hoursRemaining % 24);
      return `${days}d ${hours}h`;
    }

    if (hoursRemaining >= 1) {
      const hours = Math.floor(hoursRemaining);
      const minutes = Math.floor((hoursRemaining % 1) * 60);
      return `${hours}h ${minutes}m`;
    }

    const minutes = Math.floor(hoursRemaining * 60);
    return `${minutes}m`;
  }

  hatchEgg(): void {
    const petId = this.petId();
    if (!petId) return;

    this.hatchingEgg.set(true);
    this.hatchResult.set(null);

    this.petService.hatchEgg(petId).subscribe({
      next: (result) => {
        this.hatchingEgg.set(false);
        this.hatchResult.set(result);
        // Reload pet data to reflect changes
        this.loadPetData();
      },
      error: (err) => {
        this.hatchingEgg.set(false);
        this.error.set(err.error?.message ?? 'Failed to hatch egg');
      },
    });
  }

  closeHatchResult(): void {
    this.hatchResult.set(null);
    // Navigate to the pet list after closing the result
    this.router.navigate(['/pets']);
  }

  getRarityBgColor(rarity: string): string {
    return this.petService.getRarityBgColor(rarity);
  }

  getPetEmoji(slug?: string): string {
    if (!slug) return '🐾';
    const petTypeEmojis: Record<string, string> = {
      fox_kit: '🦊',
      fox_young: '🦊',
      fox_adult: '🦊',
      fox_mystic: '🦊',
      owlet: '🦉',
      owl_young: '🦉',
      owl_wise: '🦉',
      owl_sage: '🦉',
      dragon_egg: '🥚',
      dragon_hatchling: '🐉',
      dragon_young: '🐉',
      dragon_ancient: '🐲',
      cat: '🐱',
      dog: '🐶',
      bunny: '🐰',
      hamster: '🐹',
      panda: '🐼',
      penguin: '🐧',
      unicorn: '🦄',
      phoenix: '🔥',
    };
    return petTypeEmojis[slug] ?? '🐾';
  }

  getMoodEmoji(mood?: string): string {
    return this.petService.getMoodEmoji(mood ?? 'neutral');
  }

  getStatColor(value: number): string {
    return this.petService.getStatColor(value);
  }

  getHpColor(hp: number): string {
    // HP uses red color scheme
    if (hp >= 70) return 'bg-red-500';       // High HP - bright red
    if (hp >= 40) return 'bg-red-400';       // Medium HP - lighter red
    if (hp >= 20) return 'bg-red-300';       // Low HP - pale red
    return 'bg-red-600';                      // Critical HP - dark red (warning)
  }

  getRarityColor(rarity?: string): string {
    return this.petService.getRarityColor(rarity ?? 'common');
  }

  getEvolutionStageLabel(stage?: PetEvolutionStage | number): string {
    return this.petService.getEvolutionStageLabel(stage);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDateShort(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      feed: '🍖',
      play: '🎾',
      pet: '❤️',
      train: '📚',
      evolve: '✨',
      level_up: '⬆️',
      item_used: '📦',
    };
    return icons[type] ?? '📌';
  }

  getActivityLabel(type: string): string {
    const labels: Record<string, string> = {
      feed: 'Fed',
      play: 'Played',
      pet: 'Petted',
      train: 'Trained',
      evolve: 'Evolved',
      level_up: 'Level Up',
      item_used: 'Used Item',
    };
    return labels[type] ?? type;
  }

  // Handler for when daily task reward is claimed - reload inventory
  onTaskRewardClaimed(result: TaskClaimResult): void {
    // Reload inventory to reflect new items
    this.petService.getInventory().subscribe({
      next: (items) => this.inventory.set(items),
    });
    // Also reload pet state if active (actions might have changed)
    if (this.isActive()) {
      this.petService.getActivePet().subscribe({
        next: (data) => this.petState.set(data.state),
      });
    }
  }
}
