import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TranscriptLine {
  id?: string | number;
  startTime?: number;
  endTime?: number;
  speaker?: string;
  text: string;
  textVi?: string;
}

export interface TranscriptConfig {
  title?: string;
  lines: TranscriptLine[];
  showTimestamps?: boolean;
  showTranslations?: boolean;
  highlightCurrentLine?: boolean;
  currentTime?: number;
}

@Component({
  selector: 'app-transcript',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss']
})
export class TranscriptComponent {
  @Input() config!: TranscriptConfig;
  @Output() lineClick = new EventEmitter<TranscriptLine>();

  showTranslations = signal(true);

  toggleTranslations(): void {
    this.showTranslations.update(v => !v);
  }

  isCurrentLine(line: TranscriptLine): boolean {
    if (!this.config.highlightCurrentLine || this.config.currentTime === undefined) {
      return false;
    }
    if (line.startTime === undefined || line.endTime === undefined) {
      return false;
    }
    return this.config.currentTime >= line.startTime && this.config.currentTime < line.endTime;
  }

  formatTime(seconds?: number): string {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onLineClick(line: TranscriptLine): void {
    if (line.startTime !== undefined) {
      this.lineClick.emit(line);
    }
  }

  hasTranslations(): boolean {
    return this.config.lines.some(line => !!line.textVi);
  }
}
