import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameWithStats, UserCurrency, GameSessionInfo, GamesHubData } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { AudioControlComponent } from '../shared/audio-control/audio-control.component';

@Component({
  selector: 'app-games-hub',
  standalone: true,
  imports: [CommonModule, AudioControlComponent],
  templateUrl: './games-hub.component.html',
  styleUrls: ['./games-hub.component.scss']
})
export class GamesHubComponent implements OnInit, OnDestroy {
  games = signal<GameWithStats[]>([]);
  currency = signal<UserCurrency | null>(null);
  recentSessions = signal<GameSessionInfo[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

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
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.loadHubData();
    // Start background music when entering Game Hub
    this.audioService.playMusic();
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
    this.audioService.playSound('click');
  }

  playGame(gameCode: string): void {
    this.audioService.playSound('select');
    this.router.navigate(['/games', gameCode]);
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
}
