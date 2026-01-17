// ChatLingua Shared Types

// V1/V2 Types (Original)
export * from './types/user';
export * from './types/conversation';
export * from './types/vocabulary';
export * from './types/grammar';
export * from './types/exercise';
export * from './types/quiz';
export * from './types/stats';
export * from './types/review';
export * from './types/gamification';
export * from './types/game';

// V3 Types (Word Map System)
// Use namespace exports to avoid naming conflicts with V1/V2 types
export * as WordMapTypes from './types/word-map';
export * as VocabularyV3Types from './types/vocabulary-v3';
export * as GrammarV3Types from './types/grammar-v3';
export * as ExerciseV3Types from './types/exercise-v3';
export * as ProgressTypes from './types/progress';

// Also export specific V3 types that don't conflict
export type {
  // Word Map types
  WordMap,
  WordMapSummary,
  MapUnit,
  MapUnitWithLessons,
  UnitLesson,
  LessonType,
  LessonContent,
  ContentType,
  ContentSection,
  CustomLessonContent,
  LessonExam,
  MapPrerequisite,
  WordMapWithProgress,
  UnitWithProgress,
  LessonWithProgress,
  CreateWordMapInput,
  CreateUnitInput,
  CreateLessonInput,
  AddLessonContentInput,
} from './types/word-map';

export type {
  // Vocabulary V3 types
  MasterVocabulary,
  MasterVocabularyInput,
  UserVocabulary,
  VocabularySourceType,
  VocabularyWithProgress,
  VocabularyV3Response,
  VocabularyReviewV3,
  VocabularyReviewV3Input,
  VocabularyReviewV3Result,
  VocabularyQueueItemV3,
  VocabularyReviewQueueV3,
  MasterVocabularyFilter,
  UserVocabularyFilter,
  VocabularyTag,
  MasterVocabularyTag,
} from './types/vocabulary-v3';

export type {
  // Grammar V3 types
  MasterGrammar,
  MasterGrammarInput,
  GrammarExample,
  UserGrammar,
  GrammarSourceType,
  GrammarReviewStatusV3,
  GrammarWithProgress,
  GrammarV3Response,
  GrammarReviewV3,
  GrammarReviewV3Input,
  GrammarReviewV3Result,
  GrammarQueueItemV3,
  GrammarReviewQueueV3,
  GrammarQueuePriorityV3,
  MasterGrammarFilter,
  UserGrammarFilter,
  GrammarTag,
  MasterGrammarTag,
} from './types/grammar-v3';

export type {
  // Exercise V3 types (non-conflicting)
  MasterExercise,
  MasterExerciseInput,
  UserExerciseAttempt,
  UserExerciseAttemptInput,
  ExerciseV3Response,
  ExerciseWithAttemptV3,
  ExamAttempt,
  ExamAttemptStatus,
  ExamAttemptInput,
  ExamAnswerSubmission,
  ExamAnswer,
  ExamResult,
  ExamQuestionResult,
  MasterExerciseFilter,
  UserExerciseHistoryFilter,
  ExerciseTag,
  MasterExerciseTag,
} from './types/exercise-v3';

export type {
  // Progress types (non-conflicting)
  UserMapProgress,
  MapProgressStatus,
  UserMapProgressSummary,
  UserUnitProgress,
  UnitProgressStatus,
  UserLessonProgress,
  LessonProgressStatus,
  UserProgressOverview,
  StudySession,
  StudySessionType,
  StudySessionInput,
  DailyProgress,
  UserLearningGoals,
  LeaderboardPeriod,
  LeaderboardMetric,
  MapLeaderboard,
  MapLeaderboardEntry,
  AchievementProgress,
} from './types/progress';

// Study Page Types (JSON-driven interactive textbook pages)
export * as StudyPageTypes from './types/study-page';

// Direct exports for Study Page types (for easier imports)
export type {
  // Core types
  StudyUnit,
  StudyPage,
  StudySection,
  SectionHeader,
  VocabularySection,
  GrammarSection,
  SpeakingSection,
  WritingSection,
  // Grammar
  GrammarBox,
  GrammarTable,
  // Exercise (renamed to avoid conflict with V1/V2 Exercise type)
  StudyPageExercise,
  StudyPageExerciseType,
  StudyPageAudioConfig,
  InteractiveConfig,
  InteractiveType,
  // Content types
  ExerciseContent,
  AlphabetGridContent,
  AlphabetItem,
  NumberGridContent,
  NumberItem,
  VocabularyGridContent,
  VocabularyItem,
  ColorCakesContent,
  ColorItem,
  DaysCalendarContent,
  DayItem,
  CountryGridContent,
  CountryItem,
  FamilyTreeContent,
  FamilyMember,
  ClassroomSceneContent,
  SceneItem,
  DialogueContent,
  DialogueLine,
  DialogueBlank,
  WritingTemplate,
  TextContent,
  ImageContent,
  // Interactive data types
  InteractiveData,
  FillBlanksData,
  FillBlankSentence,
  BlankItem,
  StudyPageMatchingData,
  StudyPageMatchPair,
  OrderingData,
  MultipleChoiceData,
  LabelingData,
  LabelItem,
  TableFillData,
  TableFillRow,
  TableFillCell,
  TransformationData,
} from './types/study-page';
