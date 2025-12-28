import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBook, faSearch, faFilter, faGraduationCap,
  faSpinner, faCheckCircle, faClock, faRedo,
  faStar, faPlay, faChartLine, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import {
  ApiService,
  GrammarPointInfo,
  GrammarReviewStatus,
  GrammarCategoryInfo,
  GrammarStatsResponse
} from '../../../core/services/api.service';

@Component({
  selector: 'app-grammar-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    FontAwesomeModule,
  ],
  templateUrl: './grammar-list.component.html',
  styleUrl: './grammar-list.component.scss',
})
export class GrammarListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faBook = faBook;
  faSearch = faSearch;
  faFilter = faFilter;
  faGraduationCap = faGraduationCap;
  faSpinner = faSpinner;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faRedo = faRedo;
  faStar = faStar;
  faPlay = faPlay;
  faChartLine = faChartLine;
  faLayerGroup = faLayerGroup;

  // State
  loading = signal(true);
  grammarPoints = signal<GrammarPointInfo[]>([]);
  categories = signal<GrammarCategoryInfo[]>([]);
  stats = signal<GrammarStatsResponse | null>(null);

  // Filters
  searchQuery = signal('');
  selectedCategory = signal<string>('');
  selectedStatus = signal<GrammarReviewStatus | ''>('');

  // Computed filtered list
  filteredGrammarPoints = computed(() => {
    let points = this.grammarPoints();
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const status = this.selectedStatus();

    if (query) {
      points = points.filter(p =>
        p.grammarRule.toLowerCase().includes(query) ||
        p.explanation.toLowerCase().includes(query)
      );
    }

    if (category) {
      points = points.filter(p => p.category === category);
    }

    if (status) {
      points = points.filter(p => p.reviewStatus === status);
    }

    return points;
  });

  // Status options
  statusOptions: { value: GrammarReviewStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'learning', label: 'Learning' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'mastered', label: 'Mastered' },
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Load grammar points
    this.apiService.getGrammarPoints().subscribe({
      next: (points) => {
        this.grammarPoints.set(points);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    // Load categories
    this.apiService.getGrammarCategories().subscribe({
      next: (categories) => this.categories.set(categories)
    });

    // Load stats
    this.apiService.getGrammarStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });
  }

  getStatusIcon(status: GrammarReviewStatus) {
    switch (status) {
      case 'new': return this.faStar;
      case 'learning': return this.faBook;
      case 'reviewing': return this.faRedo;
      case 'mastered': return this.faCheckCircle;
    }
  }

  getStatusClass(status: GrammarReviewStatus): string {
    return `status-${status}`;
  }

  getStatusLabel(status: GrammarReviewStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getMasteryColor(level: number): string {
    if (level >= 80) return '#4caf50';
    if (level >= 60) return '#8bc34a';
    if (level >= 40) return '#ffc107';
    if (level >= 20) return '#ff9800';
    return '#f44336';
  }

  formatNextReview(dateStr?: string): string {
    if (!dateStr) return 'Not scheduled';

    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedStatus.set('');
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery() || this.selectedCategory() || this.selectedStatus());
  }
}
