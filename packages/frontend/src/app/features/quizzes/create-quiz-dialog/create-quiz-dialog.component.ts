import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faChevronDown, faChevronUp, faTrash } from '../../../shared/icons';
import { ApiService, Exercise, Conversation } from '../../../core/services/api.service';

@Component({
  selector: 'app-create-quiz-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    FontAwesomeModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Quiz</h2>
    <mat-dialog-content>
      @if (loadingConversations()) {
        <div class="loading">
          <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
          <span>Loading...</span>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quiz Title</mat-label>
          <input matInput [(ngModel)]="title" placeholder="e.g., Daily Vocabulary Quiz" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="description" rows="2"></textarea>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Time Limit (minutes)</mat-label>
            <input matInput type="number" [(ngModel)]="timeLimitMinutes" min="1" max="60">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Max Attempts</mat-label>
            <input matInput type="number" [(ngModel)]="maxAttempts" min="1" max="10">
          </mat-form-field>
        </div>

        <div class="exercises-section">
          <div class="filter-row">
            <mat-form-field appearance="outline" class="conversation-filter">
              <mat-label>Select Conversation ({{ totalExerciseCount() }} exercises total)</mat-label>
              <mat-select [(ngModel)]="selectedConversationId" (selectionChange)="onConversationFilterChange()">
                <mat-option [value]="null">-- Select a conversation --</mat-option>
                @for (conv of conversations(); track conv.id) {
                  <mat-option [value]="conv.id">
                    {{ conv.topic || 'Conversation #' + conv.id }} ({{ conv.count }} exercises)
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          @if (loadingExercises()) {
            <div class="loading-inline">
              <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
              <span>Loading exercises...</span>
            </div>
          } @else if (exercises().length === 0) {
            <div class="empty-state">
              <p>Select a conversation above to load exercises</p>
            </div>
          } @else {
            <div class="section-header">
              <span>Select Exercises ({{ selectedIds.size }} selected)</span>
              <button mat-button (click)="toggleAll()">
                {{ isAllSelected() ? 'Deselect All' : 'Select All' }}
              </button>
            </div>

            <div class="exercises-list">
              @for (exercise of exercises(); track exercise.id) {
                <div class="exercise-item" (click)="toggleExercise(exercise.id)">
                  <mat-checkbox
                    [checked]="selectedIds.has(exercise.id)"
                    (change)="toggleExercise(exercise.id)"
                    (click)="$event.stopPropagation()">
                  </mat-checkbox>
                  <div class="exercise-info">
                    <span class="exercise-type" [class]="exercise.exerciseType">
                      {{ formatType(exercise.exerciseType) }}
                    </span>
                    <span class="exercise-question">{{ exercise.questionText }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Selected Exercises Panel -->
        @if (selectedExercises().length > 0) {
          <div class="selected-panel">
            <div class="selected-header" (click)="showSelectedPanel = !showSelectedPanel">
              <span>
                <fa-icon [icon]="showSelectedPanel ? faChevronUp : faChevronDown"></fa-icon>
                Selected Exercises ({{ selectedExercises().length }})
              </span>
              <button mat-button color="warn" (click)="clearAllSelected(); $event.stopPropagation()">
                Clear All
              </button>
            </div>
            @if (showSelectedPanel) {
              <div class="selected-list">
                @for (exercise of selectedExercises(); track exercise.id) {
                  <div class="selected-item">
                    <div class="selected-info">
                      <span class="exercise-type" [class]="exercise.exerciseType">
                        {{ formatType(exercise.exerciseType) }}
                      </span>
                      <span class="exercise-question">{{ exercise.questionText }}</span>
                    </div>
                    <button mat-icon-button (click)="removeSelected(exercise.id)" class="remove-btn">
                      <fa-icon [icon]="faTrash"></fa-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              (click)="create()"
              [disabled]="!canCreate() || creating()">
        @if (creating()) {
          <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
          Creating...
        } @else {
          Create Quiz
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      max-height: 70vh;
    }

    .full-width {
      width: 100%;
    }

    .row {
      display: flex;
      gap: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: #666;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      color: #666;
      font-size: 13px;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: #999;
      background: #fafafa;
      border-radius: 8px;

      p {
        margin: 0;
      }
    }

    .exercises-section {
      margin-top: 16px;
    }

    .filter-row {
      margin-bottom: 8px;

      .conversation-filter {
        width: 100%;
      }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-weight: 500;
    }

    .exercises-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .exercise-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f5f5f5;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .exercise-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .exercise-type {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      width: fit-content;

      &.multiple_choice {
        background: #e3f2fd;
        color: #1565c0;
      }

      &.fill_blank {
        background: #fff3e0;
        color: #e65100;
      }

      &.translation {
        background: #f3e5f5;
        color: #7b1fa2;
      }
    }

    .exercise-question {
      font-size: 13px;
      color: #333;
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .selected-panel {
      margin-top: 16px;
      border: 1px solid #1976d2;
      border-radius: 8px;
      background: #e3f2fd;
    }

    .selected-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;

      span {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #1565c0;
      }
    }

    .selected-list {
      max-height: 200px;
      overflow-y: auto;
      border-top: 1px solid #bbdefb;
      background: white;
      border-radius: 0 0 7px 7px;
    }

    .selected-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }
    }

    .selected-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .remove-btn {
      color: #f44336;
      flex-shrink: 0;
    }
  `]
})
export class CreateQuizDialogComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialogRef = inject(MatDialogRef<CreateQuizDialogComponent>);

  faSpinner = faSpinner;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faTrash = faTrash;

  exercises = signal<Exercise[]>([]);
  conversations = signal<{ id: number; topic: string | null; count: number }[]>([]);
  loadingConversations = signal(true);
  loadingExercises = signal(false);
  creating = signal(false);
  selectedConversationId: number | null = null;
  totalExerciseCount = signal(0);

  title = '';
  description = '';
  timeLimitMinutes: number | null = 10;
  maxAttempts = 3;
  selectedIds = new Set<number>();
  showSelectedPanel = true;

  // Cache exercises across conversation switches
  private exerciseCache = new Map<number, Exercise>();

  // Computed: Get full exercise objects for selected IDs
  selectedExercises = signal<Exercise[]>([]);

  ngOnInit() {
    this.loadConversationsWithCounts();
  }

  loadConversationsWithCounts() {
    this.loadingConversations.set(true);

    // Load exercise counts by conversation first (lightweight)
    this.apiService.getExerciseCountsByConversation().subscribe({
      next: (counts) => {
        const total = counts.reduce((sum, c) => sum + c.count, 0);
        this.totalExerciseCount.set(total);

        // Get conversation IDs that have exercises
        const convIds = counts
          .filter(c => c.conversationId !== null)
          .map(c => c.conversationId as number);

        if (convIds.length === 0) {
          this.conversations.set([]);
          this.loadingConversations.set(false);
          return;
        }

        // Load conversation details for those with exercises
        this.apiService.getConversations(1, 100).subscribe({
          next: (response) => {
            const countMap = new Map(
              counts.map(c => [c.conversationId, c.count])
            );
            const filtered = response.data
              .filter(c => convIds.includes(c.id))
              .map(c => ({
                id: c.id,
                topic: c.topic,
                count: countMap.get(c.id) || 0,
              }))
              .sort((a, b) => b.count - a.count); // Sort by exercise count desc

            this.conversations.set(filtered);
            this.loadingConversations.set(false);
          },
          error: () => {
            this.loadingConversations.set(false);
          }
        });
      },
      error: () => {
        this.loadingConversations.set(false);
      }
    });
  }

  onConversationFilterChange() {
    // Load exercises for selected conversation from server
    this.loadExercisesForConversation(this.selectedConversationId);
  }

  loadExercisesForConversation(conversationId: number | null) {
    this.loadingExercises.set(true);

    const filters = conversationId ? { conversationId } : {};
    // Limit to 100 exercises per load
    this.apiService.getExercises(1, 100, filters).subscribe({
      next: (response) => {
        this.exercises.set(response.data);
        // Cache exercises for later reference
        response.data.forEach(ex => this.exerciseCache.set(ex.id, ex));
        this.loadingExercises.set(false);
      },
      error: () => {
        this.loadingExercises.set(false);
      }
    });
  }

  getExerciseCountForConversation(convId: number): number {
    const conv = this.conversations().find(c => c.id === convId);
    return conv?.count || 0;
  }

  isAllSelected(): boolean {
    const currentExercises = this.exercises();
    return currentExercises.length > 0 &&
      currentExercises.every(e => this.selectedIds.has(e.id));
  }

  toggleExercise(id: number) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.selectedIds = new Set(this.selectedIds); // Trigger change detection
    this.updateSelectedExercises();
  }

  toggleAll() {
    const currentExercises = this.exercises();
    const allSelected = currentExercises.length > 0 &&
      currentExercises.every(e => this.selectedIds.has(e.id));

    if (allSelected) {
      // Deselect all current exercises
      currentExercises.forEach(e => this.selectedIds.delete(e.id));
    } else {
      // Select all current exercises
      currentExercises.forEach(e => this.selectedIds.add(e.id));
    }
    this.selectedIds = new Set(this.selectedIds);
    this.updateSelectedExercises();
  }

  formatType(type: string): string {
    const labels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      fill_blank: 'Fill Blank',
      translation: 'Translation',
    };
    return labels[type] || type;
  }

  canCreate(): boolean {
    return this.title.trim().length > 0 && this.selectedIds.size > 0;
  }

  clearAllSelected() {
    this.selectedIds.clear();
    this.selectedIds = new Set(this.selectedIds);
    this.updateSelectedExercises();
  }

  removeSelected(id: number) {
    this.selectedIds.delete(id);
    this.selectedIds = new Set(this.selectedIds);
    this.updateSelectedExercises();
  }

  private updateSelectedExercises() {
    const selected: Exercise[] = [];
    this.selectedIds.forEach(id => {
      const exercise = this.exerciseCache.get(id);
      if (exercise) {
        selected.push(exercise);
      }
    });
    this.selectedExercises.set(selected);
  }

  create() {
    if (!this.canCreate()) return;

    this.creating.set(true);
    this.apiService.createQuiz({
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      exerciseIds: Array.from(this.selectedIds),
      timeLimitMinutes: this.timeLimitMinutes || undefined,
      maxAttempts: this.maxAttempts,
    }).subscribe({
      next: (quiz) => {
        this.dialogRef.close(quiz);
      },
      error: () => {
        this.creating.set(false);
      }
    });
  }
}
