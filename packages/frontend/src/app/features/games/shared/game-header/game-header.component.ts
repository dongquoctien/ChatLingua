import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
}
