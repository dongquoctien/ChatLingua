-- Migration: Add Crossword and Word Search Games (Phase 1 - Puzzle)
-- Adds crossword and word_search games with achievements

-- ============================================================
-- Step 1: Add Crossword Game
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('crossword', 'Crossword', 'Fill in the crossword grid using Vietnamese clues to find English words. Daily puzzles with hints!', 'puzzle', 'medium', 'fa-th', '#6B8E23', 1, '{"gridSize": 10, "hintCost": 25, "timeBonus": true}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 2: Add Word Search Game
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('word_search', 'Word Search', 'Find hidden English words in the grid! Words can be horizontal, vertical, or diagonal.', 'puzzle', 'easy', 'fa-search', '#20B2AA', 1, '{"gridSize": 12, "directions": ["horizontal", "vertical", "diagonal", "diagonal-up"], "timeBonus": true}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 3: Add Achievements for Crossword
-- ============================================================
SET @crossword_id = (SELECT id FROM games WHERE game_code = 'crossword');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@crossword_id, 'cw_first_play', 'Puzzle Starter', 'Complete your first crossword puzzle', 'fa-play', 10, 'plays', 1),
(@crossword_id, 'cw_no_hints', 'No Hints Needed', 'Complete a puzzle without using any hints', 'fa-brain', 50, 'special', 0),
(@crossword_id, 'cw_score_500', 'Crossword Expert', 'Score 500 points in one puzzle', 'fa-star', 75, 'score', 500),
(@crossword_id, 'cw_fast_solve', 'Speed Solver', 'Complete a puzzle in under 3 minutes', 'fa-stopwatch', 100, 'special', 180),
(@crossword_id, 'cw_plays_10', 'Crossword Enthusiast', 'Complete 10 puzzles', 'fa-trophy', 75, 'plays', 10),
(@crossword_id, 'cw_plays_50', 'Crossword Master', 'Complete 50 puzzles', 'fa-crown', 200, 'plays', 50),
(@crossword_id, 'cw_accuracy_100', 'Perfect Grid', 'Complete a puzzle with 100% accuracy on first check', 'fa-check-double', 100, 'accuracy', 100)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 4: Add Achievements for Word Search
-- ============================================================
SET @word_search_id = (SELECT id FROM games WHERE game_code = 'word_search');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@word_search_id, 'ws_first_play', 'Word Hunter', 'Complete your first word search puzzle', 'fa-play', 10, 'plays', 1),
(@word_search_id, 'ws_find_all', 'Eagle Eye', 'Find all words in a puzzle', 'fa-eye', 25, 'accuracy', 100),
(@word_search_id, 'ws_no_hints', 'Sharp Vision', 'Complete a puzzle without hints', 'fa-lightbulb', 50, 'special', 0),
(@word_search_id, 'ws_score_500', 'Word Finder Pro', 'Score 500 points in one puzzle', 'fa-star', 75, 'score', 500),
(@word_search_id, 'ws_fast_find', 'Quick Finder', 'Find all words in under 2 minutes', 'fa-stopwatch', 100, 'special', 120),
(@word_search_id, 'ws_plays_10', 'Search Expert', 'Complete 10 puzzles', 'fa-trophy', 75, 'plays', 10),
(@word_search_id, 'ws_plays_50', 'Word Search Master', 'Complete 50 puzzles', 'fa-crown', 200, 'plays', 50)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 5: Update Power-ups for new games
-- ============================================================
-- Add hint power-up support for crossword and word_search
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'crossword'
)
WHERE power_up_code = 'hint';

UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'word_search'
)
WHERE power_up_code = 'hint';
