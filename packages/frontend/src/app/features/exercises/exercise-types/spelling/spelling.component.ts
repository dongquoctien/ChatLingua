import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FontAwesomeModule,
  ],
  templateUrl: './spelling.component.html',
  styleUrl: './spelling.component.scss',
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
