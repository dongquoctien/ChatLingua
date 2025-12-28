-- Migration: Advanced Grammar Exercises with SM2 Spaced Repetition
-- Adds SM2 review system for grammar points and grammar-specific exercises

-- ============================================================
-- Step 1: Add SM2 fields to grammar_points table
-- ============================================================
ALTER TABLE grammar_points
ADD COLUMN next_review_at TIMESTAMP NULL COMMENT 'Next scheduled review date',
ADD COLUMN review_interval INT DEFAULT 0 COMMENT 'Current interval in days',
ADD COLUMN ease_factor DECIMAL(4,2) DEFAULT 2.50 COMMENT 'SM2 ease factor (1.3-5.0)',
ADD COLUMN repetition_count INT DEFAULT 0 COMMENT 'Number of successful reviews',
ADD COLUMN lapse_count INT DEFAULT 0 COMMENT 'Number of times forgotten',
ADD COLUMN review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new' COMMENT 'Current learning stage',
ADD COLUMN mastery_level INT DEFAULT 0 COMMENT 'Mastery percentage 0-100',
ADD COLUMN last_reviewed_at TIMESTAMP NULL COMMENT 'Last review timestamp';

CREATE INDEX idx_grammar_next_review ON grammar_points(user_id, next_review_at, review_status);
CREATE INDEX idx_grammar_review_status ON grammar_points(user_id, review_status);

-- ============================================================
-- Step 2: Create grammar_exercises table
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    grammar_point_id INT NULL COMMENT 'Related grammar point, if any',
    exercise_type ENUM(
        'error_correction',
        'verb_conjugation',
        'tense_selection',
        'article_usage',
        'preposition_fill',
        'sentence_transformation',
        'word_order'
    ) NOT NULL,
    question TEXT NOT NULL,
    options JSON NULL COMMENT 'Options for selection-based exercises',
    correct_answer TEXT NOT NULL,
    explanation TEXT NULL COMMENT 'Explanation of the correct answer',
    category VARCHAR(100) NULL COMMENT 'Grammar category (tenses, articles, etc.)',
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    error_position INT NULL COMMENT 'For error_correction: position of error',
    verb_data JSON NULL COMMENT 'For verb_conjugation: {base, tense, subject}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grammar_point_id) REFERENCES grammar_points(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_id, exercise_type),
    INDEX idx_grammar_point (grammar_point_id)
);

-- ============================================================
-- Step 3: Create grammar_exercise_attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_exercise_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grammar_exercise_id INT NOT NULL,
    user_id INT NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grammar_exercise_id) REFERENCES grammar_exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_exercise (user_id, grammar_exercise_id)
);

-- ============================================================
-- Step 4: Create grammar_reviews table (SM2 history)
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    grammar_point_id INT NOT NULL,
    quality INT NOT NULL COMMENT '0-5 rating: 0=blackout, 1=wrong, 2=hard, 3=good, 4=easy, 5=perfect',
    ease_factor_before DECIMAL(4,2) NOT NULL,
    ease_factor_after DECIMAL(4,2) NOT NULL,
    interval_before INT NOT NULL COMMENT 'Interval before review (days)',
    interval_after INT NOT NULL COMMENT 'Interval after review (days)',
    review_type ENUM('flashcard', 'quiz', 'exercise') DEFAULT 'flashcard',
    time_spent_seconds INT DEFAULT 0,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grammar_point_id) REFERENCES grammar_points(id) ON DELETE CASCADE,
    INDEX idx_user_reviewed (user_id, reviewed_at),
    INDEX idx_grammar_reviewed (grammar_point_id, reviewed_at)
);

-- ============================================================
-- Step 5: Create daily_grammar_queue table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_grammar_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    grammar_point_id INT NOT NULL,
    queue_date DATE NOT NULL COMMENT 'Date this item is queued for',
    priority ENUM('overdue', 'due', 'new') DEFAULT 'due' COMMENT 'Review priority',
    queue_order INT DEFAULT 0 COMMENT 'Order within priority group',
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    quality_rating INT NULL COMMENT 'Rating given when completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grammar_point_id) REFERENCES grammar_points(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grammar_queue_item (user_id, grammar_point_id, queue_date),
    INDEX idx_queue (user_id, queue_date, is_completed, priority)
);

-- ============================================================
-- Step 6: Create grammar_learning_goals table
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_learning_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    daily_new_rules INT DEFAULT 2 COMMENT 'New grammar rules to learn per day',
    daily_reviews INT DEFAULT 10 COMMENT 'Total grammar reviews per day',
    focus_categories JSON NULL COMMENT 'Categories to focus on',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Step 7: Initialize existing grammar_points with SM2 defaults
-- ============================================================
UPDATE grammar_points
SET
    next_review_at = CASE
        WHEN times_practiced >= 10 THEN DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHEN times_practiced >= 5 THEN DATE_ADD(NOW(), INTERVAL 3 DAY)
        WHEN times_practiced >= 1 THEN DATE_ADD(NOW(), INTERVAL 1 DAY)
        ELSE NOW()
    END,
    review_status = CASE
        WHEN times_practiced >= 10 THEN 'mastered'
        WHEN times_practiced >= 5 THEN 'reviewing'
        WHEN times_practiced >= 1 THEN 'learning'
        ELSE 'new'
    END,
    ease_factor = CASE
        WHEN times_practiced >= 10 THEN 2.8
        WHEN times_practiced >= 5 THEN 2.5
        ELSE 2.5
    END,
    review_interval = CASE
        WHEN times_practiced >= 10 THEN 7
        WHEN times_practiced >= 5 THEN 3
        WHEN times_practiced >= 1 THEN 1
        ELSE 0
    END,
    repetition_count = times_practiced,
    mastery_level = LEAST(100, times_practiced * 10)
WHERE next_review_at IS NULL;

-- ============================================================
-- Step 8: Create default grammar learning goals for existing users
-- ============================================================
INSERT INTO grammar_learning_goals (user_id, daily_new_rules, daily_reviews)
SELECT id, 2, 10 FROM users
WHERE id NOT IN (SELECT user_id FROM grammar_learning_goals);
