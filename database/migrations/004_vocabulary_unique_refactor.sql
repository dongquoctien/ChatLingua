-- Migration: Vocabulary Unique Refactor
-- Adds UNIQUE constraint on (user_id, english_word, part_of_speech)
-- Creates vocabulary_contexts table for conversation-specific data
-- Migrates existing data to deduplicate vocabulary

-- Step 1: Create vocabulary_contexts table
CREATE TABLE IF NOT EXISTS vocabulary_contexts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vocabulary_id INT NOT NULL,
    conversation_id INT NOT NULL,
    vietnamese_word VARCHAR(255) NOT NULL COMMENT 'Context-specific Vietnamese translation',
    example_sentence_vi TEXT COMMENT 'Example from this conversation context',
    example_sentence_en TEXT COMMENT 'Example from this conversation context',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vocab_conversation (vocabulary_id, conversation_id),
    INDEX idx_vocabulary_id (vocabulary_id),
    INDEX idx_conversation_id (conversation_id)
);

-- Step 2: Migrate existing data to vocabulary_contexts
-- For each vocabulary entry, create a context entry linking it to its conversation
INSERT INTO vocabulary_contexts (vocabulary_id, conversation_id, vietnamese_word, example_sentence_vi, example_sentence_en, created_at)
SELECT id, conversation_id, vietnamese_word, example_sentence_vi, example_sentence_en, created_at
FROM vocabulary;

-- Step 3: Create temporary table to identify duplicates and keep the best entry
-- Best entry = the one with most complete dictionary data (definitions, word_family, synonyms)
CREATE TEMPORARY TABLE vocabulary_to_keep AS
SELECT
    MIN(v.id) as keep_id,
    v.user_id,
    v.english_word,
    v.part_of_speech,
    -- Find the best entry (most complete data)
    (
        SELECT v2.id
        FROM vocabulary v2
        WHERE v2.user_id = v.user_id
          AND v2.english_word = v.english_word
          AND v2.part_of_speech = v.part_of_speech
        ORDER BY
            (v2.definitions IS NOT NULL) DESC,
            (v2.word_family IS NOT NULL) DESC,
            (v2.synonyms IS NOT NULL) DESC,
            (v2.collocations IS NOT NULL) DESC,
            (v2.extra_examples IS NOT NULL) DESC,
            v2.id ASC
        LIMIT 1
    ) as best_id
FROM vocabulary v
GROUP BY v.user_id, v.english_word, v.part_of_speech;

-- Step 4: Update vocabulary_contexts to point to the best vocabulary entry
UPDATE vocabulary_contexts vc
INNER JOIN vocabulary v ON vc.vocabulary_id = v.id
INNER JOIN vocabulary_to_keep vtk ON v.user_id = vtk.user_id
    AND v.english_word = vtk.english_word
    AND v.part_of_speech = vtk.part_of_speech
SET vc.vocabulary_id = vtk.best_id
WHERE vc.vocabulary_id != vtk.best_id;

-- Step 5: Merge mastery data - sum up times_practiced, keep max mastery_level
UPDATE vocabulary v
INNER JOIN (
    SELECT
        vtk.best_id,
        MAX(v2.mastery_level) as max_mastery,
        SUM(v2.times_practiced) as total_practiced,
        MAX(v2.last_practiced_at) as last_practiced
    FROM vocabulary v2
    INNER JOIN vocabulary_to_keep vtk ON v2.user_id = vtk.user_id
        AND v2.english_word = vtk.english_word
        AND v2.part_of_speech = vtk.part_of_speech
    GROUP BY vtk.best_id
) merged ON v.id = merged.best_id
SET
    v.mastery_level = merged.max_mastery,
    v.times_practiced = merged.total_practiced,
    v.last_practiced_at = merged.last_practiced;

-- Step 6: Delete duplicate vocabulary entries (keep only best_id)
DELETE v FROM vocabulary v
INNER JOIN vocabulary_to_keep vtk ON v.user_id = vtk.user_id
    AND v.english_word = vtk.english_word
    AND v.part_of_speech = vtk.part_of_speech
WHERE v.id != vtk.best_id;

-- Step 7: Clean up - remove orphaned contexts after deduplication
DELETE FROM vocabulary_contexts
WHERE vocabulary_id NOT IN (SELECT id FROM vocabulary);

-- Step 8: Remove duplicate contexts (same vocabulary_id, conversation_id)
DELETE vc1 FROM vocabulary_contexts vc1
INNER JOIN vocabulary_contexts vc2
ON vc1.vocabulary_id = vc2.vocabulary_id
   AND vc1.conversation_id = vc2.conversation_id
   AND vc1.id > vc2.id;

-- Step 9: Drop the conversation_id column from vocabulary (no longer needed)
-- First, drop the foreign key constraint
ALTER TABLE vocabulary DROP FOREIGN KEY vocabulary_ibfk_1;
ALTER TABLE vocabulary DROP INDEX idx_conversation_vocab;
ALTER TABLE vocabulary DROP COLUMN conversation_id;

-- Step 10: Drop context-specific columns from vocabulary (moved to vocabulary_contexts)
-- These are now in vocabulary_contexts
ALTER TABLE vocabulary DROP COLUMN example_sentence_vi;
ALTER TABLE vocabulary DROP COLUMN example_sentence_en;

-- Step 11: Add UNIQUE constraint on vocabulary
ALTER TABLE vocabulary
    ADD UNIQUE KEY unique_user_word_pos (user_id, english_word, part_of_speech);

-- Step 12: Clean up temporary table
DROP TEMPORARY TABLE IF EXISTS vocabulary_to_keep;

-- Step 13: Add helpful indexes
ALTER TABLE vocabulary
    ADD INDEX idx_user_mastery (user_id, mastery_level);

-- Step 14: Add updated_at column for tracking updates
ALTER TABLE vocabulary
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
