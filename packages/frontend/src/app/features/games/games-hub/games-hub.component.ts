import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faShoppingBag } from '../../../shared/icons';
import { ApiService, GameWithStats, UserCurrency, GameSessionInfo, GamesHubData, GameVocabularySources, GameSourceType } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { AudioControlComponent } from '../shared/audio-control/audio-control.component';
import { ShopService, ActiveBooster } from '../../shop/shop.service';

@Component({
  selector: 'app-games-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule, AudioControlComponent],
  templateUrl: './games-hub.component.html',
  styleUrls: ['./games-hub.component.scss']
})
export class GamesHubComponent implements OnInit, OnDestroy {
  // Icons
  faShoppingBag = faShoppingBag;

  games = signal<GameWithStats[]>([]);
  currency = signal<UserCurrency | null>(null);
  recentSessions = signal<GameSessionInfo[]>([]);
  activeBoosters = signal<ActiveBooster[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Vocabulary source filter state
  vocabSources = signal<GameVocabularySources | null>(null);
  selectedSourceType = signal<GameSourceType>('all');
  selectedMapId = signal<number | null>(null);
  prioritizeLowMastery = signal(true);
  showVocabFilter = signal(false);

  // Icon map for FA names to emojis
  private iconMap: Record<string, string> = {
    'fa-bolt': '⚡',
    'fa-clone': '🃏',
    'fa-user-secret': '🎭',
    'fa-spell-check': '📝',
    'fa-puzzle-piece': '🧩',
    'fa-brain': '🧠',
    'fa-gamepad': '🎮',
    'fa-trophy': '🏆',
    'fa-star': '⭐',
    'fa-fire': '🔥',
    'fa-arrow-down': '⬇️',
    'fa-th': '🔠',
    'fa-search': '🔍',
    'fa-random': '🔀',
    // Phase 3: Competitive Games
    'fa-swords': '🤺',
    'fa-circle': '🎈',
    'fa-flag-checkered': '🏎️',
    // Phase 4: Adventure & Collection Games
    'fa-dragon': '🐉',
    'fa-layer-group': '🃏',
    'fa-island-tropical': '🏝️',
  };

  // Game categories for filtering (must match GameCategory type from API)
  categories = [
    { id: 'all', name: 'All Games', icon: '🎮' },
    { id: 'speed', name: 'Speed', icon: '⚡' },
    { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
    { id: 'audio', name: 'Audio', icon: '🔊' },
    { id: 'competitive', name: 'Competitive', icon: '🏆' },
    { id: 'adventure', name: 'Adventure', icon: '🗺️' },
    { id: 'collection', name: 'Collection', icon: '🃏' },
  ];
  selectedCategory = signal('all');

  filteredGames = computed(() => {
    const category = this.selectedCategory();
    const allGames = this.games();
    if (category === 'all') return allGames;
    return allGames.filter(g => g.category === category);
  });

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private audioService: AudioService,
    private shopService: ShopService
  ) {}

  ngOnInit(): void {
    // Restore filters from URL query params
    this.restoreFiltersFromUrl();
    this.loadHubData();
    this.loadActiveBoosters();
    this.loadVocabSources();
    // Start background music when entering Game Hub
    this.audioService.playMusic();
  }

  private restoreFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    if (params['category']) this.selectedCategory.set(params['category']);
    if (params['source']) this.selectedSourceType.set(params['source'] as GameSourceType);
    if (params['mapId']) this.selectedMapId.set(parseInt(params['mapId'], 10));
    if (params['lowMastery'] !== undefined) this.prioritizeLowMastery.set(params['lowMastery'] === 'true');
    // Show vocab filter panel if any filter is active
    if (params['source'] || params['mapId']) {
      this.showVocabFilter.set(true);
    }
  }

