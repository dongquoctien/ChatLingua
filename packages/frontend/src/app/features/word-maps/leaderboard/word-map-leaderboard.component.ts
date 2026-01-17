import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WordMapService, MapLeaderboard, WordMapWithProgress } from '../word-map.service';

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

@Component({
  selector: 'app-word-map-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './word-map-leaderboard.component.html',
  styleUrls: ['./word-map-leaderboard.component.scss']
})
export class WordMapLeaderboardComponent implements OnInit {
  private wordMapService = inject(WordMapService);

  // State
  leaderboard = signal<MapLeaderboard | null>(null);
  maps = signal<WordMapWithProgress[]>([]);
  loading = signal(true);
  selectedMapId = signal<number | undefined>(undefined);
  selectedPeriod = signal<LeaderboardPeriod>('weekly');

  // Computed: Check if user rank should be shown (not in top entries)
  showUserRankSection = computed(() => {
    const lb = this.leaderboard();
    if (!lb?.userRank) return false;
    const userInEntries = lb.entries?.some(e => e.userId === lb.userRank?.userId);
    return !userInEntries;
  });

  // Period options
  periods: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'all_time', label: 'All Time' }
  ];

  ngOnInit(): void {
    this.loadMaps();
    this.loadLeaderboard();
  }

  loadMaps(): void {
    this.wordMapService.getWordMaps().subscribe({
      next: (response) => this.maps.set(response.maps),
      error: (err) => console.error('Error loading maps:', err)
    });
  }

  loadLeaderboard(): void {
    this.loading.set(true);

    this.wordMapService.getLeaderboard(this.selectedMapId(), this.selectedPeriod()).subscribe({
      next: (leaderboard) => {
        this.leaderboard.set(leaderboard);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading leaderboard:', err);
        this.loading.set(false);
      }
    });
  }

  selectMap(mapId: number | undefined): void {
    this.selectedMapId.set(mapId);
    this.loadLeaderboard();
  }

  selectPeriod(period: LeaderboardPeriod): void {
    this.selectedPeriod.set(period);
    this.loadLeaderboard();
  }

  getRankIcon(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  }

  getRankClass(rank: number): string {
    switch (rank) {
      case 1: return 'bg-yellow-100 border-yellow-300';
      case 2: return 'bg-gray-100 border-gray-300';
      case 3: return 'bg-orange-100 border-orange-300';
      default: return 'bg-white border-gray-200';
    }
  }

  getMetricLabel(metric: string): string {
    switch (metric) {
      case 'xp': return 'XP';
      case 'vocabulary': return 'Words';
      case 'streak': return 'Days';
      case 'accuracy': return '%';
      default: return '';
    }
  }
}
