import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PetService, UserPet, PetState, UserPetItem } from '../../services/pet.service';
import { PetSpriteComponent, PetAnimation } from '../pet-sprite/pet-sprite.component';
import { DraggableDirective, DraggablePosition } from '../../../../shared/directives/draggable.directive';

@Component({
  selector: 'app-pet-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, PetSpriteComponent, DraggableDirective],
  templateUrl: './pet-widget.component.html',
  styleUrls: ['./pet-widget.component.scss'],
})
export class PetWidgetComponent implements OnInit, OnDestroy {
  private petService = inject(PetService);
  private router = inject(Router);

  // Local state
  isExpanded = signal(false);
  isInteracting = signal(false);
  showTooltip = signal(false);
  tooltipMessage = signal('');
  currentAnimation = signal<PetAnimation>('idle');

  // Track widget position (persists across expand/collapse)
  widgetPosition = signal<DraggablePosition | null>(null);

  // From service (reactive - auto-updates when service changes)
  pet = this.petService.activePet;
  petState = this.petService.petState;
  isLoading = this.petService.isLoading;
  hasPet = this.petService.hasPet;
  inventory = this.petService.inventory;

  // Computed
  petName = computed(() => this.pet()?.nickname ?? this.pet()?.petType?.name ?? 'Pet');
  petLevel = computed(() => this.pet()?.level ?? 1);
  petSlug = computed(() => this.pet()?.petType?.slug ?? 'kitten');
  petImageUrl = computed(() => this.pet()?.petType?.imageUrl ?? '');
  petEmoji = computed(() => this.getPetEmoji());
  moodEmoji = computed(() => this.petService.getMoodEmoji(this.petState()?.mood ?? 'neutral'));
  needsAttention = computed(() => this.petState()?.needsAttention ?? false);

  // Stats computed
  hp = computed(() => this.petState()?.hp ?? 0);
  happiness = computed(() => this.petState()?.happiness ?? 0);
  energy = computed(() => this.petState()?.energy ?? 0);
  hunger = computed(() => this.petState()?.hunger ?? 0);

  // Inventory by category
  foodItems = computed(() => this.inventory().filter(i => i.itemCategory === 'food' && i.quantity > 0));
  toyItems = computed(() => this.inventory().filter(i => i.itemCategory === 'toy' && i.quantity > 0));
  heartItems = computed(() => this.inventory().filter(i => i.itemCategory === 'heart' && i.quantity > 0));
  medicineItems = computed(() => this.inventory().filter(i => i.itemCategory === 'medicine' && i.quantity > 0));

  // Total item counts for display
  foodCount = computed(() => this.foodItems().reduce((sum, i) => sum + i.quantity, 0));
  toyCount = computed(() => this.toyItems().reduce((sum, i) => sum + i.quantity, 0));
  heartCount = computed(() => this.heartItems().reduce((sum, i) => sum + i.quantity, 0));
  medicineCount = computed(() => this.medicineItems().reduce((sum, i) => sum + i.quantity, 0));

  // Action availability - requires both state permission and items
  canFeed = computed(() => (this.petState()?.canFeed ?? false) && this.foodItems().length > 0);
  canPlay = computed(() => (this.petState()?.canPlay ?? false) && this.toyItems().length > 0);
  canPet = computed(() => (this.petState()?.canPet ?? false) && this.heartItems().length > 0);
  canHeal = computed(() => (this.petState()?.canHeal ?? false) && this.medicineItems().length > 0);

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadActivePet();
    this.loadInventory();

