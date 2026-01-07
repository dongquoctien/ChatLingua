-- Migration: Unified Pet-Shop System
-- Consolidates pet and shop systems with new mechanics:
-- 1. Currency unified to user_currency only
-- 2. Eggs/Pets purchased from shop, data in pet_types
-- 3. Pet death mechanic (hp=0 for 24 hours = death)
-- 4. Pet care (feed/play/heart) tied to exercise/game scores
-- Created: 2026-01-05

-- ============================================================
-- PHASE 1: Update user_pets table with new columns
-- ============================================================

-- Add HP column for pet death mechanic (using procedure to safely add)
DROP PROCEDURE IF EXISTS add_user_pets_columns;
DELIMITER //
CREATE PROCEDURE add_user_pets_columns()
BEGIN
    -- Add hp column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND COLUMN_NAME = 'hp') THEN
        ALTER TABLE user_pets ADD COLUMN hp INT NOT NULL DEFAULT 100 AFTER hunger;
    END IF;

    -- Add hp_zero_since column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND COLUMN_NAME = 'hp_zero_since') THEN
        ALTER TABLE user_pets ADD COLUMN hp_zero_since DATETIME NULL COMMENT 'When HP first reached 0' AFTER hp;
    END IF;

    -- Add is_dead column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND COLUMN_NAME = 'is_dead') THEN
        ALTER TABLE user_pets ADD COLUMN is_dead BOOLEAN NOT NULL DEFAULT FALSE AFTER hp_zero_since;
    END IF;

    -- Add died_at column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND COLUMN_NAME = 'died_at') THEN
        ALTER TABLE user_pets ADD COLUMN died_at DATETIME NULL AFTER is_dead;
    END IF;

    -- Add last_care_at column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND COLUMN_NAME = 'last_care_at') THEN
        ALTER TABLE user_pets ADD COLUMN last_care_at DATETIME NULL COMMENT 'Last feed/play/heart action' AFTER last_interaction_at;
    END IF;
END//
DELIMITER ;

CALL add_user_pets_columns();
DROP PROCEDURE IF EXISTS add_user_pets_columns;

-- ============================================================
-- PHASE 2: Create pet_care_log table
-- Tracks care actions from exercises/games
-- ============================================================

CREATE TABLE IF NOT EXISTS pet_care_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_pet_id INT NOT NULL,
    user_id INT NOT NULL,

    -- Care action type
    care_type ENUM('feed', 'play', 'heart', 'heal') NOT NULL,

    -- Source of care (what activity generated it)
    source_type ENUM('exercise', 'game', 'review', 'daily_bonus', 'item') NOT NULL,
    source_id INT NULL COMMENT 'ID of exercise/game session',

    -- Score-based rewards
    activity_score INT NOT NULL DEFAULT 0 COMMENT 'Score from exercise/game (0-100)',
    care_points INT NOT NULL DEFAULT 0 COMMENT 'Care points earned based on score',

    -- Effects applied
    hp_change INT DEFAULT 0,
    happiness_change INT DEFAULT 0,
    energy_change INT DEFAULT 0,
    hunger_change INT DEFAULT 0,
    xp_gained INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_pet_id) REFERENCES user_pets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_user_pet (user_pet_id, created_at DESC),
    INDEX idx_user (user_id, created_at DESC),
    INDEX idx_source (source_type, source_id)
);

-- ============================================================
-- PHASE 3: Create care_score_tiers table
-- Maps activity scores to care rewards
-- ============================================================

CREATE TABLE IF NOT EXISTS care_score_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Score range
    min_score INT NOT NULL,
    max_score INT NOT NULL,

    -- Care type this tier applies to
    care_type ENUM('feed', 'play', 'heart', 'all') NOT NULL DEFAULT 'all',

    -- Rewards
    base_care_points INT NOT NULL DEFAULT 1,
    hp_bonus INT NOT NULL DEFAULT 0,
    happiness_bonus INT NOT NULL DEFAULT 0,
    energy_bonus INT NOT NULL DEFAULT 0,
    hunger_reduction INT NOT NULL DEFAULT 0,
    xp_bonus INT NOT NULL DEFAULT 0,

    -- Multipliers (applied to base values)
    multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,

    tier_name VARCHAR(50) NOT NULL,
    tier_color VARCHAR(20) NOT NULL DEFAULT '#gray',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_score_range (min_score, max_score)
);

-- Insert default score tiers (only if table is empty)
INSERT INTO care_score_tiers (min_score, max_score, care_type, base_care_points, hp_bonus, happiness_bonus, energy_bonus, hunger_reduction, xp_bonus, multiplier, tier_name, tier_color)
SELECT * FROM (
    SELECT 0 as min_score, 29 as max_score, 'all' as care_type, 1 as base_care_points, 5 as hp_bonus, 3 as happiness_bonus, 0 as energy_bonus, 5 as hunger_reduction, 5 as xp_bonus, 0.50 as multiplier, 'Needs Improvement' as tier_name, '#9CA3AF' as tier_color
    UNION ALL
    SELECT 30, 49, 'all', 2, 10, 5, 5, 10, 10, 0.75, 'Getting There', '#F59E0B'
    UNION ALL
    SELECT 50, 69, 'all', 3, 15, 10, 10, 15, 20, 1.00, 'Good Job', '#10B981'
    UNION ALL
    SELECT 70, 89, 'all', 5, 20, 15, 15, 20, 35, 1.25, 'Excellent', '#3B82F6'
    UNION ALL
    SELECT 90, 100, 'all', 8, 30, 25, 20, 30, 50, 1.50, 'Perfect', '#8B5CF6'
) AS tiers
WHERE NOT EXISTS (SELECT 1 FROM care_score_tiers LIMIT 1);

