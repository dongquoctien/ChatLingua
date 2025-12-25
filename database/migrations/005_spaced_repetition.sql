-- Migration: Spaced Repetition System (SM2 Algorithm)
-- Adds SM2 fields to vocabulary, review tracking, daily queue, and learning goals

-- ============================================================
-- Step 1: Add SM2 fields to vocabulary table
-- ============================================================
ALTER TABLE vocabulary
ADD COLUMN next_review_at TIMESTAMP NULL COMMENT 'Next scheduled review date',
ADD COLUMN review_interval INT DEFAULT 0 COMMENT 'Current interval in days',
ADD COLUMN ease_factor DECIMAL(4,2) DEFAULT 2.50 COMMENT 'SM2 ease factor (1.3-5.0)',
ADD COLUMN repetition_count INT DEFAULT 0 COMMENT 'Number of successful reviews',
ADD COLUMN lapse_count INT DEFAULT 0 COMMENT 'Number of times forgotten',
ADD COLUMN review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new' COMMENT 'Current learning stage',
ADD INDEX idx_next_review (user_id, next_review_at, review_status),
ADD INDEX idx_review_status (user_id, review_status);

-- ============================================================
-- Step 2: Create vocabulary_reviews table (review history)
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vocabulary_id INT NOT NULL,
    quality INT NOT NULL COMMENT '0-5 rating: 0=blackout, 1=wrong, 2=hard, 3=good, 4=easy, 5=perfect',
    ease_factor_before DECIMAL(4,2) NOT NULL COMMENT 'EF before review',
    ease_factor_after DECIMAL(4,2) NOT NULL COMMENT 'EF after review',
    interval_before INT NOT NULL COMMENT 'Interval before review (days)',
    interval_after INT NOT NULL COMMENT 'Interval after review (days)',
    review_type ENUM('flashcard', 'quiz', 'exercise') DEFAULT 'flashcard',
    direction ENUM('vi_to_en', 'en_to_vi') DEFAULT 'vi_to_en' COMMENT 'Flashcard direction',
    time_spent_seconds INT DEFAULT 0 COMMENT 'Time spent on this review',
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
    INDEX idx_user_reviewed (user_id, reviewed_at),
    INDEX idx_vocab_reviewed (vocabulary_id, reviewed_at)
);

-- ============================================================
-- Step 3: Create daily_review_queue table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_review_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vocabulary_id INT NOT NULL,
    queue_date DATE NOT NULL COMMENT 'Date this item is queued for',
    priority ENUM('overdue', 'due', 'new') DEFAULT 'due' COMMENT 'Review priority',
    queue_order INT DEFAULT 0 COMMENT 'Order within priority group',
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    quality_rating INT NULL COMMENT 'Rating given when completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
    UNIQUE KEY unique_queue_item (user_id, vocabulary_id, queue_date),
    INDEX idx_queue (user_id, queue_date, is_completed, priority)
);

-- ============================================================
-- Step 4: Create learning_goals table
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    daily_new_words INT DEFAULT 5 COMMENT 'New words to learn per day',
    daily_reviews INT DEFAULT 20 COMMENT 'Total reviews per day target',
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TIME DEFAULT '09:00:00' COMMENT 'Daily reminder time',
    preferred_direction ENUM('vi_to_en', 'en_to_vi', 'mixed') DEFAULT 'mixed' COMMENT 'Default flashcard direction',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_goal (user_id)
);

-- ============================================================
-- Step 5: Create review_streaks table
-- ============================================================
CREATE TABLE IF NOT EXISTS review_streaks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    current_streak INT DEFAULT 0 COMMENT 'Current consecutive days',
    longest_streak INT DEFAULT 0 COMMENT 'Best streak ever',
    last_review_date DATE NULL COMMENT 'Last date user completed reviews',
    streak_start_date DATE NULL COMMENT 'When current streak started',
    total_review_days INT DEFAULT 0 COMMENT 'Total days with reviews',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_streak (user_id)
);

-- ============================================================
-- Step 6: Initialize existing vocabulary with SM2 defaults
-- ============================================================
-- Set next_review_at for existing vocabulary based on mastery_level
UPDATE vocabulary
SET
    next_review_at = CASE
        WHEN mastery_level >= 80 THEN DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHEN mastery_level >= 50 THEN DATE_ADD(NOW(), INTERVAL 3 DAY)
        WHEN mastery_level >= 20 THEN DATE_ADD(NOW(), INTERVAL 1 DAY)
        ELSE NOW()
    END,
    review_status = CASE
        WHEN mastery_level >= 80 THEN 'mastered'
        WHEN mastery_level >= 50 THEN 'reviewing'
        WHEN times_practiced > 0 THEN 'learning'
        ELSE 'new'
    END,
    ease_factor = CASE
        WHEN mastery_level >= 80 THEN 2.8
        WHEN mastery_level >= 50 THEN 2.5
        ELSE 2.5
    END,
    review_interval = CASE
        WHEN mastery_level >= 80 THEN 7
        WHEN mastery_level >= 50 THEN 3
        WHEN mastery_level >= 20 THEN 1
        ELSE 0
    END,
    repetition_count = FLOOR(times_practiced / 2)
WHERE next_review_at IS NULL;

-- ============================================================
-- Step 7: Create default learning goals for existing users
-- ============================================================
INSERT INTO learning_goals (user_id, daily_new_words, daily_reviews)
SELECT id, 5, 20 FROM users
WHERE id NOT IN (SELECT user_id FROM learning_goals);

-- ============================================================
-- Step 8: Create default streaks for existing users
-- ============================================================
INSERT INTO review_streaks (user_id, current_streak, longest_streak)
SELECT id, 0, 0 FROM users
WHERE id NOT IN (SELECT user_id FROM review_streaks);
