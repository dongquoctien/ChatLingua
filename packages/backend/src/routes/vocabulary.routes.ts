import { Router, Response } from 'express';
import { vocabularyService } from '../services/vocabulary.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/vocabulary
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const filters = {
      difficultyLevel: req.query.difficulty as string | undefined,
      partOfSpeech: req.query.partOfSpeech as string | undefined,
      masteryLevel: req.query.mastery ? parseInt(req.query.mastery as string) : undefined,
      cefrLevel: req.query.cefr as string | undefined,
      searchTerm: req.query.search as string | undefined,
    };

    const result = await vocabularyService.getVocabulary(req.userId!, page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/search - Advanced search
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const options = {
      partOfSpeech: req.query.partOfSpeech as string | undefined,
      cefrLevel: req.query.cefr as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const results = await vocabularyService.searchVocabulary(req.userId!, query, options);
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/review
router.get('/review', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const vocabulary = await vocabularyService.getVocabularyForReview(req.userId!, limit);
    res.json(vocabulary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary for review';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/word/:word - Get by English word
router.get('/word/:word', async (req: AuthRequest, res: Response) => {
  try {
    const word = decodeURIComponent(req.params.word);
    const entry = await vocabularyService.getDictionaryByWord(req.userId!, word);

    if (!entry) {
      res.status(404).json({ error: 'Word not found in your vocabulary' });
      return;
    }

    res.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/:id - Basic info
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const vocabularyId = parseInt(req.params.id);
    if (isNaN(vocabularyId)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const vocabulary = await vocabularyService.getVocabularyById(req.userId!, vocabularyId);

    if (!vocabulary) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json(vocabulary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/:id/detail - Full dictionary entry
router.get('/:id/detail', async (req: AuthRequest, res: Response) => {
  try {
    const vocabularyId = parseInt(req.params.id);
    if (isNaN(vocabularyId)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const entry = await vocabularyService.getDictionaryEntry(req.userId!, vocabularyId);

    if (!entry) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dictionary entry';
    res.status(500).json({ error: message });
  }
});

// GET /api/vocabulary/:id/related - Get related words
router.get('/:id/related', async (req: AuthRequest, res: Response) => {
  try {
    const vocabularyId = parseInt(req.params.id);
    if (isNaN(vocabularyId)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    // First check if vocabulary exists
    const vocabulary = await vocabularyService.getVocabularyById(req.userId!, vocabularyId);
    if (!vocabulary) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    const related = await vocabularyService.getRelatedWords(req.userId!, vocabularyId);
    res.json(related);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get related words';
    res.status(500).json({ error: message });
  }
});

// POST /api/vocabulary/:id/review
router.post('/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const vocabularyId = parseInt(req.params.id);
    if (isNaN(vocabularyId)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const { correct } = req.body;
    if (typeof correct !== 'boolean') {
      res.status(400).json({ error: 'correct field must be a boolean' });
      return;
    }

    const vocabulary = await vocabularyService.updateMastery(req.userId!, vocabularyId, correct);

    if (!vocabulary) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json(vocabulary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update mastery';
    res.status(500).json({ error: message });
  }
});

export default router;
