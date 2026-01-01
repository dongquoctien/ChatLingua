import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faStar, faFire, faBolt, faGraduationCap,
  faCheckCircle, faClock, faRocket, faTimes, faShare
} from '../../../shared/icons';
import { UserAchievementInfo } from '../../../core/services/api.service';
import { ShareDialogComponent, ShareableContent } from '../../chat/components/share-dialog/share-dialog.component';
import { ChatService } from '../../chat/services/chat.service';
import type { UserStatusInfo } from '../../chat/chat.types';

@Component({
  selector: 'app-achievement-unlock-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    ShareDialogComponent,
  ],
  templateUrl: './achievement-unlock-dialog.component.html',
  styleUrl: './achievement-unlock-dialog.component.scss',
})
export class AchievementUnlockDialogComponent implements OnInit {
  private chatService = inject(ChatService);

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
  faShare = faShare;

  // State
  animationReady = signal(false);
  xpAnimated = signal(false);
  confettiPieces = Array.from({ length: 30 }, (_, i) => i);

  // Share dialog state
  showShareDialog = signal(false);
  shareableUsers = signal<UserStatusInfo[]>([]);
  shareContent = signal<ShareableContent | null>(null);

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

  // Share functionality
  openShareDialog(): void {
    // Create shareable content for the achievement
    this.shareContent.set({
      type: 'achievement',
      id: this.achievement.id,
      title: this.achievement.name,
      subtitle: this.achievement.description,
      icon: '🏆',
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      data: {
        id: this.achievement.id,
        title: this.achievement.name,
        description: this.achievement.description,
        icon: this.achievement.icon,
        xpReward: this.achievement.xpReward,
        unlockedAt: this.achievement.unlockedAt,
      },
    });

    // Load users for share dialog
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        this.shareableUsers.set(response.items);
        this.showShareDialog.set(true);
      },
      error: (err) => {
        console.error('Failed to load users for sharing:', err);
      },
    });
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
  }

  onShared(event: { recipientId: number; comment: string }): void {
    this.showShareDialog.set(false);
  }
}
