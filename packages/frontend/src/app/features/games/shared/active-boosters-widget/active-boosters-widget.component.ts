import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-active-boosters-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-boosters-widget.component.html',
  styleUrls: ['./active-boosters-widget.component.scss']
})
export class ActiveBoostersWidgetComponent implements OnInit, OnDestroy {
  private gameState = inject(GameStateService);
  private countdownInterval: any = null;
  private gameStartTime: number | null = null;

  // Signal for elapsed minutes since game started
  readonly elapsedMinutes = signal(0);

  readonly allBoosters = this.gameState.activeBoosters;

  // Filter out expired boosters based on elapsed time
  readonly activeBoosters = computed(() => {
    const elapsed = this.elapsedMinutes();
    return this.allBoosters()
      .map(b => ({
        ...b,
        remainingMinutes: Math.max(0, b.remainingMinutes - elapsed)
      }))
      .filter(b => b.remainingMinutes > 0);
  });

  readonly xpMultiplier = computed(() => {
    const boosters = this.activeBoosters();
    let multiplier = 1;
    for (const b of boosters) {
      if (b.effectType === 'xp_multiplier') {
        multiplier = Math.max(multiplier, b.multiplier);
      }
    }
    return multiplier;
  });

  readonly coinMultiplier = computed(() => {
    const boosters = this.activeBoosters();
    let multiplier = 1;
    for (const b of boosters) {
      if (b.effectType === 'coin_multiplier') {
        multiplier = Math.max(multiplier, b.multiplier);
      }
    }
    return multiplier;
  });

  readonly hasActiveBoosters = computed(() => this.activeBoosters().length > 0);

  ngOnInit(): void {
    this.gameStartTime = Date.now();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      if (this.gameStartTime) {
        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 60000);
        this.elapsedMinutes.set(elapsed);
      }
    }, 30000); // Update every 30 seconds
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  getBoosterIcon(effectType: string): string {
    const icons: Record<string, string> = {
      'xp_multiplier': '⚡',
      'coin_multiplier': '🪙',
      'streak_protection': '🛡️',
      'hint_reveal': '💡',
      'time_freeze': '❄️',
      'double_score': '✨',
    };
    return icons[effectType] || '🎯';
  }

  getBoosterBgColor(effectType: string): string {
    const colors: Record<string, string> = {
      'xp_multiplier': 'bg-gradient-to-r from-yellow-400 to-orange-500',
      'coin_multiplier': 'bg-gradient-to-r from-amber-400 to-yellow-500',
      'streak_protection': 'bg-gradient-to-r from-blue-400 to-cyan-500',
      'hint_reveal': 'bg-gradient-to-r from-purple-400 to-pink-500',
      'time_freeze': 'bg-gradient-to-r from-cyan-400 to-blue-500',
      'double_score': 'bg-gradient-to-r from-green-400 to-emerald-500',
    };
    return colors[effectType] || 'bg-gray-500';
  }

  formatTime(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }
}
