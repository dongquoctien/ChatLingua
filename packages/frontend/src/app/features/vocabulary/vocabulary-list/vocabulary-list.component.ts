import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faLanguage, faSpinner, faBook, faListUl, faVolumeUp, faEye, faChevronLeft, faChevronRight, faFilter, faTimes, faAnglesLeft, faAnglesRight } from '../../../shared/icons';
import {
  ApiService,
  UserVocabularyV3,
  VocabularyAvailableFilters,
  VocabularyFiltersV3,
  ReviewStatusV3,
  VocabularySourceTypeV3
} from '../../../core/services/api.service';
import { PronunciationService } from '../../../core/services/pronunciation.service';
import { forkJoin } from 'rxjs';

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
  private route = inject(ActivatedRoute);
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
  faFilter = faFilter;
  faTimes = faTimes;
  faAnglesLeft = faAnglesLeft;
  faAnglesRight = faAnglesRight;

  // Data
  vocabulary = signal<UserVocabularyV3[]>([]);
  availableFilters = signal<VocabularyAvailableFilters | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  loading = signal(true);
  loadingFilters = signal(true);
  speakingWordId = signal<number | null>(null);

  // Use PronunciationService's speaking signal
  get speaking() {
    return this.pronunciationService.speaking;
  }

  // Filter state
  searchTerm = '';
  cefrLevel = '';
  partOfSpeech = '';
  reviewStatus: ReviewStatusV3 | '' = '';
  sourceType: VocabularySourceTypeV3 | '' = '';
  mapId: number | null = null;
  unitId: number | null = null;
  lessonId: number | null = null;

  // Show advanced filters panel
  showAdvancedFilters = signal(false);

  // Computed: filtered units based on selected map
  filteredUnits = computed(() => {
    const filters = this.availableFilters();
    if (!filters || !this.mapId) return [];
    return filters.units.filter(u => u.mapId === this.mapId);
  });

  // Computed: filtered lessons based on selected unit
  filteredLessons = computed(() => {
    const filters = this.availableFilters();
    if (!filters || !this.unitId) return [];
    return filters.lessons.filter(l => l.unitId === this.unitId);
  });

  // Computed: active filter count
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.cefrLevel) count++;
    if (this.partOfSpeech) count++;
    if (this.reviewStatus) count++;
    if (this.sourceType) count++;
    if (this.mapId) count++;
    if (this.unitId) count++;
    if (this.lessonId) count++;
    return count;
  });

  // CEFR level colors (Tailwind classes) - color-coded by difficulty
  cefrColors: Record<string, string> = {
    A1: 'bg-green-500',      // Beginner - easiest
    A2: 'bg-teal-500',       // Elementary
    B1: 'bg-amber-500',      // Intermediate
    B2: 'bg-orange-500',     // Upper Intermediate
    C1: 'bg-rose-500',       // Advanced
    C2: 'bg-purple-600',     // Proficiency - hardest
  };

  // Review status colors
  reviewStatusColors: Record<string, string> = {
    new: 'bg-blue-500',
    learning: 'bg-yellow-500',
    reviewing: 'bg-orange-500',
    mastered: 'bg-green-500',
  };

  // Source type labels
  sourceTypeLabels: Record<string, string> = {
    conversation: 'Conversation',
    word_map: 'Word Map',
    manual: 'Manual',
    import: 'Import',
  };

  ngOnInit() {
    // Restore filters from URL query params
    this.restoreFiltersFromUrl();
    this.loadData();
  }

  private restoreFiltersFromUrl() {
    const params = this.route.snapshot.queryParams;
    if (params['search']) this.searchTerm = params['search'];
    if (params['cefr']) this.cefrLevel = params['cefr'];
    if (params['pos']) this.partOfSpeech = params['pos'];
    if (params['status']) this.reviewStatus = params['status'] as ReviewStatusV3;
    if (params['source']) this.sourceType = params['source'] as VocabularySourceTypeV3;
    if (params['mapId']) this.mapId = parseInt(params['mapId'], 10);
    if (params['unitId']) this.unitId = parseInt(params['unitId'], 10);
    if (params['lessonId']) this.lessonId = parseInt(params['lessonId'], 10);
    if (params['page']) this.page.set(parseInt(params['page'], 10));
    if (params['pageSize']) this.pageSize.set(parseInt(params['pageSize'], 10));
    // Show advanced filters if any advanced filter is active
    if (this.mapId || this.unitId || this.lessonId) {
      this.showAdvancedFilters.set(true);
    }
  }

  private updateUrlWithFilters() {
    const queryParams: Record<string, string | number | null> = {};
    if (this.searchTerm) queryParams['search'] = this.searchTerm;
    if (this.cefrLevel) queryParams['cefr'] = this.cefrLevel;
    if (this.partOfSpeech) queryParams['pos'] = this.partOfSpeech;
    if (this.reviewStatus) queryParams['status'] = this.reviewStatus;
    if (this.sourceType) queryParams['source'] = this.sourceType;
    if (this.mapId) queryParams['mapId'] = this.mapId;
    if (this.unitId) queryParams['unitId'] = this.unitId;
    if (this.lessonId) queryParams['lessonId'] = this.lessonId;
    if (this.page() > 1) queryParams['page'] = this.page();
    if (this.pageSize() !== 20) queryParams['pageSize'] = this.pageSize();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  loadData() {
    this.loading.set(true);
    this.loadingFilters.set(true);
    // Update URL with current filters (restored from URL or defaults)
    this.updateUrlWithFilters();

    forkJoin({
      filters: this.apiService.getVocabularyFiltersV3(),
      vocabulary: this.loadVocabularyRequest()
    }).subscribe({
      next: ({ filters, vocabulary }) => {
        this.availableFilters.set(filters);
        this.vocabulary.set(vocabulary.data);
        this.total.set(vocabulary.total);
        this.loading.set(false);
        this.loadingFilters.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingFilters.set(false);
      }
    });
  }

  private loadVocabularyRequest() {
    const filters: VocabularyFiltersV3 = {};
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.cefrLevel) filters.cefrLevel = this.cefrLevel;
    if (this.partOfSpeech) filters.partOfSpeech = this.partOfSpeech;
    if (this.reviewStatus) filters.reviewStatus = this.reviewStatus as ReviewStatusV3;
    if (this.sourceType) filters.sourceType = this.sourceType as VocabularySourceTypeV3;
    if (this.mapId) filters.mapId = this.mapId;
    if (this.unitId) filters.unitId = this.unitId;
    if (this.lessonId) filters.lessonId = this.lessonId;

    return this.apiService.getUserVocabularyV3(this.page(), this.pageSize(), filters);
  }

  loadVocabulary() {
    this.loading.set(true);
    // Update URL with current filters for browser history
    this.updateUrlWithFilters();
    this.loadVocabularyRequest().subscribe({
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

  clearFilters() {
    this.searchTerm = '';
    this.cefrLevel = '';
    this.partOfSpeech = '';
    this.reviewStatus = '';
    this.sourceType = '';
    this.mapId = null;
    this.unitId = null;
    this.lessonId = null;
    this.applyFilters();
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters.update(v => !v);
  }

  onMapChange() {
    // Reset unit and lesson when map changes
    this.unitId = null;
    this.lessonId = null;
    this.applyFilters();
  }

  onUnitChange() {
    // Reset lesson when unit changes
    this.lessonId = null;
    this.applyFilters();
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

  openDictionary(word: UserVocabularyV3) {
    // Navigate to vocabulary detail page using user_vocabulary.id (V3)
    this.router.navigate(['/vocabulary', word.id]);
  }

  getCefrColorClass(level: string | null | undefined): string {
    return level ? this.cefrColors[level] || 'bg-gray-400' : 'bg-gray-400';
  }

  getReviewStatusColorClass(status: string): string {
    return this.reviewStatusColors[status] || 'bg-gray-400';
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

  formatReviewStatus(status: string): string {
    const labels: Record<string, string> = {
      new: 'New',
      learning: 'Learning',
      reviewing: 'Reviewing',
      mastered: 'Mastered',
    };
    return labels[status] || status;
  }

  formatSourceType(type: string): string {
    return this.sourceTypeLabels[type] || type;
  }

  speak(wordId: number, word: UserVocabularyV3, event: Event) {
    event.stopPropagation();

    // Track which word is speaking for UI feedback
    this.speakingWordId.set(wordId);

    // Use PronunciationService with fallback chain
    this.pronunciationService.speak(word.englishWord, 'us').finally(() => {
      // Clear speaking state after playback completes
      if (this.speakingWordId() === wordId) {
        this.speakingWordId.set(null);
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize()) || 1;
  }

  get startItem(): number {
    return (this.page() - 1) * this.pageSize() + 1;
  }

  get endItem(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }

  /**
   * Generate array of visible page numbers for pagination
   * Shows: |< < 1 2 3 ... 10 11 12 ... 98 99 100 > >|
   */
  get visiblePages(): (number | '...')[] {
    const current = this.page();
    const total = this.totalPages;
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current <= 3) {
        // Near start: 1 2 3 4 ... last
        pages.push(2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push('...', total - 3, total - 2, total - 1, total);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push('...', current - 1, current, current + 1, '...', total);
      }
    }

    return pages;
  }
}
