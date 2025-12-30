-- Migration: Add Phase 4 Adventure & Collection Games
-- Adds Vocabulary Quest (RPG), Word Cards TCG, and Language Island games with achievements

-- ============================================================
-- Step 1: Add Phase 4 Games
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('vocabulary_quest', 'Vocabulary Quest', 'Embark on an RPG adventure! Battle enemies using your vocabulary knowledge and conquer challenging stages.', 'adventure', 'hard', 'fa-dragon', '#9B59B6', 4, '{"maps": 4, "stagesPerMap": 5, "questionsPerStage": 5, "playerBaseHp": 100, "baseDamage": 20}'),
('word_cards', 'Word Cards TCG', 'Collect and battle with vocabulary cards! Build your deck, pull new cards from gacha, and defeat opponents.', 'collection', 'medium', 'fa-layer-group', '#E67E22', 4, '{"deckSize": 5, "roundsPerBattle": 5, "gachaCostCoins": 100, "gachaCostGems": 10}'),
('language_island', 'Language Island', 'Build and manage your own learning paradise! Place buildings, collect resources, and grow your vocabulary empire.', 'adventure', 'medium', 'fa-island-tropical', '#1ABC9C', 4, '{"gridSize": 8, "maxBuildings": 20, "productionInterval": 3600}')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), config = VALUES(config);

-- ============================================================
-- Step 2: Add Achievements for Vocabulary Quest
-- ============================================================
SET @vocab_quest_id = (SELECT id FROM games WHERE game_code = 'vocabulary_quest');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@vocab_quest_id, 'vq_first_play', 'Quest Beginner', 'Complete your first Vocabulary Quest stage', 'fa-play', 10, 'plays', 1),
(@vocab_quest_id, 'vq_first_map', 'Map Clearer', 'Complete all stages in one map', 'fa-map', 50, 'special', 1),
(@vocab_quest_id, 'vq_boss_slayer', 'Boss Slayer', 'Defeat your first boss enemy', 'fa-skull', 75, 'special', 1),
(@vocab_quest_id, 'vq_perfect_stage', 'Perfect Stage', 'Complete a stage without taking damage', 'fa-shield', 100, 'special', 0),
(@vocab_quest_id, 'vq_combo_5', 'Combo Warrior', 'Achieve a 5x combo in battle', 'fa-fire', 50, 'combo', 5),
(@vocab_quest_id, 'vq_combo_10', 'Combo Master', 'Achieve a 10x combo in battle', 'fa-fire-alt', 100, 'combo', 10),
(@vocab_quest_id, 'vq_score_1000', 'Quest Champion', 'Score 1000 points in a single quest', 'fa-trophy', 75, 'score', 1000),
(@vocab_quest_id, 'vq_all_maps', 'World Conqueror', 'Complete all available maps', 'fa-globe', 300, 'special', 4),
(@vocab_quest_id, 'vq_plays_10', 'Quest Enthusiast', 'Complete 10 quest stages', 'fa-hiking', 75, 'plays', 10),
(@vocab_quest_id, 'vq_plays_50', 'Quest Legend', 'Complete 50 quest stages', 'fa-crown', 200, 'plays', 50)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 3: Add Achievements for Word Cards TCG
-- ============================================================
SET @word_cards_id = (SELECT id FROM games WHERE game_code = 'word_cards');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@word_cards_id, 'wc_first_play', 'Card Collector', 'Complete your first Word Cards battle', 'fa-play', 10, 'plays', 1),
(@word_cards_id, 'wc_first_legendary', 'Legendary Pull', 'Obtain your first legendary card', 'fa-star', 150, 'special', 1),
(@word_cards_id, 'wc_collect_20', 'Card Hoarder', 'Collect 20 unique cards', 'fa-layer-group', 75, 'special', 20),
(@word_cards_id, 'wc_collect_50', 'Card Master', 'Collect 50 unique cards', 'fa-crown', 200, 'special', 50),
(@word_cards_id, 'wc_perfect_battle', 'Flawless Victory', 'Win a battle without losing HP', 'fa-shield-alt', 100, 'special', 0),
(@word_cards_id, 'wc_combo_5', 'Win Streak', 'Win 5 card clashes in a row', 'fa-fire', 50, 'combo', 5),
(@word_cards_id, 'wc_gacha_10', 'Gacha Addict', 'Perform 10 gacha pulls', 'fa-dice', 40, 'special', 10),
(@word_cards_id, 'wc_max_card', 'Max Power', 'Upgrade a card to level 5', 'fa-arrow-up', 100, 'special', 5),
(@word_cards_id, 'wc_plays_10', 'Card Duelist', 'Complete 10 card battles', 'fa-trophy', 75, 'plays', 10),
(@word_cards_id, 'wc_plays_50', 'Card Legend', 'Complete 50 card battles', 'fa-medal', 200, 'plays', 50)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 4: Add Achievements for Language Island
-- ============================================================
SET @lang_island_id = (SELECT id FROM games WHERE game_code = 'language_island');

INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
(@lang_island_id, 'li_first_building', 'Island Starter', 'Place your first building', 'fa-play', 10, 'plays', 1),
(@lang_island_id, 'li_buildings_5', 'Builder', 'Place 5 buildings on your island', 'fa-hammer', 50, 'special', 5),
(@lang_island_id, 'li_buildings_10', 'Architect', 'Place 10 buildings on your island', 'fa-drafting-compass', 100, 'special', 10),
(@lang_island_id, 'li_first_upgrade', 'Upgrader', 'Upgrade a building for the first time', 'fa-arrow-up', 25, 'special', 1),
(@lang_island_id, 'li_max_building', 'Master Builder', 'Upgrade a building to level 5', 'fa-building', 100, 'special', 5),
(@lang_island_id, 'li_collect_1000', 'Resource Gatherer', 'Collect 1000 total coins from buildings', 'fa-coins', 75, 'special', 1000),
(@lang_island_id, 'li_collect_5000', 'Resource Magnate', 'Collect 5000 total coins from buildings', 'fa-gem', 150, 'special', 5000),
(@lang_island_id, 'li_level_5', 'Island Level 5', 'Reach island level 5', 'fa-level-up-alt', 75, 'special', 5),
(@lang_island_id, 'li_level_10', 'Island Level 10', 'Reach island level 10', 'fa-crown', 200, 'special', 10),
(@lang_island_id, 'li_decoration', 'Decorator', 'Place 5 decoration buildings', 'fa-tree', 50, 'special', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Step 5: Update Power-ups for Phase 4 games
-- ============================================================

-- Shield power-up for Vocabulary Quest
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'vocabulary_quest'
)
WHERE power_up_code = 'shield'
AND JSON_SEARCH(applicable_games, 'one', 'vocabulary_quest') IS NULL;

-- Hint power-up for Word Cards (reveal opponent card)
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'word_cards'
)
WHERE power_up_code = 'hint'
AND JSON_SEARCH(applicable_games, 'one', 'word_cards') IS NULL;

-- Double XP power-up for Language Island
UPDATE power_ups
SET applicable_games = JSON_ARRAY_APPEND(
    COALESCE(applicable_games, '[]'),
    '$',
    'language_island'
)
WHERE power_up_code = 'double_xp'
AND JSON_SEARCH(applicable_games, 'one', 'language_island') IS NULL;

-- ============================================================
-- Step 6: Create Word Cards collection table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_word_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vocabulary_id INT,
    card_name VARCHAR(100) NOT NULL,
    card_vietnamese VARCHAR(100),
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    power INT DEFAULT 10,
    defense INT DEFAULT 8,
    category VARCHAR(50),
    skill_name VARCHAR(50),
    skill_effect VARCHAR(50),
    skill_value INT DEFAULT 0,
    level INT DEFAULT 1,
    duplicates INT DEFAULT 0,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE SET NULL,
    INDEX idx_user_rarity (user_id, rarity),
    INDEX idx_user_category (user_id, category)
);

-- ============================================================
-- Step 7: Create Language Island buildings table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_island_buildings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    building_code VARCHAR(50) NOT NULL,
    position_x INT NOT NULL,
    position_y INT NOT NULL,
    level INT DEFAULT 1,
    last_collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_building BOOLEAN DEFAULT FALSE,
    build_complete_at TIMESTAMP NULL,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_position (user_id, position_x, position_y),
    INDEX idx_user_buildings (user_id)
);

-- ============================================================
-- Step 8: Create Vocabulary Quest progress table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_quest_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT NOT NULL,
    current_stage INT DEFAULT 1,
    stars_earned INT DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT FALSE,
    best_score INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_map (user_id, map_id),
    INDEX idx_user_progress (user_id)
);
