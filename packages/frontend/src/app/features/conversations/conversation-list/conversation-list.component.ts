import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faComment,
  faLanguage,
  faSpellCheck,
  faSpinner,
  faChevronLeft,
  faChevronRight,
} from '../../../shared/icons';
import { ApiService, Conversation } from '../../../core/services/api.service';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faComment = faComment;
  faLanguage = faLanguage;
  faSpellCheck = faSpellCheck;
  faSpinner = faSpinner;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  conversations = signal<Conversation[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  loading = signal(true);

  pageSizeOptions = [5, 10, 20];

  ngOnInit() {
    this.loadConversations();
  }

  loadConversations() {
    this.loading.set(true);
    this.apiService.getConversations(this.page(), this.pageSize()).subscribe({
      next: (response) => {
        this.conversations.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize());
  }

  get startItem(): number {
    return (this.page() - 1) * this.pageSize() + 1;
  }

  get endItem(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.page.set(1);
    this.loadConversations();
  }

  previousPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadConversations();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages) {
      this.page.update(p => p + 1);
      this.loadConversations();
    }
  }

  getDifficultyClass(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-gray-50 text-gray-700';
      case 'intermediate': return 'bg-orange-50 text-orange-700';
      case 'advanced': return 'bg-pink-50 text-pink-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  }
}
