import { DifficultyLevel } from './conversation';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'interjection'
  | 'phrase';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Register = 'formal' | 'informal' | 'neutral' | 'slang' | 'technical';

// Definition example with bilingual support
export interface DefinitionExample {
  en: string;
  vi: string;
}

// Single definition/sense of a word
export interface Definition {
  senseId: number;
  definition: string;
  definitionVi: string;
  grammar?: string; // e.g., "[countable]", "[transitive]"
  register?: Register;
  examples: DefinitionExample[];
  patterns?: string[]; // e.g., ["contract with somebody", "under contract"]
  topics?: TopicTag[];
}

// Topic with CEFR level
export interface TopicTag {
  name: string;
  level: CEFRLevel;
}

// Word forms (conjugations, plurals, etc.)
export interface WordForms {
  plural?: string;
  past?: string;
  pastParticiple?: string;
  presentParticiple?: string;
  thirdPerson?: string;
  comparative?: string;
  superlative?: string;
}

// Word family (related words by part of speech)
export interface WordFamily {
  noun?: string[];
  verb?: string[];
  adjective?: string[];
  adverb?: string[];
}

// Collocations organized by grammatical relationship
export interface Collocations {
  adjective?: string[];      // adjective + word: "long-term contract"
  verbContract?: string[];   // verb + word: "sign a contract"
  contractVerb?: string[];   // word + verb: "contract expires"
  contractNoun?: string[];   // word + noun: "contract worker"
  preposition?: string[];    // preposition patterns: "under contract"
  phrases?: string[];        // common phrases: "breach of contract"
}

// Idiom containing the word
export interface Idiom {
  phrase: string;
  meaning: string;
  meaningVi: string;
}

// Grammar information
export interface GrammarInfo {
  countable?: boolean;       // for nouns
  transitive?: boolean;      // for verbs
  patterns?: string[];       // grammar patterns
}

// Vocabulary context (conversation-specific data)
export interface VocabularyContext {
  id: number;
  vocabularyId: number;
  conversationId: number;
  vietnameseWord: string;
  exampleSentenceVi?: string;
  exampleSentenceEn?: string;
  createdAt: Date;
}

// Base Vocabulary (unique per user + english_word + part_of_speech)
export interface Vocabulary {
  id: number;
  userId: number;
  vietnameseWord: string; // Primary/default Vietnamese translation
  englishWord: string;
  phonetic?: string;
  partOfSpeech: PartOfSpeech;
  difficultyLevel: DifficultyLevel;
  masteryLevel: number; // 0-5
  timesPracticed: number;
  lastPracticedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  // Context-specific (optional, from join with vocabulary_contexts)
  exampleSentenceVi?: string;
  exampleSentenceEn?: string;
  // Contexts for all conversations this vocabulary appeared in
  contexts?: VocabularyContext[];
}

// Extended Vocabulary with Dictionary fields
export interface VocabularyExtended extends Vocabulary {
  // Pronunciation
  pronunciationUk?: string;
  pronunciationUs?: string;
  audioUkUrl?: string;
  audioUsUrl?: string;

  // Word forms and definitions
  wordForms?: WordForms;
  definitions?: Definition[];

  // Related vocabulary
  wordFamily?: WordFamily;
  synonyms?: string[];
  antonyms?: string[];

  // Usage
  collocations?: Collocations;
  idioms?: Idiom[];
  usageNotes?: string;
  extraExamples?: DefinitionExample[];

  // Grammar and classification
  grammarInfo?: GrammarInfo;
  register?: Register;
  frequencyRank?: number;
  cefrLevel?: CEFRLevel;
  topics?: TopicTag[];
  wordOrigin?: string;
  seeAlso?: string[];
}

// Full Dictionary Entry (API response)
export interface DictionaryEntry extends VocabularyExtended {
  // Learning statistics
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt?: Date;

  // Computed fields
  definitionCount: number;
  exampleCount: number;
}

// Input for creating vocabulary with dictionary data
export interface VocabularyInput {
  vietnameseWord: string;
  englishWord: string;
  phonetic?: string;
  partOfSpeech: PartOfSpeech;
  exampleSentenceVi?: string;
  exampleSentenceEn?: string;
  difficultyLevel?: DifficultyLevel;
}

// Extended input for dictionary-style vocabulary
export interface VocabularyDictionaryInput extends VocabularyInput {
  pronunciationUk?: string;
  pronunciationUs?: string;
  wordForms?: WordForms;
  definitions?: Omit<Definition, 'senseId'>[];
  wordFamily?: WordFamily;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocations;
  idioms?: Idiom[];
  usageNotes?: string;
  extraExamples?: DefinitionExample[];
  grammarInfo?: GrammarInfo;
  register?: Register;
  cefrLevel?: CEFRLevel;
  topics?: TopicTag[];
  wordOrigin?: string;
  seeAlso?: string[];
}

export interface VocabularyFilter {
  userId: number;
  difficultyLevel?: DifficultyLevel;
  partOfSpeech?: PartOfSpeech;
  cefrLevel?: CEFRLevel;
  limit?: number;
  offset?: number;
}

export interface VocabularySearchParams {
  userId: number;
  query: string;
  partOfSpeech?: PartOfSpeech;
  cefrLevel?: CEFRLevel;
  limit?: number;
}
