import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowsAlt, faUndo, faCheck } from '@fortawesome/free-solid-svg-icons';

export interface SentenceBuildingData {
  words: string[];
  correctOrder?: number[];
}

@Component({
  selector: 'app-sentence-building',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  templateUrl: './sentence-building.component.html',
  styleUrl: './sentence-building.component.scss',
})
export class SentenceBuildingComponent implements OnInit {
  @Input() exerciseData!: SentenceBuildingData;
  @Input() currentAnswer = '';  // Restore previous answer
  @Input() disabled = false;
  @Output() answerChange = new EventEmitter<string>();

  // Icons
  faArrowsAlt = faArrowsAlt;
  faUndo = faUndo;
  faCheck = faCheck;

  // State
  availableWords = signal<string[]>([]);
  arrangedWords = signal<string[]>([]);

  // Drag state
  draggedWord = signal<string | null>(null);
  draggedFrom = signal<'available' | 'arranged' | null>(null);
  draggedIndex = signal<number | null>(null);
  dropTargetZone = signal<'available' | 'arranged' | null>(null);

  // Computed
  currentSentence = computed(() => this.arrangedWords().join(' '));

  ngOnInit() {
    if (this.currentAnswer && this.exerciseData?.words) {
      // Restore from previous answer
      this.restoreFromAnswer(this.currentAnswer);
    } else {
      this.reset();
    }
  }

  private restoreFromAnswer(answer: string) {
    const arrangedWords = answer.split(' ').filter(w => w.trim());
    const allWords = [...this.exerciseData.words];

    // Validate that arranged words are from the word list
    const validArranged = arrangedWords.filter(w => allWords.includes(w));
    const remaining = allWords.filter(w => !validArranged.includes(w));

    this.arrangedWords.set(validArranged);
    this.availableWords.set(remaining);
  }

  // Drag and Drop handlers
  onDragStart(event: DragEvent, word: string, from: 'available' | 'arranged', index: number) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    this.draggedWord.set(word);
    this.draggedFrom.set(from);
    this.draggedIndex.set(index);

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', word);
    }

    // Add dragging class
    const target = event.target as HTMLElement;
    setTimeout(() => target.classList.add('opacity-50'), 0);
  }

  onDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.classList.remove('opacity-50');
    this.resetDragState();
  }

  onDragOver(event: DragEvent, zone: 'available' | 'arranged') {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropTargetZone.set(zone);
  }

  onDragLeave(event: DragEvent) {
    this.dropTargetZone.set(null);
  }

  onDrop(event: DragEvent, targetZone: 'available' | 'arranged', targetIndex?: number) {
    event.preventDefault();

    const word = this.draggedWord();
    const fromZone = this.draggedFrom();
    const fromIndex = this.draggedIndex();

    if (!word || fromZone === null || fromIndex === null) {
      this.resetDragState();
      return;
    }

    // Remove from source
    if (fromZone === 'available') {
      const available = [...this.availableWords()];
      available.splice(fromIndex, 1);
      this.availableWords.set(available);
    } else {
      const arranged = [...this.arrangedWords()];
      arranged.splice(fromIndex, 1);
      this.arrangedWords.set(arranged);
    }

    // Add to target
    if (targetZone === 'available') {
      const available = [...this.availableWords()];
      if (targetIndex !== undefined) {
        available.splice(targetIndex, 0, word);
      } else {
        available.push(word);
      }
      this.availableWords.set(available);
    } else {
      const arranged = [...this.arrangedWords()];
      if (targetIndex !== undefined) {
        arranged.splice(targetIndex, 0, word);
      } else {
        arranged.push(word);
      }
      this.arrangedWords.set(arranged);
    }

    this.resetDragState();
    this.emitAnswer();
  }

  private resetDragState() {
    this.draggedWord.set(null);
    this.draggedFrom.set(null);
    this.draggedIndex.set(null);
    this.dropTargetZone.set(null);
  }

  private emitAnswer() {
    // Always emit current state so it can be restored
    const sentence = this.currentSentence();
    if (sentence) {
      this.answerChange.emit(sentence);
    }
  }

  reset() {
    if (this.exerciseData?.words) {
      // Shuffle words for the word bank
      const shuffled = [...this.exerciseData.words].sort(() => Math.random() - 0.5);
      this.availableWords.set(shuffled);
      this.arrangedWords.set([]);
      this.answerChange.emit(''); // Clear answer
    }
  }
}
