import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, UserAchievementInfo } from '../../../core/services/api.service';
import { AchievementListComponent } from '../achievement-list/achievement-list.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-achievements-page',
  standalone: true,
  imports: [CommonModule, AchievementListComponent, FontAwesomeModule],
  template: `
    @if (loading()) {
      <div class="loading-container">
        <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
        <p>Loading achievements...</p>
      </div>
    } @else if (error()) {
      <div class="error-container">
        <p>{{ error() }}</p>
        <button (click)="loadAchievements()">Try Again</button>
      </div>
    } @else {
      <app-achievement-list
        [achievements]="achievements()"
        (achievementClick)="onAchievementClick($event)">
      </app-achievement-list>
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
export class AchievementsPageComponent implements OnInit {
  private apiService = inject(ApiService);

  faSpinner = faSpinner;

  loading = signal(true);
  error = signal<string | null>(null);
  achievements = signal<UserAchievementInfo[]>([]);

  ngOnInit() {
    this.loadAchievements();
  }

  loadAchievements() {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getAchievements().subscribe({
      next: (data: UserAchievementInfo[]) => {
        this.achievements.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Failed to load achievements');
        this.loading.set(false);
      }
    });
  }

  onAchievementClick(achievement: UserAchievementInfo) {
    // Mark as seen if it's new
    if (achievement.isNew) {
      this.apiService.markAchievementSeen(achievement.id).subscribe(() => {
        // Update the local state
        const updated = this.achievements().map(a =>
          a.id === achievement.id ? { ...a, isNew: false } : a
        );
        this.achievements.set(updated);
      });
    }
  }
}
