import { Component, Input, Output, EventEmitter, signal, computed, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VideoConfig {
  title?: string;
  url: string;
  poster?: string;
  transcript?: string;
  transcriptVi?: string;
  duration?: number;
  autoplay?: boolean;
}

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  @Input() config!: VideoConfig;
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
  isFullscreen = signal(false);
  showControls = signal(true);
  showTranscript = signal(false);

  progress = computed(() => {
    const dur = this.duration();
    if (dur === 0) return 0;
    return (this.currentTime() / dur) * 100;
  });

  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));

  private video: HTMLVideoElement | null = null;
  private controlsTimeout: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.video = this.videoElement?.nativeElement;
    if (this.video) {
      this.setupVideoListeners();
      if (this.config.autoplay) {
        this.play();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  private setupVideoListeners(): void {
    if (!this.video) return;

    this.video.addEventListener('loadedmetadata', () => {
      this.duration.set(this.video!.duration);
      this.isLoading.set(false);
      this.loaded.emit(this.video!.duration);
    });

    this.video.addEventListener('timeupdate', () => {
      this.currentTime.set(this.video!.currentTime);
      this.timeUpdate.emit(this.video!.currentTime);
    });

    this.video.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.ended.emit();
    });

    this.video.addEventListener('play', () => {
      this.isPlaying.set(true);
    });

    this.video.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });

    this.video.addEventListener('error', () => {
      this.error.set('Failed to load video');
      this.isLoading.set(false);
    });

    this.video.addEventListener('waiting', () => {
      this.isLoading.set(true);
    });

    this.video.addEventListener('canplay', () => {
      this.isLoading.set(false);
    });

    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  play(): void {
    if (this.video) {
      this.video.play().catch(err => {
        console.error('Video play error:', err);
        this.error.set('Failed to play video');
      });
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause();
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
    if (!this.video) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.video.currentTime = percent * this.duration();
  }

  setPlaybackRate(rate: number): void {
    if (this.video) {
      this.video.playbackRate = rate;
      this.playbackRate.set(rate);
    }
  }

  setVolume(vol: number): void {
    if (this.video) {
      this.video.volume = vol;
      this.volume.set(vol);
    }
  }

  skipBackward(seconds: number = 10): void {
    if (this.video) {
      this.video.currentTime = Math.max(0, this.video.currentTime - seconds);
    }
  }

  skipForward(seconds: number = 10): void {
    if (this.video) {
      this.video.currentTime = Math.min(this.duration(), this.video.currentTime + seconds);
    }
  }

  toggleFullscreen(): void {
    const container = this.videoElement?.nativeElement.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleTranscript(): void {
    this.showTranscript.update(v => !v);
  }

  onMouseMove(): void {
    this.showControls.set(true);
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.isPlaying()) {
      this.controlsTimeout = setTimeout(() => {
        this.showControls.set(false);
      }, 3000);
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
