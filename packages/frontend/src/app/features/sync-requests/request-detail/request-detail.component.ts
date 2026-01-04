import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faRefresh,
  faUser,
  faCalendar,
  faExternalLink,
  faEdit,
  faTrash,
} from '../../../shared/icons';
import {
  ApiService,
  SyncRequest,
  SyncRequestStatus,
} from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private dialogService = inject(DialogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Icons
  faArrowLeft = faArrowLeft;
  faSpinner = faSpinner;
  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faSync = faRefresh;
  faUser = faUser;
  faCalendar = faCalendar;
  faExternalLink = faExternalLink;
  faEdit = faEdit;
  faTrash = faTrash;

  // State
  request = signal<SyncRequest | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  actionLoading = signal(false);


  ngOnInit() {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '');
    if (isNaN(id)) {
      this.error.set('Invalid request ID');
      this.loading.set(false);
      return;
    }
    this.loadRequest(id);
  }

  loadRequest(id: number) {
    this.loading.set(true);
    this.apiService.getSyncRequest(id).subscribe({
      next: (request) => {
        this.request.set(request);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load request');
        this.loading.set(false);
      },
    });
  }

  get isOwner(): boolean {
    const user = this.authService.currentUser();
    return user?.id === this.request()?.requesterUserId;
  }

  get isSyncer(): boolean {
    const user = this.authService.currentUser();
    return user?.id === this.request()?.syncerUserId;
  }

  get canEdit(): boolean {
    return this.isOwner && this.request()?.status === 'pending';
  }

  get canCancel(): boolean {
    return this.isOwner && this.request()?.status === 'pending';
  }

  async cancelRequest() {
    const request = this.request();
    if (!request) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel this request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep It',
    });

    if (!confirmed) {
      return;
    }

    this.actionLoading.set(true);
    this.apiService.cancelSyncRequest(request.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.router.navigate(['/sync-requests/my']);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to cancel request');
        this.actionLoading.set(false);
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
}
