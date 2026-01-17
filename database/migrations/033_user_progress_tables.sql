-- Migration: User Progress Tables for Version 3
-- Creates tables to track user learning progress with master content

-- ============================================================
-- 1. USER VOCABULARY TABLE
-- Links users to master vocabulary with personal progress/SM2 data
-- ============================================================
CREATE TABLE IF NOT EXISTS user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_vocabulary_id INT NOT NULL,

    -- Learning source (where did user encounter this word?)
    source_type ENUM('conversation', 'word_map', 'manual', 'game', 'import') NOT NULL DEFAULT 'word_map',
    source_id INT DEFAULT NULL COMMENT 'conversation_id, lesson_id, game_session_id, etc.',

    -- SM2 Spaced Repetition fields
    mastery_level INT DEFAULT 0 COMMENT '0-100 mastery percentage',
    times_practiced INT DEFAULT 0,
    last_practiced_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL COMMENT 'Next scheduled review',
    review_interval INT DEFAULT 0 COMMENT 'Current interval in days',
    ease_factor DECIMAL(4,2) DEFAULT 2.50 COMMENT 'SM2 ease factor (1.3-5.0)',
    repetition_count INT DEFAULT 0 COMMENT 'Number of successful reviews',
    lapse_count INT DEFAULT 0 COMMENT 'Number of times forgotten',
    review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new',

    -- User customizations
    user_notes TEXT DEFAULT NULL COMMENT 'Personal notes',
    is_favorited BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE COMMENT 'User can hide words they already know',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_vocabulary_id) REFERENCES master_vocabulary(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vocab (user_id, master_vocabulary_id),
    INDEX idx_user_review (user_id, next_review_at),
    INDEX idx_user_status (user_id, review_status),
    INDEX idx_source (source_type, source_id),
    INDEX idx_favorited (user_id, is_favorited)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. USER GRAMMAR TABLE
-- Links users to master grammar with personal progress/SM2 data
-- ============================================================
CREATE TABLE IF NOT EXISTS user_grammar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_grammar_id INT NOT NULL,

    -- Learning source
    source_type ENUM('conversation', 'word_map', 'manual', 'import') NOT NULL DEFAULT 'word_map',
    source_id INT DEFAULT NULL,

    -- SM2 Spaced Repetition fields
    mastery_level INT DEFAULT 0,
    times_practiced INT DEFAULT 0,
    last_practiced_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL,
    review_interval INT DEFAULT 0,
    ease_factor DECIMAL(4,2) DEFAULT 2.50,
    repetition_count INT DEFAULT 0,
    lapse_count INT DEFAULT 0,
    review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new',

    -- User customizations
    user_notes TEXT DEFAULT NULL,
    is_favorited BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_grammar_id) REFERENCES master_grammar(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_grammar (user_id, master_grammar_id),
    INDEX idx_user_review (user_id, next_review_at),
    INDEX idx_user_status (user_id, review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. USER EXERCISE ATTEMPTS TABLE
-- Records all exercise attempts for statistics and progress
-- ============================================================
CREATE TABLE IF NOT EXISTS user_exercise_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_exercise_id INT NOT NULL,

    -- Context (where was this exercise done?)
    context_type ENUM('practice', 'lesson_exam', 'unit_exam', 'game', 'review', 'quiz') NOT NULL,
    context_id INT DEFAULT NULL COMMENT 'lesson_exam_id, game_session_id, quiz_id, etc.',

    -- Attempt data
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT DEFAULT 0,
    points_earned INT DEFAULT 0,

    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_exercise_id) REFERENCES master_exercises(id) ON DELETE CASCADE,
    INDEX idx_user_exercise (user_id, master_exercise_id),
    INDEX idx_context (context_type, context_id),
    INDEX idx_user_date (user_id, attempted_at),
    INDEX idx_correct (user_id, is_correct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. USER MAP PROGRESS TABLE
-- Tracks overall progress on a Word Map
-- ============================================================
CREATE TABLE IF NOT EXISTS user_map_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT NOT NULL,

    -- Activation
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE COMMENT 'User can have multiple active maps',

    -- Current position
    current_unit_id INT DEFAULT NULL,
    current_lesson_id INT DEFAULT NULL,

    -- Progress metrics
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    units_completed INT DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    exams_passed INT DEFAULT 0,

    -- Stats
    total_study_time_minutes INT DEFAULT 0,
    total_xp_earned INT DEFAULT 0,
    total_vocabulary_learned INT DEFAULT 0,
    total_grammar_learned INT DEFAULT 0,

    -- Timestamps
    last_activity_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL COMMENT 'When entire map was completed',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (current_unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    FOREIGN KEY (current_lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_map (user_id, map_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_completion (completion_percentage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. USER UNIT PROGRESS TABLE
-- Tracks progress on individual units
-- ============================================================
CREATE TABLE IF NOT EXISTS user_unit_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    unit_id INT NOT NULL,
    map_progress_id INT NOT NULL,

    -- Status
    status ENUM('locked', 'unlocked', 'in_progress', 'completed') DEFAULT 'locked',
    unlocked_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    -- Progress metrics
    lessons_completed INT DEFAULT 0,
    boss_exams_passed INT DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Best scores for boss exams
    best_boss_exam_score DECIMAL(5,2) DEFAULT 0.00,
    total_exam_attempts INT DEFAULT 0,

    -- Stats
    study_time_minutes INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    vocabulary_learned INT DEFAULT 0,
    grammar_learned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    FOREIGN KEY (map_progress_id) REFERENCES user_map_progress(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_unit (user_id, unit_id),
    INDEX idx_map_progress (map_progress_id),
    INDEX idx_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. USER LESSON PROGRESS TABLE
-- Tracks progress on individual lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    unit_progress_id INT NOT NULL,

    -- Status workflow: locked -> unlocked -> studying -> exam_ready -> completed
    status ENUM('locked', 'unlocked', 'studying', 'exam_ready', 'completed') DEFAULT 'locked',
    unlocked_at TIMESTAMP NULL,
    study_started_at TIMESTAMP NULL,
    study_completed_at TIMESTAMP NULL,
    exam_passed_at TIMESTAMP NULL,

    -- Study progress (which content items have been viewed)
    content_viewed JSON DEFAULT NULL COMMENT '{"content_id": true, "content_id2": true}',
    content_progress_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Exam progress
    boss_exam_passed BOOLEAN DEFAULT FALSE,
    best_exam_score DECIMAL(5,2) DEFAULT 0.00,
    exam_attempts INT DEFAULT 0,
    last_exam_attempt_at TIMESTAMP NULL,

    -- Stats
    study_time_minutes INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    vocabulary_learned INT DEFAULT 0,
    grammar_learned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_progress_id) REFERENCES user_unit_progress(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    INDEX idx_unit_progress (unit_progress_id),
    INDEX idx_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. USER EXAM ATTEMPTS TABLE
-- Records all exam attempts with detailed results
-- ============================================================
CREATE TABLE IF NOT EXISTS user_exam_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    lesson_progress_id INT DEFAULT NULL COMMENT 'For lesson exams',
    unit_progress_id INT DEFAULT NULL COMMENT 'For unit boss exams',

    -- Attempt info
    attempt_number INT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,

    -- Results
    score DECIMAL(5,2) NOT NULL COMMENT 'Percentage score',
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    time_taken_seconds INT NOT NULL,

    -- Detailed answers
    answers JSON NOT NULL COMMENT '[{exercise_id, user_answer, is_correct, time_spent, points}]',

    -- Status
    is_passed BOOLEAN NOT NULL,
    xp_earned INT DEFAULT 0,
    coins_earned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES lesson_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_progress_id) REFERENCES user_lesson_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_progress_id) REFERENCES user_unit_progress(id) ON DELETE CASCADE,
    INDEX idx_user_exam (user_id, exam_id),
    INDEX idx_lesson_progress (lesson_progress_id),
    INDEX idx_unit_progress (unit_progress_id),
    INDEX idx_passed (user_id, is_passed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. VOCABULARY REVIEWS V3 TABLE
-- Review history using user_vocabulary references
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_reviews_v3 (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_vocabulary_id INT NOT NULL,

    quality INT NOT NULL COMMENT '0-5 rating: 0=blackout, 1=wrong, 2=hard, 3=good, 4=easy, 5=perfect',
    ease_factor_before DECIMAL(4,2) NOT NULL,
    ease_factor_after DECIMAL(4,2) NOT NULL,
    interval_before INT NOT NULL COMMENT 'Interval before review (days)',
    interval_after INT NOT NULL COMMENT 'Interval after review (days)',
    review_type ENUM('flashcard', 'quiz', 'exercise', 'game') DEFAULT 'flashcard',
    direction ENUM('vi_to_en', 'en_to_vi') DEFAULT 'vi_to_en',
    time_spent_seconds INT DEFAULT 0,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_vocabulary_id) REFERENCES user_vocabulary(id) ON DELETE CASCADE,
    INDEX idx_user_reviewed (user_id, reviewed_at),
    INDEX idx_vocab_reviewed (user_vocabulary_id, reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. GRAMMAR REVIEWS V3 TABLE
-- Review history using user_grammar references
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_reviews_v3 (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_grammar_id INT NOT NULL,

    quality INT NOT NULL COMMENT '0-5 rating',
    ease_factor_before DECIMAL(4,2) NOT NULL,
    ease_factor_after DECIMAL(4,2) NOT NULL,
    interval_before INT NOT NULL,
    interval_after INT NOT NULL,
    review_type ENUM('flashcard', 'quiz', 'exercise') DEFAULT 'flashcard',
    time_spent_seconds INT DEFAULT 0,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_grammar_id) REFERENCES user_grammar(id) ON DELETE CASCADE,
    INDEX idx_user_reviewed (user_id, reviewed_at),
    INDEX idx_grammar_reviewed (user_grammar_id, reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. DAILY REVIEW QUEUE V3 TABLE
-- Daily review queue using user_vocabulary references
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_review_queue_v3 (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_vocabulary_id INT NOT NULL,
    queue_date DATE NOT NULL,
    priority ENUM('overdue', 'due', 'new') DEFAULT 'due',
    queue_order INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    quality_rating INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_vocabulary_id) REFERENCES user_vocabulary(id) ON DELETE CASCADE,
    UNIQUE KEY unique_queue_item (user_id, user_vocabulary_id, queue_date),
    INDEX idx_queue (user_id, queue_date, is_completed, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. DAILY GRAMMAR QUEUE V3 TABLE
-- Daily grammar review queue using user_grammar references
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_grammar_queue_v3 (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_grammar_id INT NOT NULL,
    queue_date DATE NOT NULL,
    priority ENUM('overdue', 'due', 'new') DEFAULT 'due',
    queue_order INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    quality_rating INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_grammar_id) REFERENCES user_grammar(id) ON DELETE CASCADE,
    UNIQUE KEY unique_queue_item (user_id, user_grammar_id, queue_date),
    INDEX idx_queue (user_id, queue_date, is_completed, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. USER LESSON CONTENT PROGRESS TABLE
-- Tracks which specific content items user has completed in a lesson
-- ============================================================
CREATE TABLE IF NOT EXISTS user_lesson_content_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_progress_id INT NOT NULL,
    lesson_content_id INT NOT NULL,

    -- Progress
    is_viewed BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    time_spent_seconds INT DEFAULT 0,

    -- For vocabulary/grammar: link to user's learning record
    user_vocabulary_id INT DEFAULT NULL,
    user_grammar_id INT DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_progress_id) REFERENCES user_lesson_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_content_id) REFERENCES lesson_content(id) ON DELETE CASCADE,
    FOREIGN KEY (user_vocabulary_id) REFERENCES user_vocabulary(id) ON DELETE SET NULL,
    FOREIGN KEY (user_grammar_id) REFERENCES user_grammar(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_content (user_id, lesson_content_id),
    INDEX idx_lesson_progress (lesson_progress_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
