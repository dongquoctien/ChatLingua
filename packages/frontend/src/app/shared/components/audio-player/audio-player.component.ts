import { Component, Input, Output, EventEmitter, signal, computed, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AudioConfig {
  title?: string;
  url: string;
  transcript?: string;
  transcriptVi?: string;
  duration?: number;
  autoplay?: boolean;
}

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss']
})
export class AudioPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;

  @Input() config!: AudioConfig;
  @Output() ended = new EventEmitter<void>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() loaded = new EventEmitter<number>();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  isLoading = signal(true);
  error = signal<string | null>(null);
  playbackRate = signal(1);
  volume = signal(1);
  showTranscript = signal(false);

  progress = computed(() => {
    const dur = this.duration();
    if (dur === 0) return 0;
    return (this.currentTime() / dur) * 100;
  });

  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));

  private audio: HTMLAudioElement | null = null;

  ngAfterViewInit(): void {
    this.audio = this.audioElement?.nativeElement;
    if (this.audio) {
      this.setupAudioListeners();
      if (this.config.autoplay) {
        this.play();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
  }

  private setupAudioListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio!.duration);
      this.isLoading.set(false);
      this.loaded.emit(this.audio!.duration);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio!.currentTime);
      this.timeUpdate.emit(this.audio!.currentTime);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.ended.emit();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });

    this.audio.addEventListener('error', () => {
      this.error.set('Failed to load audio');
      this.isLoading.set(false);
    });

    this.audio.addEventListener('waiting', () => {
      this.isLoading.set(true);
    });

    this.audio.addEventListener('canplay', () => {
      this.isLoading.set(false);
    });
  }

  play(): void {
    if (this.audio) {
      this.audio.play().catch(err => {
        console.error('Audio play error:', err);
        this.error.set('Failed to play audio');
      });
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(event: MouseEvent): void {
    if (!this.audio) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.audio.currentTime = percent * this.duration();
  }

  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = rate;
      this.playbackRate.set(rate);
    }
  }

  setVolume(vol: number): void {
    if (this.audio) {
      this.audio.volume = vol;
      this.volume.set(vol);
    }
  }

  skipBackward(seconds: number = 5): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, this.audio.currentTime - seconds);
    }
  }

  skipForward(seconds: number = 5): void {
    if (this.audio) {
      this.audio.currentTime = Math.min(this.duration(), this.audio.currentTime + seconds);
    }
  }

  toggleTranscript(): void {
    this.showTranscript.update(v => !v);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
