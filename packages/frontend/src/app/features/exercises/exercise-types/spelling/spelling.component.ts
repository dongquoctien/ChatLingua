import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faVolumeUp, faCheck, faLightbulb, faRedo } from '@fortawesome/free-solid-svg-icons';

export interface SpellingData {
  word: string;
  hint?: string;
  pronunciation?: string;
}

@Component({
  selector: 'app-spelling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    FontAwesomeModule,
  ],
  template: `
    <div class="spelling-container">
      <p class="instruction">Listen to the word and spell it correctly:</p>

      <!-- Audio Controls -->
      <div class="audio-section">
        <button mat-fab color="primary"
                (click)="playAudio()"
                [disabled]="isPlaying() || playsRemaining() <= 0">
          <fa-icon [icon]="faVolumeUp" size="lg"></fa-icon>
        </button>

        <div class="play-info">
          <span class="plays-remaining">
            {{ playsRemaining() }} plays remaining
          </span>
          @if (isPlaying()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
        </div>

        <button mat-stroked-button (click)="playAudio(0.7)" [disabled]="isPlaying() || playsRemaining() <= 0">
          Slow
        </button>
      </div>

      <!-- Hint -->
      @if (exerciseData?.hint) {
        <div class="hint-section">
          <button mat-button (click)="toggleHint()">
            <fa-icon [icon]="faLightbulb"></fa-icon>
            {{ showHint() ? 'Hide Hint' : 'Show Hint' }}
          </button>
          @if (showHint()) {
            <div class="hint-text">
              <strong>Hint:</strong> {{ exerciseData.hint }}
            </div>
          }
        </div>
      }

      <!-- Word Length Hint -->
      <div class="length-hint">
        <span>Word length: {{ exerciseData?.word?.length || '?' }} letters</span>
        <div class="letter-boxes">
          @for (i of getLetterBoxes(); track i) {
            <div class="letter-box"
                 [class.filled]="userAnswer()[i]">
              {{ userAnswer()[i] || '' }}
            </div>
          }
        </div>
      </div>

      <!-- Input -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Spell the word</mat-label>
        <input matInput
               [ngModel]="userAnswer()"
               (ngModelChange)="onAnswerChange($event)"
               [disabled]="disabled"
               (keyup.enter)="confirmAnswer()"
               autocomplete="off"
               spellcheck="false">
      </mat-form-field>

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
    .spelling-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .instruction {
      font-size: 1rem;
      color: #666;
    }

    .audio-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;

      .play-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .plays-remaining {
        font-size: 0.9rem;
        color: #666;
      }
    }

    .hint-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .hint-text {
        padding: 0.75rem;
        background: #fff3e0;
        border-radius: 4px;
        border-left: 3px solid #ff9800;
      }
    }

    .length-hint {
      text-align: center;

      span {
        font-size: 0.9rem;
        color: #666;
        display: block;
        margin-bottom: 0.5rem;
      }
    }

    .letter-boxes {
      display: flex;
      justify-content: center;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .letter-box {
      width: 32px;
      height: 40px;
      border: 2px solid #e0e0e0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 600;
      text-transform: uppercase;
      background: white;

      &.filled {
        border-color: #3f51b5;
        background: #e8eaf6;
        color: #3f51b5;
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
export class SpellingComponent implements OnInit, OnDestroy {
  @Input() exerciseData!: SpellingData;
  @Input() audioUrl?: string;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faVolumeUp = faVolumeUp;
  faCheck = faCheck;
  faLightbulb = faLightbulb;
  faRedo = faRedo;

  // State
  userAnswer = signal('');
  isPlaying = signal(false);
  playsRemaining = signal(5);
  showHint = signal(false);

  private speechSynthesis: SpeechSynthesis | null = null;
  private audioElement: HTMLAudioElement | null = null;

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis;
    }
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.userAnswer.set(this.currentAnswer);
    }
  }

  ngOnDestroy() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  playAudio(rate: number = 1) {
    if (this.playsRemaining() <= 0) return;

    this.isPlaying.set(true);
    this.playsRemaining.update(p => p - 1);

    // Try audio URL first if available
    if (this.audioUrl) {
      this.playFromUrl(rate);
    } else if (this.speechSynthesis && this.exerciseData?.word) {
      this.playWithSpeechSynthesis(rate);
    } else {
      this.isPlaying.set(false);
    }
  }

  private playFromUrl(rate: number) {
    if (!this.audioUrl) return;

    this.audioElement = new Audio(this.audioUrl);
    this.audioElement.playbackRate = rate;
    this.audioElement.onended = () => this.isPlaying.set(false);
    this.audioElement.onerror = () => {
      this.isPlaying.set(false);
      // Fallback to speech synthesis
      this.playWithSpeechSynthesis(rate);
    };
    this.audioElement.play();
  }

  private playWithSpeechSynthesis(rate: number) {
    if (!this.speechSynthesis || !this.exerciseData?.word) return;

    const utterance = new SpeechSynthesisUtterance(this.exerciseData.word);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onend = () => this.isPlaying.set(false);
    utterance.onerror = () => this.isPlaying.set(false);

    this.speechSynthesis.speak(utterance);
  }

  toggleHint() {
    this.showHint.update(v => !v);
  }

  onAnswerChange(value: string) {
    this.userAnswer.set(value);
    // Auto-emit answer on change
    if (value.trim()) {
      this.answerChange.emit(value.trim().toLowerCase());
    }
  }

  getLetterBoxes(): number[] {
    const length = this.exerciseData?.word?.length || 0;
    return Array.from({ length }, (_, i) => i);
  }

  reset() {
    this.userAnswer.set('');
    this.playsRemaining.set(5);
    this.showHint.set(false);
  }

  confirmAnswer() {
    if (this.userAnswer()) {
      this.answerChange.emit(this.userAnswer().trim().toLowerCase());
    }
  }
}
