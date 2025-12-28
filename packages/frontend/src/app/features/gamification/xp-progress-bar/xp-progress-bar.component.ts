import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar, faBolt, faArrowUp } from '@fortawesome/free-solid-svg-icons';

export interface XPData {
  totalXp: number;
  currentLevel: number;
  title: string;
  xpToNextLevel: number;
  xpForCurrentLevel: number;
  progressPercentage: number;
  nextLevelTitle?: string;
}

@Component({
  selector: 'app-xp-progress-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatTooltipModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="xp-progress-container" [class.compact]="compact" [class.animated]="animated">
      <!-- Level Badge -->
      <div class="level-badge" [matTooltip]="'Level ' + xpData.currentLevel + ': ' + xpData.title">
        <div class="level-circle" [class.pulse]="levelUp()">
          <fa-icon [icon]="faStar" class="star-icon"></fa-icon>
          <span class="level-number">{{ xpData.currentLevel }}</span>
        </div>
        @if (!compact) {
          <span class="level-title">{{ xpData.title }}</span>
        }
      </div>

      <!-- Progress Section -->
      <div class="progress-section">
        @if (!compact) {
          <div class="xp-info">
            <span class="xp-current">
              <fa-icon [icon]="faBolt" class="bolt-icon"></fa-icon>
              {{ formatNumber(xpData.totalXp) }} XP
            </span>
            <span class="xp-next">
              {{ formatNumber(xpData.xpToNextLevel) }} to Level {{ xpData.currentLevel + 1 }}
            </span>
          </div>
        }

        <!-- Animated Progress Bar -->
        <div class="progress-bar-wrapper">
          <mat-progress-bar
            mode="determinate"
            [value]="displayProgress()"
            [class.level-up-glow]="levelUp()">
          </mat-progress-bar>
          <div class="progress-fill-effect" [style.width.%]="displayProgress()"></div>
        </div>

        @if (compact) {
          <div class="compact-xp">{{ formatNumber(xpData.totalXp) }} XP</div>
        }
      </div>

      <!-- Level Up Indicator -->
      @if (levelUp()) {
        <div class="level-up-indicator">
          <fa-icon [icon]="faArrowUp" class="up-icon"></fa-icon>
          <span>Level Up!</span>
        </div>
      }

      <!-- XP Gain Animation -->
      @if (showXpGain() && xpGainAmount() > 0) {
        <div class="xp-gain-popup" [class.show]="showXpGain()">
          +{{ xpGainAmount() }} XP
        </div>
      }
    </div>
  `,
  styles: [`
    .xp-progress-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      color: white;
      position: relative;
      overflow: hidden;

      &.compact {
        padding: 0.5rem 0.75rem;
        gap: 0.75rem;
      }

      &.animated {
        .progress-fill-effect {
          animation: shimmer 2s infinite;
        }
      }
    }

    .level-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .level-circle {
      position: relative;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);

      .star-icon {
        position: absolute;
        top: -4px;
        right: -4px;
        font-size: 16px;
        color: #fff;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      }

      .level-number {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1a1a2e;
      }

      &.pulse {
        animation: pulse 0.5s ease-in-out 3;
      }
    }

    .compact .level-circle {
      width: 36px;
      height: 36px;

      .star-icon {
        font-size: 12px;
        top: -2px;
        right: -2px;
      }

      .level-number {
        font-size: 1rem;
      }
    }

    .level-title {
      font-size: 0.75rem;
      color: #ffd700;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .progress-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .xp-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }

    .xp-current {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #4ecdc4;

      .bolt-icon {
        color: #ffd700;
      }
    }

    .xp-next {
      color: #888;
      font-size: 0.8rem;
    }

    .progress-bar-wrapper {
      position: relative;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.1);

      mat-progress-bar {
        height: 100%;
        border-radius: 6px;

        ::ng-deep {
          .mdc-linear-progress__bar-inner {
            border-color: #4ecdc4;
          }
          .mdc-linear-progress__buffer-bar {
            background-color: rgba(78, 205, 196, 0.2);
          }
        }

        &.level-up-glow {
          ::ng-deep .mdc-linear-progress__bar-inner {
            border-color: #ffd700;
            box-shadow: 0 0 10px #ffd700;
          }
        }
      }
    }

    .compact .progress-bar-wrapper {
      height: 8px;
    }

    .progress-fill-effect {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255,255,255,0.3) 50%,
        transparent 100%);
      pointer-events: none;
    }

    .compact-xp {
      font-size: 0.75rem;
      color: #4ecdc4;
      font-weight: 600;
      text-align: right;
    }

    .level-up-indicator {
      position: absolute;
      top: -8px;
      right: 1rem;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      color: #1a1a2e;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      animation: bounce 0.5s ease infinite;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);

      .up-icon {
        font-size: 0.875rem;
      }
    }

    .xp-gain-popup {
      position: absolute;
      right: 1rem;
      bottom: -10px;
      background: #4ecdc4;
      color: #1a1a2e;
      padding: 0.25rem 0.5rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;

      &.show {
        opacity: 1;
        transform: translateY(0);
        animation: float-up 1.5s ease-out forwards;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    @keyframes float-up {
      0% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-30px); }
    }
  `]
})
export class XpProgressBarComponent implements OnInit {
  @Input() xpData: XPData = {
    totalXp: 0,
    currentLevel: 1,
    title: 'Beginner',
    xpToNextLevel: 100,
    xpForCurrentLevel: 0,
    progressPercentage: 0,
  };
  @Input() compact = false;
  @Input() animated = true;

  // Icons
  faStar = faStar;
  faBolt = faBolt;
  faArrowUp = faArrowUp;

  // State
  levelUp = signal(false);
  showXpGain = signal(false);
  xpGainAmount = signal(0);
  displayProgress = signal(0);

  private previousXp = 0;
  private previousLevel = 0;

  ngOnInit() {
    this.previousXp = this.xpData.totalXp;
    this.previousLevel = this.xpData.currentLevel;
    this.displayProgress.set(this.xpData.progressPercentage);
  }

  ngOnChanges() {
    // Check for level up
    if (this.xpData.currentLevel > this.previousLevel) {
      this.triggerLevelUp();
    }

    // Check for XP gain
    const xpGain = this.xpData.totalXp - this.previousXp;
    if (xpGain > 0) {
      this.triggerXpGain(xpGain);
    }

    // Animate progress bar
    this.animateProgress();

    this.previousXp = this.xpData.totalXp;
    this.previousLevel = this.xpData.currentLevel;
  }

  private triggerLevelUp() {
    this.levelUp.set(true);
    setTimeout(() => this.levelUp.set(false), 2000);
  }

  private triggerXpGain(amount: number) {
    this.xpGainAmount.set(amount);
    this.showXpGain.set(true);
    setTimeout(() => this.showXpGain.set(false), 1500);
  }

  private animateProgress() {
    const target = this.xpData.progressPercentage;
    const current = this.displayProgress();

    if (Math.abs(target - current) > 1) {
      const step = (target - current) / 10;
      const animate = () => {
        const newValue = this.displayProgress() + step;
        if ((step > 0 && newValue < target) || (step < 0 && newValue > target)) {
          this.displayProgress.set(newValue);
          requestAnimationFrame(animate);
        } else {
          this.displayProgress.set(target);
        }
      };
      requestAnimationFrame(animate);
    } else {
      this.displayProgress.set(target);
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }
}
