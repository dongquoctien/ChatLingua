-- Migration 039: Word Map Achievements
-- Adds achievement rows for Word Map learning milestones

-- ============================================================
-- 1. Word Map Lesson Milestones
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
-- Lesson milestones
('WM_LESSON_1', 'First Lesson', 'Complete your first Word Map lesson', 'learning', 'fa-book-reader', 25, 100, FALSE),
('WM_LESSON_10', 'Lesson Learner', 'Complete 10 Word Map lessons', 'learning', 'fa-book-open-reader', 75, 101, FALSE),
('WM_LESSON_25', 'Dedicated Student', 'Complete 25 Word Map lessons', 'milestone', 'fa-user-graduate', 150, 102, FALSE),
('WM_LESSON_50', 'Lesson Master', 'Complete 50 Word Map lessons', 'milestone', 'fa-chalkboard-teacher', 300, 103, FALSE),
('WM_LESSON_100', 'Century Scholar', 'Complete 100 Word Map lessons', 'milestone', 'fa-scroll', 500, 104, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 2. Word Map Unit Milestones
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_UNIT_1', 'Unit Complete', 'Complete your first Word Map unit', 'learning', 'fa-layer-group', 50, 110, FALSE),
('WM_UNIT_5', 'Unit Champion', 'Complete 5 Word Map units', 'milestone', 'fa-cubes', 150, 111, FALSE),
('WM_UNIT_10', 'Unit Master', 'Complete 10 Word Map units', 'milestone', 'fa-sitemap', 300, 112, FALSE),
('WM_UNIT_20', 'Unit Legend', 'Complete 20 Word Map units', 'milestone', 'fa-building-columns', 500, 113, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 3. Word Map Completion Milestones
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_MAP_1', 'Course Complete', 'Complete your first Word Map course', 'milestone', 'fa-map', 200, 120, FALSE),
('WM_MAP_3', 'Course Collector', 'Complete 3 Word Map courses', 'milestone', 'fa-atlas', 500, 121, FALSE),
('WM_MAP_5', 'Course Master', 'Complete 5 Word Map courses', 'milestone', 'fa-earth-americas', 1000, 122, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 4. Exam Performance Achievements
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_EXAM_PASS', 'First Exam', 'Pass your first Word Map lesson exam', 'quiz', 'fa-clipboard-check', 30, 130, FALSE),
('WM_EXAM_PERFECT', 'Perfect Exam', 'Score 100% on a Word Map lesson exam', 'quiz', 'fa-star', 100, 131, FALSE),
('WM_EXAM_FIRST_TRY', 'First Try Pass', 'Pass a Word Map exam on first attempt with 80%+', 'quiz', 'fa-bullseye', 75, 132, FALSE),
('WM_EXAM_5_PERFECT', 'Exam Expert', 'Score 100% on 5 Word Map exams', 'quiz', 'fa-award', 250, 133, FALSE),
('WM_EXAM_10_PASSED', 'Exam Champion', 'Pass 10 Word Map exams', 'milestone', 'fa-trophy', 200, 134, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 5. Word Map Vocabulary Milestones
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_VOCAB_50', 'Word Explorer', 'Learn 50 vocabulary words from Word Maps', 'learning', 'fa-language', 75, 140, FALSE),
('WM_VOCAB_100', 'Word Builder', 'Learn 100 vocabulary words from Word Maps', 'milestone', 'fa-spell-check', 150, 141, FALSE),
('WM_VOCAB_250', 'Word Scholar', 'Learn 250 vocabulary words from Word Maps', 'milestone', 'fa-book', 300, 142, FALSE),
('WM_VOCAB_500', 'Word Master', 'Learn 500 vocabulary words from Word Maps', 'milestone', 'fa-brain', 500, 143, FALSE),
('WM_VOCAB_1000', 'Vocabulary Legend', 'Learn 1000 vocabulary words from Word Maps', 'milestone', 'fa-crown', 1000, 144, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 6. Word Map Streak Achievements
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_STREAK_7', 'Weekly Learner', 'Study Word Maps for 7 consecutive days', 'streak', 'fa-calendar-week', 100, 150, FALSE),
('WM_STREAK_14', 'Two Week Streak', 'Study Word Maps for 14 consecutive days', 'streak', 'fa-calendar-check', 200, 151, FALSE),
('WM_STREAK_30', 'Monthly Scholar', 'Study Word Maps for 30 consecutive days', 'streak', 'fa-calendar-days', 400, 152, FALSE),
('WM_STREAK_60', 'Dedicated Learner', 'Study Word Maps for 60 consecutive days', 'streak', 'fa-fire', 800, 153, TRUE),
('WM_STREAK_100', 'Century Streak', 'Study Word Maps for 100 consecutive days', 'streak', 'fa-fire-flame-curved', 1500, 154, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 7. CEFR Level Completion Achievements
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('CEFR_A1_COMPLETE', 'A1 Beginner', 'Complete all A1 level Word Maps', 'milestone', 'fa-seedling', 500, 160, FALSE),
('CEFR_A2_COMPLETE', 'A2 Elementary', 'Complete all A2 level Word Maps', 'milestone', 'fa-plant-wilt', 750, 161, FALSE),
('CEFR_B1_COMPLETE', 'B1 Intermediate', 'Complete all B1 level Word Maps', 'milestone', 'fa-tree', 1000, 162, FALSE),
('CEFR_B2_COMPLETE', 'B2 Upper-Intermediate', 'Complete all B2 level Word Maps', 'milestone', 'fa-mountain', 1500, 163, FALSE),
('CEFR_C1_COMPLETE', 'C1 Advanced', 'Complete all C1 level Word Maps', 'milestone', 'fa-mountain-sun', 2000, 164, TRUE),
('CEFR_C2_COMPLETE', 'C2 Proficient', 'Complete all C2 level Word Maps', 'milestone', 'fa-gem', 3000, 165, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- 8. Speed and Performance Achievements
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden) VALUES
('WM_SPEED_LESSON', 'Quick Study', 'Complete a lesson study in under 5 minutes', 'speed', 'fa-bolt', 50, 170, FALSE),
('WM_SPEED_EXAM', 'Fast Thinker', 'Pass an exam in under 2 minutes with 90%+', 'speed', 'fa-bolt-lightning', 100, 171, FALSE),
('WM_5_LESSONS_DAY', 'Study Marathon', 'Complete 5 lessons in a single day', 'learning', 'fa-person-running', 150, 172, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ============================================================
-- Done
-- ============================================================
SELECT 'Migration 039_word_map_achievements completed - Added Word Map achievements' AS status;
