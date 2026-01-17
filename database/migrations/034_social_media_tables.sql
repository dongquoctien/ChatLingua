-- Migration: Social Features and Media Resources Tables for Version 3
-- Creates tables for social features (leaderboard, positions) and media resources

-- ============================================================
-- 1. MAP USER POSITIONS TABLE
-- Tracks user avatar positions on Word Map for social display
-- ============================================================
CREATE TABLE IF NOT EXISTS map_user_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT NOT NULL,

    -- Current position on the map
    current_unit_id INT DEFAULT NULL,
    current_lesson_id INT DEFAULT NULL,
    position_type ENUM('studying', 'exam', 'completed', 'idle') DEFAULT 'studying',

    -- Cached display info (updated when user info changes)
    user_display_name VARCHAR(100) DEFAULT NULL,
    user_avatar_url VARCHAR(500) DEFAULT NULL,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Position on visual map (for rendering)
    position_x INT DEFAULT 0 COMMENT 'X coordinate on map visual',
    position_y INT DEFAULT 0 COMMENT 'Y coordinate on map visual',

    -- Activity timestamps
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (current_unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    FOREIGN KEY (current_lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_map (user_id, map_id),
    INDEX idx_map_positions (map_id, current_unit_id, current_lesson_id),
    INDEX idx_map_completion (map_id, completion_percentage DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MAP LEADERBOARD TABLE
-- Weekly/monthly leaderboards for each Word Map
-- ============================================================
CREATE TABLE IF NOT EXISTS map_leaderboards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    map_id INT NOT NULL,
    user_id INT NOT NULL,
    period_type ENUM('weekly', 'monthly', 'all_time') NOT NULL,
    period_start DATE NOT NULL COMMENT 'Start of the period',
    period_end DATE DEFAULT NULL COMMENT 'End of the period (NULL for all_time)',

    -- Scores
    xp_earned INT DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    exams_passed INT DEFAULT 0,
    perfect_scores INT DEFAULT 0,
    study_time_minutes INT DEFAULT 0,

    -- Calculated rank (updated periodically)
    rank_position INT DEFAULT NULL,
    previous_rank INT DEFAULT NULL COMMENT 'For showing rank changes',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_period (map_id, user_id, period_type, period_start),
    INDEX idx_map_period_rank (map_id, period_type, period_start, rank_position),
    INDEX idx_map_period_xp (map_id, period_type, period_start, xp_earned DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. MEDIA RESOURCES TABLE
-- Stores audio, video, images, PDFs for Word Maps
-- ============================================================
CREATE TABLE IF NOT EXISTS media_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource_type ENUM('audio', 'video', 'image', 'pdf', 'document') NOT NULL,

    -- Source info
    source_map_id INT DEFAULT NULL COMMENT 'Which Word Map this belongs to',
    original_filename VARCHAR(255) DEFAULT NULL,

    -- Parsed metadata from filename
    unit_reference INT DEFAULT NULL COMMENT 'Extracted unit number from filename',
    page_reference INT DEFAULT NULL COMMENT 'Extracted page number',
    exercise_reference VARCHAR(50) DEFAULT NULL COMMENT 'Extracted exercise reference',
    track_number VARCHAR(20) DEFAULT NULL COMMENT 'Audio track number',

    -- Storage
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes INT DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,

    -- Media-specific metadata
    duration_seconds INT DEFAULT NULL COMMENT 'For audio/video',
    width INT DEFAULT NULL COMMENT 'For images/video',
    height INT DEFAULT NULL COMMENT 'For images/video',
    page_count INT DEFAULT NULL COMMENT 'For PDFs',

    -- Content metadata
    title VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    transcript TEXT DEFAULT NULL COMMENT 'For audio/video transcripts',
    transcript_vi TEXT DEFAULT NULL COMMENT 'Vietnamese translation of transcript',

    -- Tags for searching
    tags JSON DEFAULT NULL COMMENT '["listening", "unit1", "page10"]',

    -- Status
    is_processed BOOLEAN DEFAULT FALSE COMMENT 'Whether file has been processed',
    processing_error TEXT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (source_map_id) REFERENCES word_maps(id) ON DELETE SET NULL,
    INDEX idx_map_type (source_map_id, resource_type),
    INDEX idx_unit_page (unit_reference, page_reference),
    INDEX idx_track (track_number),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. LESSON MEDIA TABLE (Junction)
-- Links media resources to specific lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    media_resource_id INT NOT NULL,
    purpose ENUM('intro', 'content', 'practice', 'pronunciation', 'background') DEFAULT 'content',
    display_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE COMMENT 'Must view to complete lesson',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (media_resource_id) REFERENCES media_resources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lesson_media (lesson_id, media_resource_id),
    INDEX idx_lesson (lesson_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. MAP ACHIEVEMENTS TABLE
-- Achievements specific to Word Maps
-- ============================================================
CREATE TABLE IF NOT EXISTS map_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    map_id INT DEFAULT NULL COMMENT 'NULL for global achievements',
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon_url VARCHAR(500) DEFAULT NULL,

    -- Requirements
    achievement_type ENUM(
        'unit_complete',      -- Complete N units
        'lesson_complete',    -- Complete N lessons
        'perfect_exam',       -- Get perfect score on exam
        'streak',            -- N day study streak on map
        'speed_run',         -- Complete unit in record time
        'vocabulary_master', -- Learn N vocabulary from map
        'grammar_master',    -- Master N grammar rules
        'map_complete'       -- Complete entire map
    ) NOT NULL,
    requirement_count INT DEFAULT 1 COMMENT 'Number required',
    requirement_data JSON DEFAULT NULL COMMENT 'Additional requirements',

    -- Rewards
    xp_reward INT DEFAULT 0,
    coins_reward INT DEFAULT 0,
    gems_reward INT DEFAULT 0,
    badge_url VARCHAR(500) DEFAULT NULL,

    -- Display
    difficulty ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
    display_order INT DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE COMMENT 'Hidden until unlocked',
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    INDEX idx_map (map_id),
    INDEX idx_type (achievement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. USER MAP ACHIEVEMENTS TABLE
-- Tracks which achievements users have earned
-- ============================================================
CREATE TABLE IF NOT EXISTS user_map_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_achievement_id INT NOT NULL,

    -- Progress
    current_progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,

    -- Reward tracking
    rewards_claimed BOOLEAN DEFAULT FALSE,
    rewards_claimed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_achievement_id) REFERENCES map_achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, map_achievement_id),
    INDEX idx_user_completed (user_id, is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. STUDY SESSIONS TABLE
-- Tracks study sessions for analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS study_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT DEFAULT NULL,
    unit_id INT DEFAULT NULL,
    lesson_id INT DEFAULT NULL,

    session_type ENUM('study', 'review', 'exam', 'game', 'practice') NOT NULL,

    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    duration_seconds INT DEFAULT 0,

    -- Session stats
    vocabulary_studied INT DEFAULT 0,
    grammar_studied INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    xp_earned INT DEFAULT 0,

    -- Device info
    device_type VARCHAR(50) DEFAULT NULL COMMENT 'web, mobile, tablet',
    app_version VARCHAR(20) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, started_at),
    INDEX idx_map_date (map_id, started_at),
    INDEX idx_type (session_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Insert default Map Achievements for Evolve 1
-- ============================================================
INSERT INTO map_achievements (map_id, code, name, description, achievement_type, requirement_count, xp_reward, coins_reward, difficulty)
SELECT
    wm.id,
    a.code,
    a.name,
    a.description,
    a.achievement_type,
    a.requirement_count,
    a.xp_reward,
    a.coins_reward,
    a.difficulty
FROM word_maps wm
CROSS JOIN (
    SELECT 'evolve1_first_unit' AS code, 'First Steps' AS name, 'Complete your first unit in Evolve 1' AS description,
           'unit_complete' AS achievement_type, 1 AS requirement_count, 100 AS xp_reward, 50 AS coins_reward, 'bronze' AS difficulty
    UNION ALL SELECT 'evolve1_five_units', 'Making Progress', 'Complete 5 units in Evolve 1',
           'unit_complete', 5, 300, 150, 'silver'
    UNION ALL SELECT 'evolve1_all_units', 'Evolve Master', 'Complete all units in Evolve 1',
           'unit_complete', 12, 1000, 500, 'gold'
    UNION ALL SELECT 'evolve1_first_perfect', 'Perfect Start', 'Get 100% on your first exam',
           'perfect_exam', 1, 50, 25, 'bronze'
    UNION ALL SELECT 'evolve1_ten_perfect', 'Perfectionist', 'Get 100% on 10 exams',
           'perfect_exam', 10, 500, 250, 'gold'
    UNION ALL SELECT 'evolve1_vocab_50', 'Word Collector', 'Learn 50 vocabulary words',
           'vocabulary_master', 50, 200, 100, 'silver'
    UNION ALL SELECT 'evolve1_vocab_200', 'Vocabulary Champion', 'Learn 200 vocabulary words',
           'vocabulary_master', 200, 800, 400, 'gold'
    UNION ALL SELECT 'evolve1_complete', 'Evolve 1 Graduate', 'Complete the entire Evolve 1 course',
           'map_complete', 1, 2000, 1000, 'platinum'
) a
WHERE wm.name = 'Evolve 1'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 9. FEATURE FLAGS TABLE
-- For V3 migration feature flags
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    flag_value VARCHAR(255) NOT NULL DEFAULT 'false',
    description VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (flag_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert V3 feature flags
INSERT INTO feature_flags (flag_key, flag_value, description) VALUES
('USE_V3_TABLES', 'false', 'Use V3 master/user tables for vocabulary, grammar, exercises'),
('DUAL_WRITE_ENABLED', 'true', 'Write to both V2 and V3 tables during migration'),
('DEPRECATE_V2_TABLES', 'false', 'Mark V2 tables as deprecated'),
('WORD_MAPS_ENABLED', 'false', 'Enable Word Map curriculum feature'),
('V3_MIGRATION_COMPLETE', 'false', 'All data has been migrated to V3 tables')
ON DUPLICATE KEY UPDATE description = VALUES(description);
