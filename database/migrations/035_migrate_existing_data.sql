-- Migration: Migrate Existing Data to V3 Tables
-- Migrates vocabulary, grammar, and exercises from V2 tables to V3 master/user structure
-- This migration preserves all existing data and SM2 progress

-- ============================================================
-- SAFETY: Create backup timestamp for rollback reference
-- ============================================================
INSERT INTO feature_flags (flag_key, flag_value, description)
VALUES ('V3_MIGRATION_TIMESTAMP', NOW(), 'Timestamp when V3 migration started')
ON DUPLICATE KEY UPDATE flag_value = NOW();

-- ============================================================
-- STEP 1: Migrate Vocabulary to master_vocabulary
-- Deduplicate by english_word + part_of_speech, keeping the most complete entry
-- ============================================================

-- Insert unique vocabulary into master_vocabulary
INSERT INTO master_vocabulary (
    english_word,
    vietnamese_word,
    phonetic,
    pronunciation_uk,
    pronunciation_us,
    audio_uk_url,
    audio_us_url,
    part_of_speech,
    cefr_level,
    difficulty_level,
    definitions,
    word_forms,
    word_family,
    synonyms,
    antonyms,
    collocations,
    idioms,
    usage_notes,
    grammar_info,
    register,
    extra_examples,
    frequency_rank,
    topics,
    word_origin,
    see_also,
    created_by,
    is_active
)
SELECT
    v.english_word,
    v.vietnamese_word,
    v.phonetic,
    v.pronunciation_uk,
    v.pronunciation_us,
    v.audio_uk_url,
    v.audio_us_url,
    v.part_of_speech,
    COALESCE(v.cefr_level, 'A1'),
    COALESCE(v.difficulty_level, 'beginner'),
    v.definitions,
    v.word_forms,
    v.word_family,
    v.synonyms,
    v.antonyms,
    v.collocations,
    v.idioms,
    v.usage_notes,
    v.grammar_info,
    COALESCE(v.register, 'neutral'),
    v.extra_examples,
    v.frequency_rank,
    v.topics,
    v.word_origin,
    v.see_also,
    1,  -- created_by admin
    TRUE
FROM vocabulary v
WHERE v.id IN (
    -- Select the best entry for each word+part_of_speech combination
    SELECT MIN(v2.id)
    FROM vocabulary v2
    WHERE v2.id = (
        SELECT v3.id
        FROM vocabulary v3
        WHERE v3.english_word = v2.english_word
          AND v3.part_of_speech = v2.part_of_speech
        ORDER BY
            -- Prefer entries with dictionary data
            (v3.definitions IS NOT NULL AND JSON_LENGTH(v3.definitions) > 0) DESC,
            (v3.word_family IS NOT NULL) DESC,
            (v3.synonyms IS NOT NULL) DESC,
            (v3.collocations IS NOT NULL) DESC,
            (v3.extra_examples IS NOT NULL) DESC,
            -- Then prefer entries with more practice
            v3.times_practiced DESC,
            -- Finally by ID (oldest first)
            v3.id ASC
        LIMIT 1
    )
    GROUP BY v2.english_word, v2.part_of_speech
)
ON DUPLICATE KEY UPDATE
    -- Update if new entry has better data
    definitions = COALESCE(VALUES(definitions), master_vocabulary.definitions),
    word_forms = COALESCE(VALUES(word_forms), master_vocabulary.word_forms),
    word_family = COALESCE(VALUES(word_family), master_vocabulary.word_family),
    synonyms = COALESCE(VALUES(synonyms), master_vocabulary.synonyms),
    collocations = COALESCE(VALUES(collocations), master_vocabulary.collocations),
    updated_at = NOW();

