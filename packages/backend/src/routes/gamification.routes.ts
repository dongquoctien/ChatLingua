import { Router, Response } from 'express';
import { gamificationService } from '../services/gamification.service.js';
import { challengeService } from '../services/challenge.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// XP & Level Endpoints
// ============================================================

/**
 * GET /api/gamification/xp
 * Get user's XP and level information
 */
router.get('/xp', async (req: AuthRequest, res: Response) => {
  try {
    const xp = await gamificationService.getUserXP(req.userId!);
    res.json(xp);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get XP info';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/xp/history
 * Get XP transaction history
 */
router.get('/xp/history', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const history = await gamificationService.getXPHistory(req.userId!, limit);
    res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get XP history';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/levels
 * Get level definitions
 */
router.get('/levels', async (req: AuthRequest, res: Response) => {
  try {
    const levels = await gamificationService.getLevelDefinitions();
    res.json(levels);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get level definitions';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Achievement Endpoints
// ============================================================

/**
 * GET /api/gamification/achievements
 * Get all achievements with user progress
 */
router.get('/achievements', async (req: AuthRequest, res: Response) => {
  try {
    const achievements = await gamificationService.getUserAchievements(req.userId!);

    // Separate unlocked and locked achievements
    const unlocked = achievements.filter(a => a.isUnlocked);
    const locked = achievements.filter(a => !a.isUnlocked && !a.achievement.isHidden);
    const hidden = achievements.filter(a => !a.isUnlocked && a.achievement.isHidden);

    res.json({
      unlocked,
      locked,
      hiddenCount: hidden.length,
      totalUnlocked: unlocked.length,
      totalAchievements: achievements.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get achievements';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/achievements/recent
 * Get recently unlocked achievements
 */
router.get('/achievements/recent', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const achievements = await gamificationService.getUserAchievements(req.userId!);

    const recent = achievements
      .filter(a => a.isUnlocked)
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    res.json(recent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent achievements';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/gamification/achievements/:id/seen
 * Mark an achievement notification as seen
 */
router.post('/achievements/:id/seen', async (req: AuthRequest, res: Response) => {
  try {
    const achievementId = parseInt(req.params.id);
    if (isNaN(achievementId)) {
      res.status(400).json({ error: 'Invalid achievement ID' });
      return;
    }

    await gamificationService.markAchievementNotified(req.userId!, achievementId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark achievement as seen';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/gamification/achievements/game
 * Check and award game achievements after game completion
 */
router.post('/achievements/game', async (req: AuthRequest, res: Response) => {
  try {
    const {
      gameCode,
      score,
      accuracy,
      combo,
      wordsCorrect,
      timeSeconds,
      isWin,
      noHints,
      cardCount,
      isLegendary,
      stageCompleted,
      bossDefeated,
      allStagesComplete,
      flawless,
    } = req.body;

    if (!gameCode || score === undefined) {
      res.status(400).json({ error: 'gameCode and score are required' });
      return;
    }

    // Award XP for game completion
    const xpAmount = Math.floor(score / 10); // 1 XP per 10 points
    const { newTotal, levelUp } = await gamificationService.awardXP(
      req.userId!,
      xpAmount,
      'game',
      undefined,
      gameCode
    );

    // Check game achievements
    const achievements = await gamificationService.checkGameAchievements(req.userId!, {
      gameCode,
      score,
      accuracy,
      combo,
      wordsCorrect,
      timeSeconds,
      isWin,
      noHints,
      cardCount,
      isLegendary,
      stageCompleted,
      bossDefeated,
      allStagesComplete,
      flawless,
    });

    res.json({
      xpAwarded: xpAmount,
      totalXp: newTotal,
      levelUp,
      achievements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check game achievements';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Daily Challenge Endpoints
// ============================================================

/**
 * GET /api/gamification/challenges
 * Get today's challenges
 */
router.get('/challenges', async (req: AuthRequest, res: Response) => {
  try {
    const challenges = await challengeService.getTodaysChallenges(req.userId!);
    res.json(challenges);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get challenges';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/challenges/history
 * Get challenge history
 */
router.get('/challenges/history', async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);
    const history = await challengeService.getChallengeHistory(req.userId!, days);
    res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get challenge history';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/challenges/stats
 * Get challenge statistics
 */
router.get('/challenges/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await challengeService.getChallengeStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get challenge stats';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Leaderboard Endpoints
// ============================================================

/**
 * GET /api/gamification/leaderboard
 * Get weekly leaderboard
 */
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const leaderboard = await gamificationService.getWeeklyLeaderboard(req.userId!, limit);
    res.json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get leaderboard';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Notification Endpoints
// ============================================================

/**
 * GET /api/gamification/notifications
 * Get user notifications
 */
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const notifications = await gamificationService.getNotifications(req.userId!, unreadOnly, limit);
    res.json(notifications);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get notifications';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gamification/notifications/badge
 * Get notification badge (unread counts)
 */
router.get('/notifications/badge', async (req: AuthRequest, res: Response) => {
  try {
    const badge = await gamificationService.getNotificationBadge(req.userId!);
    res.json(badge);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get notification badge';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/gamification/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    await gamificationService.markNotificationRead(req.userId!, notificationId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/gamification/notifications/read-all
 * Mark all notifications as read
 */
router.post('/notifications/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await gamificationService.markAllNotificationsRead(req.userId!);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Summary Endpoint
// ============================================================

/**
 * GET /api/gamification/summary
 * Get complete gamification summary for dashboard
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await gamificationService.getGamificationSummary(req.userId!);

    // Also get today's challenges
    const challenges = await challengeService.getTodaysChallenges(req.userId!);
    summary.todaysChallenges = challenges;

    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get gamification summary';
    res.status(500).json({ error: message });
  }
});

export default router;
