import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type PetAnimation = 'idle' | 'happy' | 'eating' | 'playing' | 'sleeping' | 'sad';
export type PetSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'weapon' | 'back' | 'feet';

interface PetSpriteData {
  // 8x8 pixel grid, each number is a color index
  pixels: number[][];
  // Color palette for this pet
  palette: string[];
}

export interface EquipmentOverlay {
  slot: EquipmentSlot;
  emoji?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-pet-sprite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-sprite.component.html',
  styleUrls: ['./pet-sprite.component.scss'],
})
export class PetSpriteComponent {
  @Input() petSlug: string = 'kitten';
  @Input() imageUrl: string = ''; // Direct image URL (from database)
  @Input() animation: PetAnimation = 'idle';
  @Input() size: PetSize = 'md';
  @Input() showShadow: boolean = true;
  @Input() equipment: EquipmentOverlay[] = [];

  private useFallbackSvg = false;

  // SQKhor SVG pets mapping - maps pet slugs to SQKhor SVG filenames
  // These beautiful pixel art SVGs are from sqkhor.com
  private readonly sqkhorPetMap: Record<string, string> = {
    // === CATS ===
    'kitten': 'cat',
    'cat': 'cat-sit',
    'lion-cat': 'lion',
    'cat-black': 'cat-black',
    'cat-orange': 'cat-orange',
    'cat-grey': 'cat-grey',
    'cat-white': 'cat-white',
    'cat-tabby': 'cat-tabby',
    'cat-calico': 'cat-calico',
    'nyan-cat': 'nyan-cat',

    // === DOGS ===
    'puppy': 'dog',
    'dog': 'dog-beagle',
    'wolf-dog': 'dog-shiba',
    'shiba': 'dog-shiba',
    'beagle': 'dog-beagle',

    // === FOXES ===
    'fox-kit': 'fox',
    'fox': 'fox',
    'nine-tail-fox': 'fox',
    'firefox': 'firefox',

    // === OWLS ===
    'owlet': 'owl-2',
    'owl': 'owl-1',
    'great-owl': 'owl-1',

    // === BEARS ===
    'bear': 'bear',
    'panda': 'panda',
    'koala': 'koala',
    'koala-hug': 'koala-hug',

    // === BIRDS ===
    'penguin': 'penguin',
    'duck': 'duck',
    'rubber-duck': 'rubber-duck',

    // === RABBITS ===
    'rabbit': 'rabbit-white',
    'bunny': 'rabbit-grey',
    'rabbit-white': 'rabbit-white',
    'rabbit-grey': 'rabbit-grey',

    // === PRIMATES ===
    'monkey': 'monkey',
    'monkey-love': 'monkey-love',
    'monkey-walk': 'monkey-walk',

    // === FARM ANIMALS ===
    'pig': 'pig',
    'cow': 'cow',
    'sheep': 'sheep',
    'horse': 'horse',

    // === WILD ANIMALS ===
    'elephant': 'elephant',
    'lion': 'lion',
    'tiger': 'tiger',
    'tiger-walk': 'tiger-walk',
    'sloth': 'sloth',
    'raccoon': 'raccoon',
    'frog': 'frog',

    // === AQUATIC ===
    'dolphin': 'dolphin',
    'whale': 'whale',
    'fish': 'fish',
    'clownfish': 'clownfish',
    'crab': 'crab',

    // === INSECTS ===
    'bee': 'bee',
    'bee-side': 'bee-side',

    // === UNIQUE ANIMALS ===
    'alpaca': 'alpaca',
    'capybara': 'capybara',

    // === POKEMON ===
    'pikachu': 'pikachu',
    'surprised-pikachu': 'surprised-pikachu',
    'eevee': 'eevee',
    'bulbasaur': 'bulbasaur',
    'charmander': 'charmander',
    'squirtle': 'squirtle',
    'chikorita': 'chikorita',
    'cyndaquil': 'cyndaquil',
    'totodile': 'totodile',
    'psyduck': 'psyduck',
  };

