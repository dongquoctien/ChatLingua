import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faLanguage,
  faSpellCheck,
  faSpinner,
  faBook,
  faLightbulb,
  faComment,
  faStar,
  faClock,
} from '../../../shared/icons';
import { faStar as faStarEmpty } from '@fortawesome/free-regular-svg-icons';
import { faRobot, faTag } from '@fortawesome/free-solid-svg-icons';
import { ApiService, ConversationDetail, Vocabulary } from '../../../core/services/api.service';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
  ],
  templateUrl: './conversation-detail.component.html',
  styleUrl: './conversation-detail.component.scss',
})
export class ConversationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  // Icons
  faArrowLeft = faArrowLeft;
  faLanguage = faLanguage;
  faSpellCheck = faSpellCheck;
  faSpinner = faSpinner;
  faBook = faBook;
  faLightbulb = faLightbulb;
  faComment = faComment;
  faStar = faStar;
  faStarEmpty = faStarEmpty;
  faRobot = faRobot;
  faTag = faTag;
  faClock = faClock;

  conversation = signal<ConversationDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadConversation(+id);
    }
  }

  loadConversation(id: number) {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getConversation(id).subscribe({
      next: (conv) => {
        this.conversation.set(conv);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load conversation');
        this.loading.set(false);
      },
    });
  }

  getPhrases(): Vocabulary[] {
    const conv = this.conversation();
    if (!conv) return [];
    return conv.vocabulary.filter(v => v.partOfSpeech === 'phrase');
  }

  getMasteryLabel(level: number): string {
    if (level >= 4) return 'Mastered';
    if (level >= 2) return 'Learning';
    return 'New';
  }

  getMasteryStars(masteryLevel: number): number {
    // Convert 0-100 scale to 0-5 stars
    return Math.round(masteryLevel / 20);
  }

  getDifficultyClass(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-gray-50 text-gray-700';
      case 'intermediate': return 'bg-orange-50 text-orange-700';
      case 'advanced': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  }
}
