import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlay, faPause, faCheck, faRedo, faVolumeUp } from '@fortawesome/free-solid-svg-icons';

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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressBarModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="listening-container">
      <p class="instruction">
        @if (exerciseData?.questionType === 'dictation') {
          Listen carefully and write exactly what you hear:
        } @else {
          Listen and answer the question below:
        }
      </p>

      <!-- Audio Player -->
      <div class="audio-player">
        <button mat-fab [color]="isPlaying() ? 'warn' : 'primary'" (click)="togglePlayback()">
          <fa-icon [icon]="isPlaying() ? faPause : faPlay" size="lg"></fa-icon>
        </button>

        <div class="player-info">
          <div class="time-display">
            {{ formatTime(currentTime()) }} / {{ formatTime(duration()) }}
          </div>
          <mat-progress-bar
            mode="determinate"
            [value]="progressPercent()"
            (click)="seek($event)">
          </mat-progress-bar>
          <div class="plays-info">
            <fa-icon [icon]="faVolumeUp"></fa-icon>
            {{ playsRemaining() }} plays remaining
          </div>
        </div>

        <div class="speed-controls">
          <button mat-stroked-button
                  [class.active]="playbackRate() === 0.75"
                  (click)="setSpeed(0.75)">
            0.75x
          </button>
          <button mat-stroked-button
                  [class.active]="playbackRate() === 1"
                  (click)="setSpeed(1)">
            1x
          </button>
        </div>
      </div>

      <!-- Dictation Input -->
      @if (exerciseData?.questionType === 'dictation') {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Write what you heard</mat-label>
          <textarea matInput
                    rows="4"
                    [ngModel]="userAnswer()"
                    (ngModelChange)="onAnswerChange($event)"
                    [disabled]="disabled"
                    placeholder="Type the sentence you heard...">
          </textarea>
          <mat-hint>Write the complete sentence as you hear it</mat-hint>
        </mat-form-field>
      }

      <!-- Comprehension Question -->
      @if (exerciseData?.questionType === 'comprehension') {
        <div class="comprehension-section">
          @if (exerciseData?.comprehensionQuestion) {
            <p class="question-text">{{ exerciseData.comprehensionQuestion }}</p>
          }

          @if (exerciseData.comprehensionOptions && exerciseData.comprehensionOptions.length > 0) {
            <mat-radio-group [ngModel]="userAnswer()" (ngModelChange)="onAnswerChange($event)" class="options-list">
              @for (option of exerciseData.comprehensionOptions; track option) {
                <mat-radio-button [value]="option" [disabled]="disabled">
                  {{ option }}
                </mat-radio-button>
              }
            </mat-radio-group>
          } @else {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Your answer</mat-label>
              <input matInput
                     [ngModel]="userAnswer()"
                     (ngModelChange)="onAnswerChange($event)"
                     [disabled]="disabled">
            </mat-form-field>
          }
        </div>
      }

      <!-- Actions -->
      <div class="actions">
        <button mat-stroked-button (click)="reset()" [disabled]="disabled">
          <fa-icon [icon]="faRedo"></fa-icon>
          Reset
        </button>
      </div>
    </div>
  `,
  styles: [`
    .listening-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .instruction {
      font-size: 1rem;
      color: #666;
    }

    .audio-player {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;

      button[mat-fab] {
        flex-shrink: 0;
      }
    }

    .player-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .time-display {
        font-size: 0.9rem;
        font-family: monospace;
      }

      mat-progress-bar {
        cursor: pointer;
        height: 8px;
        border-radius: 4px;

        ::ng-deep .mdc-linear-progress__bar-inner {
          border-color: white;
        }
      }

      .plays-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        opacity: 0.9;
      }
    }

    .speed-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      button {
        color: white;
        border-color: rgba(255,255,255,0.5);

        &.active {
          background: rgba(255,255,255,0.2);
          border-color: white;
        }
      }
    }

    .comprehension-section {
      .question-text {
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 1rem;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        mat-radio-button {
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          transition: all 0.2s;

          &:hover {
            border-color: #3f51b5;
            background: #f5f5f5;
          }
        }
      }
    }

    .full-width {
      width: 100%;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      button fa-icon {
        margin-right: 0.5rem;
      }
    }
  `]
})
export class ListeningComponent implements OnInit, OnDestroy {
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
  private speechSynthesis: SpeechSynthesis | null = null;

  // Computed
  progressPercent = computed(() => {
    if (this.duration() === 0) return 0;
    return (this.currentTime() / this.duration()) * 100;
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis;

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
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
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
    } else if (this.speechSynthesis && this.exerciseData?.transcript) {
      this.playWithSpeechSynthesis();
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.speechSynthesis) {
      this.speechSynthesis.pause();
    }
    this.isPlaying.set(false);
  }

  private playWithSpeechSynthesis() {
    if (!this.speechSynthesis || !this.exerciseData?.transcript) return;

    const utterance = new SpeechSynthesisUtterance(this.exerciseData.transcript);
    utterance.lang = 'en-US';
    utterance.rate = this.playbackRate();
    utterance.onend = () => this.isPlaying.set(false);
    utterance.onerror = () => this.isPlaying.set(false);

    // Estimate duration (rough: 150 words per minute)
    const wordCount = this.exerciseData.transcript.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.duration.set(estimatedDuration);

    this.speechSynthesis.speak(utterance);
    this.isPlaying.set(true);
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
