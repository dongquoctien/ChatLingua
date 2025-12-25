import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCog, faSpinner } from '../../../shared/icons';
import { ApiService, LearningGoals, FlashcardDirection } from '../../../core/services/api.service';

@Component({
  selector: 'app-learning-goals-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    FontAwesomeModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <fa-icon [icon]="faCog"></fa-icon>
      Learning Goals
    </h2>

    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Daily New Words</mat-label>
          <input matInput type="number" [(ngModel)]="dailyNewWords" min="1" max="50">
          <mat-hint>New words to learn per day (1-50)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Daily Reviews</mat-label>
          <input matInput type="number" [(ngModel)]="dailyReviews" min="5" max="200">
          <mat-hint>Total reviews per day (5-200)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Flashcard Direction</mat-label>
          <mat-select [(ngModel)]="preferredDirection">
            <mat-option value="vi_to_en">Vietnamese → English</mat-option>
            <mat-option value="en_to_vi">English → Vietnamese</mat-option>
            <mat-option value="mixed">Mixed (Random)</mat-option>
          </mat-select>
          <mat-hint>Default direction for flashcards</mat-hint>
        </mat-form-field>

        <div class="toggle-field">
          <mat-slide-toggle [(ngModel)]="reminderEnabled">
            Enable Daily Reminder
          </mat-slide-toggle>
        </div>

        @if (reminderEnabled) {
          <mat-form-field appearance="outline">
            <mat-label>Reminder Time</mat-label>
            <input matInput type="time" [(ngModel)]="reminderTime">
            <mat-hint>When to remind you to review</mat-hint>
          </mat-form-field>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
        @if (saving()) {
          <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
        }
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;

      fa-icon {
        color: #666;
      }
    }

    mat-dialog-content {
      min-width: 350px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
    }

    mat-form-field {
      width: 100%;
    }

    .toggle-field {
      padding: 8px 0;
    }

    mat-dialog-actions button {
      fa-icon {
        margin-right: 8px;
      }
    }
  `],
})
export class LearningGoalsDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<LearningGoalsDialogComponent>);
  private apiService = inject(ApiService);
  private data = inject<LearningGoals | null>(MAT_DIALOG_DATA);

  faCog = faCog;
  faSpinner = faSpinner;

  // Form fields
  dailyNewWords = 5;
  dailyReviews = 20;
  preferredDirection: FlashcardDirection = 'mixed';
  reminderEnabled = false;
  reminderTime = '09:00';

  saving = signal(false);

  ngOnInit() {
    if (this.data) {
      this.dailyNewWords = this.data.dailyNewWords;
      this.dailyReviews = this.data.dailyReviews;
      this.preferredDirection = this.data.preferredDirection;
      this.reminderEnabled = this.data.reminderEnabled;
      this.reminderTime = this.data.reminderTime?.substring(0, 5) || '09:00';
    }
  }

  save() {
    this.saving.set(true);

    this.apiService.updateLearningGoals({
      dailyNewWords: this.dailyNewWords,
      dailyReviews: this.dailyReviews,
      preferredDirection: this.preferredDirection,
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderTime + ':00',
    }).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.dialogRef.close(result);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