  private updateUrlWithFilters(): void {
    const queryParams: Record<string, string | number | boolean | null> = {};
    if (this.selectedCategory() !== 'all') queryParams['category'] = this.selectedCategory();
    if (this.selectedSourceType() !== 'all') queryParams['source'] = this.selectedSourceType();
    if (this.selectedMapId()) queryParams['mapId'] = this.selectedMapId()!;
    if (!this.prioritizeLowMastery()) queryParams['lowMastery'] = 'false';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  ngOnDestroy(): void {
    // Stop music when leaving Game Hub (unless going to a game)
    // Music will continue in game components
  }

  loadHubData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.getGamesHub().subscribe({
      next: (data: GamesHubData) => {
        this.games.set(data.games);
        this.currency.set(data.userCurrency);
        this.recentSessions.set(data.recentSessions);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading games hub:', err);
        this.error.set('Failed to load games. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.updateUrlWithFilters();
    this.audioService.playSound('click');
  }

  playGame(gameCode: string): void {
    this.audioService.playSound('select');
    // Pass vocabulary source options as query params for the game component to use
    const queryParams: Record<string, string | number | boolean> = {};

    if (this.selectedSourceType() !== 'all') {
      queryParams['sourceType'] = this.selectedSourceType();
    }
    if (this.selectedMapId()) {
      queryParams['mapId'] = this.selectedMapId()!;
    }
    if (!this.prioritizeLowMastery()) {
      queryParams['prioritizeLowMastery'] = false;
    }

    this.router.navigate(['/games', gameCode], {
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });
  }

  viewLeaderboard(gameCode: string): void {
    this.audioService.playSound('click');
    this.router.navigate(['/games', gameCode, 'leaderboard']);
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return '';
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  }

  getGameIcon(icon: string | null | undefined): string {
    if (!icon) return '🎮';
    return this.iconMap[icon] || icon || '🎮';
  }

  loadActiveBoosters(): void {
    this.shopService.getActiveBoosters().subscribe({
      next: (boosters) => {
        this.activeBoosters.set(boosters);
      },
      error: (err) => {
        console.error('Error loading active boosters:', err);
      }
    });
  }

  getBoosterIcon(effectType: string): string {
    const icons: Record<string, string> = {
      'xp_multiplier': '⚡',
      'coin_multiplier': '🪙',
      'streak_protection': '🛡️',
      'hint_reveal': '💡',
      'time_freeze': '❄️',
      'double_score': '✨',
    };
    return icons[effectType] || '🎯';
  }

  getBoosterColor(effectType: string): string {
    const colors: Record<string, string> = {
      'xp_multiplier': 'bg-yellow-100 text-yellow-700',
      'coin_multiplier': 'bg-amber-100 text-amber-700',
      'streak_protection': 'bg-blue-100 text-blue-700',
      'hint_reveal': 'bg-purple-100 text-purple-700',
      'time_freeze': 'bg-cyan-100 text-cyan-700',
      'double_score': 'bg-green-100 text-green-700',
    };
    return colors[effectType] || 'bg-gray-100 text-gray-700';
  }

  formatBoosterTime(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  // Vocabulary source filter methods
  loadVocabSources(): void {
    this.apiService.getGameVocabularySources().subscribe({
      next: (sources) => {
        this.vocabSources.set(sources);
      },
      error: (err) => {
        console.error('Error loading vocabulary sources:', err);
      }
    });
  }

  toggleVocabFilter(): void {
    this.showVocabFilter.update(v => !v);
    this.audioService.playSound('click');
  }

  onSourceTypeChange(sourceType: GameSourceType): void {
    this.selectedSourceType.set(sourceType);
    // Reset mapId if not word_map
    if (sourceType !== 'word_map') {
      this.selectedMapId.set(null);
    }
    this.updateUrlWithFilters();
    this.audioService.playSound('click');
  }

  onMapChange(mapId: number | null): void {
    this.selectedMapId.set(mapId);
    this.updateUrlWithFilters();
    this.audioService.playSound('click');
  }

  togglePrioritizeLowMastery(): void {
    this.prioritizeLowMastery.update(v => !v);
    this.updateUrlWithFilters();
    this.audioService.playSound('click');
  }

  getTotalVocabCount(): number {
    const sources = this.vocabSources();
    if (!sources) return 0;

    const sourceType = this.selectedSourceType();
    const mapId = this.selectedMapId();

    if (mapId) {
      const map = sources.maps.find(m => m.id === mapId);
      return map?.vocabularyCount || 0;
    }

    switch (sourceType) {
      case 'conversation':
        return sources.conversationCount;
      case 'word_map':
        return sources.wordMapCount;
      default:
        return sources.conversationCount + sources.wordMapCount;
    }
  }

  getVocabSourceLabel(): string {
    const sourceType = this.selectedSourceType();
    const mapId = this.selectedMapId();

    if (mapId) {
      const sources = this.vocabSources();
      const map = sources?.maps.find(m => m.id === mapId);
      return map?.name || 'Word Map';
    }

    switch (sourceType) {
      case 'conversation':
        return 'Conversations';
      case 'word_map':
        return 'Word Maps';
      default:
        return 'All Sources';
    }
  }
}
