/**
 * Study Page JSON Schema Types
 * Used for rendering interactive textbook-style study pages
 */

// ============================================================
// CORE TYPES
// ============================================================

export interface StudyUnit {
  unitId: string;
  unitNumber: number;
  title: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  pages: StudyPage[];
}

export interface StudyPage {
  pageId: string;
  pageNumber: number;
  layout: 'single' | 'two-column';
  sections: StudySection[];
}

export type StudySection =
  | VocabularySection
  | GrammarSection
  | SpeakingSection
  | WritingSection;

// ============================================================
// SECTION TYPES
// ============================================================

export interface SectionHeader {
  title: string; // e.g., "VOCABULARY", "GRAMMAR"
  subtitle: string; // e.g., "The alphabet", "be (present simple)"
  color: 'teal' | 'blue' | 'purple' | 'orange' | 'green' | 'red';
}

export interface VocabularySection {
  sectionId: string;
  type: 'vocabulary-section';
  header: SectionHeader;
  exercises: StudyPageExercise[];
}

export interface GrammarSection {
  sectionId: string;
  type: 'grammar-section';
  header: SectionHeader;
  grammarBox?: GrammarBox;
  exercises: StudyPageExercise[];
}

export interface SpeakingSection {
  sectionId: string;
  type: 'speaking-section';
  header: SectionHeader;
  dialogue?: DialogueContent;
  exercises: StudyPageExercise[];
}

export interface WritingSection {
  sectionId: string;
  type: 'writing-section';
  header: SectionHeader;
  template?: WritingTemplate;
  exercises: StudyPageExercise[];
}

// ============================================================
// GRAMMAR BOX
// ============================================================

export interface GrammarBox {
  title: string;
  tables: GrammarTable[];
  notes?: string[];
}

export interface GrammarTable {
  type: 'conjugation' | 'comparison' | 'rules';
  headers: string[];
  rows: string[][];
}

// ============================================================
// EXERCISE TYPES
// ============================================================

export interface StudyPageExercise {
  exerciseId: string;
  number: number;
  type: StudyPageExerciseType;
  instruction: string;
  audio?: StudyPageAudioConfig;
  content: ExerciseContent;
  interactive?: InteractiveConfig;
}

export type StudyPageExerciseType =
  | 'listen-repeat'
  | 'listen-write'
  | 'match'
  | 'fill-blank'
  | 'label'
  | 'speaking'
  | 'look-write'
  | 'complete'
  | 'rewrite'
  | 'write-questions'
  | 'role-play'
  | 'write';

export interface StudyPageAudioConfig {
  trackNumber: string;
  fileName: string;
  baseUrl?: string; // defaults to /audio/word-maps/prepare-2e-l1/sb/
}

export interface InteractiveConfig {
  type: InteractiveType;
  data: InteractiveData;
}

export type InteractiveType =
  | 'fill-blanks'
  | 'matching'
  | 'ordering'
  | 'multiple-choice'
  | 'labeling'
  | 'dialogue'
  | 'table-fill'
  | 'transformation';

// ============================================================
// CONTENT TYPES
// ============================================================

export type ExerciseContent =
  | AlphabetGridContent
  | NumberGridContent
  | VocabularyGridContent
  | ColorCakesContent
  | DaysCalendarContent
  | CountryGridContent
  | FamilyTreeContent
  | ClassroomSceneContent
  | DialogueContent
  | WritingTemplate
  | TextContent
  | ImageContent;

export interface AlphabetGridContent {
  type: 'alphabet-grid';
  columns: number;
  items: AlphabetItem[];
}

export interface AlphabetItem {
  letter: string;
  phonetic?: string;
  example?: string;
}

export interface NumberGridContent {
  type: 'number-grid';
  columns: number;
  items: NumberItem[];
}

export interface NumberItem {
  number: number;
  word: string;
  image?: string;
}

export interface VocabularyGridContent {
  type: 'vocabulary-grid';
  columns: number;
  items: VocabularyItem[];
}

export interface VocabularyItem {
  word: string;
  image?: string;
  translation?: string;
}

export interface ColorCakesContent {
  type: 'color-cakes';
  items: ColorItem[];
}

export interface ColorItem {
  color: string;
  image?: string;
  hexCode?: string;
}

export interface DaysCalendarContent {
  type: 'days-calendar';
  items: DayItem[];
}

export interface DayItem {
  day: string;
  abbreviation: string;
}

export interface CountryGridContent {
  type: 'country-grid';
  columns: number;
  items: CountryItem[];
}

export interface CountryItem {
  country: string;
  flag?: string;
  nationality?: string;
}

export interface FamilyTreeContent {
  type: 'family-tree';
  members: FamilyMember[];
}

export interface FamilyMember {
  role: string;
  position: string;
  name?: string;
  image?: string;
}

export interface ClassroomSceneContent {
  type: 'classroom-scene';
  image: string;
  items: SceneItem[];
}

export interface SceneItem {
  name: string;
  x: number;
  y: number;
}

export interface DialogueContent {
  type: 'dialogue';
  lines: DialogueLine[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
  blanks?: DialogueBlank[];
}

export interface DialogueBlank {
  position?: number;
  answer: string;
}

export interface WritingTemplate {
  type: 'writing-template';
  prompts: string[];
  minWords?: number;
  maxWords?: number;
}

export interface TextContent {
  type: 'text';
  text: string;
  formatting?: 'bold' | 'italic' | 'highlight';
}

export interface ImageContent {
  type: 'image';
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

// ============================================================
// INTERACTIVE DATA TYPES
// ============================================================

export type InteractiveData =
  | FillBlanksData
  | StudyPageMatchingData
  | OrderingData
  | MultipleChoiceData
  | LabelingData
  | TableFillData
  | TransformationData;

export interface FillBlanksData {
  type: 'fill-blanks';
  sentences: FillBlankSentence[];
}

export interface FillBlankSentence {
  text: string;
  blanks: BlankItem[];
}

export interface BlankItem {
  position: number;
  answer: string;
  hint?: string;
}

export interface StudyPageMatchingData {
  type: 'matching';
  pairs: StudyPageMatchPair[];
}

export interface StudyPageMatchPair {
  left: string;
  right: string;
  leftImage?: string;
  rightImage?: string;
}

export interface OrderingData {
  type: 'ordering';
  items: string[];
  correctOrder: number[];
}

export interface MultipleChoiceData {
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctIndex: number;
  image?: string;
}

export interface LabelingData {
  type: 'labeling';
  image: string;
  labels: LabelItem[];
}

export interface LabelItem {
  x: number;
  y: number;
  answer: string;
  hint?: string;
}

export interface TableFillData {
  type: 'table-fill';
  headers: string[];
  rows: TableFillRow[];
}

export interface TableFillRow {
  cells: TableFillCell[];
}

export interface TableFillCell {
  value?: string;
  isBlank: boolean;
  answer?: string;
}

export interface TransformationData {
  type: 'transformation';
  original: string;
  instruction: string;
  answer: string;
}
