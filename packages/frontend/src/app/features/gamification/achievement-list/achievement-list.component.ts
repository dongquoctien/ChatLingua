import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faLock, faStar, faFire, faBolt,
  faGraduationCap, faCheckCircle, faClock, faRocket
} from '@fortawesome/free-solid-svg-icons';
import { UserAchievementInfo } from '../../../core/services/api.service';

type AchievementCategory = 'all' | 'learning' | 'streak' | 'quiz' | 'speed' | 'milestone';

@Component({
  selector: 'app-achievement-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTabsModule,
    MatBadgeModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="achievement-list-container">
      <div class="header">
        <h2>
          <fa-icon [icon]="faTrophy" class="trophy-icon"></fa-icon>
          Achievements
        </h2>
        <div class="summary">
          <span class="unlocked-count">{{ unlockedCount() }}/{{ achievements.length }}</span>
          <span class="unlocked-label">Unlocked</span>
        </div>
      </div>

      <!-- Category Tabs -->
      <mat-tab-group (selectedIndexChange)="onCategoryChange($event)" animationDuration="200ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <span [matBadge]="getNewCount('all')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('all') === 0">
              All
            </span>
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <fa-icon [icon]="faGraduationCap"></fa-icon>
            <span [matBadge]="getNewCount('learning')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('learning') === 0">
              Learning
            </span>
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <fa-icon [icon]="faFire"></fa-icon>
            <span [matBadge]="getNewCount('streak')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('streak') === 0">
              Streak
            </span>
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <fa-icon [icon]="faCheckCircle"></fa-icon>
            <span [matBadge]="getNewCount('quiz')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('quiz') === 0">
              Quiz
            </span>
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <fa-icon [icon]="faClock"></fa-icon>
            <span [matBadge]="getNewCount('speed')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('speed') === 0">
              Speed
            </span>
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <fa-icon [icon]="faRocket"></fa-icon>
            <span [matBadge]="getNewCount('milestone')" matBadgeColor="accent" [matBadgeHidden]="getNewCount('milestone') === 0">
              Milestone
            </span>
          </ng-template>
        </mat-tab>
      </mat-tab-group>

      <!-- Achievement Grid -->
      <div class="achievements-grid">
        @for (achievement of filteredAchievements(); track achievement.id) {
          <div class="achievement-card"
               [class.unlocked]="achievement.isUnlocked"
               [class.new]="achievement.isNew"
               (click)="onAchievementClick(achievement)">

            <!-- Unlock Glow Effect -->
            @if (achievement.isNew) {
              <div class="new-glow"></div>
            }

            <!-- Achievement Icon -->
            <div class="achievement-icon" [class.locked]="!achievement.isUnlocked">
              @if (achievement.isUnlocked) {
                <fa-icon [icon]="getIcon(achievement.icon)" [style.color]="getCategoryColor(achievement.category)"></fa-icon>
              } @else {
                <fa-icon [icon]="faLock" class="lock-icon"></fa-icon>
              }
            </div>

            <!-- Content -->
            <div class="achievement-content">
              <h4 class="achievement-name">{{ achievement.name }}</h4>
              <p class="achievement-description">{{ achievement.description }}</p>

              <!-- Progress Bar (if not unlocked) -->
              @if (!achievement.isUnlocked) {
                <div class="progress-section">
                  <mat-progress-bar mode="determinate" [value]="achievement.progressPercentage"></mat-progress-bar>
                  <span class="progress-text">{{ achievement.progressValue }}/{{ achievement.progressTarget }}</span>
                </div>
              }

              <!-- XP Reward -->
              <div class="xp-reward" [class.earned]="achievement.isUnlocked">
                <fa-icon [icon]="faBolt"></fa-icon>
                {{ achievement.xpReward }} XP
              </div>
            </div>

            <!-- Unlocked Date -->
            @if (achievement.isUnlocked && achievement.unlockedAt) {
              <div class="unlocked-date">
                <fa-icon [icon]="faCheckCircle"></fa-icon>
                {{ formatDate(achievement.unlockedAt) }}
              </div>
            }

            <!-- New Badge -->
            @if (achievement.isNew) {
              <div class="new-badge">NEW!</div>
            }
          </div>
        }
      </div>

      @if (filteredAchievements().length === 0) {
        <div class="empty-state">
          <fa-icon [icon]="faTrophy" class="empty-icon"></fa-icon>
          <p>No achievements in this category yet</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .achievement-list-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
        font-size: 1.5rem;
        color: #333;

        .trophy-icon {
          color: #ffd700;
        }
      }

      .summary {
        display: flex;
        flex-direction: column;
        align-items: flex-end;

        .unlocked-count {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4caf50;
        }

        .unlocked-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
        }
      }
    }

    mat-tab-group {
      ::ng-deep {
        .mat-mdc-tab {
          min-width: 80px;
        }
        .mat-mdc-tab-label-container {
          fa-icon {
            margin-right: 0.5rem;
          }
        }
      }
    }

    .achievements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .achievement-card {
      position: relative;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 12px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      gap: 1rem;
      overflow: hidden;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      &.unlocked {
        background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
        border-color: #ffd700;

        .achievement-icon {
          background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
          color: white;
        }
      }

      &.new {
        animation: glow-pulse 2s ease-in-out infinite;
      }
    }

    .new-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at center, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
      pointer-events: none;
    }

    .achievement-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      fa-icon {
        font-size: 1.5rem;
      }

      &.locked {
        background: #ccc;

        .lock-icon {
          color: #999;
        }
      }
    }

    .achievement-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .achievement-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
    }

    .achievement-description {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
      line-height: 1.4;
    }

    .progress-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;

      mat-progress-bar {
        flex: 1;
        height: 6px;
        border-radius: 3px;
      }

      .progress-text {
        font-size: 0.75rem;
        color: #666;
        white-space: nowrap;
      }
    }

    .xp-reward {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: #999;
      margin-top: 0.25rem;

      fa-icon {
        color: #ccc;
      }

      &.earned {
        color: #ff8c00;

        fa-icon {
          color: #ffd700;
        }
      }
    }

    .unlocked-date {
      position: absolute;
      bottom: 0.5rem;
      right: 0.75rem;
      font-size: 0.7rem;
      color: #4caf50;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .new-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      color: white;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      animation: pulse 1s ease-in-out infinite;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #999;

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.3;
      }

      p {
        margin: 0;
      }
    }

    @keyframes glow-pulse {
      0%, 100% {
        box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `]
})
export class AchievementListComponent {
  @Input() achievements: UserAchievementInfo[] = [];
  @Output() achievementClick = new EventEmitter<UserAchievementInfo>();

  // Icons
  faTrophy = faTrophy;
  faLock = faLock;
  faStar = faStar;
  faFire = faFire;
  faBolt = faBolt;
  faGraduationCap = faGraduationCap;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faRocket = faRocket;

  // State
  selectedCategory = signal<AchievementCategory>('all');

  // Computed
  unlockedCount = computed(() =>
    this.achievements.filter(a => a.isUnlocked).length
  );

  filteredAchievements = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') {
      return [...this.achievements].sort((a, b) => {
        // Sort: new first, then unlocked, then by progress
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progressPercentage - a.progressPercentage;
      });
    }
    return this.achievements
      .filter(a => a.category === category)
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progressPercentage - a.progressPercentage;
      });
  });

  private categories: AchievementCategory[] = ['all', 'learning', 'streak', 'quiz', 'speed', 'milestone'];

  onCategoryChange(index: number) {
    this.selectedCategory.set(this.categories[index]);
  }

  getNewCount(category: AchievementCategory): number {
    if (category === 'all') {
      return this.achievements.filter(a => a.isNew).length;
    }
    return this.achievements.filter(a => a.category === category && a.isNew).length;
  }

  getIcon(iconName: string): any {
    const iconMap: Record<string, any> = {
      'trophy': faTrophy,
      'star': faStar,
      'fire': faFire,
      'bolt': faBolt,
      'graduation-cap': faGraduationCap,
      'check-circle': faCheckCircle,
      'clock': faClock,
      'rocket': faRocket,
    };
    return iconMap[iconName] || faTrophy;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'learning': '#4caf50',
      'streak': '#ff5722',
      'quiz': '#2196f3',
      'speed': '#9c27b0',
      'milestone': '#ffd700',
    };
    return colors[category] || '#ffd700';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  onAchievementClick(achievement: UserAchievementInfo) {
    this.achievementClick.emit(achievement);
  }
}
