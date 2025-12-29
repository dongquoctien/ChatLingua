import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFire,
  faComments,
  faLanguage,
  faCheckCircle,
  faGraduationCap,
  faDumbbell,
  faQuestionCircle,
  faHistory,
  faSpinner,
  faBrain,
  faPlay,
  faTrophy,
  faArrowRight,
  faTimes,
} from '../../shared/icons';
import {
  ApiService, UserStats, QueueStats, ReviewStreak,
  UserXPStatus, UserAchievementInfo, DailyChallengeInfo, LeaderboardResponse, LeaderboardEntry
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { XpProgressBarComponent, XPData } from '../gamification/xp-progress-bar/xp-progress-bar.component';
import { DailyChallengesComponent } from '../gamification/daily-challenges/daily-challenges.component';
import { AchievementListComponent } from '../gamification/achievement-list/achievement-list.component';
import { LeaderboardComponent } from '../gamification/leaderboard/leaderboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    XpProgressBarComponent,
    DailyChallengesComponent,
    AchievementListComponent,
    LeaderboardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  // Icons
  faFire = faFire;
  faComments = faComments;
  faLanguage = faLanguage;
  faCheckCircle = faCheckCircle;
  faGraduationCap = faGraduationCap;
  faDumbbell = faDumbbell;
  faQuestionCircle = faQuestionCircle;
  faHistory = faHistory;
  faSpinner = faSpinner;
  faBrain = faBrain;
  faPlay = faPlay;
  faTrophy = faTrophy;
  faArrowRight = faArrowRight;
  faTimes = faTimes;

  // Stats
  stats = signal<UserStats | null>(null);
  loading = signal(true);
  queueStats = signal<QueueStats | null>(null);
  streak = signal<ReviewStreak | null>(null);

  // Gamification
  xpStatus = signal<UserXPStatus | null>(null);
  achievements = signal<UserAchievementInfo[]>([]);
  dailyChallenges = signal<DailyChallengeInfo[]>([]);
  leaderboard = signal<LeaderboardResponse | null>(null);
  newAchievements = signal<UserAchievementInfo[]>([]);

  // Dialog state
  showAchievementDialog = signal(false);
  selectedAchievement = signal<UserAchievementInfo | null>(null);

  // Computed signals for review stats
  dueCount = computed(() => {
    const q = this.queueStats();
    return q ? (q.due + q.overdue) : 0;
  });
  newCount = computed(() => {
    const q = this.queueStats();
    return q ? q.new : 0;
  });
  doneCount = computed(() => {
    const q = this.queueStats();
    return q ? q.completed : 0;
  });

  ngOnInit() {
    this.loadStats();
    this.loadReviewData();
    this.loadGamificationData();
  }

  loadStats() {
    this.apiService.getStatsOverview().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadReviewData() {
    this.apiService.getQueueStats().subscribe({
      next: (stats) => this.queueStats.set(stats),
    });
    this.apiService.getReviewStreak().subscribe({
      next: (streak) => this.streak.set(streak),
    });
  }

  loadGamificationData() {
    this.apiService.getXPStatus().subscribe({
      next: (xp) => this.xpStatus.set(xp),
      error: () => {}
    });

    this.apiService.getAchievements().subscribe({
      next: (achievements) => {
        this.achievements.set(achievements);
        const newOnes = achievements.filter(a => a.isNew && a.isUnlocked);
        if (newOnes.length > 0) {
          this.newAchievements.set(newOnes);
          this.showAchievementUnlock(newOnes[0]);
        }
      },
      error: () => {}
    });

    this.apiService.getDailyChallenges().subscribe({
      next: (challenges) => this.dailyChallenges.set(challenges),
      error: () => {}
    });

    this.apiService.getLeaderboard().subscribe({
      next: (leaderboard) => this.leaderboard.set(leaderboard),
      error: () => {}
    });
  }

  getTotalDue(): number {
    const q = this.queueStats();
    if (!q) return 0;
    return q.due + q.overdue + q.new;
  }

  getXpData(): XPData {
    const xp = this.xpStatus();
    if (!xp) {
      return {
        totalXp: 0,
        currentLevel: 1,
        title: 'Beginner',
        xpToNextLevel: 100,
        xpForCurrentLevel: 0,
        progressPercentage: 0
      };
    }
    return {
      totalXp: xp.totalXp,
      currentLevel: xp.currentLevel,
      title: xp.title,
      xpToNextLevel: xp.xpToNextLevel,
      xpForCurrentLevel: xp.xpForCurrentLevel,
      progressPercentage: xp.progressPercentage,
      nextLevelTitle: xp.nextLevelTitle
    };
  }

  getRecentAchievements(): UserAchievementInfo[] {
    return this.achievements()
      .filter(a => a.isUnlocked)
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        return new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime();
      })
      .slice(0, 4);
  }

  showAchievementUnlock(achievement: UserAchievementInfo) {
    this.selectedAchievement.set(achievement);
    this.showAchievementDialog.set(true);
  }

  closeAchievementDialog() {
    const achievement = this.selectedAchievement();
    if (achievement) {
      this.apiService.markAchievementSeen(achievement.id).subscribe();
    }
    this.showAchievementDialog.set(false);
    this.selectedAchievement.set(null);
  }

  onAchievementClick(achievement: UserAchievementInfo) {
    if (achievement.isUnlocked) {
      this.showAchievementUnlock(achievement);
    }
  }

  getDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'User';
    return user.nickname || user.username;
  }

  getLeaderboardAvatarUrl(entry: LeaderboardEntry): string {
    if (entry.avatar) return entry.avatar;
    const name = entry.nickname || entry.displayName || entry.username;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e5e7eb&color=374151&size=40`;
  }

  getLeaderboardDisplayName(entry: LeaderboardEntry): string {
    return entry.nickname || entry.displayName || entry.username;
  }
}
