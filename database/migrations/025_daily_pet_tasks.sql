-- Migration 025: Daily Pet Tasks System
-- Adds daily tasks that reward pet care items based on user learning activities

-- ============================================
-- 1. Daily Pet Tasks Definition Table
-- ============================================
CREATE TABLE IF NOT EXISTS daily_pet_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_code VARCHAR(50) NOT NULL UNIQUE,
    task_name VARCHAR(100) NOT NULL,
    description TEXT,
    task_type ENUM('exercise', 'game', 'review', 'social', 'streak', 'challenge') NOT NULL,
    requirement_type VARCHAR(50) NOT NULL COMMENT 'e.g., count, score_percent, time_minutes',
    requirement_value INT NOT NULL DEFAULT 1 COMMENT 'Target value to complete task',
    reward_item_category ENUM('food', 'toy', 'heart', 'medicine', 'random') NOT NULL,
    reward_quantity_min INT NOT NULL DEFAULT 1,
    reward_quantity_max INT NOT NULL DEFAULT 1,
    reward_coins INT NOT NULL DEFAULT 0 COMMENT 'Bonus coins for completing task',
    reward_xp INT NOT NULL DEFAULT 0 COMMENT 'Bonus XP for completing task',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    icon VARCHAR(50) DEFAULT NULL COMMENT 'Icon class or emoji',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_type (task_type),
    INDEX idx_active (is_active)
);

-- ============================================
-- 2. User Daily Task Progress Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_daily_pet_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    task_date DATE NOT NULL,
    current_progress INT NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME NULL,
    reward_claimed BOOLEAN DEFAULT FALSE,
    claimed_at DATETIME NULL,
    items_rewarded JSON NULL COMMENT 'Array of {itemId, quantity}',
    coins_rewarded INT DEFAULT 0,
    xp_rewarded INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES daily_pet_tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_task_date (user_id, task_id, task_date),
    INDEX idx_user_date (user_id, task_date),
    INDEX idx_completed (is_completed),
    INDEX idx_claimed (reward_claimed)
);

-- ============================================
-- 3. Insert Default Daily Tasks
-- ============================================
INSERT INTO daily_pet_tasks (task_code, task_name, description, task_type, requirement_type, requirement_value, reward_item_category, reward_quantity_min, reward_quantity_max, reward_coins, reward_xp, icon, sort_order) VALUES
-- Exercise Tasks
('complete_5_reviews', 'Vocabulary Master', 'Complete 5 vocabulary reviews', 'review', 'count', 5, 'food', 1, 2, 10, 5, '📚', 1),
('complete_10_reviews', 'Review Champion', 'Complete 10 vocabulary reviews', 'review', 'count', 10, 'food', 2, 3, 20, 10, '📖', 2),
('score_70_exercise', 'Good Effort', 'Score 70%+ on any exercise', 'exercise', 'score_percent', 70, 'food', 1, 1, 15, 8, '✅', 3),
('score_90_exercise', 'Excellence Award', 'Score 90%+ on any exercise', 'exercise', 'score_percent', 90, 'heart', 1, 1, 25, 15, '⭐', 4),
('perfect_exercise', 'Perfect Score', 'Get 100% on any exercise', 'exercise', 'score_percent', 100, 'heart', 1, 2, 50, 25, '🏆', 5),

-- Game Tasks
('win_1_game', 'Game Winner', 'Win a game', 'game', 'count', 1, 'toy', 1, 2, 20, 10, '🎮', 6),
('win_3_games', 'Gaming Streak', 'Win 3 games', 'game', 'count', 3, 'toy', 2, 3, 40, 20, '🎯', 7),
('high_score_game', 'High Scorer', 'Score 500+ points in a game', 'game', 'score_points', 500, 'toy', 1, 2, 30, 15, '🔥', 8),

-- Social/Challenge Tasks
('daily_challenge', 'Daily Challenge', 'Complete the daily challenge', 'challenge', 'count', 1, 'random', 1, 3, 30, 20, '📅', 9),
('help_sync', 'Helping Hand', 'Help with a sync request', 'social', 'count', 1, 'heart', 2, 2, 50, 30, '🤝', 10),

