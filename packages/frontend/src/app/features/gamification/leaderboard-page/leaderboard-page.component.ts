import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, LeaderboardResponse } from '../../../core/services/api.service';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent, FontAwesomeModule],
  template: `
    @if (loading()) {
      <div class="loading-container">
        <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
        <p>Loading leaderboard...</p>
      </div>
    } @else if (error()) {
      <div class="error-container">
        <p>{{ error() }}</p>
        <button (click)="loadLeaderboard()">Try Again</button>
      </div>
    } @else {
      <app-leaderboard
        [leaderboard]="leaderboard()"
        (userClick)="onUserClick($event)">
      </app-leaderboard>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: #666;

      fa-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #3f51b5;
      }

      button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #3f51b5;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background: #303f9f;
        }
      }
    }
  `]
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
