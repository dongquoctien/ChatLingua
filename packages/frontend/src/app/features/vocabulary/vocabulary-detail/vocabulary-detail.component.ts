import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from '../../../shared/icons';
import { ApiService, DictionaryEntry, RelatedWords, Vocabulary } from '../../../core/services/api.service';

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
  private apiService = inject(ApiService);

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

  entry = signal<DictionaryEntry | null>(null);
  relatedWords = signal<RelatedWords | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  speakingAccent = signal<'uk' | 'us' | null>(null);

  // CEFR level colors (Tailwind classes) - color-coded by difficulty
  cefrColors: Record<string, string> = {
    A1: 'bg-green-500',      // Beginner - easiest
    A2: 'bg-teal-500',       // Elementary
    B1: 'bg-amber-500',      // Intermediate
    B2: 'bg-orange-500',     // Upper Intermediate
    C1: 'bg-rose-500',       // Advanced
    C2: 'bg-purple-600',     // Proficiency - hardest
  };

  // Speech synthesis voices
  private ukVoice: SpeechSynthesisVoice | null = null;
  private usVoice: SpeechSynthesisVoice | null = null;

  ngOnInit() {
    this.loadVoices();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDictionaryEntry(parseInt(id, 10));
    }
  }

  private loadVoices() {
    const loadAvailableVoices = () => {
      const voices = speechSynthesis.getVoices();
      this.ukVoice = voices.find(v =>
        v.lang === 'en-GB' || v.lang.startsWith('en-GB')
      ) || null;
      this.usVoice = voices.find(v =>
        v.lang === 'en-US' || v.lang.startsWith('en-US')
      ) || null;
      if (!this.ukVoice && !this.usVoice) {
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        this.ukVoice = englishVoice || null;
        this.usVoice = englishVoice || null;
      }
    };

    if (speechSynthesis.getVoices().length > 0) {
      loadAvailableVoices();
    } else {
      speechSynthesis.onvoiceschanged = loadAvailableVoices;
    }
  }

  loadDictionaryEntry(id: number) {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getDictionaryEntry(id).subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.loading.set(false);
        this.loadRelatedWords(id);
      },
      error: () => {
        this.error.set('Failed to load dictionary entry');
        this.loading.set(false);
      },
    });
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
    this.router.navigate(['/vocabulary']);
  }

  navigateToWord(vocab: Vocabulary) {
    this.router.navigate(['/vocabulary', vocab.id]);
    this.loadDictionaryEntry(vocab.id);
  }

  speak(word: string, accent: 'uk' | 'us') {
    if (this.speakingAccent()) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voice = accent === 'uk' ? this.ukVoice : this.usVoice;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    } else {
      utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    }

    utterance.onstart = () => this.speakingAccent.set(accent);
    utterance.onend = () => this.speakingAccent.set(null);
    utterance.onerror = () => this.speakingAccent.set(null);

    speechSynthesis.speak(utterance);
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
}
