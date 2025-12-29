import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck, faBolt, faClock, faCheck,
  faSpellCheck, faStopwatch, faLanguage, faFire,
  faBook, faStar, faRefresh, faArrowRight
} from '../../../shared/icons';
import { DailyChallengeInfo } from '../../../core/services/api.service';

@Component({
  selector: 'app-daily-challenges',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './daily-challenges.component.html',
  styleUrl: './daily-challenges.component.scss',
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
