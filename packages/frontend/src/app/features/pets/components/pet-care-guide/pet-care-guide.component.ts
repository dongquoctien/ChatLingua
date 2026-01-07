import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type GuideSection = 'overview' | 'happiness' | 'energy' | 'fullness' | 'hp' | 'bonuses' | 'tips';

@Component({
  selector: 'app-pet-care-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-care-guide.component.html',
  styleUrls: ['./pet-care-guide.component.scss']
})
export class PetCareGuideComponent {
  @Output() close = new EventEmitter<void>();

  activeSection = signal<GuideSection>('overview');

  sections: { id: GuideSection; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'happiness', label: 'Happiness', icon: '😊' },
    { id: 'energy', label: 'Energy', icon: '⚡' },
    { id: 'fullness', label: 'Fullness', icon: '🍖' },
    { id: 'hp', label: 'Health (HP)', icon: '❤️' },
    { id: 'bonuses', label: 'Bonuses', icon: '✨' },
    { id: 'tips', label: 'Pro Tips', icon: '💡' }
  ];

  setSection(section: GuideSection): void {
    this.activeSection.set(section);
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
