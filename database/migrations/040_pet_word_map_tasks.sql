-- Migration 040: Pet Daily Tasks for Word Map
-- Adds new daily task types for Word Map learning activities

-- ============================================================
-- 1. Add Word Map specific daily tasks
-- ============================================================
INSERT INTO daily_pet_tasks (task_code, task_name, description, task_type, requirement_type, requirement_value, reward_item_category, reward_quantity_min, reward_quantity_max, reward_coins, reward_xp, icon, sort_order) VALUES
-- Word Map Study Tasks
('word_map_study', 'Lesson Complete', 'Complete 1 Word Map lesson study', 'exercise', 'count', 1, 'food', 2, 3, 25, 15, '📖', 20),
('word_map_study_3', 'Study Session', 'Complete 3 Word Map lessons', 'exercise', 'count', 3, 'food', 3, 4, 50, 30, '📚', 21),

-- Word Map Vocabulary Tasks
('word_map_vocab_10', 'Word Learner', 'Study 10 vocabulary from Word Maps', 'review', 'count', 10, 'food', 2, 2, 20, 10, '🔤', 22),
('word_map_vocab_25', 'Word Scholar', 'Study 25 vocabulary from Word Maps', 'review', 'count', 25, 'heart', 1, 2, 40, 25, '📝', 23),

-- Word Map Exam Tasks
('word_map_exam', 'Exam Taker', 'Pass any Word Map lesson exam', 'exercise', 'count', 1, 'toy', 2, 3, 30, 20, '✅', 24),
('word_map_exam_perfect', 'Perfect Exam', 'Score 100% on a Word Map exam', 'exercise', 'score_percent', 100, 'heart', 2, 3, 75, 40, '🏆', 25),

-- Word Map Review Tasks
('word_map_review_20', 'Review Master', 'Review 20 Word Map vocabulary items', 'review', 'count', 20, 'food', 2, 3, 30, 20, '🔄', 26),
('word_map_review_50', 'Review Champion', 'Review 50 Word Map vocabulary items', 'review', 'count', 50, 'random', 2, 4, 60, 35, '💪', 27),

-- Word Map Grammar Tasks
('word_map_grammar_5', 'Grammar Learner', 'Study 5 grammar points from Word Maps', 'review', 'count', 5, 'food', 1, 2, 20, 15, '📐', 28),

-- Word Map Streak Tasks
('word_map_daily', 'Daily Word Map', 'Complete at least 1 Word Map activity today', 'streak', 'count', 1, 'food', 1, 2, 15, 10, '📅', 29)

ON DUPLICATE KEY UPDATE
    task_name = VALUES(task_name),
    description = VALUES(description),
    reward_item_category = VALUES(reward_item_category),
    reward_quantity_min = VALUES(reward_quantity_min),
    reward_quantity_max = VALUES(reward_quantity_max),
    reward_coins = VALUES(reward_coins),
    reward_xp = VALUES(reward_xp);

-- ============================================================
-- 2. Update existing review tasks to specify source
-- ============================================================
-- These are general review tasks that work with both conversation and Word Map vocabulary

UPDATE daily_pet_tasks
SET description = 'Complete 5 vocabulary reviews (any source)'
WHERE task_code = 'complete_5_reviews';

UPDATE daily_pet_tasks
SET description = 'Complete 10 vocabulary reviews (any source)'
WHERE task_code = 'complete_10_reviews';

-- ============================================================
-- Done
-- ============================================================
SELECT 'Migration 040_pet_word_map_tasks completed - Added Word Map pet tasks' AS status;