-- ============================================================
-- STEP 2: Create user_vocabulary entries (preserving SM2 progress)
-- ============================================================
INSERT INTO user_vocabulary (
    user_id,
    master_vocabulary_id,
    source_type,
    source_id,
    mastery_level,
    times_practiced,
    last_practiced_at,
    next_review_at,
    review_interval,
    ease_factor,
    repetition_count,
    lapse_count,
    review_status,
    created_at
)
SELECT
    v.user_id,
    mv.id AS master_vocabulary_id,
    'conversation' AS source_type,
    v.conversation_id AS source_id,
    COALESCE(v.mastery_level, 0),
    COALESCE(v.times_practiced, 0),
    v.last_practiced_at,
    v.next_review_at,
    COALESCE(v.review_interval, 0),
    COALESCE(v.ease_factor, 2.50),
    COALESCE(v.repetition_count, 0),
    COALESCE(v.lapse_count, 0),
    COALESCE(v.review_status, 'new'),
    v.created_at
FROM vocabulary v
JOIN master_vocabulary mv
    ON mv.english_word = v.english_word
    AND mv.part_of_speech = v.part_of_speech
ON DUPLICATE KEY UPDATE
    -- Keep the better progress if duplicate exists
    mastery_level = GREATEST(user_vocabulary.mastery_level, VALUES(mastery_level)),
    times_practiced = GREATEST(user_vocabulary.times_practiced, VALUES(times_practiced)),
    updated_at = NOW();

-- ============================================================
-- STEP 3: Migrate Grammar to master_grammar
-- ============================================================
INSERT INTO master_grammar (
    grammar_rule,
    category,
    cefr_level,
    difficulty_level,
    explanation,
    explanation_vi,
    examples,
    created_by,
    is_active
)
SELECT
    gp.grammar_rule,
    COALESCE(gp.category, 'general'),
    COALESCE(gp.cefr_level, 'A1'),
    COALESCE(gp.difficulty_level, 'beginner'),
    gp.explanation,
    gp.explanation,  -- explanation_vi same as explanation initially
    JSON_ARRAY(JSON_OBJECT('en', COALESCE(gp.example_en, ''), 'vi', COALESCE(gp.example_vi, ''))),
    1,  -- created_by admin
    TRUE
FROM grammar_points gp
WHERE gp.id IN (
    SELECT MIN(gp2.id)
    FROM grammar_points gp2
    GROUP BY gp2.grammar_rule, gp2.category
)
ON DUPLICATE KEY UPDATE
    explanation = VALUES(explanation),
    updated_at = NOW();

-- ============================================================
-- STEP 4: Create user_grammar entries (preserving SM2 progress)
-- ============================================================
INSERT INTO user_grammar (
    user_id,
    master_grammar_id,
    source_type,
    source_id,
    mastery_level,
    times_practiced,
    last_practiced_at,
    next_review_at,
    review_interval,
    ease_factor,
    repetition_count,
    lapse_count,
    review_status,
    created_at
)
SELECT
    gp.user_id,
    mg.id AS master_grammar_id,
    'conversation' AS source_type,
    gp.conversation_id AS source_id,
    COALESCE(gp.mastery_level, 0),
    COALESCE(gp.times_practiced, 0),
    gp.last_reviewed_at,
    gp.next_review_at,
    COALESCE(gp.review_interval, 0),
    COALESCE(gp.ease_factor, 2.50),
    COALESCE(gp.repetition_count, 0),
    COALESCE(gp.lapse_count, 0),
    COALESCE(gp.review_status, 'new'),
    gp.created_at
FROM grammar_points gp
JOIN master_grammar mg
    ON mg.grammar_rule = gp.grammar_rule
    AND mg.category = COALESCE(gp.category, 'general')
ON DUPLICATE KEY UPDATE
    mastery_level = GREATEST(user_grammar.mastery_level, VALUES(mastery_level)),
    times_practiced = GREATEST(user_grammar.times_practiced, VALUES(times_practiced)),
    updated_at = NOW();

-- ============================================================
-- STEP 5: Migrate Exercises to master_exercises
-- ============================================================
INSERT INTO master_exercises (
    exercise_type,
    question,
    options,
    correct_answer,
    explanation,
    explanation_vi,
    exercise_data,
    audio_url,
    difficulty_level,
    cefr_level,
    time_limit_seconds,
    points,
    created_by,
    is_active
)
SELECT
    e.exercise_type,
    e.question,
    e.options,
    e.correct_answer,
    e.explanation,
    e.explanation,  -- explanation_vi same as explanation initially
    e.exercise_data,
    e.audio_url,
    COALESCE(e.difficulty_level, 'beginner'),
    'A1',  -- default cefr_level
    COALESCE(e.time_limit_seconds, 60),
    10,  -- default points
    1,  -- created_by admin
    TRUE
