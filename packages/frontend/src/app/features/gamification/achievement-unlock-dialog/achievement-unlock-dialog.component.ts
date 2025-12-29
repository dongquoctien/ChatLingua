import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faStar, faFire, faBolt, faGraduationCap,
  faCheckCircle, faClock, faRocket, faTimes
} from '../../../shared/icons';
import { UserAchievementInfo } from '../../../core/services/api.service';

@Component({
  selector: 'app-achievement-unlock-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './achievement-unlock-dialog.component.html',
  styleUrl: './achievement-unlock-dialog.component.scss',
})
export class AchievementUnlockDialogComponent implements OnInit {
  @Input() achievement!: UserAchievementInfo;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

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

  ngOnInit() {
    // Trigger animations after dialog opens
    setTimeout(() => {
      this.animationReady.set(true);
      setTimeout(() => this.xpAnimated.set(true), 300);
    }, 100);
  }

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
    this.closed.emit();
  }
}
