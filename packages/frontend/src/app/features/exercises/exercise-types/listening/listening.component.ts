import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlay, faPause, faCheck, faRedo, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import { PronunciationService } from '../../../../core/services/pronunciation.service';

export interface ListeningData {
  transcript: string;
  questionType: 'dictation' | 'comprehension';
  comprehensionQuestion?: string;
  comprehensionOptions?: string[];
}

@Component({
  selector: 'app-listening',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnInit, OnDestroy {
  private pronunciationService = inject(PronunciationService);

  @Input() exerciseData!: ListeningData;
  @Input() audioUrl!: string;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faPlay = faPlay;
  faPause = faPause;
  faCheck = faCheck;
  faRedo = faRedo;
  faVolumeUp = faVolumeUp;

  // State
  userAnswer = signal('');
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  playbackRate = signal(1);
  playsRemaining = signal(3);

  private audioElement: HTMLAudioElement | null = null;

  // Computed
  progressPercent = computed(() => {
    if (this.duration() === 0) return 0;
    return (this.currentTime() / this.duration()) * 100;
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      if (this.audioUrl) {
        this.initAudioElement();
      }
    }
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.userAnswer.set(this.currentAnswer);
    }
  }

  ngOnDestroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.pronunciationService.stop();
  }

  private initAudioElement() {
    this.audioElement = new Audio(this.audioUrl);
    this.audioElement.onloadedmetadata = () => {
      this.duration.set(this.audioElement?.duration || 0);
    };
    this.audioElement.ontimeupdate = () => {
      this.currentTime.set(this.audioElement?.currentTime || 0);
    };
    this.audioElement.onended = () => {
      this.isPlaying.set(false);
    };
    this.audioElement.onerror = () => {
      // Fallback to speech synthesis
      this.isPlaying.set(false);
    };
  }

  togglePlayback() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.playsRemaining() <= 0 && this.currentTime() === 0) return;

    // Only decrement plays when starting fresh
    if (this.currentTime() === 0 || !this.audioElement) {
      this.playsRemaining.update(p => Math.max(0, p - 1));
    }

    if (this.audioUrl && this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate();
      this.audioElement.play();
      this.isPlaying.set(true);
    } else if (this.exerciseData?.transcript) {
      // Use PronunciationService as fallback when no audio URL
      this.playWithSpeechSynthesis();
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.pronunciationService.stop();
    this.isPlaying.set(false);
  }

  private playWithSpeechSynthesis() {
    if (!this.exerciseData?.transcript) return;

    // Estimate duration (rough: 150 words per minute)
    const wordCount = this.exerciseData.transcript.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.duration.set(estimatedDuration);

    // Use PronunciationService for speech synthesis
    this.pronunciationService.speakWithSynthesis(this.exerciseData.transcript, 'us');
    this.isPlaying.set(true);

    // Set up a timer to estimate when playback ends
    setTimeout(() => {
      if (this.isPlaying()) {
        this.isPlaying.set(false);
      }
    }, estimatedDuration * 1000);
  }

  setSpeed(rate: number) {
    this.playbackRate.set(rate);
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }

  seek(event: MouseEvent) {
    if (!this.audioElement || this.duration() === 0) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * this.duration();

    this.audioElement.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onAnswerChange(value: string) {
    this.userAnswer.set(value);
    // Auto-emit answer on change
    if (value.trim()) {
      this.answerChange.emit(value.trim());
    }
  }

  reset() {
    this.userAnswer.set('');
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
    this.currentTime.set(0);
    this.isPlaying.set(false);
  }

  confirmAnswer() {
    if (this.userAnswer()) {
      this.answerChange.emit(this.userAnswer().trim());
    }
  }
}
