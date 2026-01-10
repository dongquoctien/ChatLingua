import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WordMapService, UserProgressOverview, StudyStats, MapLeaderboard } from '../word-map.service';

@Component({
  selector: 'app-word-map-progress',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './word-map-progress.component.html',
  styleUrls: ['./word-map-progress.component.scss']
})
export class WordMapProgressComponent implements OnInit {
  private wordMapService = inject(WordMapService);

  // State
  progress = signal<UserProgressOverview | null>(null);
  stats = signal<StudyStats | null>(null);
  leaderboard = signal<MapLeaderboard | null>(null);
  loading = signal(true);
  selectedPeriod = signal<'today' | 'week' | 'month' | 'all'>('week');

  // Computed
  vocabularyMasteryPercent = computed(() => {
    const p = this.progress();
    if (!p || p.vocabularyStats.total === 0) return 0;
    return Math.round((p.vocabularyStats.mastered / p.vocabularyStats.total) * 100);
  });

  grammarMasteryPercent = computed(() => {
    const p = this.progress();
    if (!p || p.grammarStats.total === 0) return 0;
    return Math.round((p.grammarStats.mastered / p.grammarStats.total) * 100);
  });

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    this.loading.set(true);

    // Load all data in parallel
    this.wordMapService.getUserProgress().subscribe({
      next: (progress) => {
        this.progress.set(progress);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading progress:', err);
        this.loading.set(false);
      }
    });

    this.wordMapService.getStudyStats(this.selectedPeriod()).subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Error loading stats:', err)
    });

    this.wordMapService.getLeaderboard(undefined, 'weekly').subscribe({
      next: (leaderboard) => this.leaderboard.set(leaderboard),
      error: (err) => console.error('Error loading leaderboard:', err)
    });
  }

  changePeriod(period: 'today' | 'week' | 'month' | 'all'): void {
    this.selectedPeriod.set(period);
    this.wordMapService.getStudyStats(period).subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Error loading stats:', err)
    });
  }

  formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'mastered': return 'bg-green-500';
      case 'reviewing': return 'bg-blue-500';
      case 'learning': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  }
}
