-- Migration: New Exercise Types
-- Extends exercise system with 7 new types and type-specific data storage

-- ============================================================
-- Step 1: Extend exercise_type ENUM
-- ============================================================
ALTER TABLE exercises
MODIFY COLUMN exercise_type ENUM(
    'multiple_choice', 'fill_blank', 'translation',
    'sentence_building', 'matching', 'spelling',
    'listening', 'error_correction', 'verb_conjugation', 'cloze'
) NOT NULL;

-- ============================================================
-- Step 2: Add type-specific data columns
-- ============================================================
ALTER TABLE exercises
ADD COLUMN exercise_data JSON NULL COMMENT 'Type-specific data (words, pairs, blanks, etc.)',
ADD COLUMN audio_url VARCHAR(500) NULL COMMENT 'Audio URL for listening/spelling exercises',
ADD COLUMN time_limit_seconds INT NULL COMMENT 'Optional time limit for the exercise';

-- ============================================================
-- Step 3: Add index for exercise type filtering
-- ============================================================
CREATE INDEX idx_exercise_type ON exercises(exercise_type);
CREATE INDEX idx_user_difficulty_type ON exercises(user_id, difficulty_level, exercise_type);
