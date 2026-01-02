import pool from '../config/database.js';
import type { ResultSetHeader } from 'mysql2';
import {
  ForumRank,
  BadgeInfo,
  BadgeRow,
  ReputationRow,
  CountRow,
  RANK_THRESHOLDS,
  FORUM_XP_REWARDS,
} from '../types/forum.types.js';

// ============================================================
// Reputation Service Class
// ============================================================

export class ReputationService {
  // --------------------------------------------------------
  // Reputation Management
  // --------------------------------------------------------

  /**
   * Get or create reputation record for a user
   */
  async getOrCreateReputation(userId: number): Promise<ReputationRow> {
    // Try to get existing reputation
    const [rows] = await pool.execute<ReputationRow[]>(
      `SELECT * FROM forum_reputation WHERE user_id = ?`,
      [userId]
    );

    if (rows.length > 0) {
      return rows[0];
    }

    // Create new reputation record
    await pool.execute(
      `INSERT INTO forum_reputation (user_id, reputation, \`rank\`) VALUES (?, 0, 'newcomer')`,
      [userId]
    );

    const [newRows] = await pool.execute<ReputationRow[]>(
      `SELECT * FROM forum_reputation WHERE user_id = ?`,
      [userId]
    );

    return newRows[0];
  }

  /**
   * Update reputation points and check for rank changes
   */
  async updateReputation(
    userId: number,
    change: number,
    reason: 'upvote' | 'downvote' | 'import' | 'post' | 'comment'
  ): Promise<{ newReputation: number; newRank: ForumRank; rankChanged: boolean; newBadges: BadgeInfo[] }> {
    await this.getOrCreateReputation(userId);

    // Update reputation based on reason
    let updateField = '';
    switch (reason) {
      case 'upvote':
        updateField = 'total_upvotes_received = total_upvotes_received + 1';
        break;
      case 'downvote':
        updateField = 'total_downvotes_received = total_downvotes_received + 1';
        break;
      case 'import':
        updateField = 'total_imports = total_imports + 1';
        break;
      case 'post':
        updateField = 'total_posts = total_posts + 1';
        break;
      case 'comment':
        updateField = 'total_comments = total_comments + 1';
        break;
    }

    // Update reputation and counter
    await pool.execute(
      `UPDATE forum_reputation
       SET reputation = GREATEST(0, reputation + ?), ${updateField}
       WHERE user_id = ?`,
      [change, userId]
    );

    // Get updated reputation
    const [rows] = await pool.execute<ReputationRow[]>(
      `SELECT * FROM forum_reputation WHERE user_id = ?`,
      [userId]
    );

    const reputation = rows[0];
    const oldRank = reputation.rank;

    // Calculate new rank
    const newRank = this.calculateRank(reputation.reputation);
    const rankChanged = oldRank !== newRank;

    if (rankChanged) {
      await pool.execute(
        `UPDATE forum_reputation SET \`rank\` = ? WHERE user_id = ?`,
        [newRank, userId]
      );

      // Create notification for rank up
      if (this.getRankOrder(newRank) > this.getRankOrder(oldRank)) {
        await this.createNotification(userId, {
          notificationType: 'forum_rank_up',
          title: 'Rank Up!',
          message: `Congratulations! You are now a ${this.formatRankName(newRank)}!`,
          icon: 'fa-arrow-up',
          actionUrl: '/forum/my-posts',
          metadata: {
            oldRank,
            newRank,
            reputation: reputation.reputation,
          },
        });
      }
    }

    // Check for new badges
    const newBadges = await this.checkAndAwardBadges(userId);

    return {
      newReputation: reputation.reputation,
      newRank,
      rankChanged,
      newBadges,
    };
  }

  /**
   * Calculate rank based on reputation
   */
  calculateRank(reputation: number): ForumRank {
    if (reputation >= RANK_THRESHOLDS.legend) return 'legend';
    if (reputation >= RANK_THRESHOLDS.master) return 'master';
    if (reputation >= RANK_THRESHOLDS.expert) return 'expert';
    if (reputation >= RANK_THRESHOLDS.trusted_contributor) return 'trusted_contributor';
    if (reputation >= RANK_THRESHOLDS.active_contributor) return 'active_contributor';
    if (reputation >= RANK_THRESHOLDS.contributor) return 'contributor';
    return 'newcomer';
  }

