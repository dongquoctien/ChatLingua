import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComment, faLanguage, faSpellCheck, faSpinner } from '../../../shared/icons';
import { ApiService, Conversation } from '../../../core/services/api.service';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatPaginatorModule,
    MatChipsModule,
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

  conversations = signal<Conversation[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  loading = signal(true);

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

  onPageChange(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadConversations();
  }
}
