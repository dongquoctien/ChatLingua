import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBook,
  faSpinner,
  faLightbulb,
  faCheckCircle,
  faClock,
  faPlay,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { ApiService, GrammarPointDetail, GrammarReviewStatus } from '../../../core/services/api.service';

@Component({
  selector: 'app-grammar-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    FontAwesomeModule,
  ],
  templateUrl: './grammar-detail.component.html',
  styleUrl: './grammar-detail.component.scss',
})
export class GrammarDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  // Icons
  faArrowLeft = faArrowLeft;
  faBook = faBook;
  faSpinner = faSpinner;
  faLightbulb = faLightbulb;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faPlay = faPlay;
  faChartLine = faChartLine;

  grammarPoint = signal<GrammarPointDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadGrammarPoint(parseInt(id, 10));
    }
  }

  loadGrammarPoint(id: number) {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getGrammarPoint(id).subscribe({
      next: (point) => {
        this.grammarPoint.set(point);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load grammar point');
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/grammar']);
  }

  startReview() {
    this.router.navigate(['/grammar/review']);
  }

  getStatusClass(status: GrammarReviewStatus): string {
    const classes: Record<GrammarReviewStatus, string> = {
      new: 'status-new',
      learning: 'status-learning',
      reviewing: 'status-reviewing',
      mastered: 'status-mastered',
    };
    return classes[status] || 'status-new';
  }

  getStatusLabel(status: GrammarReviewStatus): string {
    const labels: Record<GrammarReviewStatus, string> = {
      new: 'New',
      learning: 'Learning',
      reviewing: 'Reviewing',
      mastered: 'Mastered',
    };
    return labels[status] || status;
  }

  getMasteryColor(level: number): string {
    if (level >= 80) return '#4caf50';
    if (level >= 60) return '#8bc34a';
    if (level >= 40) return '#ffeb3b';
    if (level >= 20) return '#ff9800';
    return '#f44336';
  }

  formatNextReview(dateStr?: string): string {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
