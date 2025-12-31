import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faRefresh,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faPlus,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faHourglass,
  faTrash,
  faEdit,
  faEye,
  faExternalLink,
  faListUl,
  faPaperPlane,
} from '../../../shared/icons';
import {
  ApiService,
  SyncRequest,
  SyncRequestStatus,
  SyncRequestStats,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule],
  templateUrl: './my-requests.component.html',
  styleUrl: './my-requests.component.scss',
})
export class MyRequestsComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faSync = faRefresh;
  faSpinner = faSpinner;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faPlus = faPlus;
  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faHourglass = faHourglass;
  faTrash = faTrash;
  faEdit = faEdit;
  faEye = faEye;
  faExternalLink = faExternalLink;
  faListUl = faListUl;
  faPaperPlane = faPaperPlane;

  // State
  requests = signal<SyncRequest[]>([]);
  stats = signal<SyncRequestStats | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  loading = signal(true);
  cancellingId = signal<number | null>(null);
  selectedStatus = signal<SyncRequestStatus | ''>('');

  pageSizeOptions = [5, 10, 20];
  statusOptions: SyncRequestStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

  ngOnInit() {
    this.loadRequests();
    this.loadStats();
  }

  loadRequests() {
    this.loading.set(true);
    const status = this.selectedStatus() || undefined;
    this.apiService.getMyRequests(this.page(), this.pageSize(), status).subscribe({
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

  onStatusChange() {
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

  cancelRequest(request: SyncRequest) {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    this.cancellingId.set(request.id);
    this.apiService.cancelSyncRequest(request.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.loadRequests();
        this.loadStats();
      },
      error: () => {
        this.cancellingId.set(null);
      },
    });
  }

  getStatusClass(status: SyncRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getStatusIcon(status: SyncRequestStatus) {
    switch (status) {
      case 'pending':
        return this.faClock;
      case 'in_progress':
        return this.faSync;
      case 'completed':
        return this.faCheckCircle;
      case 'cancelled':
        return this.faTimesCircle;
      default:
        return this.faClock;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  truncateText(text: string, maxLength = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
