-- Migration 026: Random Daily Tasks System
-- Implements random task selection per user per day for variety

-- ============================================
-- 1. Add Columns for Task Randomization
-- ============================================
ALTER TABLE daily_pet_tasks
ADD COLUMN IF NOT EXISTS is_always_shown BOOLEAN DEFAULT FALSE COMMENT 'If TRUE, task always appears in daily list',
ADD COLUMN IF NOT EXISTS weight INT DEFAULT 10 COMMENT 'Selection weight (higher = more likely to be picked)',
ADD COLUMN IF NOT EXISTS difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'easy' COMMENT 'Task difficulty level';

-- ============================================
-- 2. Update Existing Tasks with Difficulty and Always-Show Status
-- ============================================

-- Always shown tasks (core daily activities)
UPDATE daily_pet_tasks SET is_always_shown = TRUE, difficulty = 'easy'
WHERE task_code IN ('complete_5_reviews', 'win_1_game', 'daily_challenge');

-- Easy tasks (weight 15 = more likely)
UPDATE daily_pet_tasks SET weight = 15, difficulty = 'easy'
WHERE task_code IN ('complete_5_reviews', 'score_70_exercise', 'win_1_game', 'learning_10min');

-- Medium tasks (weight 10 = normal)
UPDATE daily_pet_tasks SET weight = 10, difficulty = 'medium'
WHERE task_code IN ('complete_10_reviews', 'win_3_games', 'high_score_game', 'daily_challenge', 'login_streak_3');

-- Hard tasks (weight 5 = less likely)
UPDATE daily_pet_tasks SET weight = 5, difficulty = 'hard'
WHERE task_code IN ('score_90_exercise', 'perfect_exercise', 'help_sync', 'login_streak_7');

-- Bonus task (never randomly selected, only shown when relevant)
UPDATE daily_pet_tasks SET weight = 0, difficulty = 'hard', is_always_shown = FALSE
WHERE task_code = 'complete_all_daily';

-- ============================================
-- 3. Drop Old Stored Procedure
-- ============================================
DROP PROCEDURE IF EXISTS sp_init_daily_tasks;

-- ============================================
-- 4. Create New Random Task Selection Procedure
-- ============================================
DELIMITER //

CREATE PROCEDURE sp_init_daily_tasks(IN p_user_id INT, IN p_date DATE)
BEGIN
    DECLARE v_seed INT;
    DECLARE v_has_tasks INT;
    DECLARE v_target_count INT DEFAULT 8; -- Target number of daily tasks

    -- Check if user already has tasks for this date
    SELECT COUNT(*) INTO v_has_tasks
    FROM user_daily_pet_tasks
    WHERE user_id = p_user_id AND task_date = p_date;

    -- Only initialize if no tasks exist for this date
    IF v_has_tasks = 0 THEN
        -- Generate reproducible seed from user_id + date
        -- This ensures same user sees same tasks on same day, but different tasks on different days
        SET v_seed = p_user_id * 1000 + DATEDIFF(p_date, '2020-01-01');

        -- Step 1: Insert always-shown tasks
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE is_active = TRUE AND is_always_shown = TRUE;

        -- Step 2: Insert one easy task (if not already added)
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE is_active = TRUE
          AND is_always_shown = FALSE
          AND difficulty = 'easy'
          AND weight > 0
          AND id NOT IN (
              SELECT task_id FROM user_daily_pet_tasks
              WHERE user_id = p_user_id AND task_date = p_date
          )
        ORDER BY RAND(v_seed)
        LIMIT 1;

        -- Step 3: Insert one medium task
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE is_active = TRUE
          AND is_always_shown = FALSE
          AND difficulty = 'medium'
          AND weight > 0
          AND id NOT IN (
              SELECT task_id FROM user_daily_pet_tasks
              WHERE user_id = p_user_id AND task_date = p_date
          )
        ORDER BY RAND(v_seed + 1)
        LIMIT 1;

        -- Step 4: Insert one hard task
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE is_active = TRUE
          AND is_always_shown = FALSE
          AND difficulty = 'hard'
          AND weight > 0
          AND id NOT IN (
              SELECT task_id FROM user_daily_pet_tasks
              WHERE user_id = p_user_id AND task_date = p_date
          )
        ORDER BY RAND(v_seed + 2)
        LIMIT 1;

        -- Step 5: Fill remaining slots with weighted random selection
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE is_active = TRUE
          AND is_always_shown = FALSE
          AND weight > 0
          AND id NOT IN (
              SELECT task_id FROM user_daily_pet_tasks
              WHERE user_id = p_user_id AND task_date = p_date
          )
        ORDER BY -LOG(1 - RAND(v_seed + 3)) / weight -- Weighted random selection
        LIMIT GREATEST(0, v_target_count - (SELECT COUNT(*) FROM user_daily_pet_tasks WHERE user_id = p_user_id AND task_date = p_date));

        -- Step 6: Always add the "complete_all_daily" bonus task at the end
        INSERT INTO user_daily_pet_tasks (user_id, task_id, task_date)
        SELECT p_user_id, id, p_date
        FROM daily_pet_tasks
        WHERE task_code = 'complete_all_daily' AND is_active = TRUE
          AND id NOT IN (
              SELECT task_id FROM user_daily_pet_tasks
              WHERE user_id = p_user_id AND task_date = p_date
          );
    END IF;
END //

DELIMITER ;

-- ============================================
-- 5. Helper View: Task Selection Pool
-- ============================================
CREATE OR REPLACE VIEW v_daily_task_pool AS
SELECT
    id,
    task_code,
    task_name,
    difficulty,
    weight,
    is_always_shown,
    CASE
        WHEN is_always_shown THEN 'Always'
        WHEN weight >= 15 THEN 'High'
        WHEN weight >= 10 THEN 'Normal'
        WHEN weight >= 5 THEN 'Low'
        ELSE 'Never'
    END AS selection_chance
FROM daily_pet_tasks
WHERE is_active = TRUE
ORDER BY is_always_shown DESC, weight DESC, sort_order;

-- ============================================
-- Done
-- ============================================
SELECT 'Migration 026_random_daily_tasks completed successfully' AS status;
