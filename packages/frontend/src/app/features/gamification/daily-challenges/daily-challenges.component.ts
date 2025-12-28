import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck, faBolt, faClock, faCheck,
  faSpellCheck, faStopwatch, faLanguage, faFire,
  faBook, faStar, faRefresh, faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { DailyChallengeInfo } from '../../../core/services/api.service';

@Component({
  selector: 'app-daily-challenges',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="daily-challenges-container">
      <div class="header">
        <h2>
          <fa-icon [icon]="faCalendarCheck" class="calendar-icon"></fa-icon>
          Daily Challenges
        </h2>
        <div class="refresh-time">
          <fa-icon [icon]="faClock"></fa-icon>
          Refreshes in {{ timeUntilRefresh() }}
        </div>
      </div>

      <div class="challenges-list">
        @for (challenge of challenges; track challenge.id) {
          <div class="challenge-card"
               [class.completed]="challenge.status === 'completed'"
               [class.expired]="challenge.status === 'expired'"
               [class.in-progress]="challenge.status === 'in_progress'"
               [class.clickable]="challenge.status !== 'completed' && challenge.status !== 'expired'"
               (click)="navigateToChallenge(challenge)">

            <!-- Status Indicator -->
            <div class="status-indicator"
                 [class.completed]="challenge.status === 'completed'"
                 [class.expired]="challenge.status === 'expired'">
              @if (challenge.status === 'completed') {
                <fa-icon [icon]="faCheck"></fa-icon>
              } @else {
                <fa-icon [icon]="getChallengeIcon(challenge.challengeType)"></fa-icon>
              }
            </div>

            <!-- Challenge Content -->
            <div class="challenge-content">
              <div class="challenge-header">
                <h4 class="challenge-name">{{ challenge.name }}</h4>
                <div class="xp-badge" [class.earned]="challenge.status === 'completed'">
                  <fa-icon [icon]="faBolt"></fa-icon>
                  {{ challenge.xpReward }} XP
                </div>
              </div>

              <p class="challenge-description">{{ challenge.description }}</p>

              <!-- Progress Section -->
              <div class="progress-section">
                <mat-progress-bar
                  mode="determinate"
                  [value]="challenge.progressPercentage"
                  [class.completed]="challenge.status === 'completed'">
                </mat-progress-bar>
                <div class="progress-info">
                  <span class="progress-text">
                    {{ challenge.currentProgress }}/{{ challenge.targetValue }}
                  </span>
                  @if (challenge.status !== 'completed' && challenge.status !== 'expired') {
                    <span class="time-left">
                      <fa-icon [icon]="faClock"></fa-icon>
                      {{ getTimeRemaining(challenge.expiresAt) }}
                    </span>
                  }
                </div>
              </div>

              <!-- Completed Badge -->
              @if (challenge.status === 'completed') {
                <div class="completed-badge">
                  <fa-icon [icon]="faStar"></fa-icon>
                  Completed!
                </div>
              }

              <!-- Expired Badge -->
              @if (challenge.status === 'expired') {
                <div class="expired-badge">
                  Expired
                </div>
              }

              <!-- Go Button for active challenges -->
              <!-- @if (challenge.status !== 'completed' && challenge.status !== 'expired') {
                <button class="go-button" (click)="navigateToChallenge(challenge); $event.stopPropagation()">
                  <span>{{ challenge.status === 'in_progress' ? 'Continue' : 'Start' }}</span>
                  <fa-icon [icon]="faArrowRight"></fa-icon>
                </button>
              } -->
            </div>
          </div>
        }
      </div>

      @if (challenges.length === 0) {
        <div class="empty-state">
          <fa-icon [icon]="faCalendarCheck" class="empty-icon"></fa-icon>
          <p>No challenges available today</p>
          <p class="hint">Check back tomorrow for new challenges!</p>
        </div>
      }

      <!-- Summary -->
      @if (challenges.length > 0) {
        <div class="summary">
          <div class="summary-stat">
            <span class="stat-value">{{ completedCount() }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">{{ totalXpEarned() }}</span>
            <span class="stat-label">XP Earned</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">{{ remainingCount() }}</span>
            <span class="stat-label">Remaining</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .daily-challenges-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;

      h2 {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
        font-size: 1.5rem;
        color: #333;

        .calendar-icon {
          color: #2196f3;
        }
      }

      .refresh-time {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #666;
        padding: 0.5rem 1rem;
        background: #f5f5f5;
        border-radius: 20px;

        fa-icon {
          color: #ff9800;
        }
      }
    }

    .challenges-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .challenge-card {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 12px;
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;

      &.clickable {
        cursor: pointer;

        &:hover {
          border-color: #2196f3;
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.15);
          transform: translateY(-2px);

          .go-button {
            background: #1976d2;
          }
        }
      }

      &.completed {
        background: linear-gradient(135deg, #e8f5e9 0%, #fff 100%);
        border-color: #4caf50;

        .status-indicator {
          background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
        }
      }

      &.expired {
        opacity: 0.6;
        background: #f5f5f5;
      }

      &.in-progress {
        border-color: #ff9800;
      }
    }

    .status-indicator {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2196f3 0%, #64b5f6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;

      fa-icon {
        font-size: 1.25rem;
      }
    }

    .challenge-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .challenge-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .challenge-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
    }

    .xp-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: #f5f5f5;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #666;
      white-space: nowrap;

      fa-icon {
        color: #ccc;
      }

      &.earned {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        color: #ff8c00;

        fa-icon {
          color: #ffd700;
        }
      }
    }

    .challenge-description {
      margin: 0;
      font-size: 0.9rem;
      color: #666;
    }

    .progress-section {
      margin-top: 0.5rem;

      mat-progress-bar {
        height: 8px;
        border-radius: 4px;

        &.completed {
          ::ng-deep .mdc-linear-progress__bar-inner {
            border-color: #4caf50;
          }
        }
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
        font-size: 0.8rem;
      }

      .progress-text {
        font-weight: 600;
        color: #333;
      }

      .time-left {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: #666;

        fa-icon {
          color: #ff9800;
        }
      }
    }

    .completed-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: #4caf50;
      color: white;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      width: fit-content;

      fa-icon {
        color: #ffd700;
      }
    }

    .expired-badge {
      display: inline-flex;
      padding: 0.25rem 0.75rem;
      background: #9e9e9e;
      color: white;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      width: fit-content;
    }

    .go-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
      width: fit-content;
      transition: all 0.2s ease;

      fa-icon {
        font-size: 0.75rem;
      }

      &:hover {
        background: #1976d2;
        transform: translateX(4px);
      }
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
        margin: 0.5rem 0;
      }

      .hint {
        font-size: 0.9rem;
      }
    }

    .summary {
      display: flex;
      justify-content: center;
      gap: 2rem;
      padding: 1rem;
      background: linear-gradient(135deg, #f5f5f5 0%, #fff 100%);
      border-radius: 12px;
    }

    .summary-stat {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2196f3;
      }

      .stat-label {
        font-size: 0.75rem;
        color: #666;
        text-transform: uppercase;
      }
    }
  `]
})
export class DailyChallengesComponent {
  @Input() challenges: DailyChallengeInfo[] = [];

  private router = inject(Router);

  // Icons
  faCalendarCheck = faCalendarCheck;
  faBolt = faBolt;
  faClock = faClock;
  faCheck = faCheck;
  faSpellCheck = faSpellCheck;
  faStopwatch = faStopwatch;
  faLanguage = faLanguage;
  faFire = faFire;
  faBook = faBook;
  faStar = faStar;
  faRefresh = faRefresh;
  faArrowRight = faArrowRight;

  // Computed
  completedCount = computed(() =>
    this.challenges.filter(c => c.status === 'completed').length
  );

  totalXpEarned = computed(() =>
    this.challenges
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + c.xpReward, 0)
  );

  remainingCount = computed(() =>
    this.challenges.filter(c => c.status !== 'completed' && c.status !== 'expired').length
  );

  getChallengeIcon(type: string): any {
    const iconMap: Record<string, any> = {
      'spelling': faSpellCheck,
      'speed_quiz': faStopwatch,
      'translation': faLanguage,
      'streak': faFire,
      'vocabulary': faBook,
      'perfect_score': faStar,
      'review': faRefresh,
      'exercise': faCheck,
    };
    return iconMap[type] || faCalendarCheck;
  }

  getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  timeUntilRefresh(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  getChallengeRoute(challengeType: string): string {
    const routeMap: Record<string, string> = {
      'spelling': '/exercises',
      'speed_quiz': '/quizzes',
      'translation': '/exercises',
      'streak': '/review',
      'vocabulary': '/vocabulary',
      'perfect_score': '/quizzes',
      'review': '/review',
      'exercise': '/exercises',
      'quiz': '/quizzes',
      'flashcard': '/review',
      'grammar': '/grammar',
    };
    return routeMap[challengeType] || '/dashboard';
  }

  navigateToChallenge(challenge: DailyChallengeInfo): void {
    if (challenge.status === 'completed' || challenge.status === 'expired') {
      return;
    }
    const route = this.getChallengeRoute(challenge.challengeType);
    this.router.navigate([route]);
  }
}
