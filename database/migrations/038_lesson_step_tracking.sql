-- Migration: Lesson Step Tracking for Word Map Improvement
-- Adds columns to track step-level progress within lessons
-- Enables: Continue Learning, Replay Lessons, Auto-Save Progress

-- ============================================================
-- 1. ADD STEP TRACKING COLUMNS TO user_lesson_progress
-- ============================================================

ALTER TABLE user_lesson_progress
ADD COLUMN current_step VARCHAR(50) DEFAULT 'overview'
    COMMENT 'Current step: overview, vocabulary, grammar, exercises, exam, complete',
ADD COLUMN current_step_index INT DEFAULT 0
    COMMENT 'Current index within the step (vocab/grammar/exercise index)',
ADD COLUMN step_progress JSON DEFAULT NULL
    COMMENT 'Detailed progress: {vocabulary: {studied: [], total, currentIndex, completed}, grammar: {...}, exercises: {...}}',
ADD COLUMN can_continue BOOLEAN DEFAULT FALSE
    COMMENT 'User can click Continue Learning button',
ADD COLUMN last_step_at TIMESTAMP NULL
    COMMENT 'Last time user interacted with this lesson',
ADD COLUMN allow_replay BOOLEAN DEFAULT TRUE
    COMMENT 'Allow user to replay completed lessons/steps';

-- Add index for continue learning queries
CREATE INDEX idx_can_continue ON user_lesson_progress(user_id, can_continue);
CREATE INDEX idx_last_step ON user_lesson_progress(user_id, last_step_at);

-- ============================================================
-- 2. MIGRATE EXISTING DATA
-- Set current_step based on existing status
-- ============================================================

UPDATE user_lesson_progress
SET
    current_step = CASE
        WHEN status = 'completed' THEN 'complete'
        WHEN status = 'exam_ready' THEN 'exam'
        WHEN status = 'studying' THEN 'vocabulary'
        ELSE 'overview'
    END,
    current_step_index = 0,
    can_continue = CASE
        WHEN status IN ('studying', 'exam_ready') THEN TRUE
        ELSE FALSE
    END,
    allow_replay = TRUE,
    last_step_at = COALESCE(study_started_at, unlocked_at, created_at)
WHERE current_step IS NULL OR current_step = 'overview';
