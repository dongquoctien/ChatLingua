import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameActiveBooster } from '../../../../core/services/api.service';

export interface ActiveBoosterDisplay {
  name: string;
  effectType: string;
  multiplier: number;
  remainingMinutes: number;
}

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-header.component.html',
  styleUrls: ['./game-header.component.scss']
})
export class GameHeaderComponent {
  @Input() gameName: string = '';
  @Input() score: number = 0;
  @Input() timeLeft: number = 0;
  @Input() showTimer: boolean = true;
  @Input() lives: number = 3;
  @Input() maxLives: number = 3;
  @Input() showLives: boolean = false;
  @Input() combo: number = 0;
  @Input() showCombo: boolean = true;
  @Input() isPaused: boolean = false;
  @Input() activeBoosters: GameActiveBooster[] = [];
  @Input() xpMultiplier: number = 1;
  @Input() coinMultiplier: number = 1;

  @Output() pause = new EventEmitter<void>();
  @Output() quit = new EventEmitter<void>();

  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get livesArray(): boolean[] {
    return Array(this.maxLives).fill(false).map((_, i) => i < this.lives);
  }

  get isLowTime(): boolean {
    return this.timeLeft <= 10 && this.timeLeft > 0;
  }

  onPause(): void {
    this.pause.emit();
  }

  onQuit(): void {
    this.quit.emit();
  }

  get hasActiveBoosters(): boolean {
    return this.activeBoosters.length > 0;
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

  getBoosterColor(effectType: string): string {
    const colors: Record<string, string> = {
      'xp_multiplier': 'text-yellow-500',
      'coin_multiplier': 'text-amber-500',
      'streak_protection': 'text-blue-500',
      'hint_reveal': 'text-purple-500',
      'time_freeze': 'text-cyan-500',
      'double_score': 'text-green-500',
    };
    return colors[effectType] || 'text-gray-500';
  }
}
