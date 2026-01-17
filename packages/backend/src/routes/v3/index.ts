import { Router } from 'express';
import wordMapsRoutes from './word-maps.routes.js';
import progressRoutes from './progress.routes.js';
import masterVocabularyRoutes from './master-vocabulary.routes.js';
import masterGrammarRoutes from './master-grammar.routes.js';
import masterExercisesRoutes from './master-exercises.routes.js';
import userVocabularyRoutes from './user-vocabulary.routes.js';
import userGrammarRoutes from './user-grammar.routes.js';

const router = Router();

// V3 Routes - Word Map System
router.use('/word-maps', wordMapsRoutes);
router.use('/progress', progressRoutes);

// Master Content Routes (admin-managed, shared by all users)
router.use('/master/vocabulary', masterVocabularyRoutes);
router.use('/master/grammar', masterGrammarRoutes);
router.use('/master/exercises', masterExercisesRoutes);

// User Content Routes (personal content with spaced repetition)
router.use('/user/vocabulary', userVocabularyRoutes);
router.use('/user/grammar', userGrammarRoutes);

export default router;
