-- Migration: Gamification System
-- Adds achievements, XP/levels, daily challenges, leaderboards, and adaptive difficulty

-- ============================================================
-- Step 1: Achievements System
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    achievement_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('learning', 'streak', 'quiz', 'speed', 'milestone') NOT NULL,
    icon VARCHAR(100) NOT NULL,
    xp_reward INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE COMMENT 'Hidden achievements shown after unlock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP NULL DEFAULT NULL COMMENT 'NULL until achievement is unlocked',
    progress_value INT DEFAULT 0 COMMENT 'Current progress toward achievement',
    progress_target INT DEFAULT 1 COMMENT 'Target value to unlock',
    notified BOOLEAN DEFAULT FALSE COMMENT 'User has been notified',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user_unlocked (user_id, unlocked_at)
);

-- ============================================================
-- Step 2: XP & Levels System
-- ============================================================
CREATE TABLE IF NOT EXISTS level_definitions (
    level INT PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    xp_required INT NOT NULL COMMENT 'Total XP needed to reach this level',
    badge_color VARCHAR(20) DEFAULT '#6366f1' COMMENT 'Badge color for this level'
);

CREATE TABLE IF NOT EXISTS user_xp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    title VARCHAR(50) DEFAULT 'Beginner',
    xp_to_next_level INT DEFAULT 100 COMMENT 'XP needed for next level',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS xp_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    xp_amount INT NOT NULL COMMENT 'Can be positive or negative',
    source ENUM('exercise', 'quiz', 'review', 'streak', 'achievement', 'challenge', 'bonus') NOT NULL,
    source_id INT NULL COMMENT 'ID of related entity (exercise_id, quiz_id, etc.)',
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_source (source, source_id)
);

-- ============================================================
-- Step 3: Daily Challenges System
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    challenge_type ENUM('spelling', 'speed_quiz', 'translation', 'streak', 'vocabulary', 'perfect_score', 'review', 'exercise') NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    target_value INT NOT NULL COMMENT 'Value to complete challenge',
    xp_reward INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    day_of_week TINYINT NULL COMMENT 'NULL=any day, 0=Sun, 1=Mon, etc.',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_id INT NOT NULL,
    challenge_date DATE NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'expired') DEFAULT 'pending',
    current_progress INT DEFAULT 0,
    target_value INT NOT NULL,
    xp_reward INT NOT NULL,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES challenge_templates(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_challenge_date (user_id, template_id, challenge_date),
    INDEX idx_user_status (user_id, status, challenge_date)
);

-- ============================================================
-- Step 4: Weekly Leaderboard
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_leaderboards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    week_start DATE NOT NULL COMMENT 'Monday of the week',
    total_xp INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    reviews_completed INT DEFAULT 0,
    quizzes_completed INT DEFAULT 0,
    rank_position INT NULL COMMENT 'Calculated weekly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_week (user_id, week_start),
    INDEX idx_week_xp (week_start, total_xp DESC)
);

-- ============================================================
-- Step 5: Adaptive Difficulty Profile
-- ============================================================
CREATE TABLE IF NOT EXISTS user_difficulty_profile (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    current_difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    performance_score DECIMAL(5,2) DEFAULT 50.00 COMMENT '0-100 rolling accuracy',
    exercises_at_level INT DEFAULT 0 COMMENT 'Exercises completed at current level',
    auto_adjust_enabled BOOLEAN DEFAULT TRUE,
    last_adjustment_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Step 6: Notification Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type ENUM('achievement', 'level_up', 'challenge', 'streak', 'leaderboard') NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(100) NULL,
    action_url VARCHAR(255) NULL,
    metadata JSON NULL COMMENT 'Additional data for rendering',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read, created_at)
);

-- ============================================================
-- Step 7: Seed Level Definitions
-- ============================================================
INSERT INTO level_definitions (level, title, xp_required, badge_color) VALUES
(1, 'Beginner', 0, '#9ca3af'),
(2, 'Novice', 100, '#84cc16'),
(3, 'Learner', 250, '#22c55e'),
(4, 'Student', 500, '#14b8a6'),
(5, 'Practitioner', 1000, '#06b6d4'),
(6, 'Competent', 2000, '#3b82f6'),
(7, 'Proficient', 3500, '#6366f1'),
(8, 'Advanced', 5500, '#8b5cf6'),
(9, 'Expert', 8000, '#a855f7'),
(10, 'Master', 12000, '#ec4899'),
(11, 'Grandmaster', 18000, '#f43f5e'),
(12, 'Legend', 25000, '#f59e0b')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================
-- Step 8: Seed Achievement Definitions
-- ============================================================
INSERT INTO achievements (achievement_code, name, description, category, icon, xp_reward, sort_order) VALUES
-- Learning Achievements
('FIRST_STEPS', 'First Steps', 'Complete your first exercise', 'learning', 'fa-baby-carriage', 10, 1),
('VOCAB_10', 'Word Collector', 'Learn 10 vocabulary words', 'learning', 'fa-book', 20, 2),
('VOCAB_50', 'Vocabulary Builder', 'Learn 50 vocabulary words', 'learning', 'fa-book-open', 50, 3),
('VOCAB_100', 'Word Master', 'Learn 100 vocabulary words', 'milestone', 'fa-graduation-cap', 100, 4),
('VOCAB_500', 'Lexicon Legend', 'Learn 500 vocabulary words', 'milestone', 'fa-crown', 250, 5),
('EXERCISE_10', 'Getting Started', 'Complete 10 exercises', 'learning', 'fa-dumbbell', 15, 6),
('EXERCISE_50', 'Practice Makes Perfect', 'Complete 50 exercises', 'learning', 'fa-medal', 40, 7),
('EXERCISE_100', 'Exercise Expert', 'Complete 100 exercises', 'milestone', 'fa-trophy', 100, 8),

