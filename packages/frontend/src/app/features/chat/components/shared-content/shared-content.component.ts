import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MessageType } from '../../chat.types';

export interface SharedAchievementData {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  xpReward: number;
  unlockedAt?: string;
}

export interface SharedGameData {
  id: number;
  gameName: string;
  gameType: string;
  score: number;
  wordsLearned?: number;
  accuracy?: number;
  timeSpent?: number;
  highScore?: boolean;
}

export interface SharedExerciseData {
  id: number;
  exerciseType: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  xpEarned?: number;
}

export interface SharedVocabularyData {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
}

export interface SharedQuizData {
  id: number;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  xpEarned?: number;
}

export type SharedContentData =
  | SharedAchievementData
  | SharedGameData
  | SharedExerciseData
  | SharedVocabularyData
  | SharedQuizData;

@Component({
  selector: 'app-shared-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shared-content.component.html',
  styleUrls: ['./shared-content.component.scss'],
})
export class SharedContentComponent {
  @Input({ required: true }) type!: MessageType;
  @Input() data: Record<string, unknown> | null = null;
  @Input() comment?: string;

  get achievementData(): SharedAchievementData | null {
    if (this.type !== 'achievement' || !this.data) return null;
    return this.data as unknown as SharedAchievementData;
  }

  get gameData(): SharedGameData | null {
    if (this.type !== 'game' || !this.data) return null;
    return this.data as unknown as SharedGameData;
  }

  get exerciseData(): SharedExerciseData | null {
    if (this.type !== 'exercise' || !this.data) return null;
    return this.data as unknown as SharedExerciseData;
  }

  get vocabularyData(): SharedVocabularyData | null {
    if (this.type !== 'vocabulary' || !this.data) return null;
    return this.data as unknown as SharedVocabularyData;
  }

  get quizData(): SharedQuizData | null {
    if (this.type === 'exercise' && this.data && 'quizTitle' in this.data) {
      return this.data as unknown as SharedQuizData;
    }
    return null;
  }

  get contentComment(): string | undefined {
    if (this.comment) return this.comment;
    if (this.data && 'comment' in this.data) {
      return this.data['comment'] as string;
    }
    return undefined;
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}
