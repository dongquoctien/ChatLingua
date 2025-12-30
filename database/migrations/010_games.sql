-- Migration: Game-Based Learning System
-- Adds games, game sessions, leaderboards, achievements, power-ups, and currency

-- ============================================================
-- Step 1: Game Definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('speed', 'puzzle', 'adventure', 'competitive', 'audio', 'collection') NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    icon VARCHAR(50) COMMENT 'FontAwesome icon class',
    color VARCHAR(7) COMMENT 'Hex color for UI',
    is_active BOOLEAN DEFAULT TRUE,
    min_vocabulary_required INT DEFAULT 10,
    unlock_level INT DEFAULT 1 COMMENT 'User level required to unlock',
    config JSON COMMENT 'Game-specific configuration',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Step 2: Game Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_id INT NOT NULL,

    -- Session data
    score INT DEFAULT 0,
    max_combo INT DEFAULT 0,
    accuracy DECIMAL(5,2) COMMENT 'Percentage 0-100',
    words_correct INT DEFAULT 0,
    words_wrong INT DEFAULT 0,
    words_total INT DEFAULT 0,

    -- Timing
    duration_seconds INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,

    -- Rewards
    xp_earned INT DEFAULT 0,
    coins_earned INT DEFAULT 0,

    -- Game-specific data
    game_data JSON COMMENT 'Level reached, power-ups used, etc.',

    -- Status
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_user_game (user_id, game_id),
    INDEX idx_user_date (user_id, started_at),
    INDEX idx_game_score (game_id, score DESC)
);

-- ============================================================
-- Step 3: Game Leaderboards
-- ============================================================
CREATE TABLE IF NOT EXISTS game_leaderboards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_id INT NOT NULL,

    -- All-time stats
    best_score INT DEFAULT 0,
    best_combo INT DEFAULT 0,
    best_accuracy DECIMAL(5,2),
    total_plays INT DEFAULT 0,
    total_time_seconds INT DEFAULT 0,

    -- Weekly stats (reset every Monday)
    weekly_score INT DEFAULT 0,
    weekly_plays INT DEFAULT 0,
    week_start DATE,

    -- Daily stats (reset daily)
    daily_score INT DEFAULT 0,
    daily_plays INT DEFAULT 0,
    play_date DATE,

    -- Ranking
    all_time_rank INT,
    weekly_rank INT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_game (user_id, game_id),
    INDEX idx_game_best (game_id, best_score DESC),
    INDEX idx_game_weekly (game_id, weekly_score DESC)
);

-- ============================================================
-- Step 4: Game Achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS game_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    achievement_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    xp_reward INT DEFAULT 0,
    requirement_type ENUM('score', 'combo', 'accuracy', 'plays', 'streak', 'special') NOT NULL,
    requirement_value INT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY unique_game_achievement (game_id, achievement_code)
);

CREATE TABLE IF NOT EXISTS user_game_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id INT COMMENT 'Which session unlocked it',

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES game_achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);

-- ============================================================
-- Step 5: Power-ups System
-- ============================================================
CREATE TABLE IF NOT EXISTS power_ups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    power_up_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    effect_type ENUM('freeze', 'slow', 'clear', 'hint', 'skip', 'double_xp', 'shield', 'extra_time') NOT NULL,
    effect_value INT COMMENT 'Duration in seconds or amount',
    coin_cost INT DEFAULT 0,
    applicable_games JSON COMMENT 'Array of game_codes where this can be used'
);

CREATE TABLE IF NOT EXISTS user_power_ups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    power_up_id INT NOT NULL,
    quantity INT DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (power_up_id) REFERENCES power_ups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_powerup (user_id, power_up_id)
);

-- ============================================================
-- Step 6: Currency System
-- ============================================================
CREATE TABLE IF NOT EXISTS user_currency (
    user_id INT PRIMARY KEY,
    coins INT DEFAULT 100 COMMENT 'Starting coins',
    gems INT DEFAULT 0 COMMENT 'Premium currency',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS currency_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    currency_type ENUM('coins', 'gems') NOT NULL,
    amount INT NOT NULL COMMENT 'Positive = earn, negative = spend',
    source ENUM('game', 'achievement', 'daily_bonus', 'purchase', 'power_up', 'gacha') NOT NULL,
    source_id INT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
);

