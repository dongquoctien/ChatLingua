-- Migration: Add Falling Words Game (Phase 2)
-- Adds falling_words game and its achievements

-- ============================================================
-- Step 1: Add Falling Words Game
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('falling_words', 'Falling Words', 'Type Vietnamese translations before English words hit the ground! Speed increases over time.', 'speed', 'medium', 'fa-arrow-down', '#DDA0DD', 1, '{"baseSpeed": 40, "maxWords": 6, "lives": 3, "levelUpInterval": 15}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 2: Add Power-ups for Falling Words
-- ============================================================
-- Update existing power-ups to include falling_words
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'falling_words'
)
WHERE power_up_code = 'freeze';

-- Add slow and bomb power-ups for Falling Words
INSERT INTO power_ups (power_up_code, name, description, icon, effect_type, effect_value, coin_cost, applicable_games) VALUES
('slow', 'Slow Motion', 'Slow down all falling words for 8 seconds', 'fa-hourglass-half', 'slow', 8, 60, '["falling_words"]'),
('bomb', 'Word Bomb', 'Clear all words on screen instantly', 'fa-bomb', 'clear', 1, 80, '["falling_words"]')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 3: Add Achievements for Falling Words
-- ============================================================
-- Get the game_id for falling_words (assuming it's 5 if inserted in order)
SET @falling_words_id = (SELECT id FROM games WHERE game_code = 'falling_words');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@falling_words_id, 'fw_first_play', 'Falling Into Learning', 'Play Falling Words for the first time', 'fa-play', 10, 'plays', 1),
(@falling_words_id, 'fw_score_200', 'Quick Typer', 'Score 200 points in one game', 'fa-keyboard', 25, 'score', 200),
(@falling_words_id, 'fw_score_500', 'Speed Typer', 'Score 500 points in one game', 'fa-fire', 75, 'score', 500),
(@falling_words_id, 'fw_score_1000', 'Lightning Fingers', 'Score 1000 points in one game', 'fa-bolt', 150, 'score', 1000),
(@falling_words_id, 'fw_combo_15', 'Combo King', 'Achieve a 15x combo', 'fa-link', 50, 'combo', 15),
(@falling_words_id, 'fw_no_miss', 'Perfect Catch', 'Complete a game without missing any words', 'fa-check-double', 100, 'accuracy', 100),
(@falling_words_id, 'fw_level_5', 'Level Master', 'Reach level 5 in a single game', 'fa-level-up-alt', 75, 'special', 5),
(@falling_words_id, 'fw_plays_25', 'Word Catcher', 'Play 25 games', 'fa-repeat', 100, 'plays', 25),
(@falling_words_id, 'fw_plays_100', 'Falling Words Expert', 'Play 100 games', 'fa-crown', 250, 'plays', 100)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
