import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faRefresh,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faPlay,
  faClock,
  faUser,
  faFlag,
  faGraduationCap,
  faSearch,
  faExclamationCircle,
  faCheckCircle,
  faInfoCircle,
  faPlus,
  faListUl,
  faPaperPlane,
} from '../../../shared/icons';
import {
  ApiService,
  SyncRequest,
  SyncRequestFilters,
  SyncRequestStats,
  SyncRequestPriority,
  SyncDifficultyLevel,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-sync-request-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule],
  templateUrl: './sync-request-list.component.html',
  styleUrl: './sync-request-list.component.scss',
})
export class SyncRequestListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faSync = faRefresh;
  faSpinner = faSpinner;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faFilter = faFilter;
  faPlay = faPlay;
  faClock = faClock;
  faUser = faUser;
  faFlag = faFlag;
  faGraduationCap = faGraduationCap;
  faSearch = faSearch;
  faExclamationCircle = faExclamationCircle;
  faCheckCircle = faCheckCircle;
  faInfoCircle = faInfoCircle;
  faPlus = faPlus;
  faListUl = faListUl;
  faPaperPlane = faPaperPlane;

  // State
  requests = signal<SyncRequest[]>([]);
  stats = signal<SyncRequestStats | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  loading = signal(true);
  startingSyncId = signal<number | null>(null);

  // Filters
  filters = signal<SyncRequestFilters>({});
  showFilters = signal(false);
  selectedPriority = signal<SyncRequestPriority | ''>('');
  selectedDifficulty = signal<SyncDifficultyLevel | ''>('');
  sortBy = signal<'created_at' | 'priority' | 'updated_at'>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  pageSizeOptions = [5, 10, 20];
  priorityOptions: SyncRequestPriority[] = ['low', 'normal', 'high'];
  difficultyOptions: SyncDifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

  ngOnInit() {
    this.loadRequests();
    this.loadStats();
  }

  loadRequests() {
    this.loading.set(true);
    const filters: SyncRequestFilters = {
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };
    if (this.selectedPriority()) {
      filters.priority = this.selectedPriority() as SyncRequestPriority;
    }
    if (this.selectedDifficulty()) {
      filters.difficultyLevel = this.selectedDifficulty() as SyncDifficultyLevel;
    }

    this.apiService.getPendingRequests(this.page(), this.pageSize(), filters).subscribe({
      next: (response) => {
        this.requests.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadStats() {
    this.apiService.getSyncRequestStats().subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize()) || 1;
  }

  get startItem(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  get endItem(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.page.set(1);
    this.loadRequests();
  }

  previousPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadRequests();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages) {
      this.page.update((p) => p + 1);
      this.loadRequests();
    }
  }

  toggleFilters() {
    this.showFilters.update((v) => !v);
  }

  applyFilters() {
    this.page.set(1);
    this.loadRequests();
  }

  clearFilters() {
    this.selectedPriority.set('');
    this.selectedDifficulty.set('');
    this.sortBy.set('created_at');
    this.sortOrder.set('desc');
    this.page.set(1);
    this.loadRequests();
  }

  startSync(request: SyncRequest) {
    this.startingSyncId.set(request.id);
    this.apiService.startSync(request.id).subscribe({
      next: () => {
        this.startingSyncId.set(null);
        this.loadRequests();
        this.loadStats();
      },
      error: () => {
        this.startingSyncId.set(null);
      },
    });
  }

  getPriorityClass(priority: SyncRequestPriority): string {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'normal':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getDifficultyClass(level: SyncDifficultyLevel | undefined): string {
    switch (level) {
      case 'beginner':
        return 'bg-green-50 text-green-700';
      case 'intermediate':
        return 'bg-orange-50 text-orange-700';
      case 'advanced':
        return 'bg-pink-50 text-pink-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  truncateText(text: string, maxLength = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
