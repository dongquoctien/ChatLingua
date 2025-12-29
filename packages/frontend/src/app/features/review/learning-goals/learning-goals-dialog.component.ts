import { Component, inject, signal, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCog, faSpinner } from '../../../shared/icons';
import { ApiService, LearningGoals, FlashcardDirection } from '../../../core/services/api.service';

@Component({
  selector: 'app-learning-goals-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './learning-goals-dialog.component.html',
  styleUrl: './learning-goals-dialog.component.scss',
})
export class LearningGoalsDialogComponent implements OnInit, OnChanges {
  private apiService = inject(ApiService);

  @Input() data: LearningGoals | null = null;
  @Output() closed = new EventEmitter<LearningGoals | null>();

  faCog = faCog;
  faSpinner = faSpinner;

  isOpen = signal(false);

  // Form fields
  dailyNewWords = 5;
  dailyReviews = 20;
  preferredDirection: FlashcardDirection = 'mixed';
  reminderEnabled = false;
  reminderTime = '09:00';

  saving = signal(false);

  ngOnInit() {
    this.initFromData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.initFromData();
    }
  }

  private initFromData() {
    if (this.data) {
      this.dailyNewWords = this.data.dailyNewWords;
      this.dailyReviews = this.data.dailyReviews;
      this.preferredDirection = this.data.preferredDirection;
      this.reminderEnabled = this.data.reminderEnabled;
      this.reminderTime = this.data.reminderTime?.substring(0, 5) || '09:00';
    }
  }

  open() {
    this.initFromData();
    this.isOpen.set(true);
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
        this.isOpen.set(false);
        this.closed.emit(result);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  cancel() {
    this.isOpen.set(false);
    this.closed.emit(null);
  }
}
