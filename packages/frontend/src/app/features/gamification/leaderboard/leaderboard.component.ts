import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faMedal, faCrown, faUser, faBolt,
  faArrowUp, faArrowDown, faMinus, faCalendarWeek
} from '../../../shared/icons';
import { LeaderboardEntry, LeaderboardResponse } from '../../../core/services/api.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
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
