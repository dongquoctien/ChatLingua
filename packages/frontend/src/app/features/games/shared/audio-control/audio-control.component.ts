import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-audio-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-control.component.html',
  styleUrls: ['./audio-control.component.scss']
})
export class AudioControlComponent {
  @Input() showLabels = false;
  @Input() compact = false;

  isExpanded = false;

  constructor(public audioService: AudioService) {}

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    this.audioService.playSound('click');
  }

  toggleMusic(): void {
    this.audioService.toggleMusic();
    this.audioService.playSound('click');
  }

  toggleSfx(): void {
    this.audioService.toggleSfx();
    // Play sound after toggle to demonstrate it's on
    if (this.audioService.sfxEnabled()) {
      this.audioService.playSound('click');
    }
  }

  onMusicVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.audioService.setMusicVolume(parseFloat(target.value));
  }

  onSfxVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.audioService.setSfxVolume(parseFloat(target.value));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.audio-control-container')) {
      this.isExpanded = false;
    }
  }
}
