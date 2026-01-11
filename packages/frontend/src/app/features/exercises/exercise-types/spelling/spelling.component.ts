import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faVolumeUp, faCheck, faLightbulb, faRedo } from '@fortawesome/free-solid-svg-icons';
import { PronunciationService } from '../../../../core/services/pronunciation.service';

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
  private pronunciationService = inject(PronunciationService);

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
  playsRemaining = signal(5);
  showHint = signal(false);

  // Use PronunciationService's speaking signal - wrap as computed for template compatibility
  isPlaying = () => this.pronunciationService.speaking() !== null;

  private audioElement: HTMLAudioElement | null = null;

  ngOnInit() {
    // Restore previous answer if provided
    if (this.currentAnswer) {
      this.userAnswer.set(this.currentAnswer);
    }
  }

  ngOnDestroy() {
    this.pronunciationService.stop();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  playAudio(rate: number = 1) {
    if (this.playsRemaining() <= 0) return;

    this.playsRemaining.update(p => p - 1);

    // For rate != 1, we need to handle audio playback differently
    if (rate !== 1 && this.audioUrl) {
      // Use custom audio element for playback rate control
      this.playFromUrlWithRate(rate);
    } else {
      // Use PronunciationService with fallback chain (normal speed)
      this.pronunciationService.speak(this.exerciseData?.word || '', 'us');
    }
  }

  private playFromUrlWithRate(rate: number) {
    if (!this.audioUrl) {
      // Fallback to speech synthesis for slow playback
      this.pronunciationService.speakWithSynthesis(this.exerciseData?.word || '', 'us');
      return;
    }

    this.audioElement = new Audio(this.audioUrl);
    this.audioElement.playbackRate = rate;
    this.audioElement.onended = () => this.pronunciationService.stop();
    this.audioElement.onerror = () => {
      // Fallback to speech synthesis
      this.pronunciationService.speakWithSynthesis(this.exerciseData?.word || '', 'us');
    };
    this.audioElement.play();
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
