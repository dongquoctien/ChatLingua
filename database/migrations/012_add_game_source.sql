-- Migration: Add 'game' to xp_transactions source enum
-- Allows game sessions to record XP transactions

-- Add 'game' to the source enum
ALTER TABLE xp_transactions MODIFY COLUMN source ENUM('exercise', 'quiz', 'review', 'streak', 'achievement', 'challenge', 'bonus', 'game') NOT NULL;
