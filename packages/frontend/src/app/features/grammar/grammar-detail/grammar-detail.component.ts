import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
} from '../../../shared/icons';
import { ApiService, GrammarPointDetail, GrammarReviewStatus } from '../../../core/services/api.service';

@Component({
  selector: 'app-grammar-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
      new: 'bg-gray-50 text-gray-700',
      learning: 'bg-orange-50 text-orange-700',
      reviewing: 'bg-pink-50 text-pink-700',
      mastered: 'bg-gray-100 text-gray-900',
    };
    return classes[status] || 'bg-gray-50 text-gray-700';
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
    if (level >= 80) return 'bg-gray-900';
    if (level >= 60) return 'bg-gray-700';
    if (level >= 40) return 'bg-gray-500';
    if (level >= 20) return 'bg-gray-400';
    return 'bg-gray-300';
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
