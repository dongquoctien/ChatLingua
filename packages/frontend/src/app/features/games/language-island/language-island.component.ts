import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { ApiService } from '../../../core/services/api.service';

// Building definition
interface BuildingDef {
  id: string;
  name: string;
  description: string;
  category: 'learning' | 'production' | 'decoration';
  icon: string;
  unlockLevel: number;
  cost: { coins: number; gems?: number };
  production: { xp?: number; coins?: number }; // per hour
  size: { x: number; y: number };
  buildTime: number; // seconds
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

// Building definitions
const BUILDINGS: BuildingDef[] = [
  {
    id: 'library',
    name: 'Library',
    description: 'A place to study and learn new words',
    category: 'learning',
    icon: '📚',
    unlockLevel: 1,
    cost: { coins: 100 },
    production: { xp: 5 },
    size: { x: 2, y: 2 },
    buildTime: 30
  },
  {
    id: 'vocabulary_garden',
    name: 'Vocabulary Garden',
    description: 'Grow your word collection here',
    category: 'learning',
    icon: '🌸',
    unlockLevel: 2,
    cost: { coins: 300 },
    production: { xp: 10, coins: 5 },
    size: { x: 3, y: 3 },
    buildTime: 60
  },
  {
    id: 'grammar_tower',
    name: 'Grammar Tower',
    description: 'Master grammar rules from above',
    category: 'learning',
    icon: '🗼',
    unlockLevel: 3,
    cost: { coins: 500, gems: 5 },
    production: { xp: 20 },
    size: { x: 2, y: 3 },
    buildTime: 120
  },
  {
    id: 'coin_fountain',
    name: 'Coin Fountain',
    description: 'Generates coins over time',
    category: 'production',
    icon: '⛲',
    unlockLevel: 2,
    cost: { coins: 400 },
    production: { coins: 15 },
    size: { x: 2, y: 2 },
    buildTime: 90
  },
  {
    id: 'xp_shrine',
    name: 'XP Shrine',
    description: 'A mystical shrine that grants experience',
    category: 'production',
    icon: '⛩️',
    unlockLevel: 4,
    cost: { coins: 800, gems: 10 },
    production: { xp: 30 },
    size: { x: 2, y: 2 },
    buildTime: 180
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
    buildTime: 10
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
    buildTime: 5
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
    buildTime: 60
  },
  {
    id: 'pronunciation_lab',
    name: 'Pronunciation Lab',
    description: 'Practice speaking here',
    category: 'learning',
    icon: '🎙️',
    unlockLevel: 5,
    cost: { coins: 1000, gems: 15 },
    production: { xp: 25, coins: 10 },
    size: { x: 3, y: 2 },
    buildTime: 300
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Guides learners through the fog',
    category: 'decoration',
    icon: '🏠',
    unlockLevel: 4,
    cost: { coins: 600 },
    production: { xp: 5 },
    size: { x: 2, y: 2 },
    buildTime: 120
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
  phase = signal<'island' | 'build' | 'shop' | 'lesson'>('island');
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

  // Collection
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

  totalProductionPerHour = computed(() => {
    let xp = 0;
    let coins = 0;

    for (const placed of this.placedBuildings()) {
      if (placed.isBuilding) continue;
      const def = BUILDINGS.find(b => b.id === placed.buildingId);
      if (def) {
        xp += (def.production.xp || 0) * placed.level;
        coins += (def.production.coins || 0) * placed.level;
      }
    }

    return { xp, coins };
  });

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.initializeIsland();
    this.startProductionTimer();
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

  private startProductionTimer(): void {
    // Check production every 10 seconds
    setInterval(() => {
      this.calculatePendingCollection();
    }, 10000);

    // Initial calculation
    setTimeout(() => this.calculatePendingCollection(), 1000);
  }

  private calculatePendingCollection(): void {
    let totalXp = 0;
    let totalCoins = 0;

    for (const building of this.placedBuildings()) {
      if (building.isBuilding) continue;

      const def = BUILDINGS.find(b => b.id === building.buildingId);
      if (!def) continue;

      const now = new Date();
      const lastCollected = new Date(building.lastCollected);
      const hoursPassed = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);

      // Cap at 8 hours
      const effectiveHours = Math.min(hoursPassed, 8);

      totalXp += Math.floor((def.production.xp || 0) * building.level * effectiveHours);
      totalCoins += Math.floor((def.production.coins || 0) * building.level * effectiveHours);
    }

    this.pendingCollection.set({ xp: totalXp, coins: totalCoins });
  }

  // Navigation
  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  // Shop
  openShop(): void {
    this.phase.set('shop');
  }

  closeShop(): void {
    this.phase.set('island');
    this.selectedBuilding.set(null);
  }

  selectBuildingToBuy(building: BuildingDef): void {
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
    this.selectedPlacedBuilding.set(building);
  }

  closeBuildingInfo(): void {
    this.selectedPlacedBuilding.set(null);
  }

  getBuildingDef(buildingId: string): BuildingDef | undefined {
    return BUILDINGS.find(b => b.id === buildingId);
  }

  // Collection
  collectAll(): void {
    const pending = this.pendingCollection();
    if (pending.xp === 0 && pending.coins === 0) return;

    // Add resources
    this.xp.update(x => x + pending.xp);
    this.coins.update(c => c + pending.coins);

    // Check level up
    while (this.xp() >= this.xpToNextLevel()) {
      this.xp.update(x => x - this.xpToNextLevel());
      this.level.update(l => l + 1);
      this.xpToNextLevel.update(x => Math.floor(x * 1.5));
    }

    // Reset collection times
    this.placedBuildings.update(buildings =>
      buildings.map(b => ({ ...b, lastCollected: new Date() }))
    );

    this.pendingCollection.set({ xp: 0, coins: 0 });
    this.showCollection.set(true);

    setTimeout(() => {
      this.showCollection.set(false);
    }, 2000);
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
