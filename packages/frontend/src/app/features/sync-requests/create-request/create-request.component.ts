import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faPaperPlane,
  faSpinner,
  faInfoCircle,
  faEdit,
} from '../../../shared/icons';
import {
  ApiService,
  CreateSyncRequestDTO,
  UpdateSyncRequestDTO,
  SyncRequestPriority,
  SyncDifficultyLevel,
} from '../../../core/services/api.service';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
})
export class CreateRequestComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Icons
  faArrowLeft = faArrowLeft;
  faPaperPlane = faPaperPlane;
  faSpinner = faSpinner;
  faInfoCircle = faInfoCircle;
  faEdit = faEdit;

  // Edit mode
  isEditMode = signal(false);
  editId = signal<number | null>(null);
  loading = signal(false);

  // Form state
  vietnameseText = signal('');
  englishTranslation = signal('');
  topic = signal('');
  difficultyLevel = signal<SyncDifficultyLevel | ''>('');
  priority = signal<SyncRequestPriority>('normal');
  notes = signal('');

  // UI state
  submitting = signal(false);
  error = signal<string | null>(null);

  // Options
  difficultyOptions: SyncDifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
  priorityOptions: SyncRequestPriority[] = ['low', 'normal', 'high'];

  topicSuggestions = [
    'Daily Life',
    'Work',
    'Travel',
    'Food',
    'Health',
    'Education',
    'Technology',
    'Sports',
    'Entertainment',
    'Business',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId.set(+id);
      this.loadRequest(+id);
    }
  }

  private loadRequest(id: number) {
    this.loading.set(true);
    this.apiService.getSyncRequest(id).subscribe({
      next: (request) => {
        this.vietnameseText.set(request.vietnameseText);
        this.englishTranslation.set(request.englishTranslation || '');
        this.topic.set(request.topic || '');
        this.difficultyLevel.set(request.difficultyLevel || '');
        this.priority.set(request.priority);
        this.notes.set(request.notes || '');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Failed to load request');
        this.router.navigate(['/sync-requests/my']);
      },
    });
  }

  get canSubmit(): boolean {
    return this.vietnameseText().trim().length > 0 && !this.submitting() && !this.loading();
  }

  get charCount(): number {
    return this.vietnameseText().length;
  }

  get maxChars(): number {
    return 5000;
  }

  selectTopic(topic: string) {
    this.topic.set(topic);
  }

  submit() {
    if (!this.canSubmit) return;

    this.error.set(null);
    this.submitting.set(true);

    if (this.isEditMode() && this.editId()) {
      this.updateRequest();
    } else {
      this.createRequest();
    }
  }

  private createRequest() {
    const data: CreateSyncRequestDTO = {
      vietnameseText: this.vietnameseText().trim(),
      priority: this.priority(),
    };

    if (this.englishTranslation().trim()) {
      data.englishTranslation = this.englishTranslation().trim();
    }
    if (this.topic().trim()) {
      data.topic = this.topic().trim();
    }
    if (this.difficultyLevel()) {
      data.difficultyLevel = this.difficultyLevel() as SyncDifficultyLevel;
    }
    if (this.notes().trim()) {
      data.notes = this.notes().trim();
    }

    this.apiService.createSyncRequest(data).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/sync-requests/my']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.error || 'Failed to create request. Please try again.');
      },
    });
  }

  private updateRequest() {
    const data: UpdateSyncRequestDTO = {};

    if (this.vietnameseText().trim()) {
      data.vietnameseText = this.vietnameseText().trim();
    }
    if (this.englishTranslation().trim()) {
      data.englishTranslation = this.englishTranslation().trim();
    }
    if (this.topic().trim()) {
      data.topic = this.topic().trim();
    }
    if (this.difficultyLevel()) {
      data.difficultyLevel = this.difficultyLevel() as SyncDifficultyLevel;
    }
    if (this.notes().trim()) {
      data.notes = this.notes().trim();
    }

    this.apiService.updateSyncRequest(this.editId()!, data).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/sync-requests/my']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.error || 'Failed to update request. Please try again.');
      },
    });
  }
}