  // Legacy PNG pets from kenney pack (fallback)
  private readonly availablePngPets = new Set([
    'buffalo', 'chick', 'chicken', 'crocodile', 'duck',
    'giraffe', 'goat', 'gorilla', 'hippo', 'moose', 'narwhal',
    'parrot', 'rhino', 'snake', 'walrus', 'zebra'
  ]);

  constructor(private sanitizer: DomSanitizer) {}

  // Check if we have a SQKhor SVG for this pet
  hasSqkhorSvg(): boolean {
    return this.petSlug in this.sqkhorPetMap;
  }

  getSqkhorSvgUrl(): string {
    const svgName = this.sqkhorPetMap[this.petSlug] || this.petSlug;
    return `/assets/icons/pixel/sqkhor/individual/${svgName}.svg`;
  }

  hasPngAsset(): boolean {
    return !this.useFallbackSvg && this.availablePngPets.has(this.petSlug);
  }

  getPngAssetUrl(): string {
    return `/assets/pets/${this.petSlug}.png`;
  }

  onImageError(event: Event): void {
    // If PNG fails to load, fall back to SVG
    this.useFallbackSvg = true;
  }

  // Get equipment by slot
  getEquipment(slot: EquipmentSlot): EquipmentOverlay | undefined {
    return this.equipment.find(e => e.slot === slot);
  }

  // Get equipment emoji font size based on pet size
  get equipmentFontSize(): number {
    const sizeMap: Record<PetSize, number> = {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 28,
      xl: 36,
    };
    return sizeMap[this.size];
  }

  // Size mapping
  private sizeMap: Record<PetSize, number> = {
    xs: 32,
    sm: 48,
    md: 64,
    lg: 96,
    xl: 128,
  };

  get pixelSize(): number {
    return this.sizeMap[this.size];
  }

  get animationClass(): string {
    return `pet-animation-${this.animation}`;
  }

