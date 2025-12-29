import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUser,
  faLock,
  faSave,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faCamera,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService, User, UpdateProfileRequest, ChangePasswordRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);

  // Icons
  faUser = faUser;
  faLock = faLock;
  faSave = faSave;
  faSpinner = faSpinner;
  faCheck = faCheck;
  faExclamationTriangle = faExclamationTriangle;
  faCamera = faCamera;

  // State
  activeTab = signal<'profile' | 'password'>('profile');
  loading = signal(false);
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);
  passwordSuccess = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  // Profile form
  avatar = signal<string | null>(null);
  nickname = signal<string | null>(null);
  bio = signal<string | null>(null);
  gender = signal<'male' | 'female' | 'other' | 'prefer_not_to_say' | null>(null);

  // Password form
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  // Gender options
  genderOptions: Array<{ value: 'male' | 'female' | 'other' | 'prefer_not_to_say'; label: string }> = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  // Computed
  user = this.authService.currentUser;

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.authService.refreshProfile().subscribe({
      next: (user) => {
        this.avatar.set(user.avatar);
        this.nickname.set(user.nickname);
        this.bio.set(user.bio);
        this.gender.set(user.gender);
      },
      error: (err) => {
        console.error('Failed to load profile', err);
      }
    });
  }

  setTab(tab: 'profile' | 'password') {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  clearMessages() {
    this.profileSuccess.set(null);
    this.profileError.set(null);
    this.passwordSuccess.set(null);
    this.passwordError.set(null);
  }

  updateProfile() {
    this.clearMessages();
    this.loading.set(true);

    const data: UpdateProfileRequest = {
      avatar: this.avatar(),
      nickname: this.nickname(),
      bio: this.bio(),
      gender: this.gender(),
    };

    this.authService.updateProfile(data).subscribe({
      next: () => {
        this.profileSuccess.set('Profile updated successfully');
        this.loading.set(false);
      },
      error: (err) => {
        this.profileError.set(err || 'Failed to update profile');
        this.loading.set(false);
      }
    });
  }

  changePassword() {
    this.clearMessages();

    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('New passwords do not match');
      return;
    }

    if (this.newPassword().length < 6) {
      this.passwordError.set('New password must be at least 6 characters');
      return;
    }

    this.loading.set(true);

    const data: ChangePasswordRequest = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    };

    this.authService.changePassword(data).subscribe({
      next: () => {
        this.passwordSuccess.set('Password changed successfully');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.passwordError.set(err || 'Failed to change password');
        this.loading.set(false);
      }
    });
  }

  getGenderLabel(gender: string | null): string {
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      case 'other': return 'Other';
      case 'prefer_not_to_say': return 'Prefer not to say';
      default: return 'Not set';
    }
  }

  getDefaultAvatar(): string {
    const user = this.user();
    if (!user) return 'https://ui-avatars.com/api/?name=User&background=random';
    const name = user.nickname || user.username;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  }
}
