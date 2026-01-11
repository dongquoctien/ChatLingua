import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faLanguage, faSpinner, faBook, faListUl, faVolumeUp, faEye, faChevronLeft, faChevronRight } from '../../../shared/icons';
import { ApiService, Vocabulary } from '../../../core/services/api.service';
import { PronunciationService } from '../../../core/services/pronunciation.service';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FontAwesomeModule,
  ],
  templateUrl: './vocabulary-list.component.html',
  styleUrl: './vocabulary-list.component.scss',
})
export class VocabularyListComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private pronunciationService = inject(PronunciationService);

  // Icons
  faSearch = faSearch;
  faLanguage = faLanguage;
  faSpinner = faSpinner;
  faBook = faBook;
  faListUl = faListUl;
  faVolumeUp = faVolumeUp;
  faEye = faEye;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  vocabulary = signal<Vocabulary[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  loading = signal(true);
  speakingWordId = signal<number | null>(null);

  // Use PronunciationService's speaking signal
  get speaking() {
    return this.pronunciationService.speaking;
  }

  searchTerm = '';
  difficulty = '';
  partOfSpeech = '';
  cefrLevel = '';

  // CEFR level colors (Tailwind classes) - color-coded by difficulty
  cefrColors: Record<string, string> = {
    A1: 'bg-green-500',      // Beginner - easiest
    A2: 'bg-teal-500',       // Elementary
    B1: 'bg-amber-500',      // Intermediate
    B2: 'bg-orange-500',     // Upper Intermediate
    C1: 'bg-rose-500',       // Advanced
    C2: 'bg-purple-600',     // Proficiency - hardest
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

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.loadVocabulary();
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.page.set(1);
    this.loadVocabulary();
  }

  openDictionary(word: Vocabulary) {
    this.router.navigate(['/vocabulary', word.id]);
  }

  getCefrColorClass(level: string | null | undefined): string {
    return level ? this.cefrColors[level] || 'bg-gray-400' : 'bg-gray-400';
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

  getPronunciation(word: Vocabulary): string | null {
    return word.phonetic || word.pronunciationUk || word.pronunciationUs || null;
  }

  speak(wordId: number, word: Vocabulary, event: Event) {
    event.stopPropagation();

    // Track which word is speaking for UI feedback
    this.speakingWordId.set(wordId);

    // Use PronunciationService with fallback chain (Vocabulary doesn't have audio URLs, they're in DictionaryEntry)
    this.pronunciationService.speak(word.englishWord, 'us').finally(() => {
      // Clear speaking state after playback completes
      if (this.speakingWordId() === wordId) {
        this.speakingWordId.set(null);
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
}
