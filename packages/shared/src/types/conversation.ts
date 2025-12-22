export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Conversation {
  id: number;
  userId: number;
  vietnameseText: string;
  englishTranslation?: string;
  aiAnalysis?: ConversationAnalysis;
  topic?: string;
  difficultyLevel: DifficultyLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationAnalysis {
  summary: string;
  detectedTopics: string[];
  suggestedLevel: DifficultyLevel;
  keyPhrases: string[];
}

export interface ConversationWithDetails extends Conversation {
  vocabulary: import('./vocabulary').Vocabulary[];
  grammarPoints: import('./grammar').GrammarPoint[];
}

export interface AnalyzeConversationInput {
  userId: number;
  vietnameseText: string;
  context?: string;
}

export interface AnalyzeConversationResult {
  conversationId: number;
  englishTranslation: string;
  vocabulary: import('./vocabulary').VocabularyInput[];
  grammarPoints: import('./grammar').GrammarPointInput[];
  difficultyLevel: DifficultyLevel;
  topic: string;
}