  /**
   * Get rank order for comparison
   */
  private getRankOrder(rank: ForumRank): number {
    const order: Record<ForumRank, number> = {
      newcomer: 0,
      contributor: 1,
      active_contributor: 2,
      trusted_contributor: 3,
      expert: 4,
      master: 5,
      legend: 6,
    };
    return order[rank];
  }

  /**
   * Format rank name for display
   */
  private formatRankName(rank: ForumRank): string {
    const names: Record<ForumRank, string> = {
      newcomer: 'Newcomer',
      contributor: 'Contributor',
      active_contributor: 'Active Contributor',
      trusted_contributor: 'Trusted Contributor',
      expert: 'Expert',
      master: 'Master',
      legend: 'Legend',
    };
    return names[rank];
  }

  // --------------------------------------------------------
  // Badge Management
  // --------------------------------------------------------

  /**
   * Check and award any badges the user has earned
   */
  async checkAndAwardBadges(userId: number): Promise<BadgeInfo[]> {
    const reputation = await this.getOrCreateReputation(userId);
    // Handle badges - could be null, string, or already parsed array
    let existingBadges: number[] = [];
    if (reputation.badges) {
      if (typeof reputation.badges === 'string') {
        existingBadges = JSON.parse(reputation.badges);
      } else if (Array.isArray(reputation.badges)) {
        existingBadges = reputation.badges;
      }
    }

    // Get all active badges
    const [badges] = await pool.execute<BadgeRow[]>(
      `SELECT * FROM forum_badges WHERE is_active = TRUE`
    );

    const newlyEarnedBadges: BadgeInfo[] = [];

    for (const badge of badges) {
      // Skip if already earned
      if (existingBadges.includes(badge.id)) continue;

      let earned = false;

      switch (badge.requirement_type) {
        case 'posts_count':
          earned = reputation.total_posts >= badge.requirement_value;
          break;
        case 'imports_count':
          earned = reputation.total_imports >= badge.requirement_value;
          break;
        case 'upvotes_count':
          earned = reputation.total_upvotes_received >= badge.requirement_value;
          break;
        case 'reputation':
          earned = reputation.reputation >= badge.requirement_value;
          break;
        case 'special':
          // Special badges are awarded manually
          break;
      }

      if (earned) {
        existingBadges.push(badge.id);
        newlyEarnedBadges.push({
          id: badge.id,
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          rarity: badge.rarity,
          earnedAt: new Date().toISOString(),
        });
      }
    }

    // Update badges in database if any new ones earned
    if (newlyEarnedBadges.length > 0) {
      await pool.execute(
        `UPDATE forum_reputation SET badges = ? WHERE user_id = ?`,
        [JSON.stringify(existingBadges), userId]
      );

      // Create notification for each new badge
      for (const badge of newlyEarnedBadges) {
        await this.createNotification(userId, {
          notificationType: 'forum_badge_earned',
          title: 'New Badge Earned!',
          message: `You earned the "${badge.name}" badge: ${badge.description}`,
          icon: badge.icon,
          actionUrl: '/forum/my-posts',
          metadata: {
            badgeId: badge.id,
            badgeCode: badge.code,
            badgeName: badge.name,
            badgeRarity: badge.rarity,
          },
        });
      }
    }

    return newlyEarnedBadges;
  }

