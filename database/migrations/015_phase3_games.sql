-- Migration: Add Phase 3 Competitive Games
-- Adds Word Duel (AI), Pop Quiz Blitz, and Translation Race games with achievements

-- ============================================================
-- Step 1: Add Phase 3 Games
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('word_duel', 'Word Duel', 'Battle against AI opponents in vocabulary showdowns! Choose your opponent and prove your word mastery.', 'competitive', 'medium', 'fa-swords', '#E74C3C', 3, '{"roundsPerGame": 10, "roundTimeLimit": 10, "aiOpponents": ["Rookie Bot", "Study Buddy", "Word Master", "Linguist Pro"]}'),
('pop_quiz_blitz', 'Pop Quiz Blitz', 'Tap the correct answer bubbles before they float away! Test your reflexes and vocabulary.', 'speed', 'medium', 'fa-circle', '#3498DB', 3, '{"questionsPerGame": 15, "initialLives": 3, "bubbleSpeed": 0.4}'),
('translation_race', 'Translation Race', 'Race against the clock to translate words! Type fast and accurate to earn bonus points.', 'competitive', 'medium', 'fa-flag-checkered', '#2ECC71', 3, '{"sentencesPerGame": 10, "timePerSentence": 30, "accuracyThreshold": 0.7}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 2: Add Achievements for Word Duel
-- ============================================================
SET @word_duel_id = (SELECT id FROM games WHERE game_code = 'word_duel');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@word_duel_id, 'wd_first_play', 'Duel Initiate', 'Complete your first Word Duel', 'fa-play', 10, 'plays', 1),
(@word_duel_id, 'wd_beat_rookie', 'Rookie Crusher', 'Defeat Rookie Bot in a duel', 'fa-robot', 25, 'special', 0),
(@word_duel_id, 'wd_beat_expert', 'Expert Slayer', 'Defeat Linguist Pro in a duel', 'fa-crown', 150, 'special', 0),
(@word_duel_id, 'wd_perfect_duel', 'Flawless Victory', 'Win all 10 rounds in a single duel', 'fa-trophy', 200, 'special', 10),
(@word_duel_id, 'wd_score_500', 'Duel Champion', 'Score 500 points in a single duel', 'fa-medal', 75, 'score', 500),
(@word_duel_id, 'wd_score_1000', 'Duel Legend', 'Score 1000 points in a single duel', 'fa-star', 150, 'score', 1000),
(@word_duel_id, 'wd_speed_demon', 'Speed Demon', 'Answer correctly in under 1 second', 'fa-bolt', 50, 'special', 1000),
(@word_duel_id, 'wd_plays_10', 'Duel Enthusiast', 'Complete 10 duels', 'fa-shield', 75, 'plays', 10),
(@word_duel_id, 'wd_plays_50', 'Duel Master', 'Complete 50 duels', 'fa-swords', 200, 'plays', 50),
(@word_duel_id, 'wd_win_streak', 'Unstoppable', 'Win 5 duels in a row', 'fa-fire', 100, 'special', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 3: Add Achievements for Pop Quiz Blitz
-- ============================================================
SET @pop_quiz_id = (SELECT id FROM games WHERE game_code = 'pop_quiz_blitz');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@pop_quiz_id, 'pq_first_play', 'Bubble Popper', 'Complete your first Pop Quiz Blitz', 'fa-play', 10, 'plays', 1),
(@pop_quiz_id, 'pq_no_miss', 'Perfect Pop', 'Complete a game without missing any bubbles', 'fa-bullseye', 100, 'special', 0),
(@pop_quiz_id, 'pq_combo_5', 'Combo Starter', 'Achieve a 5x combo', 'fa-link', 25, 'combo', 5),
(@pop_quiz_id, 'pq_combo_10', 'Combo Master', 'Achieve a 10x combo', 'fa-fire', 75, 'combo', 10),
(@pop_quiz_id, 'pq_score_500', 'Blitz Expert', 'Score 500 points in one game', 'fa-star', 50, 'score', 500),
(@pop_quiz_id, 'pq_score_1000', 'Blitz Legend', 'Score 1000 points in one game', 'fa-crown', 125, 'score', 1000),
(@pop_quiz_id, 'pq_fast_pop', 'Lightning Reflexes', 'Pop a bubble in under 500ms', 'fa-bolt', 40, 'special', 500),
(@pop_quiz_id, 'pq_plays_10', 'Quiz Enthusiast', 'Complete 10 games', 'fa-trophy', 75, 'plays', 10),
(@pop_quiz_id, 'pq_plays_50', 'Quiz Master', 'Complete 50 games', 'fa-medal', 200, 'plays', 50),
(@pop_quiz_id, 'pq_survivor', 'Survivor', 'Finish a game with only 1 life remaining', 'fa-heart', 50, 'special', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 4: Add Achievements for Translation Race
-- ============================================================
SET @translation_id = (SELECT id FROM games WHERE game_code = 'translation_race');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@translation_id, 'tr_first_play', 'Translator Trainee', 'Complete your first Translation Race', 'fa-play', 10, 'plays', 1),
(@translation_id, 'tr_perfect_game', 'Perfect Translator', 'Complete all translations with 100% accuracy', 'fa-check-double', 150, 'accuracy', 100),
(@translation_id, 'tr_speed_run', 'Speed Translator', 'Complete a game in under 2 minutes', 'fa-stopwatch', 100, 'special', 120),
(@translation_id, 'tr_combo_5', 'Streak Starter', 'Get 5 correct translations in a row', 'fa-link', 30, 'combo', 5),
(@translation_id, 'tr_combo_10', 'Streak Master', 'Get 10 correct translations in a row', 'fa-fire', 100, 'combo', 10),
(@translation_id, 'tr_score_500', 'Race Pro', 'Score 500 points in one game', 'fa-star', 50, 'score', 500),
(@translation_id, 'tr_score_1000', 'Race Champion', 'Score 1000 points in one game', 'fa-crown', 125, 'score', 1000),
(@translation_id, 'tr_high_accuracy', 'Precision Master', 'Achieve 95%+ accuracy in a game', 'fa-bullseye', 75, 'special', 95),
(@translation_id, 'tr_plays_10', 'Race Enthusiast', 'Complete 10 races', 'fa-trophy', 75, 'plays', 10),
(@translation_id, 'tr_plays_50', 'Race Legend', 'Complete 50 races', 'fa-flag-checkered', 200, 'plays', 50)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 5: Update Power-ups for Phase 3 games
-- ============================================================

-- Freeze power-up for Pop Quiz Blitz (already includes pop_quiz_blitz from seed data)
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'word_duel'
)
WHERE power_up_code = 'freeze'
AND JSON_SEARCH(applicable_games, 'one', 'word_duel') IS NULL;

-- Skip power-up for Translation Race (already includes translation_race from seed data)
-- Nothing to add

-- Shield power-up for Word Duel (already includes word_duel from seed data)
-- Nothing to add

-- Extra time for Translation Race (already includes translation_race from seed data)
-- Nothing to add

-- Hint power-up for Word Duel (opponent hints)
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'pop_quiz_blitz'
)
WHERE power_up_code = 'hint'
AND JSON_SEARCH(applicable_games, 'one', 'pop_quiz_blitz') IS NULL;
