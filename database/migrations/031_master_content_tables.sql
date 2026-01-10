-- Migration: Master Content Tables for Version 3 Word Map System
-- Creates shared content tables that are admin-managed and used by all users

-- ============================================================
-- 1. MASTER VOCABULARY TABLE
-- Shared vocabulary entries managed by admin
-- ============================================================
CREATE TABLE IF NOT EXISTS master_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    english_word VARCHAR(255) NOT NULL,
    vietnamese_word VARCHAR(255) NOT NULL,
    phonetic VARCHAR(100) DEFAULT NULL,
    pronunciation_uk VARCHAR(100) DEFAULT NULL COMMENT 'UK IPA pronunciation',
    pronunciation_us VARCHAR(100) DEFAULT NULL COMMENT 'US IPA pronunciation',
    audio_uk_url VARCHAR(500) DEFAULT NULL COMMENT 'UK audio file URL',
    audio_us_url VARCHAR(500) DEFAULT NULL COMMENT 'US audio file URL',
    part_of_speech ENUM('noun', 'verb', 'adjective', 'adverb', 'preposition',
                        'conjunction', 'pronoun', 'interjection', 'phrase') NOT NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL DEFAULT 'A1',
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',

    -- Oxford-style dictionary fields (JSON)
    definitions JSON DEFAULT NULL COMMENT 'Array of definition objects with examples, grammar, patterns',
    word_forms JSON DEFAULT NULL COMMENT '{"plural": "", "past": "", "pastParticiple": "", "presentParticiple": "", "thirdPerson": "", "comparative": "", "superlative": ""}',
    word_family JSON DEFAULT NULL COMMENT '{"noun": [], "verb": [], "adjective": [], "adverb": []}',
    synonyms JSON DEFAULT NULL COMMENT '["word1", "word2"]',
    antonyms JSON DEFAULT NULL COMMENT '["word1", "word2"]',
    collocations JSON DEFAULT NULL COMMENT '{"adjective": [], "verbContract": [], "contractVerb": [], "contractNoun": [], "preposition": [], "phrases": []}',
    idioms JSON DEFAULT NULL COMMENT '[{"phrase": "", "meaning": "", "meaningVi": ""}]',
    usage_notes TEXT DEFAULT NULL COMMENT 'Usage notes and tips',
    grammar_info JSON DEFAULT NULL COMMENT '{"countable": true, "transitive": null, "patterns": []}',
    register ENUM('formal', 'informal', 'neutral', 'slang', 'technical') DEFAULT 'neutral',
    extra_examples JSON DEFAULT NULL COMMENT 'Additional example sentences',
    frequency_rank INT DEFAULT NULL COMMENT 'Oxford 3000/5000 frequency rank',
    topics JSON DEFAULT NULL COMMENT '[{"name": "Business", "level": "B2"}]',
    word_origin TEXT DEFAULT NULL COMMENT 'Etymology - word origin history',
    see_also JSON DEFAULT NULL COMMENT '["related_word1", "related_word2"]',

    -- Metadata
    created_by INT DEFAULT NULL COMMENT 'Admin user ID who created this',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Indexes and constraints
    UNIQUE KEY unique_word_pos (english_word, part_of_speech),
    INDEX idx_cefr (cefr_level),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_english_word (english_word),
    INDEX idx_vietnamese_word (vietnamese_word),
    INDEX idx_active (is_active),
    FULLTEXT INDEX ft_search (english_word, vietnamese_word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MASTER GRAMMAR TABLE
-- Shared grammar rules managed by admin
-- ============================================================
CREATE TABLE IF NOT EXISTS master_grammar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grammar_rule VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL COMMENT 'tenses, articles, prepositions, conditionals, etc.',
    subcategory VARCHAR(100) DEFAULT NULL COMMENT 'e.g., present_simple, past_continuous',
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL DEFAULT 'A1',
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',

    -- Content
    explanation TEXT NOT NULL COMMENT 'English explanation',
    explanation_vi TEXT NOT NULL COMMENT 'Vietnamese explanation',
    formula VARCHAR(500) DEFAULT NULL COMMENT 'e.g., Subject + will + V(base)',
    examples JSON NOT NULL COMMENT '[{"en": "...", "vi": "..."}]',
    common_mistakes JSON DEFAULT NULL COMMENT '[{"wrong": "...", "correct": "...", "explanation": "..."}]',
    usage_tips TEXT DEFAULT NULL,
    related_grammar_ids JSON DEFAULT NULL COMMENT 'IDs of related grammar rules',

    -- Metadata
    created_by INT DEFAULT NULL COMMENT 'Admin user ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Indexes and constraints
    UNIQUE KEY unique_rule_category (grammar_rule, category),
    INDEX idx_category (category),
    INDEX idx_subcategory (subcategory),
    INDEX idx_cefr (cefr_level),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. MASTER EXERCISES TABLE
-- Shared exercises that can be reused across users/lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS master_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exercise_type ENUM(
        'multiple_choice',
        'fill_blank',
        'translation',
        'sentence_building',
        'matching',
        'spelling',
        'listening',
        'error_correction',
        'verb_conjugation',
        'cloze',
        'article_usage',
        'preposition_fill',
        'tense_selection',
        'sentence_transformation',
        'word_order'
    ) NOT NULL,
    question TEXT NOT NULL,
    options JSON DEFAULT NULL COMMENT 'For multiple choice exercises',
    correct_answer TEXT NOT NULL,
    explanation TEXT DEFAULT NULL COMMENT 'English explanation',
    explanation_vi TEXT DEFAULT NULL COMMENT 'Vietnamese explanation',
    exercise_data JSON DEFAULT NULL COMMENT 'Type-specific data (words, pairs, blanks, etc.)',
    audio_url VARCHAR(500) DEFAULT NULL COMMENT 'Audio file for listening exercises',
    image_url VARCHAR(500) DEFAULT NULL COMMENT 'Image for visual exercises',

    -- Classification
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') DEFAULT NULL,
    time_limit_seconds INT DEFAULT 60 COMMENT 'Suggested time limit',
    points INT DEFAULT 10 COMMENT 'Points awarded for correct answer',

    -- Relations to master content
    related_vocabulary_ids JSON DEFAULT NULL COMMENT 'master_vocabulary IDs',
    related_grammar_ids JSON DEFAULT NULL COMMENT 'master_grammar IDs',

    -- Categories for filtering
    category VARCHAR(100) DEFAULT NULL COMMENT 'Grammar category if applicable',
    tags JSON DEFAULT NULL COMMENT '["vocabulary", "business", "travel"]',

    -- Metadata
    created_by INT DEFAULT NULL COMMENT 'Admin user ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Indexes
    INDEX idx_type (exercise_type),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_cefr (cefr_level),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. VOCABULARY TAGS TABLE (Many-to-Many)
-- For categorizing vocabulary by topics/themes
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    color VARCHAR(7) DEFAULT '#gray' COMMENT 'Hex color for UI display',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. MASTER VOCABULARY TAGS (Junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS master_vocabulary_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    master_vocabulary_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_vocabulary_id) REFERENCES master_vocabulary(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES vocabulary_tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vocab_tag (master_vocabulary_id, tag_id),
    INDEX idx_vocab (master_vocabulary_id),
    INDEX idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Insert default vocabulary tags
-- ============================================================
INSERT INTO vocabulary_tags (name, description, color) VALUES
('daily_life', 'Everyday vocabulary', '#10B981'),
('business', 'Business and work vocabulary', '#3B82F6'),
('travel', 'Travel and tourism vocabulary', '#F59E0B'),
('food', 'Food and cooking vocabulary', '#EF4444'),
('technology', 'Technology and computers', '#8B5CF6'),
('health', 'Health and medical vocabulary', '#EC4899'),
('education', 'Education and learning', '#06B6D4'),
('entertainment', 'Entertainment and media', '#F97316'),
('sports', 'Sports and fitness', '#84CC16'),
('nature', 'Nature and environment', '#22C55E')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================================
-- 7. GRAMMAR CATEGORIES TABLE
-- Standard grammar categories for organization
-- ============================================================
CREATE TABLE IF NOT EXISTS grammar_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default grammar categories
INSERT INTO grammar_categories (name, display_name, description, display_order) VALUES
('tenses', 'Verb Tenses', 'All verb tense forms', 1),
('articles', 'Articles', 'A, an, the usage', 2),
('prepositions', 'Prepositions', 'Preposition usage', 3),
('pronouns', 'Pronouns', 'Personal, possessive, reflexive pronouns', 4),
('adjectives', 'Adjectives', 'Adjective forms and comparison', 5),
('adverbs', 'Adverbs', 'Adverb usage and placement', 6),
('nouns', 'Nouns', 'Countable, uncountable, plural forms', 7),
('verbs', 'Verbs', 'Verb forms, modals, phrasal verbs', 8),
('conditionals', 'Conditionals', 'If clauses and conditional forms', 9),
('passive_voice', 'Passive Voice', 'Active to passive transformations', 10),
('reported_speech', 'Reported Speech', 'Direct to indirect speech', 11),
('questions', 'Questions', 'Question formation and types', 12),
('conjunctions', 'Conjunctions', 'Connecting words and phrases', 13),
('relative_clauses', 'Relative Clauses', 'Who, which, that clauses', 14),
('word_order', 'Word Order', 'Sentence structure', 15)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);
