import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faMedal, faCrown, faUser, faBolt,
  faArrowUp, faArrowDown, faMinus, faCalendarWeek
} from '@fortawesome/free-solid-svg-icons';
import { LeaderboardEntry, LeaderboardResponse } from '../../../core/services/api.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="leaderboard-container">
      <div class="header">
        <h2>
          <fa-icon [icon]="faTrophy" class="trophy-icon"></fa-icon>
          Weekly Leaderboard
        </h2>
        <div class="week-info">
          <fa-icon [icon]="faCalendarWeek"></fa-icon>
          {{ formatDateRange(leaderboard.weekStart, leaderboard.weekEnd) }}
        </div>
      </div>

      <!-- Top 3 Podium -->
      @if (topThree().length > 0) {
        <div class="podium">
          <!-- Second Place -->
          @if (topThree()[1]) {
            <div class="podium-item second" (click)="onUserClick(topThree()[1])">
              <div class="avatar" [class.current-user]="topThree()[1].isCurrentUser">
                <fa-icon [icon]="faUser"></fa-icon>
              </div>
              <div class="medal silver">
                <fa-icon [icon]="faMedal"></fa-icon>
                <span></span>
              </div>
              <div class="user-info">
                <span class="username">{{ topThree()[1].displayName || topThree()[1].username }}</span>
                <span class="xp">
                  <fa-icon [icon]="faBolt"></fa-icon>
                  {{ formatNumber(topThree()[1].totalXp) }}
                </span>
              </div>
              <div class="podium-stand silver"></div>
            </div>
          }

          <!-- First Place -->
          @if (topThree()[0]) {
            <div class="podium-item first" (click)="onUserClick(topThree()[0])">
              <div class="crown">
                <fa-icon [icon]="faCrown"></fa-icon>
              </div>
              <div class="avatar" [class.current-user]="topThree()[0].isCurrentUser">
                <fa-icon [icon]="faUser"></fa-icon>
              </div>
              <div class="medal gold">
                <fa-icon [icon]="faMedal"></fa-icon>
                <span></span>
              </div>
              <div class="user-info">
                <span class="username">{{ topThree()[0].displayName || topThree()[0].username }}</span>
                <span class="xp">
                  <fa-icon [icon]="faBolt"></fa-icon>
                  {{ formatNumber(topThree()[0].totalXp) }}
                </span>
              </div>
              <div class="podium-stand gold"></div>
            </div>
          }

          <!-- Third Place -->
          @if (topThree()[2]) {
            <div class="podium-item third" (click)="onUserClick(topThree()[2])">
              <div class="avatar" [class.current-user]="topThree()[2].isCurrentUser">
                <fa-icon [icon]="faUser"></fa-icon>
              </div>
              <div class="medal bronze">
                <fa-icon [icon]="faMedal"></fa-icon>
                <span></span>
              </div>
              <div class="user-info">
                <span class="username">{{ topThree()[2].displayName || topThree()[2].username }}</span>
                <span class="xp">
                  <fa-icon [icon]="faBolt"></fa-icon>
                  {{ formatNumber(topThree()[2].totalXp) }}
                </span>
              </div>
              <div class="podium-stand bronze"></div>
            </div>
          } @else {
            <div class="podium-item third placeholder">
              <div class="avatar empty">
                <fa-icon [icon]="faUser"></fa-icon>
              </div>
              <div class="medal bronze">
                <fa-icon [icon]="faMedal"></fa-icon>
                <span></span>
              </div>
              <div class="user-info">
                <span class="username empty-text">---</span>
              </div>
              <div class="podium-stand bronze"></div>
            </div>
          }
        </div>
      }

      <!-- Rest of Leaderboard -->
      @if (restOfEntries().length > 0) {
        <div class="leaderboard-list">
          @for (entry of restOfEntries(); track entry.userId) {
            <div class="leaderboard-entry"
                 [class.current-user]="entry.isCurrentUser"
                 (click)="onUserClick(entry)">
              <div class="rank">{{ entry.rank }}</div>
              <div class="user-avatar" [class.highlight]="entry.isCurrentUser">
                <fa-icon [icon]="faUser"></fa-icon>
              </div>
              <div class="user-details">
                <span class="name">{{ entry.displayName || entry.username }}</span>
                <span class="level">Level {{ entry.level }}</span>
              </div>
              <div class="xp-info">
                <fa-icon [icon]="faBolt" class="bolt"></fa-icon>
                <span class="xp-value">{{ formatNumber(entry.totalXp) }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Current User Position (if not in top) -->
      @if (showCurrentUserSection()) {
        <div class="current-user-section">
          <div class="divider">
            <span>Your Position</span>
          </div>
          <div class="leaderboard-entry current-user highlight">
            <div class="rank">{{ leaderboard.currentUserRank }}</div>
            <div class="user-avatar highlight">
              <fa-icon [icon]="faUser"></fa-icon>
            </div>
            <div class="user-details">
              <span class="name">You</span>
              <span class="level">Keep learning to climb!</span>
            </div>
            <div class="xp-info">
              <fa-icon [icon]="faBolt" class="bolt"></fa-icon>
              <span class="xp-value">{{ formatNumber(getCurrentUserXp()) }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (leaderboard.entries.length === 0) {
        <div class="empty-state">
          <fa-icon [icon]="faTrophy" class="empty-icon"></fa-icon>
          <p>No leaderboard data yet</p>
          <p class="hint">Start learning to join the competition!</p>
        </div>
      }

      <!-- Stats -->
      @if (leaderboard.totalParticipants > 0) {
        <div class="stats">
          <div class="stat">
            <span class="value">{{ leaderboard.totalParticipants }}</span>
            <span class="label">Learners</span>
          </div>
          @if (leaderboard.currentUserRank) {
            <div class="stat">
              <span class="value">Top {{ getPercentile() }}%</span>
              <span class="label">Your Rank</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .leaderboard-container {
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

        .trophy-icon {
          color: #ffd700;
        }
      }

      .week-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #666;
        padding: 0.5rem 1rem;
        background: #f5f5f5;
        border-radius: 20px;

        fa-icon {
          color: #2196f3;
        }
      }
    }

    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 0.5rem;
      padding: 2rem 1rem 0;
      background: linear-gradient(180deg, #f8f9fa 0%, #fff 100%);
      border-radius: 16px;
    }

    .podium-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-5px);
      }

      &.first {
        order: 2;

        .avatar {
          width: 70px;
          height: 70px;
          font-size: 2rem;
        }

        .podium-stand {
          height: 100px;
        }
      }

      &.second {
        order: 1;

        .avatar {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }

        .podium-stand {
          height: 70px;
        }
      }

      &.third {
        order: 3;

        .avatar {
          width: 55px;
          height: 55px;
          font-size: 1.25rem;
        }

        .podium-stand {
          height: 50px;
        }
      }
    }

    .crown {
      color: #ffd700;
      font-size: 1.5rem;
      margin-bottom: -0.5rem;
      animation: float 2s ease-in-out infinite;
    }

    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      border: 3px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);

      &.current-user {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        border-color: #4ecdc4;
      }

      &.empty {
        background: linear-gradient(135deg, #ccc 0%, #999 100%);
        opacity: 0.5;
      }
    }

    .podium-item.placeholder {
      opacity: 0.6;
      cursor: default;

      &:hover {
        transform: none;
      }
    }

    .medal {
      position: relative;
      margin-top: -0.75rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      z-index: 1;

      fa-icon {
        position: absolute;
        font-size: 2rem;
      }

      span {
        position: relative;
        z-index: 1;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }

      &.gold {
        fa-icon { color: #ffd700; }
      }

      &.silver {
        fa-icon { color: #c0c0c0; }
      }

      &.bronze {
        fa-icon { color: #cd7f32; }
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;

      .username {
        font-weight: 600;
        font-size: 0.9rem;
        color: #333;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.empty-text {
          color: #999;
        }
      }

      .xp {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #666;

        fa-icon {
          color: #ffd700;
          font-size: 0.75rem;
        }
      }
    }

    .podium-stand {
      width: 80px;
      border-radius: 8px 8px 0 0;

      &.gold {
        background: linear-gradient(180deg, #ffd700 0%, #ff8c00 100%);
      }

      &.silver {
        background: linear-gradient(180deg, #e8e8e8 0%, #b0b0b0 100%);
      }

      &.bronze {
        background: linear-gradient(180deg, #cd7f32 0%, #8b4513 100%);
      }
    }

    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .leaderboard-entry {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #f8f9fa;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f0f0;
        transform: translateX(5px);
      }

      &.current-user {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border: 2px solid #4caf50;
      }

      .rank {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        color: #666;
        flex-shrink: 0;
      }

      .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;

        &.highlight {
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        }
      }

      .user-details {
        flex: 1;
        display: flex;
        flex-direction: column;

        .name {
          font-weight: 600;
          color: #333;
        }

        .level {
          font-size: 0.8rem;
          color: #666;
        }
      }

      .xp-info {
        display: flex;
        align-items: center;
        gap: 0.25rem;

        .bolt {
          color: #ffd700;
        }

        .xp-value {
          font-weight: 700;
          color: #333;
        }
      }
    }

    .current-user-section {
      .divider {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: #999;
        font-size: 0.8rem;
        margin-bottom: 0.75rem;

        &::before, &::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e0e0;
        }
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

    .stats {
      display: flex;
      justify-content: center;
      gap: 3rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 12px;

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;

        .value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2196f3;
        }

        .label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
        }
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `]
})
export class LeaderboardComponent {
  @Input() leaderboard: LeaderboardResponse = {
    weekStart: '',
    weekEnd: '',
    entries: [],
    totalParticipants: 0
  };
  @Output() userClick = new EventEmitter<LeaderboardEntry>();

  // Icons
  faTrophy = faTrophy;
  faMedal = faMedal;
  faCrown = faCrown;
  faUser = faUser;
  faBolt = faBolt;
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;
  faMinus = faMinus;
  faCalendarWeek = faCalendarWeek;

  // Computed
  topThree = computed(() => this.leaderboard.entries.slice(0, 3));

  restOfEntries = computed(() => this.leaderboard.entries.slice(3));

  showCurrentUserSection = computed(() => {
    if (!this.leaderboard.currentUserRank) return false;
    // Show if current user is not in top entries displayed
    const isInDisplayed = this.leaderboard.entries.some(e => e.isCurrentUser);
    return !isInDisplayed && this.leaderboard.currentUserRank > this.leaderboard.entries.length;
  });

  formatDateRange(start: string, end: string): string {
    if (!start || !end) return 'This Week';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  getPercentile(): number {
    if (!this.leaderboard.currentUserRank || !this.leaderboard.totalParticipants) {
      return 100;
    }
    return Math.round((this.leaderboard.currentUserRank / this.leaderboard.totalParticipants) * 100);
  }

  getCurrentUserXp(): number {
    const currentUser = this.leaderboard.entries.find(e => e.isCurrentUser);
    return currentUser?.totalXp || 0;
  }

  onUserClick(entry: LeaderboardEntry) {
    this.userClick.emit(entry);
  }
}
