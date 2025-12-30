import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PowerUpItem {
  powerUpCode: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  effectType: string;
  effectValue: number;
}

@Component({
  selector: 'app-power-ups-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './power-ups-panel.component.html',
  styleUrls: ['./power-ups-panel.component.scss']
})
export class PowerUpsPanelComponent {
  @Input() powerUps: PowerUpItem[] = [];
  @Input() disabled: boolean = false;

  @Output() usePowerUp = new EventEmitter<string>();

  onUsePowerUp(powerUpCode: string): void {
    if (!this.disabled) {
      this.usePowerUp.emit(powerUpCode);
    }
  }

  getEffectDescription(powerUp: PowerUpItem): string {
    switch (powerUp.effectType) {
      case 'time_bonus':
        return `+${powerUp.effectValue}s`;
      case 'hint':
        return 'Reveal letter';
      case 'skip':
        return 'Skip word';
      case 'freeze':
        return `${powerUp.effectValue}s freeze`;
      case 'double_points':
        return '2x points';
      default:
        return powerUp.description;
    }
  }
}