-- Streak Tasks
('login_streak_3', '3-Day Streak', 'Maintain a 3-day login streak', 'streak', 'days', 3, 'food', 2, 3, 25, 15, '🔥', 11),
('login_streak_7', 'Weekly Warrior', 'Maintain a 7-day login streak', 'streak', 'days', 7, 'medicine', 1, 1, 100, 50, '💪', 12),
('learning_10min', 'Study Session', 'Spend 10 minutes learning', 'streak', 'time_minutes', 10, 'food', 1, 2, 15, 10, '⏱️', 13),

-- Bonus Tasks
('complete_all_daily', 'Daily Completionist', 'Complete all other daily tasks', 'challenge', 'count', 1, 'random', 3, 5, 100, 50, '🌟', 99);

-- ============================================
-- 4. View for User Daily Tasks with Progress
-- ============================================
CREATE OR REPLACE VIEW v_user_daily_tasks AS
SELECT
    udpt.id AS progress_id,
    udpt.user_id,
    udpt.task_date,
    dpt.id AS task_id,
    dpt.task_code,
    dpt.task_name,
    dpt.description,
    dpt.task_type,
    dpt.requirement_type,
    dpt.requirement_value,
    dpt.reward_item_category,
    dpt.reward_quantity_min,
    dpt.reward_quantity_max,
    dpt.reward_coins,
    dpt.reward_xp,
    dpt.icon,
    dpt.sort_order,
    COALESCE(udpt.current_progress, 0) AS current_progress,
    COALESCE(udpt.is_completed, FALSE) AS is_completed,
    udpt.completed_at,
    COALESCE(udpt.reward_claimed, FALSE) AS reward_claimed,
    udpt.claimed_at,
    udpt.items_rewarded,
    CASE
        WHEN dpt.requirement_value > 0 THEN ROUND((COALESCE(udpt.current_progress, 0) / dpt.requirement_value) * 100, 1)
        ELSE 100
    END AS progress_percent
FROM daily_pet_tasks dpt
LEFT JOIN user_daily_pet_tasks udpt ON dpt.id = udpt.task_id
WHERE dpt.is_active = TRUE
ORDER BY dpt.sort_order;

-- ============================================
-- 5. Stored Procedure: Initialize Daily Tasks for User
-- ============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_init_daily_tasks(IN p_user_id INT, IN p_date DATE)
BEGIN
    -- Insert missing task entries for the user on given date
    INSERT IGNORE INTO user_daily_pet_tasks (user_id, task_id, task_date)
    SELECT p_user_id, id, p_date
    FROM daily_pet_tasks
    WHERE is_active = TRUE;
END //

DELIMITER ;

-- ============================================
-- 6. Stored Procedure: Update Task Progress
-- ============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_update_task_progress(
    IN p_user_id INT,
    IN p_task_code VARCHAR(50),
    IN p_increment INT,
    IN p_set_value INT
)
BEGIN
    DECLARE v_task_id INT;
    DECLARE v_requirement_value INT;
    DECLARE v_today DATE DEFAULT CURDATE();

    -- Get task info
    SELECT id, requirement_value INTO v_task_id, v_requirement_value
    FROM daily_pet_tasks
    WHERE task_code = p_task_code AND is_active = TRUE
    LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Initialize task if not exists
        INSERT IGNORE INTO user_daily_pet_tasks (user_id, task_id, task_date)
        VALUES (p_user_id, v_task_id, v_today);

        -- Update progress
        IF p_set_value IS NOT NULL THEN
            -- Set to specific value
            UPDATE user_daily_pet_tasks
            SET current_progress = LEAST(p_set_value, v_requirement_value),
                is_completed = (p_set_value >= v_requirement_value),
                completed_at = IF(p_set_value >= v_requirement_value AND completed_at IS NULL, NOW(), completed_at)
            WHERE user_id = p_user_id AND task_id = v_task_id AND task_date = v_today;
        ELSE
            -- Increment progress
            UPDATE user_daily_pet_tasks
            SET current_progress = LEAST(current_progress + COALESCE(p_increment, 1), v_requirement_value),
                is_completed = (current_progress + COALESCE(p_increment, 1) >= v_requirement_value),
                completed_at = IF(current_progress + COALESCE(p_increment, 1) >= v_requirement_value AND completed_at IS NULL, NOW(), completed_at)
            WHERE user_id = p_user_id AND task_id = v_task_id AND task_date = v_today;
        END IF;
    END IF;
END //

DELIMITER ;

-- ============================================
-- Done
-- ============================================
SELECT 'Migration 025_daily_pet_tasks completed successfully' AS status;
