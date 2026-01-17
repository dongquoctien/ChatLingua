import { Component, Input, Output, EventEmitter, signal, computed, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyPageAudioConfig } from '@chatlingua/shared';

@Component({
  selector: 'app-audio-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-popup.component.html',
  styleUrls: ['./audio-popup.component.scss']
})
export class AudioPopupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;

  @Input({ required: true }) audio!: StudyPageAudioConfig;
  @Output() close = new EventEmitter<void>();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  isLoading = signal(true);

  progress = computed(() => {
    const dur = this.duration();
    if (dur === 0) return 0;
    return (this.currentTime() / dur) * 100;
  });

  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));

  private audioEl: HTMLAudioElement | null = null;

  get audioUrl(): string {
    const baseUrl = this.audio.baseUrl || '/audio/word-maps/prepare-2e-l1/sb/';
    return baseUrl + this.audio.fileName;
  }

  ngAfterViewInit(): void {
    this.audioEl = this.audioElement?.nativeElement;
    if (this.audioEl) {
      this.setupAudioListeners();
    }
  }

  ngOnDestroy(): void {
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  private setupAudioListeners(): void {
    if (!this.audioEl) return;

    this.audioEl.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audioEl!.duration);
      this.isLoading.set(false);
    });

    this.audioEl.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audioEl!.currentTime);
    });

    this.audioEl.addEventListener('ended', () => {
      this.isPlaying.set(false);
    });

    this.audioEl.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.audioEl.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });

    this.audioEl.addEventListener('canplay', () => {
      this.isLoading.set(false);
    });

    this.audioEl.addEventListener('error', () => {
      this.isLoading.set(false);
    });
  }

  togglePlay(): void {
    if (!this.audioEl) return;

    if (this.isPlaying()) {
      this.audioEl.pause();
    } else {
      this.audioEl.play().catch(err => {
        console.error('Audio play error:', err);
      });
    }
  }

  seek(event: MouseEvent): void {
    if (!this.audioEl) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.audioEl.currentTime = percent * this.duration();
  }

  onClose(): void {
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.close.emit();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
