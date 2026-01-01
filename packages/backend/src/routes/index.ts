import { Router } from 'express';
import authRoutes from './auth.routes.js';
import conversationsRoutes from './conversations.routes.js';
import vocabularyRoutes from './vocabulary.routes.js';
import exercisesRoutes from './exercises.routes.js';
import quizzesRoutes from './quizzes.routes.js';
import statsRoutes from './stats.routes.js';
import reviewRoutes from './review.routes.js';
import gamificationRoutes from './gamification.routes.js';
import grammarRoutes from './grammar.routes.js';
import ttsRoutes from './tts.routes.js';
import mcpAuthRoutes from './mcp-auth.routes.js';
import gameRoutes from './game.routes.js';
import syncRequestsRoutes from './sync-requests.routes.js';
import chatRoutes from './chat.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/vocabulary', vocabularyRoutes);
router.use('/exercises', exercisesRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/stats', statsRoutes);
router.use('/review', reviewRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/grammar', grammarRoutes);
router.use('/tts', ttsRoutes);
router.use('/mcp-auth', mcpAuthRoutes);
router.use('/games', gameRoutes);
router.use('/sync-requests', syncRequestsRoutes);
router.use('/chat', chatRoutes);

export default router;
