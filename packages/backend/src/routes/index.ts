import { Router } from 'express';
import authRoutes from './auth.routes.js';
import conversationsRoutes from './conversations.routes.js';
import vocabularyRoutes from './vocabulary.routes.js';
import exercisesRoutes from './exercises.routes.js';
import quizzesRoutes from './quizzes.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/vocabulary', vocabularyRoutes);
router.use('/exercises', exercisesRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/stats', statsRoutes);

export default router;
