// V3 Services - Word Map System
// ============================================================

// Master content services (admin-managed, shared by all users)
export * from './master-vocabulary.service.js';
export * from './master-grammar.service.js';
export * from './master-exercises.service.js';

// Word Map curriculum services
export * from './word-map.service.js';

// User progress services
export * from './user-vocabulary.service.js';
export * from './user-grammar.service.js';
export * from './user-progress.service.js';

// Exam services
export * from './exam.service.js';

// Re-export service instances for convenience
export { masterVocabularyService } from './master-vocabulary.service.js';
export { masterGrammarService } from './master-grammar.service.js';
export { masterExercisesService } from './master-exercises.service.js';
export { wordMapService } from './word-map.service.js';
export { userVocabularyService } from './user-vocabulary.service.js';
export { userGrammarService } from './user-grammar.service.js';
export { userProgressService } from './user-progress.service.js';
export { examService } from './exam.service.js';