  // Pet sprite data - 8x8 pixel art
  // 0 = transparent, other numbers = palette index
  private petSprites: Record<string, PetSpriteData> = {
    // === CAT EVOLUTION LINE ===
    kitten: {
      pixels: [
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 1, 2, 1, 1, 2, 1, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 2, 3, 2, 2, 3, 2, 0],
        [0, 2, 2, 4, 4, 2, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      palette: ['transparent', '#4a4a4a', '#8b8b8b', '#2d2d2d', '#ffb6c1'],
    },
    cat: {
      pixels: [
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 2, 2, 1, 1, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [2, 2, 3, 2, 2, 3, 2, 2],
        [2, 2, 2, 4, 4, 2, 2, 2],
        [0, 2, 2, 2, 2, 2, 2, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#3d3d3d', '#6b6b6b', '#1a1a1a', '#ff9999'],
    },
    'lion-cat': {
      pixels: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 2, 2, 1, 1, 2, 2, 1],
        [1, 2, 3, 2, 2, 3, 2, 1],
        [1, 2, 2, 4, 4, 2, 2, 1],
        [0, 2, 2, 2, 2, 2, 2, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#d4a44a', '#f5d98a', '#2d2d2d', '#ff6b6b'],
    },

    // === DOG EVOLUTION LINE ===
    puppy: {
      pixels: [
        [0, 1, 0, 0, 0, 0, 1, 0],
        [1, 2, 1, 0, 0, 1, 2, 1],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 2, 3, 2, 2, 3, 2, 0],
        [0, 2, 2, 4, 4, 2, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      palette: ['transparent', '#8b6914', '#c9a227', '#2d2d2d', '#ffb6c1'],
    },
    dog: {
      pixels: [
        [1, 1, 0, 0, 0, 0, 1, 1],
        [2, 1, 1, 0, 0, 1, 1, 2],
        [0, 2, 2, 2, 2, 2, 2, 0],
        [0, 2, 3, 2, 2, 3, 2, 0],
        [0, 2, 2, 4, 4, 2, 2, 0],
        [0, 2, 2, 2, 2, 2, 2, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#7a5c1e', '#b8922e', '#1a1a1a', '#ff9999'],
    },
    'wolf-dog': {
      pixels: [
        [1, 1, 0, 0, 0, 0, 1, 1],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 3, 2, 2, 3, 2, 2],
        [1, 2, 2, 4, 4, 2, 2, 1],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#4a4a4a', '#7a7a7a', '#1a1a1a', '#ff6b6b'],
    },

    // === FOX EVOLUTION LINE ===
    'fox-kit': {
      pixels: [
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 1, 2, 1, 1, 2, 1, 0],
        [0, 1, 3, 3, 3, 3, 1, 0],
        [0, 2, 4, 3, 3, 4, 2, 0],
        [0, 2, 3, 5, 5, 3, 2, 0],
        [0, 0, 3, 3, 3, 3, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      palette: ['transparent', '#c75d2c', '#ff7f3f', '#ffffff', '#2d2d2d', '#ffb6c1'],
    },
    fox: {
      pixels: [
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 2, 2, 1, 1, 2, 2, 1],
        [1, 2, 3, 3, 3, 3, 2, 1],
        [2, 2, 4, 3, 3, 4, 2, 2],
        [2, 2, 3, 5, 5, 3, 2, 2],
        [0, 3, 3, 3, 3, 3, 3, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#a34a1f', '#e86a2c', '#ffffff', '#1a1a1a', '#ff9999'],
    },
    'nine-tail-fox': {
      pixels: [
        [1, 1, 1, 0, 0, 1, 1, 1],
        [2, 2, 2, 1, 1, 2, 2, 2],
        [2, 2, 3, 3, 3, 3, 2, 2],
        [2, 3, 4, 3, 3, 4, 3, 2],
        [2, 3, 3, 5, 5, 3, 3, 2],
        [1, 3, 3, 3, 3, 3, 3, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 0, 1, 0, 0, 1, 0, 1],
      ],
      palette: ['transparent', '#ffd700', '#ffaa00', '#ffffff', '#8b0000', '#ff69b4'],
    },

    // === OWL EVOLUTION LINE ===
    owlet: {
      pixels: [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 2, 3, 2, 2, 3, 2, 0],
        [0, 2, 4, 2, 2, 4, 2, 0],
        [0, 0, 2, 5, 5, 2, 0, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      palette: ['transparent', '#5c4033', '#8b7355', '#ffffff', '#2d2d2d', '#ffcc00'],
    },
    owl: {
      pixels: [
        [0, 1, 1, 1, 1, 1, 1, 0],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 3, 2, 2, 3, 2, 1],
        [1, 2, 4, 2, 2, 4, 2, 1],
        [0, 1, 2, 5, 5, 2, 1, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
      ],
      palette: ['transparent', '#4a3728', '#7a6548', '#ffffff', '#1a1a1a', '#ffa500'],
    },
    'great-owl': {
      pixels: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [2, 2, 3, 2, 2, 3, 2, 2],
        [2, 2, 4, 2, 2, 4, 2, 2],
        [1, 2, 2, 5, 5, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [0, 1, 1, 0, 0, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0],
      ],
      palette: ['transparent', '#3d2817', '#6b4423', '#f0f0f0', '#ffd700', '#ff4500'],
    },
  };

  // Fallback sprite for unknown pets
  private defaultSprite: PetSpriteData = {
    pixels: [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 3, 2, 2, 3, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 4, 4, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    palette: ['transparent', '#6b6b6b', '#9b9b9b', '#2d2d2d', '#ffb6c1'],
  };

  get spriteData(): PetSpriteData {
    return this.petSprites[this.petSlug] ?? this.defaultSprite;
  }

  generateSvg(): SafeHtml {
    const data = this.spriteData;
    const gridSize = data.pixels.length;
    const cellSize = this.pixelSize / gridSize;

    let rects = '';
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const colorIndex = data.pixels[y][x];
        if (colorIndex > 0) {
          const color = data.palette[colorIndex];
          rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        }
      }
    }

    const svg = `
      <svg
        width="${this.pixelSize}"
        height="${this.pixelSize}"
        viewBox="0 0 ${this.pixelSize} ${this.pixelSize}"
        xmlns="http://www.w3.org/2000/svg"
        style="image-rendering: pixelated;"
      >
        ${rects}
      </svg>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
