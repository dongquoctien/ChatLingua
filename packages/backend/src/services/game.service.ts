import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { petService } from './pet.service.js';

// ============================================================
// Types
// ============================================================

interface GameRow extends RowDataPacket {
  id: number;
  game_code: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  min_vocabulary_required: number;
  unlock_level: number;
  config: string | null;
  created_at: Date;
}

interface GameSessionRow extends RowDataPacket {
  id: number;
  user_id: number;
  game_id: number;
  score: number;
  max_combo: number;
  accuracy: number | null;
  words_correct: number;
  words_wrong: number;
  words_total: number;
  duration_seconds: number | null;
  started_at: Date;
  ended_at: Date | null;
  xp_earned: number;
  coins_earned: number;
  game_data: string | null;
  status: string;
}

interface GameLeaderboardRow extends RowDataPacket {
  id: number;
  user_id: number;
  game_id: number;
  best_score: number;
  best_combo: number;
  best_accuracy: number | null;
  total_plays: number;
  total_time_seconds: number;
  weekly_score: number;
  weekly_plays: number;
  week_start: Date | null;
  daily_score: number;
  daily_plays: number;
  play_date: Date | null;
  all_time_rank: number | null;
  weekly_rank: number | null;
  updated_at: Date;
}

interface GameAchievementRow extends RowDataPacket {
  id: number;
  game_id: number;
  achievement_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  is_hidden: boolean;
}

interface UserGameAchievementRow extends RowDataPacket {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: Date;
  session_id: number | null;
  // Joined from game_achievements
  achievement_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
}

interface PowerUpRow extends RowDataPacket {
  id: number;
  power_up_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  effect_type: string;
  effect_value: number | null;
  coin_cost: number;
  applicable_games: string | null;
}

interface UserPowerUpRow extends RowDataPacket {
  id: number;
  user_id: number;
  power_up_id: number;
  quantity: number;
  // Joined from power_ups
  power_up_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  effect_type: string;
  effect_value: number | null;
  coin_cost: number;
}

interface UserCurrencyRow extends RowDataPacket {
  user_id: number;
  coins: number;
  gems: number;
  updated_at: Date;
}

interface VocabularyRow extends RowDataPacket {
  id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  part_of_speech: string | null;
  difficulty_level: string;
}

interface LeaderboardEntryRow extends RowDataPacket {
  rank: number;
  user_id: number;
  username: string;
  display_name: string | null;
  score: number;
  combo: number | null;
  accuracy: number | null;
}

// ============================================================
// Game Service Class
// ============================================================

class GameService {
  // ============================================================
  // Game Definitions
  // ============================================================

  async getAllGames(): Promise<GameRow[]> {
    const [rows] = await pool.query<GameRow[]>(
      `SELECT * FROM games WHERE is_active = TRUE ORDER BY unlock_level, name`
    );
    return rows;
  }

  async getGameByCode(gameCode: string): Promise<GameRow | null> {
    const [rows] = await pool.query<GameRow[]>(
      `SELECT * FROM games WHERE game_code = ? AND is_active = TRUE`,
      [gameCode]
    );
    return rows[0] || null;
  }