-- ============================================================
-- Step 7: Seed Data - Games (Phase 1)
-- ============================================================
INSERT INTO games (game_code, name, description, category, difficulty, icon, color, unlock_level, config) VALUES
('word_rush', 'Word Rush', 'Answer as many questions as possible in 60 seconds! Match Vietnamese words with English translations.', 'speed', 'easy', 'fa-bolt', '#FF6B6B', 1, '{"timeLimit": 60, "questionsPerRound": 20, "comboMultiplier": true}'),
('memory_match', 'Memory Match', 'Match English words with Vietnamese translations by flipping cards. Test your memory and vocabulary!', 'puzzle', 'easy', 'fa-clone', '#4ECDC4', 1, '{"gridSizes": [4, 6, 8], "timeBonus": true}'),
('hangman', 'Hangman 2.0', 'Guess the English word letter by letter with Vietnamese context hints.', 'puzzle', 'easy', 'fa-user-secret', '#45B7D1', 1, '{"maxMistakes": 6, "hintCost": 50}'),
('spelling_bee', 'Spelling Bee', 'Listen to words and spell them correctly. Improve your listening and spelling skills!', 'audio', 'easy', 'fa-spell-check', '#96CEB4', 1, '{"timePerWord": 30, "repeatAllowed": true}');

-- ============================================================
-- Step 8: Seed Data - Power-ups
-- ============================================================
INSERT INTO power_ups (power_up_code, name, description, icon, effect_type, effect_value, coin_cost, applicable_games) VALUES
('freeze', 'Time Freeze', 'Freeze time for 5 seconds', 'fa-snowflake', 'freeze', 5, 50, '["word_rush", "spelling_bee"]'),
('hint', 'Hint', 'Reveal a letter or clue', 'fa-lightbulb', 'hint', 1, 20, '["hangman", "spelling_bee"]'),
('skip', 'Skip', 'Skip current question without penalty', 'fa-forward', 'skip', 1, 40, '["word_rush", "spelling_bee"]'),
('double_xp', 'Double XP', 'Earn double XP for this session', 'fa-star', 'double_xp', 1, 150, NULL),
('extra_time', 'Extra Time', 'Add 15 seconds to timer', 'fa-clock', 'extra_time', 15, 40, '["word_rush"]');

-- ============================================================
-- Step 9: Seed Data - Game Achievements
-- ============================================================
INSERT INTO game_achievements (game_id, achievement_code, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
-- Word Rush achievements (game_id = 1)
(1, 'wr_first_play', 'Speed Starter', 'Play Word Rush for the first time', 'fa-play', 10, 'plays', 1),
(1, 'wr_score_100', 'Century', 'Score 100 points in one game', 'fa-hundred-points', 25, 'score', 100),
(1, 'wr_score_500', 'Speed Demon', 'Score 500 points in one game', 'fa-fire', 100, 'score', 500),
(1, 'wr_combo_10', 'Combo Master', 'Achieve a 10x combo', 'fa-link', 50, 'combo', 10),
(1, 'wr_perfect', 'Perfect Rush', '100% accuracy in a game', 'fa-check-double', 75, 'accuracy', 100),
(1, 'wr_plays_50', 'Rush Addict', 'Play 50 games', 'fa-repeat', 150, 'plays', 50),

-- Memory Match achievements (game_id = 2)
(2, 'mm_first_play', 'Memory Initialized', 'Play Memory Match for the first time', 'fa-play', 10, 'plays', 1),
(2, 'mm_perfect_4', 'Perfect Memory (4x4)', 'Complete 4x4 grid without mistakes', 'fa-brain', 25, 'accuracy', 100),
(2, 'mm_perfect_6', 'Super Memory (6x6)', 'Complete 6x6 grid without mistakes', 'fa-brain', 50, 'accuracy', 100),
(2, 'mm_plays_25', 'Memory Enthusiast', 'Play 25 games', 'fa-repeat', 75, 'plays', 25),
(2, 'mm_fast_clear', 'Speed Matcher', 'Clear a grid in under 30 seconds', 'fa-stopwatch', 100, 'special', 30),

-- Hangman achievements (game_id = 3)
(3, 'hm_first_play', 'First Rescue', 'Play Hangman for the first time', 'fa-play', 10, 'plays', 1),
(3, 'hm_no_mistakes', 'Perfect Guess', 'Solve a word with no mistakes', 'fa-star', 25, 'accuracy', 100),
(3, 'hm_streak_5', 'Word Detective', 'Solve 5 words in a row', 'fa-magnifying-glass', 50, 'streak', 5),
(3, 'hm_plays_30', 'Hangman Hero', 'Play 30 games', 'fa-medal', 100, 'plays', 30),

-- Spelling Bee achievements (game_id = 4)
(4, 'sb_first_play', 'First Spelling', 'Play Spelling Bee for the first time', 'fa-play', 10, 'plays', 1),
(4, 'sb_perfect_10', 'Perfect Speller', 'Spell 10 words correctly in a row', 'fa-check', 50, 'streak', 10),
(4, 'sb_accuracy_95', 'Spelling Ace', 'Achieve 95% accuracy in a session', 'fa-trophy', 75, 'accuracy', 95),
(4, 'sb_plays_40', 'Spelling Champion', 'Play 40 games', 'fa-crown', 125, 'plays', 40);
