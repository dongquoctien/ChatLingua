import { DifficultyLevel } from './conversation';

export interface GrammarPoint {
  id: number;
  conversationId: number;
  userId: number;
  grammarRule: string;
  explanation: string;
  exampleVi?: string;
  exampleEn?: string;
  category?: string; // e.g., "tense", "article", "preposition"
  difficultyLevel: DifficultyLevel;
  timesPracticed: number;
  createdAt: Date;
}

export interface GrammarPointInput {
  grammarRule: string;
  explanation: string;
  exampleVi?: string;
  exampleEn?: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
}
