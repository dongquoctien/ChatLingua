import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faGamepad,
  faTrophy,
  faClock,
  faFire,
  faBullseye,
  faStar,
} from '@fortawesome/free-solid-svg-icons';

export interface SharedGamePayload {
  gameType: string;
  score: number;
  wordsLearned: number;
  timeSpent: number;
  completedAt: string;
  accuracy: number;
  maxCombo: number;
  level?: number;
  perfectRounds?: number;
}

@Component({
  selector: 'app-shared-game-card',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './shared-game-card.component.html',
  styleUrls: ['./shared-game-card.component.scss'],
})
export class SharedGameCardComponent {
  readonly data = input.required<SharedGamePayload>();
  readonly isOwn = input(false);

  // Icons
  readonly faGamepad = faGamepad;
  readonly faTrophy = faTrophy;
  readonly faClock = faClock;
  readonly faFire = faFire;
  readonly faBullseye = faBullseye;
  readonly faStar = faStar;

  getGameName(): string {
    const gameNames: Record<string, string> = {
      'word-rush': 'Word Rush',
      'memory-match': 'Memory Match',
      'spelling-bee': 'Spelling Bee',
      'hangman': 'Hangman',
      'falling-words': 'Falling Words',
      'crossword': 'Crossword',
    };
    return gameNames[this.data().gameType] || this.data().gameType;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  getScoreGrade(): { label: string; color: string } {
    const score = this.data().score;
    const accuracy = this.data().accuracy;

    if (accuracy >= 95 || score >= 10000) {
      return { label: 'S', color: 'bg-purple-100 text-purple-700' };
    } else if (accuracy >= 85 || score >= 5000) {
      return { label: 'A', color: 'bg-green-100 text-green-700' };
    } else if (accuracy >= 70 || score >= 2500) {
      return { label: 'B', color: 'bg-blue-100 text-blue-700' };
    } else if (accuracy >= 50 || score >= 1000) {
      return { label: 'C', color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { label: 'D', color: 'bg-red-100 text-red-700' };
    }
  }
}
