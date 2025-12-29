import { Component, inject, OnInit, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faChevronDown, faChevronUp, faTrash, faTimes } from '../../../shared/icons';
import { ApiService, Exercise } from '../../../core/services/api.service';

@Component({
  selector: 'app-create-quiz-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './create-quiz-dialog.component.html',
  styleUrl: './create-quiz-dialog.component.scss',
})
export class CreateQuizDialogComponent implements OnInit {
  private apiService = inject(ApiService);

  close = output<void>();
  created = output<void>();

  faSpinner = faSpinner;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faTrash = faTrash;
  faTimes = faTimes;

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

  getTypeClass(type: string): string {
    switch (type) {
      case 'multiple_choice':
        return 'bg-gray-100 text-gray-700';
      case 'fill_blank':
        return 'bg-orange-100 text-orange-700';
      case 'translation':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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

  onClose() {
    this.close.emit();
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
      next: () => {
        this.created.emit();
      },
      error: () => {
        this.creating.set(false);
      }
    });
  }
}