    // Refresh pet state every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (this.hasPet()) {
        this.petService.getActivePet().subscribe();
      }
    }, 30000);
  }

  loadInventory(): void {
    // Just trigger the service call - it updates the inventory signal automatically
    this.petService.getInventory().subscribe();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadActivePet(): void {
    this.petService.getActivePet().subscribe();
  }

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  onPositionChange(position: DraggablePosition): void {
    this.widgetPosition.set(position);
  }

  async feedPet(): Promise<void> {
    if (this.isInteracting()) return;

    // Use first available food item
    const foodItem = this.foodItems()[0];
    if (!foodItem) {
      this.goToPetDetail();
      return;
    }

    this.isInteracting.set(true);
    this.currentAnimation.set('eating');

    this.petService.feedPet(foodItem.id).subscribe({
      next: (result) => {
        this.showMessage('Yummy! +' + (result.xpGained ?? 0) + ' XP');
        this.loadInventory();
        setTimeout(() => {
          this.isInteracting.set(false);
          this.currentAnimation.set('idle');
        }, 1500);
      },
      error: () => {
        this.showMessage('Cannot feed right now');
        this.isInteracting.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  async playWithPet(): Promise<void> {
    if (this.isInteracting()) return;

    // Use first available toy
    const toyItem = this.toyItems()[0];
    if (!toyItem) {
      this.goToPetDetail();
      return;
    }

    this.isInteracting.set(true);
    this.currentAnimation.set('playing');

    this.petService.playWithPet(toyItem.id).subscribe({
      next: (result) => {
        this.showMessage('Fun! +' + (result.xpGained ?? 0) + ' XP');
        this.loadInventory();
        setTimeout(() => {
          this.isInteracting.set(false);
          this.currentAnimation.set('idle');
        }, 1500);
      },
      error: () => {
        this.showMessage('Too tired to play');
        this.isInteracting.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  async petThePet(): Promise<void> {
    if (this.isInteracting()) return;

    // Use first available heart item
    const heartItem = this.heartItems()[0];
    if (!heartItem) {
      this.goToPetDetail();
      return;
    }

    this.isInteracting.set(true);
    this.currentAnimation.set('happy');

    this.petService.petThePet(heartItem.id).subscribe({
      next: (result) => {
        this.showMessage('Love it! +' + (result.xpGained ?? 0) + ' XP');
        this.loadInventory();
        setTimeout(() => {
          this.isInteracting.set(false);
          this.currentAnimation.set('idle');
        }, 1000);
      },
      error: () => {
        this.showMessage('Try again later');
        this.isInteracting.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  async healPet(): Promise<void> {
    if (this.isInteracting()) return;

    // Use first available medicine item
    const medicineItem = this.medicineItems()[0];
    if (!medicineItem) {
      this.goToPetDetail();
      return;
    }

    this.isInteracting.set(true);
    this.currentAnimation.set('happy');

    this.petService.healPet(medicineItem.id).subscribe({
      next: (result) => {
        this.showMessage('Healed! +' + (result.hpRestored ?? 0) + ' HP');
        this.loadInventory();
        setTimeout(() => {
          this.isInteracting.set(false);
          this.currentAnimation.set('idle');
        }, 1000);
      },
      error: () => {
        this.showMessage('Cannot heal right now');
        this.isInteracting.set(false);
        this.currentAnimation.set('idle');
      },
    });
  }

  goToPetDetail(): void {
    const petId = this.pet()?.id;
    if (petId) {
      this.router.navigate(['/pets', petId]);
    }
  }

  private showMessage(message: string): void {
    this.tooltipMessage.set(message);
    this.showTooltip.set(true);
    setTimeout(() => {
      this.showTooltip.set(false);
    }, 2000);
  }

  private getPetEmoji(): string {
    const pet = this.pet();
    if (!pet?.petType) return '🐾';

    const petTypeEmojis: Record<string, string> = {
      // Fox evolution line
      fox_kit: '🦊',
      fox_young: '🦊',
      fox_adult: '🦊',
      fox_mystic: '🦊',
      // Owl evolution line
      owlet: '🦉',
      owl_young: '🦉',
      owl_wise: '🦉',
      owl_sage: '🦉',
      // Dragon evolution line
      dragon_egg: '🥚',
      dragon_hatchling: '🐉',
      dragon_young: '🐉',
      dragon_ancient: '🐲',
      // Standalone pets
      cat: '🐱',
      dog: '🐶',
      bunny: '🐰',
      hamster: '🐹',
      panda: '🐼',
      penguin: '🐧',
      unicorn: '🦄',
      phoenix: '🔥',
    };

    return petTypeEmojis[pet.petType.slug] ?? '🐾';
  }

  getStatBarColor(value: number): string {
    return this.petService.getStatColor(value);
  }

  getTimeRemaining(date: string | null): string {
    return this.petService.formatTimeRemaining(date);
  }
}