FROM exercises e
WHERE e.id IN (
    -- Deduplicate by question + exercise_type
    SELECT MIN(e2.id)
    FROM exercises e2
    GROUP BY e2.question, e2.exercise_type
)
ON DUPLICATE KEY UPDATE
    explanation = VALUES(explanation),
    updated_at = NOW();

-- ============================================================
-- STEP 6: Migrate exercise_attempts to user_exercise_attempts
-- ============================================================
INSERT INTO user_exercise_attempts (
    user_id,
    master_exercise_id,
    context_type,
    context_id,
    user_answer,
    is_correct,
    time_spent_seconds,
    points_earned,
    attempted_at
)
SELECT
    ea.user_id,
    me.id AS master_exercise_id,
    'practice' AS context_type,
    NULL AS context_id,
    ea.user_answer,
    ea.is_correct,
    COALESCE(ea.time_spent_seconds, 0),
    CASE WHEN ea.is_correct THEN 10 ELSE 0 END,
    ea.attempted_at
FROM exercise_attempts ea
JOIN exercises e ON ea.exercise_id = e.id
JOIN master_exercises me ON me.question = e.question AND me.exercise_type = e.exercise_type;

-- ============================================================
-- STEP 7: Migrate vocabulary_reviews to vocabulary_reviews_v3
-- ============================================================
INSERT INTO vocabulary_reviews_v3 (
    user_id,
    user_vocabulary_id,
    quality,
    ease_factor_before,
    ease_factor_after,
    interval_before,
    interval_after,
    review_type,
    direction,
    time_spent_seconds,
    reviewed_at
)
SELECT
    vr.user_id,
    uv.id AS user_vocabulary_id,
    vr.quality,
    vr.ease_factor_before,
    vr.ease_factor_after,
    vr.interval_before,
    vr.interval_after,
    vr.review_type,
    COALESCE(vr.direction, 'vi_to_en'),
    COALESCE(vr.time_spent_seconds, 0),
    vr.reviewed_at
FROM vocabulary_reviews vr
JOIN vocabulary v ON vr.vocabulary_id = v.id
JOIN master_vocabulary mv ON mv.english_word = v.english_word AND mv.part_of_speech = v.part_of_speech
JOIN user_vocabulary uv ON uv.user_id = vr.user_id AND uv.master_vocabulary_id = mv.id;

-- ============================================================
-- STEP 8: Migrate grammar_reviews to grammar_reviews_v3
-- ============================================================
INSERT INTO grammar_reviews_v3 (
    user_id,
    user_grammar_id,
    quality,
    ease_factor_before,
    ease_factor_after,
    interval_before,
    interval_after,
    review_type,
    time_spent_seconds,
    reviewed_at
)
SELECT
    gr.user_id,
    ug.id AS user_grammar_id,
    gr.quality,
    gr.ease_factor_before,
    gr.ease_factor_after,
    gr.interval_before,
    gr.interval_after,
    gr.review_type,
    COALESCE(gr.time_spent_seconds, 0),
    gr.reviewed_at
FROM grammar_reviews gr
JOIN grammar_points gp ON gr.grammar_point_id = gp.id
JOIN master_grammar mg ON mg.grammar_rule = gp.grammar_rule AND mg.category = COALESCE(gp.category, 'general')
JOIN user_grammar ug ON ug.user_id = gr.user_id AND ug.master_grammar_id = mg.id;

-- ============================================================
-- STEP 9: Update related_vocabulary_ids and related_grammar_ids in master_exercises
-- Map old IDs to new master IDs
-- ============================================================
-- This is complex and requires application-level logic to properly map
-- For now, we'll clear these fields and let them be populated fresh
UPDATE master_exercises
SET related_vocabulary_ids = NULL,
    related_grammar_ids = NULL
WHERE related_vocabulary_ids IS NOT NULL OR related_grammar_ids IS NOT NULL;

