import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faQuestionCircle,
  faClock,
  faRedo,
  faTrophy,
  faSpinner,
  faPlus,
} from '../../../shared/icons';
import { ApiService, Quiz } from '../../../core/services/api.service';
import { CreateQuizDialogComponent } from '../create-quiz-dialog/create-quiz-dialog.component';

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatPaginatorModule,
    MatChipsModule,
    MatDialogModule,
    FontAwesomeModule,
  ],
  templateUrl: './quiz-list.component.html',
  styleUrl: './quiz-list.component.scss',
})
export class QuizListComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);

  // Icons
  faQuestionCircle = faQuestionCircle;
  faClock = faClock;
  faRedo = faRedo;
  faTrophy = faTrophy;
  faSpinner = faSpinner;
  faPlus = faPlus;

  quizzes = signal<Quiz[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(12);
  loading = signal(true);

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

  onPageChange(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadQuizzes();
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(CreateQuizDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadQuizzes();
      }
    });
  }
}
