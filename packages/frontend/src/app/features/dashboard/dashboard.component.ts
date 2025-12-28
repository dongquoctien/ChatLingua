import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
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
} from '../../shared/icons';
import {
  ApiService, UserStats, QueueStats, ReviewStreak,
  UserXPStatus, UserAchievementInfo, DailyChallengeInfo, LeaderboardResponse
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { XpProgressBarComponent, XPData } from '../gamification/xp-progress-bar/xp-progress-bar.component';
import { DailyChallengesComponent } from '../gamification/daily-challenges/daily-challenges.component';
import { AchievementListComponent } from '../gamification/achievement-list/achievement-list.component';
import { AchievementUnlockDialogComponent, AchievementUnlockDialogData } from '../gamification/achievement-unlock-dialog/achievement-unlock-dialog.component';
import { LeaderboardComponent } from '../gamification/leaderboard/leaderboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDialogModule,
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
  private dialog = inject(MatDialog);
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

  // Computed signals for review stats (fixes Angular template reactivity issue)
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
    // Load XP status
    this.apiService.getXPStatus().subscribe({
      next: (xp) => this.xpStatus.set(xp),
      error: () => {} // Silently fail if gamification not available
    });

    // Load achievements
    this.apiService.getAchievements().subscribe({
      next: (achievements) => {
        this.achievements.set(achievements);
        // Check for new achievements to celebrate
        const newOnes = achievements.filter(a => a.isNew && a.isUnlocked);
        if (newOnes.length > 0) {
          this.newAchievements.set(newOnes);
          this.showAchievementUnlock(newOnes[0]);
        }
      },
      error: () => {}
    });

    // Load daily challenges
    this.apiService.getDailyChallenges().subscribe({
      next: (challenges) => this.dailyChallenges.set(challenges),
      error: () => {}
    });

    // Load leaderboard
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

  // Convert XP status to XPData format
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

  // Get recent achievements (max 4) for dashboard preview
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
    const dialogRef = this.dialog.open(AchievementUnlockDialogComponent, {
      data: { achievement } as AchievementUnlockDialogData,
      panelClass: 'achievement-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(() => {
      // Mark as seen
      this.apiService.markAchievementSeen(achievement.id).subscribe();
    });
  }

  onAchievementClick(achievement: UserAchievementInfo) {
    if (achievement.isUnlocked) {
      this.showAchievementUnlock(achievement);
    }
  }
}
