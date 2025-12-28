import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faStar, faFire, faBolt, faGraduationCap,
  faCheckCircle, faClock, faRocket, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { UserAchievementInfo } from '../../../core/services/api.service';

export interface AchievementUnlockDialogData {
  achievement: UserAchievementInfo;
}

@Component({
  selector: 'app-achievement-unlock-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="achievement-unlock-dialog" [class.visible]="animationReady()">
      <!-- Close Button -->
      <button mat-icon-button class="close-btn" (click)="close()">
        <fa-icon [icon]="faTimes"></fa-icon>
      </button>

      <!-- Confetti Container -->
      <div class="confetti-container">
        @for (i of confettiPieces; track i) {
          <div class="confetti" [style.--delay]="i * 0.1 + 's'" [style.--x]="getRandomX()"></div>
        }
      </div>

      <!-- Main Content -->
      <div class="content">
        <!-- Trophy Animation -->
        <div class="trophy-container" [class.animate]="animationReady()">
          <div class="glow-ring"></div>
          <div class="trophy-circle">
            <fa-icon [icon]="getIcon(data.achievement.icon)"
                     [style.color]="getCategoryColor(data.achievement.category)">
            </fa-icon>
          </div>
          <div class="sparkles">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="sparkle" [style.--i]="i"></div>
            }
          </div>
        </div>

        <!-- Text Content -->
        <div class="text-content">
          <h2 class="title">Achievement Unlocked!</h2>
          <h3 class="achievement-name">{{ data.achievement.name }}</h3>
          <p class="achievement-description">{{ data.achievement.description }}</p>

          <!-- XP Reward -->
          <div class="xp-reward" [class.animate]="xpAnimated()">
            <fa-icon [icon]="faBolt" class="bolt-icon"></fa-icon>
            <span class="xp-amount">+{{ data.achievement.xpReward }}</span>
            <span class="xp-label">XP</span>
          </div>
        </div>

        <!-- Action Button -->
        <button mat-raised-button color="primary" class="action-btn" (click)="close()">
          Awesome!
        </button>
      </div>
    </div>
  `,
  styles: [`
    .achievement-unlock-dialog {
      position: relative;
      padding: 2rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      color: white;
      text-align: center;
      overflow: hidden;
      min-width: 320px;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);

      &.visible {
        opacity: 1;
        transform: scale(1);
      }
    }

    .close-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      color: white;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }

    .confetti-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
    }

    .confetti {
      position: absolute;
      top: -10px;
      width: 10px;
      height: 10px;
      background: linear-gradient(135deg, #ffd700, #ff6b6b, #4ecdc4, #a855f7);
      animation: fall 3s ease-out var(--delay) infinite;
      left: calc(var(--x) * 1%);

      &:nth-child(odd) {
        border-radius: 50%;
      }
    }

    .content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    .trophy-container {
      position: relative;
      width: 120px;
      height: 120px;

      &.animate {
        .trophy-circle {
          animation: trophy-pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .glow-ring {
          animation: glow-expand 1s ease-out;
        }
      }
    }

    .glow-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, transparent 70%);
      transform: translate(-50%, -50%) scale(0);
    }

    .trophy-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      box-shadow: 0 10px 40px rgba(255, 215, 0, 0.5);

      fa-icon {
        font-size: 2.5rem;
        color: white !important;
      }
    }

    .sparkles {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      transform: translate(-50%, -50%);
    }

    .sparkle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #ffd700;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: sparkle 1.5s ease-out calc(var(--i) * 0.1s) infinite;

      &:nth-child(1) { --angle: 0deg; }
      &:nth-child(2) { --angle: 60deg; }
      &:nth-child(3) { --angle: 120deg; }
      &:nth-child(4) { --angle: 180deg; }
      &:nth-child(5) { --angle: 240deg; }
      &:nth-child(6) { --angle: 300deg; }
    }

    .text-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .title {
      margin: 0;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #ffd700;
      font-weight: 600;
    }

    .achievement-name {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .achievement-description {
      margin: 0;
      font-size: 0.9rem;
      color: #aaa;
      max-width: 280px;
    }

    .xp-reward {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 215, 0, 0.2);
      border-radius: 20px;
      transform: scale(0);

      &.animate {
        animation: xp-pop 0.5s 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
      }

      .bolt-icon {
        color: #ffd700;
        font-size: 1.25rem;
      }

      .xp-amount {
        font-size: 1.5rem;
        font-weight: 700;
        color: #4ecdc4;
      }

      .xp-label {
        font-size: 0.9rem;
        color: #888;
      }
    }

    .action-btn {
      padding: 0.75rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 25px;
    }

    @keyframes fall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(300px) rotate(720deg);
        opacity: 0;
      }
    }

    @keyframes trophy-pop {
      0% { transform: translate(-50%, -50%) scale(0) rotate(-180deg); }
      60% { transform: translate(-50%, -50%) scale(1.2) rotate(10deg); }
      100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
    }

    @keyframes glow-expand {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    }

    @keyframes sparkle {
      0% {
        transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) rotate(var(--angle)) translateX(80px);
        opacity: 0;
      }
    }

    @keyframes xp-pop {
      0% { transform: scale(0); }
      60% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `]
})
export class AchievementUnlockDialogComponent implements OnInit, OnDestroy {
  // Icons
  faTrophy = faTrophy;
  faStar = faStar;
  faFire = faFire;
  faBolt = faBolt;
  faGraduationCap = faGraduationCap;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faRocket = faRocket;
  faTimes = faTimes;

  // State
  animationReady = signal(false);
  xpAnimated = signal(false);
  confettiPieces = Array.from({ length: 30 }, (_, i) => i);

  constructor(
    public dialogRef: MatDialogRef<AchievementUnlockDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AchievementUnlockDialogData
  ) {}

  ngOnInit() {
    // Trigger animations after dialog opens
    setTimeout(() => {
      this.animationReady.set(true);
      setTimeout(() => this.xpAnimated.set(true), 300);
    }, 100);
  }

  ngOnDestroy() {}

  getRandomX(): number {
    return Math.random() * 100;
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

  close() {
    this.dialogRef.close();
  }
}
