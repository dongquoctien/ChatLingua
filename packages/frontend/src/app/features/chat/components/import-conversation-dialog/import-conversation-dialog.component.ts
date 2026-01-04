import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faBook,
  faGraduationCap,
  faPencil,
  faDownload,
  faSpinner,
  faCheck,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { DialogRef } from '@angular/cdk/dialog';
import { ChatService } from '../../services/chat.service';
import type { SharedPreview, ImportOptions } from '../../chat.types';

export interface ImportConversationDialogData {
  messageId: number;
}

@Component({
  selector: 'app-import-conversation-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './import-conversation-dialog.component.html',
  styleUrls: ['./import-conversation-dialog.component.scss'],
})
export class ImportConversationDialogComponent implements OnInit {
  private dialogRef = inject(DialogRef<boolean>);
  private chatService = inject(ChatService);

  // Icons
  readonly faTimes = faTimes;
  readonly faBook = faBook;
  readonly faGraduationCap = faGraduationCap;
  readonly faPencil = faPencil;
  readonly faDownload = faDownload;
  readonly faSpinner = faSpinner;
  readonly faCheck = faCheck;
  readonly faExclamationTriangle = faExclamationTriangle;

  // State
  readonly loading = signal(true);
  readonly importing = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<SharedPreview | null>(null);
  readonly importSuccess = signal(false);
  readonly importResult = signal<{ vocabularyImported: number; grammarImported: number; exercisesImported: number } | null>(null);

  // Import options
  readonly importVocabulary = signal(true);
  readonly importGrammar = signal(true);
  readonly importExercises = signal(true);

  // Data from parent
  messageId = 0;

  ngOnInit() {
    const data = this.dialogRef.config.data as ImportConversationDialogData;
    if (data?.messageId) {
      this.messageId = data.messageId;
      this.loadPreview();
    } else {
      this.error.set('Invalid message ID');
      this.loading.set(false);
    }
  }

  loadPreview() {
    this.loading.set(true);
    this.error.set(null);

    this.chatService.getSharedPreview(this.messageId).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);

        // If already imported, show message
        if (preview.alreadyImported) {
          this.importSuccess.set(true);
        }
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load preview');
        this.loading.set(false);
      },
    });
  }

  toggleVocabulary() {
    this.importVocabulary.update(v => !v);
  }

  toggleGrammar() {
    this.importGrammar.update(v => !v);
  }

  toggleExercises() {
    this.importExercises.update(v => !v);
  }

  get hasSelection(): boolean {
    return this.importVocabulary() || this.importGrammar() || this.importExercises();
  }

  doImport() {
    if (!this.hasSelection || this.importing()) return;

    this.importing.set(true);
    this.error.set(null);

    const options: ImportOptions = {
      importVocabulary: this.importVocabulary(),
      importGrammar: this.importGrammar(),
      importExercises: this.importExercises(),
    };

    this.chatService.importSharedConversation(this.messageId, options).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importSuccess.set(true);
        this.importResult.set(result.stats);
      },
      error: (err) => {
        this.importing.set(false);
        this.error.set(err.error?.error || 'Failed to import conversation');
      },
    });
  }

  close() {
    this.dialogRef.close(this.importSuccess());
  }

  getDifficultyLabel(level?: string): string {
    switch (level) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return '';
    }
  }

  getDifficultyColor(level?: string): string {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}
