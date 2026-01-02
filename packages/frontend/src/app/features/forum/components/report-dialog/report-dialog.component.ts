import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faFlag,
  faSpinner,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'harassment'
  | 'misinformation'
  | 'copyright'
  | 'other';

export type ReportType = 'post' | 'comment';

export interface ReportData {
  reason: ReportReason;
  details: string;
}

interface ReasonOption {
  value: ReportReason;
  label: string;
  description: string;
}

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './report-dialog.component.html',
  styleUrls: ['./report-dialog.component.scss']
})
export class ReportDialogComponent {
  @Input() isOpen = false;
  @Input() type: ReportType = 'post';
  @Input() loading = false;
  @Input() success = false;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ReportData>();

  faTimes = faTimes;
  faFlag = faFlag;
  faSpinner = faSpinner;
  faCheck = faCheck;
  faExclamationTriangle = faExclamationTriangle;

  selectedReason = signal<ReportReason | null>(null);
  details = '';

  readonly reasons: ReasonOption[] = [
    {
      value: 'spam',
      label: 'Spam',
      description: 'Promotional content, repetitive posts, or unrelated advertising'
    },
    {
      value: 'inappropriate',
      label: 'Inappropriate Content',
      description: 'Offensive, vulgar, or sexually explicit content'
    },
    {
      value: 'harassment',
      label: 'Harassment',
      description: 'Bullying, threats, or targeted attacks against individuals'
    },
    {
      value: 'misinformation',
      label: 'Misinformation',
      description: 'False or misleading educational content'
    },
    {
      value: 'copyright',
      label: 'Copyright Violation',
      description: 'Content that infringes on intellectual property rights'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Something else not listed above'
    }
  ];

  get typeLabel(): string {
    return this.type === 'post' ? 'Post' : 'Comment';
  }

  get canSubmit(): boolean {
    return this.selectedReason() !== null;
  }

  selectReason(reason: ReportReason): void {
    this.selectedReason.set(reason);
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onSubmit(): void {
    const reason = this.selectedReason();
    if (!reason || this.loading) return;

    this.submit.emit({
      reason,
      details: this.details.trim()
    });
  }

  resetForm(): void {
    this.selectedReason.set(null);
    this.details = '';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onClose();
    }
  }
}
