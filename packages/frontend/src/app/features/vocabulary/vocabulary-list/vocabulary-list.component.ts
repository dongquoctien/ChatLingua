import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faLanguage, faSpinner } from '../../../shared/icons';
import { ApiService, Vocabulary } from '../../../core/services/api.service';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    FontAwesomeModule,
  ],
  templateUrl: './vocabulary-list.component.html',
  styleUrl: './vocabulary-list.component.scss',
})
export class VocabularyListComponent implements OnInit {
  private apiService = inject(ApiService);

  // Icons
  faSearch = faSearch;
  faLanguage = faLanguage;
  faSpinner = faSpinner;

  vocabulary = signal<Vocabulary[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  loading = signal(true);

  searchTerm = '';
  difficulty = '';
  partOfSpeech = '';

  ngOnInit() {
    this.loadVocabulary();
  }

  loadVocabulary() {
    this.loading.set(true);
    const filters = {
      search: this.searchTerm || undefined,
      difficulty: this.difficulty || undefined,
      partOfSpeech: this.partOfSpeech || undefined,
    };

    this.apiService.getVocabulary(this.page(), this.pageSize(), filters).subscribe({
      next: (response) => {
        this.vocabulary.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.page.set(1);
    this.loadVocabulary();
  }

  onPageChange(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadVocabulary();
  }
}