-- ============================================================
-- STEP 10: Create ID mapping tables for reference
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_vocab_id_map (
    old_vocabulary_id INT NOT NULL,
    master_vocabulary_id INT NOT NULL,
    user_vocabulary_id INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    PRIMARY KEY (old_vocabulary_id),
    INDEX idx_master (master_vocabulary_id),
    INDEX idx_user_vocab (user_vocabulary_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migration_vocab_id_map (old_vocabulary_id, master_vocabulary_id, user_vocabulary_id, user_id)
SELECT
    v.id AS old_vocabulary_id,
    mv.id AS master_vocabulary_id,
    uv.id AS user_vocabulary_id,
    v.user_id
FROM vocabulary v
JOIN master_vocabulary mv ON mv.english_word = v.english_word AND mv.part_of_speech = v.part_of_speech
LEFT JOIN user_vocabulary uv ON uv.user_id = v.user_id AND uv.master_vocabulary_id = mv.id
ON DUPLICATE KEY UPDATE
    master_vocabulary_id = VALUES(master_vocabulary_id),
    user_vocabulary_id = VALUES(user_vocabulary_id);

CREATE TABLE IF NOT EXISTS migration_grammar_id_map (
    old_grammar_id INT NOT NULL,
    master_grammar_id INT NOT NULL,
    user_grammar_id INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    PRIMARY KEY (old_grammar_id),
    INDEX idx_master (master_grammar_id),
    INDEX idx_user_grammar (user_grammar_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migration_grammar_id_map (old_grammar_id, master_grammar_id, user_grammar_id, user_id)
SELECT
    gp.id AS old_grammar_id,
    mg.id AS master_grammar_id,
    ug.id AS user_grammar_id,
    gp.user_id
FROM grammar_points gp
JOIN master_grammar mg ON mg.grammar_rule = gp.grammar_rule AND mg.category = COALESCE(gp.category, 'general')
LEFT JOIN user_grammar ug ON ug.user_id = gp.user_id AND ug.master_grammar_id = mg.id
ON DUPLICATE KEY UPDATE
    master_grammar_id = VALUES(master_grammar_id),
    user_grammar_id = VALUES(user_grammar_id);

CREATE TABLE IF NOT EXISTS migration_exercise_id_map (
    old_exercise_id INT NOT NULL,
    master_exercise_id INT NOT NULL,
    PRIMARY KEY (old_exercise_id),
    INDEX idx_master (master_exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migration_exercise_id_map (old_exercise_id, master_exercise_id)
SELECT
    e.id AS old_exercise_id,
    me.id AS master_exercise_id
FROM exercises e
JOIN master_exercises me ON me.question = e.question AND me.exercise_type = e.exercise_type
ON DUPLICATE KEY UPDATE
    master_exercise_id = VALUES(master_exercise_id);

-- ============================================================
-- STEP 11: Update statistics
-- ============================================================
-- Count migrated records
SELECT
    'Migration Statistics' AS report,
    (SELECT COUNT(*) FROM master_vocabulary) AS master_vocabulary_count,
    (SELECT COUNT(*) FROM user_vocabulary) AS user_vocabulary_count,
    (SELECT COUNT(*) FROM master_grammar) AS master_grammar_count,
    (SELECT COUNT(*) FROM user_grammar) AS user_grammar_count,
    (SELECT COUNT(*) FROM master_exercises) AS master_exercises_count,
    (SELECT COUNT(*) FROM user_exercise_attempts) AS user_exercise_attempts_count,
    (SELECT COUNT(*) FROM vocabulary_reviews_v3) AS vocabulary_reviews_v3_count,
    (SELECT COUNT(*) FROM grammar_reviews_v3) AS grammar_reviews_v3_count;

-- ============================================================
-- STEP 12: Mark migration as complete
-- ============================================================
UPDATE feature_flags
SET flag_value = 'true', updated_at = NOW()
WHERE flag_key = 'V3_MIGRATION_COMPLETE';

-- Enable dual-write by default
UPDATE feature_flags
SET flag_value = 'true', updated_at = NOW()
WHERE flag_key = 'DUAL_WRITE_ENABLED';
