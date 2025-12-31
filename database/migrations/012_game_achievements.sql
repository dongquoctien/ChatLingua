-- Migration: Game Achievements
-- Adds game-specific achievements for the games hub

-- ============================================================
-- Step 1: Alter achievements table to add 'game' category
-- ============================================================
ALTER TABLE achievements
MODIFY COLUMN category ENUM('learning', 'streak', 'quiz', 'speed', 'milestone', 'game') NOT NULL;

-- ============================================================
-- Step 2: Seed Game Achievement Definitions
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
-- First Game Achievements
('GAME_FIRST', 'Game On!', 'Play your first game', 'game', 'fa-gamepad', 15, 100, FALSE),
('GAME_10', 'Gamer', 'Play 10 games', 'game', 'fa-dice', 30, 101, FALSE),
('GAME_50', 'Game Enthusiast', 'Play 50 games', 'game', 'fa-trophy', 75, 102, FALSE),
('GAME_100', 'Game Master', 'Play 100 games', 'game', 'fa-crown', 150, 103, FALSE),

-- High Score Achievements
('GAME_SCORE_1000', 'Rising Star', 'Score 1,000 points in any game', 'game', 'fa-star', 25, 110, FALSE),
('GAME_SCORE_5000', 'Score Hunter', 'Score 5,000 points in any game', 'game', 'fa-star-half-stroke', 50, 111, FALSE),
('GAME_SCORE_10000', 'Score Champion', 'Score 10,000 points in any game', 'game', 'fa-ranking-star', 100, 112, FALSE),

-- Perfect Game Achievements
('GAME_PERFECT', 'Flawless', 'Get 100% accuracy in any game', 'game', 'fa-check-double', 40, 120, FALSE),
('GAME_PERFECT_3', 'Perfectionist', 'Get 100% accuracy in 3 different games', 'game', 'fa-award', 100, 121, FALSE),
('GAME_PERFECT_10', 'Perfect Master', 'Get 100% accuracy in 10 games', 'game', 'fa-medal', 200, 122, TRUE),

-- Speed Game Achievements
('GAME_SPEED_WIN', 'Quick Thinker', 'Win a speed game (Word Rush, Falling Words)', 'game', 'fa-bolt', 30, 130, FALSE),
('GAME_SPEED_MASTER', 'Speed Demon', 'Win 10 speed games', 'game', 'fa-bolt-lightning', 75, 131, FALSE),

-- Word Rush Specific
('WORD_RUSH_50', 'Rush Hour', 'Answer 50 words correctly in Word Rush', 'game', 'fa-clock', 40, 140, FALSE),
('WORD_RUSH_100', 'Rush Legend', 'Answer 100 words correctly in Word Rush', 'game', 'fa-stopwatch', 80, 141, FALSE),

-- Memory Match Specific
('MEMORY_MATCH_WIN', 'Sharp Memory', 'Complete Memory Match game', 'game', 'fa-brain', 25, 150, FALSE),
('MEMORY_MATCH_FAST', 'Memory Master', 'Complete Memory Match in under 2 minutes', 'game', 'fa-lightbulb', 50, 151, FALSE),

-- Crossword Specific
('CROSSWORD_COMPLETE', 'Word Weaver', 'Complete a Crossword puzzle', 'game', 'fa-puzzle-piece', 30, 160, FALSE),
('CROSSWORD_NO_HINTS', 'No Help Needed', 'Complete Crossword without using hints', 'game', 'fa-user-graduate', 60, 161, TRUE),

-- Falling Words Specific
('FALLING_WORDS_100', 'Word Catcher', 'Catch 100 falling words', 'game', 'fa-hand-holding-heart', 40, 170, FALSE),
('FALLING_WORDS_SURVIVAL', 'Survival Expert', 'Survive 3 minutes in Falling Words', 'game', 'fa-shield', 60, 171, FALSE),

-- Word Duel Specific
('WORD_DUEL_WIN', 'Duelist', 'Win a Word Duel', 'game', 'fa-swords', 30, 180, FALSE),
('WORD_DUEL_WIN_10', 'Champion Duelist', 'Win 10 Word Duels', 'game', 'fa-chess-king', 75, 181, FALSE),
('WORD_DUEL_FLAWLESS', 'Undefeated', 'Win a Word Duel without losing a round', 'game', 'fa-shield-halved', 100, 182, TRUE),

-- Word Cards TCG Specific
('WORD_CARDS_BATTLE', 'Card Battler', 'Win a Word Cards battle', 'game', 'fa-clone', 30, 190, FALSE),
('WORD_CARDS_COLLECTION', 'Card Collector', 'Collect 20 cards in Word Cards', 'game', 'fa-layer-group', 50, 191, FALSE),
('WORD_CARDS_LEGENDARY', 'Legendary Pull', 'Pull a Legendary card in Word Cards', 'game', 'fa-gem', 100, 192, TRUE),

-- Vocabulary Quest Specific
('VOCAB_QUEST_STAGE', 'Quest Starter', 'Complete a stage in Vocabulary Quest', 'game', 'fa-map', 25, 200, FALSE),
('VOCAB_QUEST_BOSS', 'Boss Slayer', 'Defeat a boss in Vocabulary Quest', 'game', 'fa-dragon', 75, 201, FALSE),
('VOCAB_QUEST_ALL_STAGES', 'Quest Champion', 'Complete all stages in Vocabulary Quest', 'game', 'fa-flag-checkered', 150, 202, TRUE),

-- Combo & Streak Achievements
('GAME_COMBO_10', 'Combo Starter', 'Get a 10-combo in any game', 'game', 'fa-fire', 30, 210, FALSE),
('GAME_COMBO_25', 'Combo King', 'Get a 25-combo in any game', 'game', 'fa-fire-flame-curved', 60, 211, FALSE),
('GAME_COMBO_50', 'Combo Legend', 'Get a 50-combo in any game', 'game', 'fa-meteor', 120, 212, TRUE),

-- Variety Achievements
('GAME_ALL_TYPES', 'Jack of All Games', 'Play all game types at least once', 'game', 'fa-dice-d20', 100, 220, FALSE),
('GAME_DAILY_3', 'Daily Gamer', 'Play 3 different games in one day', 'game', 'fa-calendar-day', 40, 221, FALSE),

-- Total Score Achievements
('GAME_TOTAL_10000', 'Point Collector', 'Earn 10,000 total game points', 'game', 'fa-coins', 50, 230, FALSE),
('GAME_TOTAL_50000', 'Point Hoarder', 'Earn 50,000 total game points', 'game', 'fa-sack-dollar', 100, 231, FALSE),
('GAME_TOTAL_100000', 'Point Millionaire', 'Earn 100,000 total game points', 'game', 'fa-money-bill-trend-up', 200, 232, TRUE)

ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 3: Update xp_transactions to support game source
-- ============================================================
ALTER TABLE xp_transactions
MODIFY COLUMN source ENUM('exercise', 'quiz', 'review', 'streak', 'achievement', 'challenge', 'bonus', 'game') NOT NULL;

-- ============================================================
-- Step 4: Add games_played to weekly_leaderboards
-- ============================================================
ALTER TABLE weekly_leaderboards
ADD COLUMN games_played INT DEFAULT 0 AFTER quizzes_completed;
