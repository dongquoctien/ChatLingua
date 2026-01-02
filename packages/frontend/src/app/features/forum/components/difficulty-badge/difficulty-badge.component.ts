import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DifficultyLevel } from '../../services/forum.service';

@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './difficulty-badge.component.html',
  styleUrls: ['./difficulty-badge.component.scss']
})
export class DifficultyBadgeComponent {
  @Input({ required: true }) level!: DifficultyLevel;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get badgeClasses(): string {
    const sizeClass = `badge-${this.size}`;
    const levelClass = `badge-${this.level}`;
    return `${sizeClass} ${levelClass}`;
  }

  get label(): string {
    switch (this.level) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return '';
    }
  }

  get icon(): string {
    switch (this.level) {
      case 'beginner': return '●';
      case 'intermediate': return '●●';
      case 'advanced': return '●●●';
      default: return '';
    }
  }
}