-- Streak Achievements
('STREAK_3', 'Consistent', 'Maintain a 3-day streak', 'streak', 'fa-fire', 30, 20),
('STREAK_7', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 'fa-fire-flame-curved', 70, 21),
('STREAK_14', 'Fortnight Fighter', 'Maintain a 14-day streak', 'streak', 'fa-fire-flame-simple', 150, 22),
('STREAK_30', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'fa-volcano', 300, 23),
('STREAK_100', 'Century Streak', 'Maintain a 100-day streak', 'milestone', 'fa-star', 1000, 24),

-- Quiz Achievements
('QUIZ_FIRST', 'Quiz Taker', 'Complete your first quiz', 'quiz', 'fa-clipboard-question', 15, 40),
('QUIZ_10', 'Quiz Pro', 'Complete 10 quizzes', 'quiz', 'fa-clipboard-check', 50, 41),
('PERFECT_QUIZ', 'Perfect Score', 'Score 100% on any quiz', 'quiz', 'fa-100', 50, 42),
('PERFECT_QUIZ_3', 'Triple Perfection', 'Score 100% on 3 quizzes', 'quiz', 'fa-star', 150, 43),

-- Speed Achievements
('SPEED_DEMON', 'Speed Demon', 'Complete a quiz in under 2 minutes with 80%+ score', 'speed', 'fa-bolt', 75, 60),
('LIGHTNING', 'Lightning Fast', 'Complete 5 exercises in under 30 seconds each', 'speed', 'fa-bolt-lightning', 50, 61),

-- Milestone Achievements
('LEVEL_5', 'Rising Star', 'Reach level 5', 'milestone', 'fa-arrow-up', 50, 80),
('LEVEL_10', 'Master Learner', 'Reach level 10', 'milestone', 'fa-gem', 200, 81),
('CHALLENGE_7', 'Challenge Champion', 'Complete 7 daily challenges', 'milestone', 'fa-calendar-check', 100, 82),
('CHALLENGE_30', 'Challenge Master', 'Complete 30 daily challenges', 'milestone', 'fa-calendar-days', 300, 83)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- Step 9: Seed Challenge Templates
-- ============================================================
INSERT INTO challenge_templates (challenge_type, name, description, target_value, xp_reward, difficulty, day_of_week) VALUES
-- Daily challenges (any day)
('exercise', 'Exercise Starter', 'Complete 3 exercises today', 3, 15, 'easy', NULL),
('exercise', 'Exercise Pro', 'Complete 10 exercises today', 10, 40, 'medium', NULL),
('review', 'Review Session', 'Review 5 vocabulary words', 5, 15, 'easy', NULL),
('review', 'Deep Review', 'Review 15 vocabulary words', 15, 35, 'medium', NULL),
('perfect_score', 'Accuracy Master', 'Get 5 correct answers in a row', 5, 30, 'medium', NULL),
('vocabulary', 'Word Hunter', 'Learn 3 new vocabulary words', 3, 20, 'easy', NULL),

-- Weekend challenges
('spelling', 'Spelling Bee', 'Complete 5 spelling exercises', 5, 40, 'medium', 6),
('speed_quiz', 'Speed Challenge', 'Complete a quiz in under 3 minutes', 1, 50, 'hard', 0),

-- Weekday specific
('streak', 'Monday Motivation', 'Complete at least 1 activity', 1, 10, 'easy', 1),
('translation', 'Translation Tuesday', 'Complete 5 translation exercises', 5, 35, 'medium', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- Step 10: Initialize gamification for existing users
-- ============================================================
INSERT INTO user_xp (user_id, total_xp, current_level, title)
SELECT id, 0, 1, 'Beginner' FROM users
WHERE id NOT IN (SELECT user_id FROM user_xp);

INSERT INTO user_difficulty_profile (user_id, current_difficulty, performance_score)
SELECT id, 'beginner', 50.00 FROM users
WHERE id NOT IN (SELECT user_id FROM user_difficulty_profile);
