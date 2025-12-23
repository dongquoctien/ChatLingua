import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faLanguage, faSpinner, faBook, faListUl, faVolumeUp } from '../../../shared/icons';
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
    MatChipsModule,
    MatTooltipModule,
    FontAwesomeModule,
  ],
  templateUrl: './vocabulary-list.component.html',
  styleUrl: './vocabulary-list.component.scss',
})
export class VocabularyListComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Icons
  faSearch = faSearch;
  faLanguage = faLanguage;
  faSpinner = faSpinner;
  faBook = faBook;
  faListUl = faListUl;
  faVolumeUp = faVolumeUp;

  vocabulary = signal<Vocabulary[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  loading = signal(true);
  speakingWordId = signal<number | null>(null);

  searchTerm = '';
  difficulty = '';
  partOfSpeech = '';
  cefrLevel = '';

  // CEFR level colors
  cefrColors: Record<string, string> = {
    A1: '#4caf50',
    A2: '#8bc34a',
    B1: '#ffeb3b',
    B2: '#ff9800',
    C1: '#f44336',
    C2: '#9c27b0',
  };

  ngOnInit() {
    this.loadVocabulary();
  }

  loadVocabulary() {
    this.loading.set(true);
    const filters = {
      search: this.searchTerm || undefined,
      difficulty: this.difficulty || undefined,
      partOfSpeech: this.partOfSpeech || undefined,
      cefr: this.cefrLevel || undefined,
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

  openDictionary(word: Vocabulary) {
    this.router.navigate(['/vocabulary', word.id]);
  }

  getCefrColor(level: string | null | undefined): string {
    return level ? this.cefrColors[level] || '#9e9e9e' : '#9e9e9e';
  }

  formatPartOfSpeech(pos: string | null): string {
    const labels: Record<string, string> = {
      noun: 'n',
      verb: 'v',
      adjective: 'adj',
      adverb: 'adv',
      preposition: 'prep',
      conjunction: 'conj',
      pronoun: 'pron',
      interjection: 'interj',
      phrase: 'phr',
    };
    return pos ? labels[pos] || pos : '';
  }

  speak(wordId: number, wordText: string, event: Event) {
    event.stopPropagation(); // Prevent card click
    if (this.speakingWordId()) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';

    utterance.onstart = () => this.speakingWordId.set(wordId);
    utterance.onend = () => this.speakingWordId.set(null);
    utterance.onerror = () => this.speakingWordId.set(null);

    speechSynthesis.speak(utterance);
  }
}
