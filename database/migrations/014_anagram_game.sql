-- Migration: Add Anagram Master Game (Phase 2 Complete)
-- Adds anagram game with achievements

-- ============================================================
-- Step 1: Add Anagram Game
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('anagram', 'Anagram Master', 'Unscramble the letters to form the correct English word! Use Vietnamese hints to help you guess.', 'puzzle', 'medium', 'fa-random', '#9333EA', 1, '{"wordsPerGame": 10, "hintCost": 15, "shuffleEnabled": true, "timeBonus": true}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 2: Add Achievements for Anagram
-- ============================================================
SET @anagram_id = (SELECT id FROM games WHERE game_code = 'anagram');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@anagram_id, 'ag_first_play', 'Letter Shuffler', 'Complete your first anagram game', 'fa-play', 10, 'plays', 1),
(@anagram_id, 'ag_no_hints', 'Sharp Mind', 'Complete a game without using any hints', 'fa-brain', 50, 'special', 0),
(@anagram_id, 'ag_score_500', 'Anagram Expert', 'Score 500 points in one game', 'fa-star', 75, 'score', 500),
(@anagram_id, 'ag_score_1000', 'Word Wizard', 'Score 1000 points in one game', 'fa-wand-magic-sparkles', 150, 'score', 1000),
(@anagram_id, 'ag_perfect', 'Perfect Unscrambler', 'Complete all words correctly in one game', 'fa-check-double', 100, 'accuracy', 100),
(@anagram_id, 'ag_fast_solve', 'Quick Thinker', 'Complete a game in under 2 minutes', 'fa-stopwatch', 100, 'special', 120),
(@anagram_id, 'ag_plays_10', 'Anagram Enthusiast', 'Complete 10 games', 'fa-trophy', 75, 'plays', 10),
(@anagram_id, 'ag_plays_50', 'Anagram Master', 'Complete 50 games', 'fa-crown', 200, 'plays', 50),
(@anagram_id, 'ag_long_word', 'Long Word Solver', 'Correctly solve a word with 8+ letters', 'fa-spell-check', 50, 'special', 8)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 3: Update Power-ups for Anagram game
-- ============================================================
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'anagram'
)
WHERE power_up_code = 'hint';

UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'anagram'
)
WHERE power_up_code = 'skip';
