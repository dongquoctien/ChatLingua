import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBook,
  faGraduationCap,
  faTasks,
  faChevronDown,
  faChevronUp,
  faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import { VocabularyPreview, GrammarPreview } from '../../services/forum.service';

@Component({
  selector: 'app-content-preview',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './content-preview.component.html',
  styleUrls: ['./content-preview.component.scss']
})
export class ContentPreviewComponent {
  @Input() vocabulary: VocabularyPreview[] = [];
  @Input() grammarPoints: GrammarPreview[] = [];
  @Input() exerciseCount = 0;
  @Input() collapsible = true;
  @Input() initiallyExpanded = false;

  faBook = faBook;
  faGraduationCap = faGraduationCap;
  faTasks = faTasks;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faVolumeUp = faVolumeUp;

  vocabularyExpanded = false;
  grammarExpanded = false;

  ngOnInit(): void {
    this.vocabularyExpanded = this.initiallyExpanded;
    this.grammarExpanded = this.initiallyExpanded;
  }

  toggleVocabulary(): void {
    if (this.collapsible) {
      this.vocabularyExpanded = !this.vocabularyExpanded;
    }
  }

  toggleGrammar(): void {
    if (this.collapsible) {
      this.grammarExpanded = !this.grammarExpanded;
    }
  }

  get previewVocabulary(): VocabularyPreview[] {
    return this.vocabularyExpanded ? this.vocabulary : this.vocabulary.slice(0, 5);
  }

  get previewGrammar(): GrammarPreview[] {
    return this.grammarExpanded ? this.grammarPoints : this.grammarPoints.slice(0, 3);
  }

  get hasMoreVocabulary(): boolean {
    return this.vocabulary.length > 5;
  }

  get hasMoreGrammar(): boolean {
    return this.grammarPoints.length > 3;
  }

  getPartOfSpeechClass(pos: string): string {
    switch (pos.toLowerCase()) {
      case 'noun': return 'bg-blue-100 text-blue-700';
      case 'verb': return 'bg-green-100 text-green-700';
      case 'adjective': return 'bg-purple-100 text-purple-700';
      case 'adverb': return 'bg-yellow-100 text-yellow-700';
      case 'preposition': return 'bg-orange-100 text-orange-700';
      case 'phrase': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
