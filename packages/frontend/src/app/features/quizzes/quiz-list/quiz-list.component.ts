import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faQuestionCircle,
  faClock,
  faRedo,
  faTrophy,
  faSpinner,
  faPlus,
  faListOl,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faHistory,
  faPlay,
} from '../../../shared/icons';
import { ApiService, Quiz } from '../../../core/services/api.service';
import { CreateQuizDialogComponent } from '../create-quiz-dialog/create-quiz-dialog.component';

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    CreateQuizDialogComponent,
  ],
  templateUrl: './quiz-list.component.html',
  styleUrl: './quiz-list.component.scss',
})
export class QuizListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faQuestionCircle = faQuestionCircle;
  faClock = faClock;
  faRedo = faRedo;
  faTrophy = faTrophy;
  faSpinner = faSpinner;
  faPlus = faPlus;
  faListOl = faListOl;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faHistory = faHistory;
  faPlay = faPlay;

  quizzes = signal<Quiz[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(12);
  loading = signal(true);
  expandedQuizzes = signal<Set<number>>(new Set());
  showCreateDialog = signal(false);

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.loading.set(true);
    this.apiService.getQuizzes(this.page(), this.pageSize()).subscribe({
      next: (response) => {
        this.quizzes.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Pagination helpers
  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize());
  }

  get startItem(): number {
    return (this.page() - 1) * this.pageSize() + 1;
  }

  get endItem(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.loadQuizzes();
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.page.set(1);
    this.loadQuizzes();
  }

  openCreateDialog() {
    this.showCreateDialog.set(true);
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
  }

  onQuizCreated() {
    this.showCreateDialog.set(false);
    this.loadQuizzes();
  }

  togglePreview(quizId: number) {
    this.expandedQuizzes.update(set => {
      const newSet = new Set(set);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  }

  isExpanded(quizId: number): boolean {
    return this.expandedQuizzes().has(quizId);
  }

  truncateQuestion(text: string, maxLength: number = 60): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatExerciseType(type: string): string {
    const labels: Record<string, string> = {
      multiple_choice: 'MC',
      fill_blank: 'Fill',
      translation: 'Trans',
    };
    return labels[type] || type;
  }
}
