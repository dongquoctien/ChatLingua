-- Migration: Word Map Curriculum Tables for Version 3
-- Creates the curriculum structure: Word Maps > Units > Lessons > Content > Exams

-- ============================================================
-- 1. WORD MAPS TABLE
-- Top-level curriculum container (e.g., "Evolve 1", "Custom Map")
-- ============================================================
CREATE TABLE IF NOT EXISTS word_maps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'e.g., Evolve 1, Business English',
    description TEXT DEFAULT NULL,
    cover_image_url VARCHAR(500) DEFAULT NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL,
    publisher VARCHAR(100) DEFAULT NULL COMMENT 'e.g., Cambridge, Custom',

    -- Stats (auto-calculated, cached for performance)
    total_units INT DEFAULT 0,
    total_lessons INT DEFAULT 0,
    total_vocabulary INT DEFAULT 0,
    total_grammar INT DEFAULT 0,
    estimated_hours INT DEFAULT NULL COMMENT 'Total learning hours',

    -- Pricing/Access
    is_free BOOLEAN DEFAULT FALSE,
    price_coins INT DEFAULT 0 COMMENT 'In-app currency price',
    price_gems INT DEFAULT 0 COMMENT 'Premium currency price',

    -- Display & Status
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE COMMENT 'Only published maps visible to users',

    -- Metadata
    created_by INT DEFAULT NULL COMMENT 'Admin user ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_map_name (name),
    INDEX idx_cefr (cefr_level),
    INDEX idx_display_order (display_order),
    INDEX idx_featured (is_featured),
    INDEX idx_active_published (is_active, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MAP UNITS TABLE
-- Units within a Word Map (e.g., Unit 1: "I am...")
-- ============================================================
CREATE TABLE IF NOT EXISTS map_units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    map_id INT NOT NULL,
    unit_number INT NOT NULL COMMENT 'Sequential unit number in the map',
    title VARCHAR(255) NOT NULL COMMENT 'e.g., I am..., Great people',
    description TEXT DEFAULT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,

    -- Unit type
    is_review_unit BOOLEAN DEFAULT FALSE COMMENT 'True for review units (after every 3 units)',
    review_unit_ids JSON DEFAULT NULL COMMENT 'For review units: [unit_id1, unit_id2, unit_id3]',

    -- Progression
    prerequisite_unit_id INT DEFAULT NULL COMMENT 'Must complete this unit first',

    -- Boss Exams configuration
    boss_exam_count INT DEFAULT 2 COMMENT 'Number of boss exams at end of unit (2-3)',
    boss_passing_score INT DEFAULT 100 COMMENT 'Must score 100% to pass',

    -- Content stats (cached)
    total_lessons INT DEFAULT 0,
    total_vocabulary INT DEFAULT 0,
    total_grammar INT DEFAULT 0,
    total_exercises INT DEFAULT 0,

    -- Rewards
    completion_xp INT DEFAULT 100 COMMENT 'XP for completing entire unit',
    completion_coins INT DEFAULT 50 COMMENT 'Coins reward',

    -- Display
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    UNIQUE KEY unique_map_unit (map_id, unit_number),
    INDEX idx_map_order (map_id, display_order),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. UNIT LESSONS TABLE
-- Lessons within a Unit (e.g., Lesson 1: Vocabulary, Lesson 2: Grammar)
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    lesson_number INT NOT NULL COMMENT 'Sequential lesson number in unit',
    title VARCHAR(255) NOT NULL,
    lesson_type ENUM(
        'vocabulary',      -- Vocabulary focus
        'grammar',         -- Grammar focus
        'listening',       -- Listening skills
        'speaking',        -- Speaking/Time to speak
        'reading',         -- Reading comprehension
        'writing',         -- Writing skills
        'mixed',           -- Combined skills
        'review',          -- Lesson review
        'project'          -- Project-based learning
    ) NOT NULL,
    description TEXT DEFAULT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,

    -- Media content
    video_url VARCHAR(500) DEFAULT NULL COMMENT 'Lesson video if any',
    audio_url VARCHAR(500) DEFAULT NULL COMMENT 'Lesson audio if any',
    pdf_page_start INT DEFAULT NULL COMMENT 'Reference to textbook page start',
    pdf_page_end INT DEFAULT NULL COMMENT 'Reference to textbook page end',

    -- Progression
    prerequisite_lesson_id INT DEFAULT NULL COMMENT 'Must complete this lesson first',

    -- Boss Exam configuration
    has_boss_exam BOOLEAN DEFAULT TRUE COMMENT 'Whether lesson has a boss exam',
    boss_passing_score INT DEFAULT 100 COMMENT '100% required to unlock next',

    -- Content stats (cached)
    total_vocabulary INT DEFAULT 0,
    total_grammar INT DEFAULT 0,
    total_exercises INT DEFAULT 0,

    -- Time & Rewards
    estimated_minutes INT DEFAULT 30 COMMENT 'Estimated study time',
    study_xp INT DEFAULT 20 COMMENT 'XP for completing study phase',
    exam_xp INT DEFAULT 30 COMMENT 'XP for passing exam',
    coins_reward INT DEFAULT 10 COMMENT 'Coins for completing lesson',

    -- Display
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    UNIQUE KEY unique_unit_lesson (unit_id, lesson_number),
    INDEX idx_unit_order (unit_id, display_order),
    INDEX idx_type (lesson_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. LESSON CONTENT TABLE
-- Links content (vocabulary, grammar, exercises) to lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_content (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    content_type ENUM('vocabulary', 'grammar', 'exercise', 'text', 'audio', 'video', 'image') NOT NULL,

    -- Reference to master content (mutually exclusive)
    master_vocabulary_id INT DEFAULT NULL,
    master_grammar_id INT DEFAULT NULL,
    master_exercise_id INT DEFAULT NULL,

    -- For custom content (text, notes, etc.)
    custom_content JSON DEFAULT NULL COMMENT 'For text/audio/video/image: {title, content, url, transcript}',

    -- Organization
    section ENUM('warmup', 'study', 'practice', 'review', 'extension') DEFAULT 'study' COMMENT 'Section within lesson',
    display_order INT DEFAULT 0,

    -- Optional overrides
    custom_instructions TEXT DEFAULT NULL COMMENT 'Special instructions for this content in this lesson',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (master_vocabulary_id) REFERENCES master_vocabulary(id) ON DELETE SET NULL,
    FOREIGN KEY (master_grammar_id) REFERENCES master_grammar(id) ON DELETE SET NULL,
    FOREIGN KEY (master_exercise_id) REFERENCES master_exercises(id) ON DELETE SET NULL,
    INDEX idx_lesson_order (lesson_id, section, display_order),
    INDEX idx_content_type (content_type),
    INDEX idx_vocab (master_vocabulary_id),
    INDEX idx_grammar (master_grammar_id),
    INDEX idx_exercise (master_exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. LESSON EXAMS TABLE (Boss Exams)
-- Exams that must be passed to unlock next lesson/unit
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT DEFAULT NULL COMMENT 'Lesson boss exam (if set)',
    unit_id INT DEFAULT NULL COMMENT 'Unit boss exam (if lesson_id is NULL)',
    exam_number INT DEFAULT 1 COMMENT '1, 2, 3 for multiple exams per lesson/unit',

    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,

    -- Exam configuration
    time_limit_seconds INT DEFAULT 300 COMMENT 'Time limit in seconds (0 = no limit)',
    passing_score INT DEFAULT 100 COMMENT 'Percentage required to pass (100 = perfect)',
    max_attempts INT DEFAULT NULL COMMENT 'NULL = unlimited attempts',
    shuffle_questions BOOLEAN DEFAULT TRUE,
    show_answers_after BOOLEAN DEFAULT TRUE COMMENT 'Show correct answers after attempt',

    -- Questions (references to master_exercises)
    exercise_ids JSON NOT NULL COMMENT '[exercise_id1, exercise_id2, ...]',
    total_questions INT NOT NULL,
    total_points INT NOT NULL,

    -- Randomization options
    random_question_count INT DEFAULT NULL COMMENT 'If set, pick N random questions from pool',

    -- Rewards
    pass_xp INT DEFAULT 50,
    perfect_score_bonus_xp INT DEFAULT 20 COMMENT 'Bonus for 100% score',
    pass_coins INT DEFAULT 20,
    perfect_score_bonus_coins INT DEFAULT 10,

    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    INDEX idx_lesson (lesson_id),
    INDEX idx_unit (unit_id),
    INDEX idx_order (display_order),

    -- Ensure exam belongs to either lesson or unit, not both
    CONSTRAINT chk_exam_parent CHECK (
        (lesson_id IS NOT NULL AND unit_id IS NULL) OR
        (lesson_id IS NULL AND unit_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. MAP PREREQUISITES TABLE
-- Defines what must be completed before accessing a map
-- ============================================================
CREATE TABLE IF NOT EXISTS map_prerequisites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    map_id INT NOT NULL COMMENT 'The map that has prerequisites',
    prerequisite_map_id INT DEFAULT NULL COMMENT 'Must complete this map first',
    prerequisite_cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') DEFAULT NULL COMMENT 'Or must reach this level',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prerequisite (map_id, prerequisite_map_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Insert sample Word Map (Evolve 1)
-- ============================================================
INSERT INTO word_maps (name, description, cefr_level, publisher, is_free, is_featured, is_active, is_published, display_order)
VALUES (
    'Evolve 1',
    'A six-level English course that gets students speaking with confidence. Level 1 covers CEFR A1 (Beginner) with 12 units of real-world English.',
    'A1',
    'Cambridge',
    TRUE,
    TRUE,
    TRUE,
    FALSE,  -- Not published yet until content is imported
    1
)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert sample units for Evolve 1
INSERT INTO map_units (map_id, unit_number, title, description, is_review_unit, display_order, completion_xp)
SELECT
    wm.id,
    u.unit_number,
    u.title,
    u.description,
    u.is_review,
    u.unit_number,
    CASE WHEN u.is_review THEN 150 ELSE 100 END
FROM word_maps wm
CROSS JOIN (
    SELECT 1 AS unit_number, 'I am...' AS title, 'Personal introductions and basic information' AS description, FALSE AS is_review
    UNION ALL SELECT 2, 'Great people', 'Describing people and their qualities', FALSE
    UNION ALL SELECT 3, 'Come in', 'Rooms, furniture, and home vocabulary', FALSE
    UNION ALL SELECT 4, 'Review 1', 'Review of Units 1-3', TRUE
    UNION ALL SELECT 5, 'I love it', 'Talking about likes and dislikes', FALSE
    UNION ALL SELECT 6, 'Mondays and fun days', 'Days, routines, and free time', FALSE
    UNION ALL SELECT 7, 'Zoom in, zoom out', 'Places in town and giving directions', FALSE
    UNION ALL SELECT 8, 'Review 2', 'Review of Units 4-6', TRUE
    UNION ALL SELECT 9, 'Now is good', 'Present activities and current events', FALSE
    UNION ALL SELECT 10, 'You''re good!', 'Abilities and talents', FALSE
    UNION ALL SELECT 11, 'Places to go', 'Travel and vacation vocabulary', FALSE
    UNION ALL SELECT 12, 'Review 3', 'Review of Units 7-9', TRUE
    UNION ALL SELECT 13, 'Get ready', 'Future plans and preparations', FALSE
    UNION ALL SELECT 14, 'Colorful memories', 'Past events and experiences', FALSE
    UNION ALL SELECT 15, 'Outdoors', 'Nature, weather, and outdoor activities', FALSE
    UNION ALL SELECT 16, 'Review 4', 'Review of Units 10-12', TRUE
) u
WHERE wm.name = 'Evolve 1'
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Update review unit references
UPDATE map_units mu
JOIN word_maps wm ON mu.map_id = wm.id
SET mu.review_unit_ids = (
    SELECT JSON_ARRAY(
        (SELECT id FROM map_units WHERE map_id = wm.id AND unit_number = mu.unit_number - 3),
        (SELECT id FROM map_units WHERE map_id = wm.id AND unit_number = mu.unit_number - 2),
        (SELECT id FROM map_units WHERE map_id = wm.id AND unit_number = mu.unit_number - 1)
    )
)
WHERE wm.name = 'Evolve 1' AND mu.is_review_unit = TRUE;

-- Set prerequisite units (each unit requires previous non-review unit)
UPDATE map_units mu
JOIN word_maps wm ON mu.map_id = wm.id
SET mu.prerequisite_unit_id = (
    SELECT mu2.id
    FROM (SELECT * FROM map_units) mu2
    WHERE mu2.map_id = wm.id
      AND mu2.unit_number < mu.unit_number
    ORDER BY mu2.unit_number DESC
    LIMIT 1
)
WHERE wm.name = 'Evolve 1' AND mu.unit_number > 1;

-- Insert sample lessons for Unit 1 (I am...)
INSERT INTO unit_lessons (unit_id, lesson_number, title, lesson_type, description, display_order, study_xp, exam_xp)
SELECT
    mu.id,
    l.lesson_number,
    l.title,
    l.lesson_type,
    l.description,
    l.lesson_number,
    l.study_xp,
    l.exam_xp
FROM map_units mu
JOIN word_maps wm ON mu.map_id = wm.id
CROSS JOIN (
    SELECT 1 AS lesson_number, 'Hello!' AS title, 'vocabulary' AS lesson_type, 'Greetings and introductions vocabulary' AS description, 20 AS study_xp, 30 AS exam_xp
    UNION ALL SELECT 2, 'Be verb', 'grammar', 'Present tense of be (am/is/are)', 20, 30
    UNION ALL SELECT 3, 'Where are you from?', 'listening', 'Countries and nationalities', 20, 30
    UNION ALL SELECT 4, 'Nice to meet you', 'speaking', 'Introducing yourself and others', 20, 30
    UNION ALL SELECT 5, 'Time to speak: All about me', 'project', 'Create a personal introduction', 30, 40
) l
WHERE wm.name = 'Evolve 1' AND mu.unit_number = 1
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Set prerequisite lessons within unit
UPDATE unit_lessons ul
JOIN map_units mu ON ul.unit_id = mu.id
JOIN word_maps wm ON mu.map_id = wm.id
SET ul.prerequisite_lesson_id = (
    SELECT ul2.id
    FROM (SELECT * FROM unit_lessons) ul2
    WHERE ul2.unit_id = ul.unit_id
      AND ul2.lesson_number < ul.lesson_number
    ORDER BY ul2.lesson_number DESC
    LIMIT 1
)
WHERE wm.name = 'Evolve 1' AND mu.unit_number = 1 AND ul.lesson_number > 1;

-- Update word_maps stats
UPDATE word_maps wm
SET
    total_units = (SELECT COUNT(*) FROM map_units WHERE map_id = wm.id AND is_active = TRUE),
    total_lessons = (
        SELECT COUNT(*)
        FROM unit_lessons ul
        JOIN map_units mu ON ul.unit_id = mu.id
        WHERE mu.map_id = wm.id AND ul.is_active = TRUE
    )
WHERE wm.id > 0;

-- Update map_units stats
UPDATE map_units mu
SET total_lessons = (SELECT COUNT(*) FROM unit_lessons WHERE unit_id = mu.id AND is_active = TRUE)
WHERE mu.id > 0;
