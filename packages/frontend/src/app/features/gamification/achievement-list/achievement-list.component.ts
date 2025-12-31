import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrophy, faLock, faStar, faFire, faBolt,
  faGraduationCap, faCheckCircle, faClock, faRocket, faGamepad
} from '../../../shared/icons';
import { UserAchievementInfo } from '../../../core/services/api.service';

type AchievementCategory = 'all' | 'learning' | 'streak' | 'quiz' | 'speed' | 'milestone' | 'game';

interface CategoryTab {
  id: AchievementCategory;
  label: string;
  icon: any;
}

@Component({
  selector: 'app-achievement-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './achievement-list.component.html',
  styleUrl: './achievement-list.component.scss',
})
export class AchievementListComponent {
  @Input() achievements: UserAchievementInfo[] = [];
  @Output() achievementClick = new EventEmitter<UserAchievementInfo>();

  // Icons
  faTrophy = faTrophy;
  faLock = faLock;
  faStar = faStar;
  faFire = faFire;
  faBolt = faBolt;
  faGraduationCap = faGraduationCap;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faRocket = faRocket;
  faGamepad = faGamepad;

  // Category tabs
  categoryTabs: CategoryTab[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'learning', label: 'Learning', icon: faGraduationCap },
    { id: 'streak', label: 'Streak', icon: faFire },
    { id: 'quiz', label: 'Quiz', icon: faCheckCircle },
    { id: 'speed', label: 'Speed', icon: faClock },
    { id: 'milestone', label: 'Milestone', icon: faRocket },
    { id: 'game', label: 'Game', icon: faGamepad },
  ];

  // State
  selectedCategory = signal<AchievementCategory>('all');

  // Computed
  unlockedCount = computed(() =>
    this.achievements.filter(a => a.isUnlocked).length
  );

  filteredAchievements = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') {
      return [...this.achievements].sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progressPercentage - a.progressPercentage;
      });
    }
    return this.achievements
      .filter(a => a.category === category)
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progressPercentage - a.progressPercentage;
      });
  });

  onCategoryChange(index: number) {
    this.selectedCategory.set(this.categoryTabs[index].id);
  }

  getNewCount(category: AchievementCategory): number {
    if (category === 'all') {
      return this.achievements.filter(a => a.isNew).length;
    }
    return this.achievements.filter(a => a.category === category && a.isNew).length;
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
      'gamepad': faGamepad,
    };
    return iconMap[iconName] || faTrophy;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'learning': '#22c55e',
      'streak': '#f97316',
      'quiz': '#374151',
      'speed': '#a855f7',
      'milestone': '#fbbf24',
      'game': '#ec4899',
    };
    return colors[category] || '#fbbf24';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  onAchievementClick(achievement: UserAchievementInfo) {
    this.achievementClick.emit(achievement);
  }
}
