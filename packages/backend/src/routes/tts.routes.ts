import { Router, Request, Response } from 'express';
import {
  generateSpeech,
  generateListeningSpeech,
  generatePronunciation,
  generateVietnameseSpeech,
  listVoices,
  clearAudioCache,
  VOICES,
} from '../services/tts.service';

const router = Router();

/**
 * POST /api/tts/generate
 * Generate speech audio from text
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch, volume } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const result = await generateSpeech(text, { voice, rate, pitch, volume });

    res.json({
      success: true,
      url: result.url,
      cached: result.cached,
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

/**
 * POST /api/tts/listening
 * Generate speech optimized for listening exercises
 */
router.post('/listening', async (req: Request, res: Response) => {
  try {
    const { text, speed, accent } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const result = await generateListeningSpeech(text, { speed, accent });

    res.json({
      success: true,
      url: result.url,
      cached: result.cached,
    });
  } catch (error) {
    console.error('TTS listening generation error:', error);
    res.status(500).json({ error: 'Failed to generate listening audio' });
  }
});

/**
 * POST /api/tts/pronunciation
 * Generate pronunciation audio for a word
 */
router.post('/pronunciation', async (req: Request, res: Response) => {
  try {
    const { word, accent } = req.body;

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    if (word.length > 100) {
      return res.status(400).json({ error: 'Word too long (max 100 characters)' });
    }

    const result = await generatePronunciation(word, accent || 'us');

    res.json({
      success: true,
      url: result.url,
      cached: result.cached,
    });
  } catch (error) {
    console.error('TTS pronunciation error:', error);
    res.status(500).json({ error: 'Failed to generate pronunciation' });
  }
});

/**
 * POST /api/tts/vietnamese
 * Generate Vietnamese speech
 */
router.post('/vietnamese', async (req: Request, res: Response) => {
  try {
    const { text, gender } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const result = await generateVietnameseSpeech(text, { gender });

    res.json({
      success: true,
      url: result.url,
      cached: result.cached,
    });
  } catch (error) {
    console.error('TTS Vietnamese generation error:', error);
    res.status(500).json({ error: 'Failed to generate Vietnamese speech' });
  }
});

/**
 * GET /api/tts/voices
 * List available voices
 */
router.get('/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await listVoices();
    const shortcuts = Object.entries(VOICES).map(([key, value]) => ({
      shortcut: key,
      voice: value,
    }));

    res.json({
      shortcuts,
      allVoices: voices,
    });
  } catch (error) {
    console.error('TTS list voices error:', error);
    res.status(500).json({ error: 'Failed to list voices' });
  }
});

/**
 * DELETE /api/tts/cache
 * Clear all cached TTS audio files
 */
router.delete('/cache', async (_req: Request, res: Response) => {
  try {
    const count = clearAudioCache();
    res.json({
      success: true,
      deletedFiles: count,
    });
  } catch (error) {
    console.error('TTS clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