  /**
   * Get all badges for a user
   */
  async getUserBadges(userId: number): Promise<BadgeInfo[]> {
    const reputation = await this.getOrCreateReputation(userId);
    // Handle badges - could be null, string, or already parsed array
    let badgeIds: number[] = [];
    if (reputation.badges) {
      if (typeof reputation.badges === 'string') {
        badgeIds = JSON.parse(reputation.badges);
      } else if (Array.isArray(reputation.badges)) {
        badgeIds = reputation.badges;
      }
    }

    if (badgeIds.length === 0) return [];

    const placeholders = badgeIds.map(() => '?').join(',');
    const [badges] = await pool.execute<BadgeRow[]>(
      `SELECT * FROM forum_badges WHERE id IN (${placeholders})`,
      badgeIds
    );

    return badges.map(badge => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      rarity: badge.rarity,
    }));
  }

  /**
   * Get all available badges
   */
  async getAllBadges(): Promise<BadgeInfo[]> {
    const [badges] = await pool.execute<BadgeRow[]>(
      `SELECT * FROM forum_badges WHERE is_active = TRUE ORDER BY requirement_type, requirement_value`
    );

    return badges.map(badge => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      rarity: badge.rarity,
    }));
  }

  // --------------------------------------------------------
  // Leaderboard
  // --------------------------------------------------------

  /**
   * Get forum leaderboard
   */
  async getLeaderboard(
    period: 'week' | 'month' | 'all' = 'all',
    limit: number = 10
  ): Promise<{
    rank: number;
    userId: number;
    username: string;
    displayName: string;
    avatar?: string;
    reputation: number;
    forumRank: ForumRank;
    totalPosts: number;
    totalImports: number;
    badges: BadgeInfo[];
  }[]> {
    const safeLimit = Math.min(100, Math.max(1, limit));

    // For period-based leaderboard, we'd need to track reputation changes over time
    // For now, just return all-time leaderboard
    const [rows] = await pool.execute<(ReputationRow & { username: string; display_name: string; avatar: string | null })[]>(
      `SELECT fr.*, u.username, u.username as display_name, NULL as avatar
       FROM forum_reputation fr
       JOIN users u ON fr.user_id = u.id
       ORDER BY fr.reputation DESC
       LIMIT ${safeLimit}`
    );

    const leaderboard = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const badges = await this.getUserBadges(row.user_id);

      leaderboard.push({
        rank: i + 1,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatar: row.avatar || undefined,
        reputation: row.reputation,
        forumRank: row.rank,
        totalPosts: row.total_posts,
        totalImports: row.total_imports,
        badges,
      });
    }

    return leaderboard;
  }

  // --------------------------------------------------------
  // XP Integration
  // --------------------------------------------------------

  /**
   * Award XP for forum actions (integrates with gamification system)
   */
  async awardForumXP(userId: number, action: keyof typeof FORUM_XP_REWARDS): Promise<number> {
    const xp = FORUM_XP_REWARDS[action];
    if (xp === 0) return 0;

    // Update user XP in the gamification system
    await pool.execute(
      `UPDATE user_xp SET total_xp = total_xp + ?, weekly_xp = weekly_xp + ? WHERE user_id = ?`,
      [xp, xp, userId]
    );

    return xp;
  }

  // --------------------------------------------------------
  // Stats
  // --------------------------------------------------------

  /**
   * Get user's forum stats
   */
  async getUserForumStats(userId: number): Promise<{
    reputation: number;
    rank: ForumRank;
    totalPosts: number;
    totalImportsReceived: number;
    totalUpvotesReceived: number;
    totalDownvotesReceived: number;
    totalComments: number;
    badges: BadgeInfo[];
  }> {
    const reputation = await this.getOrCreateReputation(userId);
    const badges = await this.getUserBadges(userId);

    return {
      reputation: reputation.reputation,
      rank: reputation.rank,
      totalPosts: reputation.total_posts,
      totalImportsReceived: reputation.total_imports,
      totalUpvotesReceived: reputation.total_upvotes_received,
      totalDownvotesReceived: reputation.total_downvotes_received,
      totalComments: reputation.total_comments,
      badges,
    };
  }

  // --------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------

  private async createNotification(
    userId: number,
    notification: {
      notificationType: string;
      title: string;
      message: string;
      icon?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await pool.execute(
      `INSERT INTO notification_queue
       (user_id, notification_type, title, message, icon, action_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        notification.notificationType,
        notification.title,
        notification.message,
        notification.icon || null,
        notification.actionUrl || null,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
      ]
    );
  }
}

export const reputationService = new ReputationService();
