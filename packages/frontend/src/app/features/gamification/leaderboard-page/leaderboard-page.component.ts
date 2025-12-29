import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, LeaderboardResponse } from '../../../core/services/api.service';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '../../../shared/icons';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent, FontAwesomeModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrl: './leaderboard-page.component.scss',
})
export class LeaderboardPageComponent implements OnInit {
  private apiService = inject(ApiService);

  faSpinner = faSpinner;

  loading = signal(true);
  error = signal<string | null>(null);
  leaderboard = signal<LeaderboardResponse>({
    weekStart: '',
    weekEnd: '',
    entries: [],
    totalParticipants: 0
  });

  ngOnInit() {
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getLeaderboard().subscribe({
      next: (data: LeaderboardResponse) => {
        this.leaderboard.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Failed to load leaderboard');
        this.loading.set(false);
      }
    });
  }

  onUserClick(user: any) {
    // Could navigate to user profile or show details
    console.log('User clicked:', user);
  }
}