-- ============================================================
-- PHASE 4: Update pet_activities table for new care system
-- ============================================================

-- Safely add columns to pet_activities
DROP PROCEDURE IF EXISTS add_pet_activities_columns;
DELIMITER //
CREATE PROCEDURE add_pet_activities_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pet_activities' AND COLUMN_NAME = 'source_type') THEN
        ALTER TABLE pet_activities ADD COLUMN source_type VARCHAR(50) NULL AFTER trigger_source;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pet_activities' AND COLUMN_NAME = 'source_id') THEN
        ALTER TABLE pet_activities ADD COLUMN source_id INT NULL AFTER source_type;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pet_activities' AND COLUMN_NAME = 'activity_score') THEN
        ALTER TABLE pet_activities ADD COLUMN activity_score INT NULL AFTER source_id;
    END IF;
END//
DELIMITER ;

CALL add_pet_activities_columns();
DROP PROCEDURE IF EXISTS add_pet_activities_columns;

-- ============================================================
-- PHASE 5: Add pet_egg item type to shop_items
-- ============================================================

-- Safely add columns to shop_items
DROP PROCEDURE IF EXISTS add_shop_items_columns;
DELIMITER //
CREATE PROCEDURE add_shop_items_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop_items' AND COLUMN_NAME = 'metadata') THEN
        ALTER TABLE shop_items ADD COLUMN metadata JSON NULL AFTER asset_data;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop_items' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE shop_items ADD COLUMN image_url VARCHAR(500) NULL AFTER preview_url;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop_items' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE shop_items ADD COLUMN category VARCHAR(50) NULL AFTER category_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop_items' AND COLUMN_NAME = 'sort_order') THEN
        ALTER TABLE shop_items ADD COLUMN sort_order INT DEFAULT 0 AFTER favorite_count;
    END IF;
END//
DELIMITER ;

CALL add_shop_items_columns();
DROP PROCEDURE IF EXISTS add_shop_items_columns;

-- ============================================================
-- PHASE 6: Add index for faster HP monitoring (safe create)
-- ============================================================

DROP PROCEDURE IF EXISTS add_pet_indexes;
DELIMITER //
CREATE PROCEDURE add_pet_indexes()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND INDEX_NAME = 'idx_user_pets_hp_zero') THEN
        CREATE INDEX idx_user_pets_hp_zero ON user_pets(hp_zero_since, is_dead);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_pets' AND INDEX_NAME = 'idx_user_pets_active') THEN
        CREATE INDEX idx_user_pets_active ON user_pets(user_id, is_active, is_dead);
    END IF;
END//
DELIMITER ;

CALL add_pet_indexes();
DROP PROCEDURE IF EXISTS add_pet_indexes;

-- ============================================================
-- PHASE 7: Create Pets & Eggs category if not exists
-- ============================================================

INSERT IGNORE INTO shop_categories (name, slug, description, icon, sort_order)
VALUES ('Pets & Eggs', 'pets-eggs', 'Pet eggs and companions', 'fa-paw', 7);

-- ============================================================
-- PHASE 8: Initialize HP for existing pets
-- ============================================================

UPDATE user_pets
SET hp = 100, is_dead = FALSE, hp_zero_since = NULL
WHERE hp IS NULL OR hp = 0;

-- ============================================================
-- PHASE 9: Create view for active pets with shop info
-- ============================================================

DROP VIEW IF EXISTS v_user_pets_with_shop;
CREATE VIEW v_user_pets_with_shop AS
SELECT
    up.*,
    pt.name AS pet_type_name,
    pt.slug AS pet_type_slug,
    pt..rarity,
    pt.image_url AS pet_image,
    pt.xp_multiplier,
    pt.coin_multiplier,
    pt.special_ability,
    pt.ability_description,
    pt.is_egg AS is_egg_type,
    pt.hatch_xp_required,
    pt.hatch_hours_min,
    uc.coins AS user_coins,
    uc.gems AS user_gems,
    -- Calculate time until death if HP is 0
    CASE
        WHEN up.hp = 0 AND up.hp_zero_since IS NOT NULL THEN
            GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(up.hp_zero_since, INTERVAL 24 HOUR)))
        ELSE NULL
    END AS seconds_until_death
FROM user_pets up
JOIN pet_types pt ON up.pet_type_id = pt.id
LEFT JOIN user_currency uc ON up.user_id = uc.user_id;

-- ============================================================
-- PHASE 10: HP zero tracking will be handled in application logic
-- (Trigger creation requires SUPER privilege which we may not have)
-- ============================================================

-- Note: The pet.service.ts now handles hp_zero_since tracking:
-- - When HP reaches 0: set hp_zero_since = NOW()
-- - When HP recovers from 0: clear hp_zero_since = NULL

-- ============================================================
-- DONE
-- ============================================================
