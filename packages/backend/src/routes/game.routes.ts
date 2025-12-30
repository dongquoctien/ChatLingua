import { Router, Response } from 'express';
import { gameService } from '../services/game.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Games Hub
// ============================================================

/**
 * GET /api/games
 * Get all games with user stats
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const games = await gameService.getGamesWithUserStats(userId);
    res.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

/**
 * GET /api/games/hub
 * Get games hub data (games, currency, recent sessions)
 */
router.get('/hub', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [games, currency, recentSessions] = await Promise.all([
      gameService.getGamesWithUserStats(userId),
      gameService.getUserCurrency(userId),
      gameService.getUserRecentSessions(userId, 5),
    ]);

    res.json({
      games,
      userCurrency: currency,
      recentSessions,
      dailyBonusClaimed: false, // TODO: Track daily bonus
    });
  } catch (error) {
    console.error('Error fetching games hub:', error);
    res.status(500).json({ error: 'Failed to fetch games hub data' });
  }
});

/**
 * GET /api/games/:gameCode
 * Get specific game details and user stats
 */
router.get('/:gameCode', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const userId = req.userId!;

    const game = await gameService.getGameByCode(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const stats = await gameService.getGameStats(userId, gameCode);

    res.json({
      game: {
        id: game.id,
        gameCode: game.game_code,
        name: game.name,
        description: game.description,
        category: game.category,
        difficulty: game.difficulty,
        icon: game.icon,
        color: game.color,
        config: game.config ? (typeof game.config === 'string' ? JSON.parse(game.config) : game.config) : null,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// ============================================================
// Game Sessions
// ============================================================

/**
 * POST /api/games/:gameCode/start
 * Start a new game session
 */
router.post('/:gameCode/start', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { difficulty, gridSize } = req.body;
    const userId = req.userId!;

    const game = await gameService.getGameByCode(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get vocabulary for the game
    let vocabCount = 20;
    if (gameCode === 'memory_match') {
      vocabCount = gridSize ? (gridSize * gridSize) / 2 : 8;
    } else if (gameCode === 'hangman') {
      vocabCount = 10;
    } else if (gameCode === 'spelling_bee') {
      vocabCount = 15;
    }

    const vocabulary = await gameService.getVocabularyForGame(userId, vocabCount, difficulty);

    if (vocabulary.length < 4) {
      return res.status(400).json({
        error: 'Not enough vocabulary',
        message: 'You need at least 4 vocabulary items to play games. Add more vocabulary first!',
      });
    }

    // Start session
    const sessionId = await gameService.startSession(userId, game.id);

    res.json({
      sessionId,
      game: {
        id: game.id,
        gameCode: game.game_code,
        name: game.name,
        config: game.config ? (typeof game.config === 'string' ? JSON.parse(game.config) : game.config) : null,
      },
      vocabulary: vocabulary.map(v => ({
        id: v.id,
        englishWord: v.english_word,
        vietnameseWord: v.vietnamese_word,
        phonetic: v.phonetic,
        audioUrl: v.pronunciation_uk ? `/tts/${encodeURIComponent(v.english_word)}.mp3` : null,
        hint: v.vietnamese_word,
      })),
      config: game.config ? (typeof game.config === 'string' ? JSON.parse(game.config) : game.config) : {},
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * POST /api/games/sessions/:sessionId/end
 * End a game session and calculate rewards
 */
router.post('/sessions/:sessionId/end', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const {
      score,
      maxCombo,
      accuracy,
      wordsCorrect,
      wordsWrong,
      durationSeconds,
      gameData,
    } = req.body;

    const userId = req.userId!;

    // Verify session belongs to user
    const session = await gameService.getSession(parseInt(sessionId));
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session already ended' });
    }

    // Calculate rewards
    const baseXp = Math.floor(score / 10) + (wordsCorrect * 5);
    const comboBonus = maxCombo * 2;
    const accuracyBonus = accuracy >= 90 ? 25 : accuracy >= 70 ? 10 : 0;
    const perfectBonus = accuracy === 100 ? 50 : 0;
    const xpEarned = baseXp + comboBonus + accuracyBonus + perfectBonus;

    const coinsEarned = 10 + (accuracy === 100 ? 25 : 0) + Math.floor(score / 50);

    // End session
    const completedSession = await gameService.endSession(
      parseInt(sessionId),
      score,
      maxCombo,
      accuracy,
      wordsCorrect,
      wordsWrong,
      durationSeconds,
      xpEarned,
      coinsEarned,
      gameData
    );

    // Update leaderboard
    const { isNewBestScore, position } = await gameService.updateLeaderboard(
      userId,
      session.game_id,
      score,
      maxCombo,
      accuracy
    );

    // Get current play count for achievements (by game_id)
    const stats = await gameService.getGameStatsById(userId, session.game_id);

    // Check achievements
    const newAchievements = await gameService.checkAndUnlockAchievements(
      userId,
      session.game_id,
      parseInt(sessionId),
      {
        score,
        combo: maxCombo,
        accuracy,
        plays: stats?.totalPlays || 0,
      }
    );

    // Award XP
    await gameService.awardXP(userId, xpEarned, parseInt(sessionId), `Game: ${score} points`);

    // Award coins
    await gameService.updateUserCoins(userId, coinsEarned, 'game', parseInt(sessionId), `Game reward`);

    // Award achievement XP and coins
    for (const achievement of newAchievements) {
      await gameService.awardXP(userId, achievement.xp_reward, achievement.id, `Achievement: ${achievement.name}`);
      await gameService.updateUserCoins(userId, 50, 'achievement', achievement.id, achievement.name);
    }

    res.json({
      session: {
        id: completedSession.id,
        score: completedSession.score,
        maxCombo: completedSession.max_combo,
        accuracy: completedSession.accuracy,
        wordsCorrect: completedSession.words_correct,
        wordsWrong: completedSession.words_wrong,
        durationSeconds: completedSession.duration_seconds,
        xpEarned: completedSession.xp_earned,
        coinsEarned: completedSession.coins_earned,
      },
      xpEarned,
      coinsEarned,
      newAchievements: newAchievements.map(a => ({
        id: a.id,
        achievementCode: a.achievement_code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xp_reward,
      })),
      leaderboardPosition: position,
      isNewBestScore,
    });
  } catch (error) {
    console.error('Error ending game session:', error);
    res.status(500).json({ error: 'Failed to end game session' });
  }
});

// ============================================================
// Leaderboards
// ============================================================

/**
 * GET /api/games/:gameCode/leaderboard
 * Get leaderboard for a game
 */
router.get('/:gameCode/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { period = 'all_time', limit = '10' } = req.query;
    const userId = req.userId!;

    const leaderboard = await gameService.getLeaderboard(
      gameCode,
      period as 'daily' | 'weekly' | 'all_time',
      parseInt(limit as string)
    );

    if (!leaderboard) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Mark current user
    leaderboard.entries = leaderboard.entries.map((entry: any) => ({
      ...entry,
      isCurrentUser: entry.userId === userId,
    }));

    // Find current user's rank if not in top
    const userEntry = leaderboard.entries.find((e: any) => e.isCurrentUser);
    if (!userEntry) {
      const game = await gameService.getGameByCode(gameCode);
      if (game) {
        const stats = await gameService.getGameStats(userId, gameCode);
        if (stats.bestScore > 0) {
          leaderboard.currentUserRank = await gameService.getLeaderboardPosition(game.id, stats.bestScore);
        }
      }
    }

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============================================================
// Achievements
// ============================================================

/**
 * GET /api/games/:gameCode/achievements
 * Get achievements for a specific game
 */
router.get('/:gameCode/achievements', async (req: AuthRequest, res: Response) => {
  try {
    const { gameCode } = req.params;
    const userId = req.userId!;

    const game = await gameService.getGameByCode(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const achievements = await gameService.getUserGameAchievements(userId, game.id);

    res.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/games/achievements
 * Get all game achievements for user
 */
router.get('/achievements/all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const achievements = await gameService.getUserGameAchievements(userId);
    res.json({ achievements });
  } catch (error) {
    console.error('Error fetching all achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ============================================================
// Power-ups
// ============================================================

/**
 * GET /api/games/power-ups
 * Get user's power-ups inventory
 */
router.get('/power-ups/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const powerUps = await gameService.getUserPowerUps(userId);
    res.json({ powerUps });
  } catch (error) {
    console.error('Error fetching power-ups:', error);
    res.status(500).json({ error: 'Failed to fetch power-ups' });
  }
});

/**
 * GET /api/games/power-ups/shop
 * Get available power-ups for purchase
 */
router.get('/power-ups/shop', async (req: AuthRequest, res: Response) => {
  try {
    const powerUps = await gameService.getAllPowerUps();
    res.json({
      powerUps: powerUps.map(p => ({
        id: p.id,
        powerUpCode: p.power_up_code,
        name: p.name,
        description: p.description,
        icon: p.icon,
        effectType: p.effect_type,
        effectValue: p.effect_value,
        coinCost: p.coin_cost,
        applicableGames: p.applicable_games ? (typeof p.applicable_games === 'string' ? JSON.parse(p.applicable_games) : p.applicable_games) : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching power-ups shop:', error);
    res.status(500).json({ error: 'Failed to fetch power-ups shop' });
  }
});

/**
 * POST /api/games/power-ups/purchase
 * Purchase a power-up
 */
router.post('/power-ups/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { powerUpCode, quantity = 1 } = req.body;
    const userId = req.userId!;

    if (!powerUpCode) {
      return res.status(400).json({ error: 'Power-up code is required' });
    }

    const result = await gameService.purchasePowerUp(userId, powerUpCode, quantity);

    if (!result.success) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error purchasing power-up:', error);
    res.status(500).json({ error: 'Failed to purchase power-up' });
  }
});

/**
 * POST /api/games/power-ups/use
 * Use a power-up in a game
 */
router.post('/power-ups/use', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, powerUpCode } = req.body;
    const userId = req.userId!;

    if (!sessionId || !powerUpCode) {
      return res.status(400).json({ error: 'Session ID and power-up code are required' });
    }

    // Verify session
    const session = await gameService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await gameService.usePowerUp(userId, powerUpCode);

    if (!result.success) {
      return res.status(400).json({ error: 'Power-up not available' });
    }

    res.json({
      success: true,
      remainingQuantity: result.remaining,
    });
  } catch (error) {
    console.error('Error using power-up:', error);
    res.status(500).json({ error: 'Failed to use power-up' });
  }
});

// ============================================================
// Currency
// ============================================================

/**
 * GET /api/games/currency
 * Get user's currency balance
 */
router.get('/currency/balance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const currency = await gameService.getUserCurrency(userId);
    res.json(currency);
  } catch (error) {
    console.error('Error fetching currency:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

// ============================================================
// Recent Activity
// ============================================================

/**
 * GET /api/games/history
 * Get user's game history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '20' } = req.query;

    const sessions = await gameService.getUserRecentSessions(userId, parseInt(limit as string));
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

export default router;
