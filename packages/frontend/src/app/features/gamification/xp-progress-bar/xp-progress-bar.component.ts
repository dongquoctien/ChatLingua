import { Component, Input, OnInit, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar, faBolt, faArrowUp } from '../../../shared/icons';

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
    FontAwesomeModule,
  ],
  templateUrl: './xp-progress-bar.component.html',
  styleUrl: './xp-progress-bar.component.scss',
})
export class XpProgressBarComponent implements OnInit, OnChanges {
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
