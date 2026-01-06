import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AvatarEquipment {
  frameColor?: string;
  frameStyle?: string;
  effectType?: string;
  badgeEmoji?: string;
}

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAvatarComponent {
  @Input() src: string | null = null;
  @Input() name: string = 'User';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() equipment: AvatarEquipment | null = null;
  @Input() showOnlineStatus = false;
  @Input() isOnline = false;

  get sizeClasses(): string {
    const sizes = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24'
    };
    return sizes[this.size] || sizes.md;
  }

  get innerSizeClasses(): string {
    // Inner avatar is slightly smaller than container
    const sizes = {
      xs: 'w-5 h-5',
      sm: 'w-7 h-7',
      md: 'w-9 h-9',
      lg: 'w-14 h-14',
      xl: 'w-22 h-22'
    };
    return sizes[this.size] || sizes.md;
  }

  get textSizeClass(): string {
    const sizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-xl',
      xl: 'text-3xl'
    };
    return sizes[this.size] || sizes.md;
  }

  get badgeSizeClass(): string {
    const sizes = {
      xs: 'w-3 h-3 text-xs',
      sm: 'w-4 h-4 text-xs',
      md: 'w-5 h-5 text-sm',
      lg: 'w-7 h-7 text-base',
      xl: 'w-9 h-9 text-lg'
    };
    return sizes[this.size] || sizes.md;
  }

  get statusSizeClass(): string {
    const sizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3.5 h-3.5',
      xl: 'w-5 h-5'
    };
    return sizes[this.size] || sizes.md;
  }

  get frameStyle(): Record<string, string> {
    if (!this.equipment?.frameColor) return {};

    return {
      '--frame-color': this.equipment.frameColor
    };
  }

  get avatarSrc(): string {
    if (this.src) return this.src;
    // Generate placeholder
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=e5e7eb&color=374151&size=128`;
  }

  get initials(): string {
    return this.name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