  async getGamesWithUserStats(userId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        g.*,
        COALESCE(gl.total_plays, 0) as total_plays,
        COALESCE(gl.best_score, 0) as best_score,
        COALESCE(gl.best_combo, 0) as best_combo,
        COALESCE(gl.best_accuracy, 0) as best_accuracy,
        ux.current_level >= g.unlock_level as is_unlocked
      FROM games g
      LEFT JOIN game_leaderboards gl ON g.id = gl.game_id AND gl.user_id = ?
      LEFT JOIN user_xp ux ON ux.user_id = ?
      WHERE g.is_active = TRUE
      ORDER BY g.unlock_level, g.name`,
      [userId, userId]
    );

    return rows.map(row => ({
      id: row.id,
      gameCode: row.game_code,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      icon: row.icon,
      color: row.color,
      minVocabularyRequired: row.min_vocabulary_required,
      unlockLevel: row.unlock_level,
      config: row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : null,
      totalPlays: row.total_plays,
      bestScore: row.best_score,
      bestCombo: row.best_combo,
      bestAccuracy: row.best_accuracy,
      isUnlocked: row.is_unlocked ?? true,
    }));
  }

  // ============================================================
  // Game Sessions
  // ============================================================

  async startSession(userId: number, gameId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO game_sessions (user_id, game_id, status) VALUES (?, ?, 'in_progress')`,
      [userId, gameId]
    );
    return result.insertId;
  }

  async getSession(sessionId: number): Promise<GameSessionRow | null> {
    const [rows] = await pool.query<GameSessionRow[]>(
      `SELECT * FROM game_sessions WHERE id = ?`,
      [sessionId]
    );
    return rows[0] || null;
  }

  async updateSessionScore(
    sessionId: number,
    score: number,
    combo: number,
    correct: number,
    wrong: number
  ): Promise<void> {
    await pool.query(
      `UPDATE game_sessions
       SET score = ?, max_combo = GREATEST(max_combo, ?),
           words_correct = ?, words_wrong = ?, words_total = ? + ?
       WHERE id = ?`,
      [score, combo, correct, wrong, correct, wrong, sessionId]
    );
  }

  async endSession(
    sessionId: number,
    finalScore: number,
    maxCombo: number,
    accuracy: number,
    wordsCorrect: number,
    wordsWrong: number,
    durationSeconds: number,
    xpEarned: number,
    coinsEarned: number,
    gameData: any
  ): Promise<GameSessionRow> {
    await pool.query(
      `UPDATE game_sessions
       SET score = ?, max_combo = ?, accuracy = ?,
           words_correct = ?, words_wrong = ?, words_total = ? + ?,
           duration_seconds = ?, xp_earned = ?, coins_earned = ?,
           game_data = ?, status = 'completed', ended_at = NOW()
       WHERE id = ?`,
      [
        finalScore, maxCombo, accuracy,
        wordsCorrect, wordsWrong, wordsCorrect, wordsWrong,
        durationSeconds, xpEarned, coinsEarned,
        JSON.stringify(gameData), sessionId
      ]
    );

    const session = await this.getSession(sessionId);

    // ============================================================
    // Pet Care Integration - Award care points based on game score
    // Higher scores = higher care points for active pet
    // ============================================================
    if (session && session.user_id) {
      try {
        // Use accuracy as score (0-100), fallback to normalized finalScore
        const careScore = accuracy ?? Math.min(100, Math.round((finalScore / 1000) * 100));
        await petService.processCareFromActivity(
          session.user_id,
          'play', // Game activities = play care type
          'game',
          careScore,
          sessionId
        );
      } catch (error) {
        // Don't fail game session if pet care fails
        console.error('Failed to process pet care from game:', error);
      }

      // ============================================================
      // Pet Daily Tasks Integration - Update task progress for games
      // Tracks: win_1_game, win_3_games, high_score_game
      // ============================================================
      try {
        // Consider a game "won" if accuracy >= 50% or score is decent
        const won = (accuracy !== null && accuracy >= 50) || finalScore >= 100;
        await petService.recordActivityForTasks(session.user_id, 'game', {
          won: won,
          scorePoints: finalScore
        });
        console.log(`[Pet Tasks] Updated game task progress: userId=${session.user_id}, won=${won}, score=${finalScore}`);
      } catch (error) {
        console.error('Failed to update pet daily tasks from game:', error);
      }
    }

    return session!;
  }

  async getUserRecentSessions(userId: number, limit: number = 10): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT gs.*, g.game_code, g.name as game_name, g.icon, g.color
       FROM game_sessions gs
       JOIN games g ON gs.game_id = g.id
       WHERE gs.user_id = ? AND gs.status = 'completed'
       ORDER BY gs.ended_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows.map(row => ({
      id: row.id,
      gameCode: row.game_code,
      gameName: row.game_name,
      icon: row.icon,
      color: row.color,
      score: row.score,
      maxCombo: row.max_combo,
      accuracy: row.accuracy,
      wordsCorrect: row.words_correct,
      wordsWrong: row.words_wrong,
      durationSeconds: row.duration_seconds,
      xpEarned: row.xp_earned,
      coinsEarned: row.coins_earned,
      endedAt: row.ended_at,
    }));
  }

  // ============================================================
  // Leaderboards
  // ============================================================

  async updateLeaderboard(
    userId: number,
    gameId: number,
    score: number,
    combo: number,
    accuracy: number
  ): Promise<{ isNewBestScore: boolean; position: number }> {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart();

    // Get current stats
    const [existing] = await pool.query<GameLeaderboardRow[]>(
      `SELECT * FROM game_leaderboards WHERE user_id = ? AND game_id = ?`,
      [userId, gameId]
    );

    const current = existing[0];
    const isNewBestScore = !current || score > current.best_score;

    if (current) {
      // Update existing record
      await pool.query(
        `UPDATE game_leaderboards SET
          best_score = GREATEST(best_score, ?),
          best_combo = GREATEST(best_combo, ?),
          best_accuracy = GREATEST(COALESCE(best_accuracy, 0), ?),
          total_plays = total_plays + 1,
          weekly_score = IF(week_start = ?, weekly_score + ?, ?),
          weekly_plays = IF(week_start = ?, weekly_plays + 1, 1),
          week_start = ?,
          daily_score = IF(play_date = ?, daily_score + ?, ?),
          daily_plays = IF(play_date = ?, daily_plays + 1, 1),
          play_date = ?
        WHERE user_id = ? AND game_id = ?`,
        [
          score, combo, accuracy,
          weekStart, score, score,
          weekStart,
          weekStart,
          today, score, score,
          today,
          today,
          userId, gameId
        ]
      );
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO game_leaderboards
          (user_id, game_id, best_score, best_combo, best_accuracy, total_plays,
           weekly_score, weekly_plays, week_start, daily_score, daily_plays, play_date)
         VALUES (?, ?, ?, ?, ?, 1, ?, 1, ?, ?, 1, ?)`,
        [userId, gameId, score, combo, accuracy, score, weekStart, score, today]
      );
    }

    // Get position
    const position = await this.getLeaderboardPosition(gameId, score);

    return { isNewBestScore, position };
  }

  async getLeaderboardPosition(gameId: number, score: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) + 1 as position FROM game_leaderboards
       WHERE game_id = ? AND best_score > ?`,
      [gameId, score]
    );
    return rows[0]?.position || 1;
  }

  async getLeaderboard(
    gameCode: string,
    period: 'daily' | 'weekly' | 'all_time' = 'all_time',
    limit: number = 10
  ): Promise<any> {
    const game = await this.getGameByCode(gameCode);
    if (!game) return null;

    let scoreColumn: string;
    let orderBy: string;

    switch (period) {
      case 'daily':
        scoreColumn = 'daily_score';
        orderBy = 'gl.daily_score DESC';
        break;
      case 'weekly':
        scoreColumn = 'weekly_score';
        orderBy = 'gl.weekly_score DESC';
        break;
      default:
        scoreColumn = 'best_score';
        orderBy = 'gl.best_score DESC';
    }

    const [rows] = await pool.query<LeaderboardEntryRow[]>(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) as \`rank\`,
        gl.user_id,
        u.username,
        u.display_name,
        gl.${scoreColumn} as score,
        gl.best_combo as combo,
        gl.best_accuracy as accuracy
      FROM game_leaderboards gl
      JOIN users u ON gl.user_id = u.id
      WHERE gl.game_id = ? AND gl.${scoreColumn} > 0
      ORDER BY ${orderBy}
      LIMIT ?`,
      [game.id, limit]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM game_leaderboards WHERE game_id = ? AND ${scoreColumn} > 0`,
      [game.id]
    );

    return {
      gameCode,
      gameName: game.name,
      period,
      entries: rows.map(row => ({
        rank: Number(row.rank),
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        score: row.score,
        combo: row.combo,
        accuracy: row.accuracy,
        isCurrentUser: false,
      })),
      totalParticipants: countResult[0]?.total || 0,
    };
  }

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  // ============================================================
  // Game Achievements
  // ============================================================

  async checkAndUnlockAchievements(
    userId: number,
    gameId: number,
    sessionId: number,
    stats: { score: number; combo: number; accuracy: number; plays: number }
  ): Promise<GameAchievementRow[]> {
    // Get all achievements for this game that user hasn't unlocked
    const [achievements] = await pool.query<GameAchievementRow[]>(
      `SELECT ga.* FROM game_achievements ga
       LEFT JOIN user_game_achievements uga ON ga.id = uga.achievement_id AND uga.user_id = ?
       WHERE ga.game_id = ? AND uga.id IS NULL`,
      [userId, gameId]
    );

    const unlocked: GameAchievementRow[] = [];

    for (const achievement of achievements) {
      let shouldUnlock = false;

      switch (achievement.requirement_type) {
        case 'score':
          shouldUnlock = stats.score >= achievement.requirement_value;
          break;
        case 'combo':
          shouldUnlock = stats.combo >= achievement.requirement_value;
          break;
        case 'accuracy':
          shouldUnlock = stats.accuracy >= achievement.requirement_value;
          break;
        case 'plays':
          shouldUnlock = stats.plays >= achievement.requirement_value;
          break;
      }

      if (shouldUnlock) {
        await pool.query(
          `INSERT INTO user_game_achievements (user_id, achievement_id, session_id)
           VALUES (?, ?, ?)`,
          [userId, achievement.id, sessionId]
        );
        unlocked.push(achievement);
      }
    }

    return unlocked;
  }

  async getUserGameAchievements(userId: number, gameId?: number): Promise<any[]> {
    let query = `
      SELECT uga.*, ga.achievement_code, ga.name, ga.description, ga.icon,
             ga.xp_reward, ga.requirement_type, ga.requirement_value, g.game_code
      FROM user_game_achievements uga
      JOIN game_achievements ga ON uga.achievement_id = ga.id
      JOIN games g ON ga.game_id = g.id
      WHERE uga.user_id = ?
    `;
    const params: any[] = [userId];

    if (gameId) {
      query += ` AND ga.game_id = ?`;
      params.push(gameId);
    }

    query += ` ORDER BY uga.unlocked_at DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      gameCode: row.game_code,
      achievementCode: row.achievement_code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      xpReward: row.xp_reward,
      unlockedAt: row.unlocked_at,
    }));
  }

  // ============================================================
  // Power-ups
  // ============================================================

  async getAllPowerUps(): Promise<PowerUpRow[]> {
    const [rows] = await pool.query<PowerUpRow[]>(`SELECT * FROM power_ups`);
    return rows;
  }

  async getUserPowerUps(userId: number): Promise<any[]> {
    const [rows] = await pool.query<UserPowerUpRow[]>(
      `SELECT up.*, pu.power_up_code, pu.name, pu.description, pu.icon,
              pu.effect_type, pu.effect_value, pu.coin_cost
       FROM user_power_ups up
       JOIN power_ups pu ON up.power_up_id = pu.id
       WHERE up.user_id = ? AND up.quantity > 0`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      powerUpCode: row.power_up_code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      effectType: row.effect_type,
      effectValue: row.effect_value,
      quantity: row.quantity,
      coinCost: row.coin_cost,
    }));
  }

  async usePowerUp(userId: number, powerUpCode: string): Promise<{ success: boolean; remaining: number }> {
    const [powerUps] = await pool.query<PowerUpRow[]>(
      `SELECT * FROM power_ups WHERE power_up_code = ?`,
      [powerUpCode]
    );

    if (!powerUps[0]) {
      return { success: false, remaining: 0 };
    }

    const [userPowerUps] = await pool.query<UserPowerUpRow[]>(
      `SELECT * FROM user_power_ups WHERE user_id = ? AND power_up_id = ?`,
      [userId, powerUps[0].id]
    );

    if (!userPowerUps[0] || userPowerUps[0].quantity < 1) {
      return { success: false, remaining: 0 };
    }

    await pool.query(
      `UPDATE user_power_ups SET quantity = quantity - 1 WHERE user_id = ? AND power_up_id = ?`,
      [userId, powerUps[0].id]
    );

    return { success: true, remaining: userPowerUps[0].quantity - 1 };
  }

  async purchasePowerUp(
    userId: number,
    powerUpCode: string,
    quantity: number = 1
  ): Promise<{ success: boolean; newBalance: number; newQuantity: number }> {
    const [powerUps] = await pool.query<PowerUpRow[]>(
      `SELECT * FROM power_ups WHERE power_up_code = ?`,
      [powerUpCode]
    );

    if (!powerUps[0]) {
      return { success: false, newBalance: 0, newQuantity: 0 };
    }

    const totalCost = powerUps[0].coin_cost * quantity;

    // Check user has enough coins
    const currency = await this.getUserCurrency(userId);
    if (currency.coins < totalCost) {
      return { success: false, newBalance: currency.coins, newQuantity: 0 };
    }

    // Deduct coins
    await this.updateUserCoins(userId, -totalCost, 'power_up', powerUps[0].id, `Purchased ${quantity}x ${powerUps[0].name}`);

    // Add power-ups
    await pool.query(
      `INSERT INTO user_power_ups (user_id, power_up_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, powerUps[0].id, quantity, quantity]
    );

    const [updated] = await pool.query<UserPowerUpRow[]>(
      `SELECT quantity FROM user_power_ups WHERE user_id = ? AND power_up_id = ?`,
      [userId, powerUps[0].id]
    );

    const newCurrency = await this.getUserCurrency(userId);

    return {
      success: true,
      newBalance: newCurrency.coins,
      newQuantity: updated[0]?.quantity || quantity,
    };
  }

  // ============================================================
  // Currency
  // ============================================================

  async getUserCurrency(userId: number): Promise<{ coins: number; gems: number }> {
    const [rows] = await pool.query<UserCurrencyRow[]>(
      `SELECT * FROM user_currency WHERE user_id = ?`,
      [userId]
    );

    if (!rows[0]) {
      // Create default currency for user
      await pool.query(
        `INSERT INTO user_currency (user_id, coins, gems) VALUES (?, 100, 0)`,
        [userId]
      );
      return { coins: 100, gems: 0 };
    }

    return { coins: rows[0].coins, gems: rows[0].gems };
  }

  async updateUserCoins(
    userId: number,
    amount: number,
    source: string,
    sourceId: number | null = null,
    description: string | null = null
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_currency (user_id, coins) VALUES (?, GREATEST(0, ?))
       ON DUPLICATE KEY UPDATE coins = GREATEST(0, coins + ?)`,
      [userId, 100 + amount, amount]
    );

    await pool.query(
      `INSERT INTO currency_transactions (user_id, currency_type, amount, source, source_id, description)
       VALUES (?, 'coins', ?, ?, ?, ?)`,
      [userId, amount, source, sourceId, description]
    );
  }

  // ============================================================
  // Vocabulary for Games
  // ============================================================

  async getVocabularyForGame(
    userId: number,
    count: number,
    difficulty?: string
  ): Promise<VocabularyRow[]> {
    let query = `
      SELECT v.id, v.english_word, v.vietnamese_word, v.phonetic,
             v.pronunciation_uk, v.pronunciation_us, v.part_of_speech, v.difficulty_level
      FROM vocabulary v
      JOIN vocabulary_contexts vc ON v.id = vc.vocabulary_id
      JOIN conversations c ON vc.conversation_id = c.id
      WHERE c.user_id = ?
    `;
    const params: any[] = [userId];

    if (difficulty) {
      query += ` AND v.difficulty_level = ?`;
      params.push(difficulty);
    }

    query += ` GROUP BY v.id ORDER BY RAND() LIMIT ?`;
    params.push(count);

    const [rows] = await pool.query<VocabularyRow[]>(query, params);
    return rows;
  }

  async getVocabularyById(id: number): Promise<VocabularyRow | null> {
    const [rows] = await pool.query<VocabularyRow[]>(
      `SELECT * FROM vocabulary WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // ============================================================
  // Game Stats
  // ============================================================

  async getGameStats(userId: number, gameCode: string): Promise<any> {
    const game = await this.getGameByCode(gameCode);
    if (!game) return null;

    const [leaderboard] = await pool.query<GameLeaderboardRow[]>(
      `SELECT * FROM game_leaderboards WHERE user_id = ? AND game_id = ?`,
      [userId, game.id]
    );

    const [sessions] = await pool.query<RowDataPacket[]>(
      `SELECT AVG(score) as avg_score, SUM(xp_earned) as total_xp
       FROM game_sessions
       WHERE user_id = ? AND game_id = ? AND status = 'completed'`,
      [userId, game.id]
    );

    const achievements = await this.getUserGameAchievements(userId, game.id);

    return {
      gameCode,
      totalPlays: leaderboard[0]?.total_plays || 0,
      bestScore: leaderboard[0]?.best_score || 0,
      bestCombo: leaderboard[0]?.best_combo || 0,
      bestAccuracy: leaderboard[0]?.best_accuracy || null,
      averageScore: Math.round(sessions[0]?.avg_score || 0),
      totalXpEarned: sessions[0]?.total_xp || 0,
      achievements,
    };
  }

  async getGameStatsById(userId: number, gameId: number): Promise<any> {
    const [leaderboard] = await pool.query<GameLeaderboardRow[]>(
      `SELECT * FROM game_leaderboards WHERE user_id = ? AND game_id = ?`,
      [userId, gameId]
    );

    const [sessions] = await pool.query<RowDataPacket[]>(
      `SELECT AVG(score) as avg_score, SUM(xp_earned) as total_xp
       FROM game_sessions
       WHERE user_id = ? AND game_id = ? AND status = 'completed'`,
      [userId, gameId]
    );

    const achievements = await this.getUserGameAchievements(userId, gameId);

    return {
      gameId,
      totalPlays: leaderboard[0]?.total_plays || 0,
      bestScore: leaderboard[0]?.best_score || 0,
      bestCombo: leaderboard[0]?.best_combo || 0,
      bestAccuracy: leaderboard[0]?.best_accuracy || null,
      averageScore: Math.round(sessions[0]?.avg_score || 0),
      totalXpEarned: sessions[0]?.total_xp || 0,
      achievements,
    };
  }

  // ============================================================
  // XP Integration
  // ============================================================

  async awardXP(userId: number, xpAmount: number, sourceId: number, description: string): Promise<void> {
    // Add XP transaction
    await pool.query(
      `INSERT INTO xp_transactions (user_id, xp_amount, source, source_id, description)
       VALUES (?, ?, 'game', ?, ?)`,
      [userId, xpAmount, sourceId, description]
    );

    // Update user XP
    await pool.query(
      `INSERT INTO user_xp (user_id, total_xp, current_level, title, xp_to_next_level)
       VALUES (?, ?, 1, 'Beginner', 100)
       ON DUPLICATE KEY UPDATE total_xp = total_xp + ?`,
      [userId, xpAmount, xpAmount]
    );

    // Check for level up
    await this.checkLevelUp(userId);

    // Also add XP to user's active egg for hatching progress
    try {
      await petService.addHatchXpToActiveEgg(userId, xpAmount, 'game');
    } catch (error) {
      // Don't fail XP award if egg XP fails
      console.error('Failed to add hatch XP to egg from game:', error);
    }
  }

  private async checkLevelUp(userId: number): Promise<void> {
    const [userXp] = await pool.query<RowDataPacket[]>(
      `SELECT ux.*, ld.level, ld.title, ld.xp_required,
              (SELECT MIN(xp_required) FROM level_definitions WHERE xp_required > ux.total_xp) as next_level_xp
       FROM user_xp ux
       LEFT JOIN level_definitions ld ON ux.total_xp >= ld.xp_required
       WHERE ux.user_id = ?
       ORDER BY ld.level DESC
       LIMIT 1`,
      [userId]
    );

    if (userXp[0] && userXp[0].level > userXp[0].current_level) {
      await pool.query(
        `UPDATE user_xp SET current_level = ?, title = ?,
         xp_to_next_level = COALESCE(?, 0) - total_xp
         WHERE user_id = ?`,
        [userXp[0].level, userXp[0].title, userXp[0].next_level_xp, userId]
      );
    }
  }
}

export const gameService = new GameService();
