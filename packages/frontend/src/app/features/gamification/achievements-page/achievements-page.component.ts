import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, UserAchievementInfo } from '../../../core/services/api.service';
import { AchievementListComponent } from '../achievement-list/achievement-list.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '../../../shared/icons';

@Component({
  selector: 'app-achievements-page',
  standalone: true,
  imports: [CommonModule, AchievementListComponent, FontAwesomeModule],
  templateUrl: './achievements-page.component.html',
  styleUrl: './achievements-page.component.scss',
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
