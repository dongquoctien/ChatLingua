import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ForumService, LeaderboardEntry } from '../../services/forum.service';

type LeaderboardPeriod = 'week' | 'month' | 'all';

@Component({
  selector: 'app-forum-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgClass],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class LeaderboardComponent implements OnInit {
  private readonly forumService = inject(ForumService);

  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  period = signal<LeaderboardPeriod>('all');

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getLeaderboard(50, this.period()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load leaderboard:', err);
        this.error.set('Failed to load leaderboard. Please try again.');
        this.loading.set(false);
      }
    });
  }

  setPeriod(period: LeaderboardPeriod): void {
    if (this.period() !== period) {
      this.period.set(period);
      this.loadLeaderboard();
    }
  }

  getRankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }

  getForumRankClass(forumRank: string): string {
    const rankMap: Record<string, string> = {
      newcomer: 'rank-newcomer',
      contributor: 'rank-contributor',
      active_contributor: 'rank-active',
      trusted_contributor: 'rank-trusted',
      expert: 'rank-expert',
      master: 'rank-master',
      legend: 'rank-legend'
    };
    return rankMap[forumRank] || 'rank-newcomer';
  }

  getForumRankLabel(forumRank: string): string {
    const labelMap: Record<string, string> = {
      newcomer: 'Newcomer',
      contributor: 'Contributor',
      active_contributor: 'Active',
      trusted_contributor: 'Trusted',
      expert: 'Expert',
      master: 'Master',
      legend: 'Legend'
    };
    return labelMap[forumRank] || 'Newcomer';
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || '?';
  }
}
