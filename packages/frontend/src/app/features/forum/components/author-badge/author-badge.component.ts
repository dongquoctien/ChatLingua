import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSeedling,
  faStar,
  faFire,
  faShieldAlt,
  faAward,
  faCrown,
  faGem,
  IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { ForumRank } from '../../services/forum.service';

@Component({
  selector: 'app-author-badge',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './author-badge.component.html',
  styleUrls: ['./author-badge.component.scss']
})
export class AuthorBadgeComponent {
  @Input({ required: true }) rank!: ForumRank;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showLabel = true;

  readonly rankConfig: Record<ForumRank, {
    label: string;
    icon: IconDefinition;
    bgClass: string;
    textClass: string;
    description: string;
  }> = {
    newcomer: {
      label: 'Newcomer',
      icon: faSeedling,
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600',
      description: '0-50 reputation'
    },
    contributor: {
      label: 'Contributor',
      icon: faStar,
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-700',
      description: '51-200 reputation'
    },
    active_contributor: {
      label: 'Active',
      icon: faFire,
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
      description: '201-500 reputation'
    },
    trusted_contributor: {
      label: 'Trusted',
      icon: faShieldAlt,
      bgClass: 'bg-purple-100',
      textClass: 'text-purple-700',
      description: '501-1000 reputation'
    },
    expert: {
      label: 'Expert',
      icon: faAward,
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-700',
      description: '1001-2500 reputation'
    },
    master: {
      label: 'Master',
      icon: faCrown,
      bgClass: 'bg-orange-100',
      textClass: 'text-orange-700',
      description: '2501-5000 reputation'
    },
    legend: {
      label: 'Legend',
      icon: faGem,
      bgClass: 'bg-red-100',
      textClass: 'text-red-700',
      description: '5000+ reputation'
    }
  };

  get config() {
    return this.rankConfig[this.rank] || this.rankConfig.newcomer;
  }

  get sizeClasses(): string {
    switch (this.size) {
      case 'small': return 'px-1.5 py-0.5 text-xs gap-0.5';
      case 'large': return 'px-3 py-1.5 text-sm gap-2';
      default: return 'px-2 py-1 text-xs gap-1';
    }
  }

  get iconSize(): string {
    switch (this.size) {
      case 'small': return 'text-[10px]';
      case 'large': return 'text-sm';
      default: return 'text-xs';
    }
  }
}
