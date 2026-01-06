import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PetService, UserPet, PetState, PetEvolutionStage, EggHatchResult } from '../../services/pet.service';
import { PetSpriteComponent, PetAnimation } from '../../components/pet-sprite/pet-sprite.component';
import { PetCareGuideComponent } from '../../components/pet-care-guide/pet-care-guide.component';

@Component({
  selector: 'app-pets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PetSpriteComponent, PetCareGuideComponent],
  templateUrl: './pets-list.component.html',
  styleUrls: ['./pets-list.component.scss'],
})
export class PetsListComponent implements OnInit {
  private petService = inject(PetService);

  pets = signal<UserPet[]>([]);
  eggs = signal<UserPet[]>([]);
  activePet = this.petService.activePet;
  petState = this.petService.petState;
  loading = signal(true);
  error = signal<string | null>(null);
  switchingPet = signal<number | null>(null);
  hatchingEgg = signal<number | null>(null);
  hatchResult = signal<EggHatchResult | null>(null);
  showGuide = signal(false);

  // Computed: separate eggs from hatched pets
  hatchedPets = computed(() => this.pets().filter(p => p.isHatched));

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load both eggs and hatched pets
    this.petService.getMyPets().subscribe({
      next: (allPets) => {
        // Separate eggs from hatched pets
        this.eggs.set(allPets.filter(p => !p.isHatched));
        this.pets.set(allPets.filter(p => p.isHatched));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Failed to load pets');
        this.loading.set(false);
      },
    });

    // Also refresh active pet state
    this.petService.getActivePet().subscribe();
  }

  setActivePet(petId: number): void {
    if (this.activePet()?.id === petId) return;

    this.switchingPet.set(petId);
    this.petService.setActivePet(petId).subscribe({
      next: () => {
        this.switchingPet.set(null);
        this.loadPets();
      },
      error: () => {
        this.switchingPet.set(null);
      },
    });
  }

  hatchEgg(eggId: number): void {
    this.hatchingEgg.set(eggId);
    this.hatchResult.set(null);

    this.petService.hatchEgg(eggId).subscribe({
      next: (result) => {
        this.hatchingEgg.set(null);
        this.hatchResult.set(result);
        // Reload pets to reflect changes
        this.loadPets();
      },
      error: (err) => {
        this.hatchingEgg.set(null);
        this.error.set(err.error?.message ?? 'Failed to hatch egg');
      },
    });
  }

  closeHatchResult(): void {
    this.hatchResult.set(null);
  }

  getEggImageUrl(rarity: string): string {
    return this.petService.getEggImageUrl(rarity);
  }

  getHatchProgress(egg: UserPet): { xpPercent: number; timePercent: number; overallPercent: number } {
    return this.petService.getHatchProgress(egg);
  }

  canEggHatch(egg: UserPet): boolean {
    return this.petService.canEggHatch(egg);
  }

  getTimeRemaining(egg: UserPet): string {
    if (!egg.hatchStartedAt || !egg.petType?.hatchHoursMin) return 'Ready';

    const hoursRequired = egg.petType.hatchHoursMin;
    const startTime = new Date(egg.hatchStartedAt).getTime();
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

  getPetEmoji(slug: string): string {
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

  getRarityColor(rarity: string): string {
    return this.petService.getRarityColor(rarity);
  }

  getRarityBgColor(rarity: string): string {
    return this.petService.getRarityBgColor(rarity);
  }

  getEvolutionStageLabel(stage?: PetEvolutionStage | number): string {
    return this.petService.getEvolutionStageLabel(stage);
  }

  getMoodEmoji(mood: string): string {
    return this.petService.getMoodEmoji(mood);
  }

  getStatColor(value: number): string {
    return this.petService.getStatColor(value);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
