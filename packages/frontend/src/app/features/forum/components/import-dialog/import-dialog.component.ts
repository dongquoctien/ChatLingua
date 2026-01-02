import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faDownload,
  faBook,
  faGraduationCap,
  faTasks,
  faCheck,
  faSpinner,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

export interface ImportOptions {
  importVocabulary: boolean;
  importGrammar: boolean;
  importExercises: boolean;
}

export interface ImportContent {
  vocabularyCount: number;
  grammarCount: number;
  exerciseCount: number;
}

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent {
  @Input() isOpen = false;
  @Input() content: ImportContent = { vocabularyCount: 0, grammarCount: 0, exerciseCount: 0 };
  @Input() postTitle = '';
  @Input() loading = false;
  @Input() success = false;

  @Output() close = new EventEmitter<void>();
  @Output() import = new EventEmitter<ImportOptions>();

  faTimes = faTimes;
  faDownload = faDownload;
  faBook = faBook;
  faGraduationCap = faGraduationCap;
  faTasks = faTasks;
  faCheck = faCheck;
  faSpinner = faSpinner;
  faInfoCircle = faInfoCircle;

  options = signal<ImportOptions>({
    importVocabulary: true,
    importGrammar: true,
    importExercises: false
  });

  get hasContent(): boolean {
    return this.content.vocabularyCount > 0 || this.content.grammarCount > 0 || this.content.exerciseCount > 0;
  }

  get hasVocabulary(): boolean {
    return this.content.vocabularyCount > 0;
  }

  get hasGrammar(): boolean {
    return this.content.grammarCount > 0;
  }

  get hasExercises(): boolean {
    return this.content.exerciseCount > 0;
  }

  get canImport(): boolean {
    const opts = this.options();
    return (
      (opts.importVocabulary && this.hasVocabulary) ||
      (opts.importGrammar && this.hasGrammar) ||
      (opts.importExercises && this.hasExercises)
    );
  }

  get selectedCount(): number {
    let count = 0;
    const opts = this.options();
    if (opts.importVocabulary && this.hasVocabulary) count += this.content.vocabularyCount;
    if (opts.importGrammar && this.hasGrammar) count += this.content.grammarCount;
    if (opts.importExercises && this.hasExercises) count += this.content.exerciseCount;
    return count;
  }

  toggleVocabulary(): void {
    this.options.update(opts => ({ ...opts, importVocabulary: !opts.importVocabulary }));
  }

  toggleGrammar(): void {
    this.options.update(opts => ({ ...opts, importGrammar: !opts.importGrammar }));
  }

  toggleExercises(): void {
    this.options.update(opts => ({ ...opts, importExercises: !opts.importExercises }));
  }

  onClose(): void {
    this.close.emit();
  }

  onImport(): void {
    if (!this.canImport || this.loading) return;
    this.import.emit(this.options());
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onClose();
    }
  }
}
