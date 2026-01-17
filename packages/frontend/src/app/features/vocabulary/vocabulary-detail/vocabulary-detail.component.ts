import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faVolumeUp,
  faBook,
  faGraduationCap,
  faChartLine,
  faSpinner,
  faLightbulb,
  faQuoteLeft,
  faComments,
  faGlobe,
  faExternalLinkAlt,
} from '../../../shared/icons';
import { ApiService, DictionaryEntry, RelatedWords, Vocabulary } from '../../../core/services/api.service';
import { PronunciationService, CachedDictionaryData, FreeDictionaryMeaning } from '../../../core/services/pronunciation.service';

@Component({
  selector: 'app-vocabulary-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FontAwesomeModule,
  ],
  templateUrl: './vocabulary-detail.component.html',
  styleUrl: './vocabulary-detail.component.scss',
})
export class VocabularyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private apiService = inject(ApiService);
  private pronunciationService = inject(PronunciationService);

  // Icons
  faArrowLeft = faArrowLeft;
  faVolumeUp = faVolumeUp;
  faBook = faBook;
  faGraduationCap = faGraduationCap;
  faChartLine = faChartLine;
  faSpinner = faSpinner;
  faLightbulb = faLightbulb;
  faQuoteLeft = faQuoteLeft;
  faComments = faComments;
  faGlobe = faGlobe;
  faExternalLinkAlt = faExternalLinkAlt;

  entry = signal<DictionaryEntry | null>(null);
  relatedWords = signal<RelatedWords | null>(null);
  freeDictData = signal<CachedDictionaryData | null>(null);
  freeDictLoading = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);

  // Use PronunciationService's speaking signal
  get speakingAccent() {
    return this.pronunciationService.speaking;
  }

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
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDictionaryEntry(parseInt(id, 10));
    }
  }

  loadDictionaryEntry(id: number) {
    this.loading.set(true);
    this.error.set(null);
    this.freeDictData.set(null);

    this.apiService.getDictionaryEntry(id).subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.loading.set(false);
        this.loadRelatedWords(id);
        // Load Free Dictionary data concurrently
        this.loadFreeDictionaryData(entry.englishWord);
      },
      error: () => {
        this.error.set('Failed to load dictionary entry');
        this.loading.set(false);
      },
    });
  }

  /**
   * Load additional dictionary data from Free Dictionary API
   */
  async loadFreeDictionaryData(word: string) {
    this.freeDictLoading.set(true);
    try {
      const data = await this.pronunciationService.fetchFullDictionary(word);
      this.freeDictData.set(data);
    } catch {
      // Silently fail - Free Dictionary data is supplementary
    } finally {
      this.freeDictLoading.set(false);
    }
  }

  loadRelatedWords(id: number) {
    this.apiService.getRelatedWords(id).subscribe({
      next: (related) => {
        this.relatedWords.set(related);
      },
      error: () => {
        // Silently fail - related words are optional
      },
    });
  }

  goBack() {
    // Use Location.back() to preserve query params from previous page
    this.location.back();
  }

  navigateToWord(vocab: Vocabulary) {
    this.router.navigate(['/vocabulary', vocab.id]);
    this.loadDictionaryEntry(vocab.id);
  }

  speak(word: string, accent: 'uk' | 'us') {
    const entry = this.entry();
    this.pronunciationService.speak(word, accent, {
      uk: entry?.audioUkUrl,
      us: entry?.audioUsUrl
    });
  }

  playAudio(url: string | null) {
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  }

  getCefrColorClass(level: string | null): string {
    return level ? this.cefrColors[level] || 'bg-gray-400' : 'bg-gray-400';
  }

  formatPartOfSpeech(pos: string | null): string {
    const labels: Record<string, string> = {
      noun: 'noun',
      verb: 'verb',
      adjective: 'adj',
      adverb: 'adv',
      preposition: 'prep',
      conjunction: 'conj',
      pronoun: 'pron',
      interjection: 'interj',
      phrase: 'phrase',
    };
    return pos ? labels[pos] || pos : '';
  }

  formatWordForms(entry: DictionaryEntry): string[] {
    const forms: string[] = [];
    if (!entry.wordForms) return forms;

    const wf = entry.wordForms;
    if (wf.plural) forms.push(`plural: ${wf.plural}`);
    if (wf.past) forms.push(`past: ${wf.past}`);
    if (wf.pastParticiple) forms.push(`past participle: ${wf.pastParticiple}`);
    if (wf.presentParticiple) forms.push(`-ing form: ${wf.presentParticiple}`);
    if (wf.thirdPerson) forms.push(`3rd person: ${wf.thirdPerson}`);
    if (wf.comparative) forms.push(`comparative: ${wf.comparative}`);
    if (wf.superlative) forms.push(`superlative: ${wf.superlative}`);

    return forms;
  }

  hasCollocations(entry: DictionaryEntry): boolean {
    if (!entry.collocations) return false;
    const c = entry.collocations;
    return !!(
      c.adjective?.length ||
      c.verbContract?.length ||
      c.contractVerb?.length ||
      c.contractNoun?.length ||
      c.preposition?.length ||
      c.phrases?.length
    );
  }

  hasWordFamily(entry: DictionaryEntry): boolean {
    if (!entry.wordFamily) return false;
    const wf = entry.wordFamily;
    return !!(
      wf.noun?.length ||
      wf.verb?.length ||
      wf.adjective?.length ||
      wf.adverb?.length
    );
  }

  formatTimeSince(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  navigateToConversation(conversationId: number) {
    this.router.navigate(['/conversations', conversationId]);
  }

  // ============================================================
  // Free Dictionary Data Helpers
  // ============================================================

  /**
   * Get all unique synonyms from Free Dictionary data
   */
  getFreeDictSynonyms(): string[] {
    const data = this.freeDictData();
    if (!data) return [];
    return PronunciationService.extractAllSynonyms(data);
  }

  /**
   * Get all unique antonyms from Free Dictionary data
   */
  getFreeDictAntonyms(): string[] {
    const data = this.freeDictData();
    if (!data) return [];
    return PronunciationService.extractAllAntonyms(data);
  }

  /**
   * Get meanings grouped by part of speech
   */
  getFreeDictMeanings(): FreeDictionaryMeaning[] {
    return this.freeDictData()?.meanings || [];
  }

  /**
   * Check if Free Dictionary has additional data not in our database
   */
  hasAdditionalFreeDictData(): boolean {
    const data = this.freeDictData();
    if (!data) return false;

    const entry = this.entry();
    if (!entry) return false;

    // Check if Free Dictionary has more synonyms/antonyms
    const freeSynonyms = this.getFreeDictSynonyms();
    const freeAntonyms = this.getFreeDictAntonyms();
    const dbSynonyms = entry.synonyms || [];
    const dbAntonyms = entry.antonyms || [];

    const hasMoreSynonyms = freeSynonyms.some(s => !dbSynonyms.includes(s));
    const hasMoreAntonyms = freeAntonyms.some(a => !dbAntonyms.includes(a));
    const hasExamples = data.meanings.some(m =>
      m.definitions.some(d => d.example)
    );

    return hasMoreSynonyms || hasMoreAntonyms || hasExamples || data.meanings.length > 0;
  }

  /**
   * Get source URLs from Free Dictionary
   */
  getSourceUrls(): string[] {
    return this.freeDictData()?.sourceUrls || [];
  }

  /**
   * Format part of speech from Free Dictionary
   */
  formatFreeDictPos(pos: string): string {
    const labels: Record<string, string> = {
      noun: 'noun',
      verb: 'verb',
      adjective: 'adj',
      adverb: 'adv',
      preposition: 'prep',
      conjunction: 'conj',
      pronoun: 'pron',
      interjection: 'interj',
      exclamation: 'excl',
    };
    return labels[pos.toLowerCase()] || pos;
  }
}
