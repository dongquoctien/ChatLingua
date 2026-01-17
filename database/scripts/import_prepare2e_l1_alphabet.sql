-- ============================================================
-- Import Prepare 2e Level 1 - Alphabet (26 letters)
-- Run this AFTER import_prepare2e_l1_unit0.sql
-- ============================================================

-- Get IDs
SET @map_id = (SELECT id FROM word_maps WHERE name = 'Prepare 2e Level 1');
SET @unit_id = (SELECT id FROM map_units WHERE map_id = @map_id AND unit_number = 0);
SET @lesson1_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 1);

-- ============================================================
-- Import Alphabet as Vocabulary
-- ============================================================

INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, usage_notes, is_active)
VALUES
('A', 'A (chữ cái)', '/eɪ/', '/eɪ/', '/eɪ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'First letter of the alphabet. Vowel letter.', TRUE),
('B', 'B (bê)', '/biː/', '/biː/', '/biː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Second letter of the alphabet. Consonant letter.', TRUE),
('C', 'C (xê)', '/siː/', '/siː/', '/siː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Third letter of the alphabet. Consonant letter.', TRUE),
('D', 'D (đê)', '/diː/', '/diː/', '/diː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Fourth letter of the alphabet. Consonant letter.', TRUE),
('E', 'E (i)', '/iː/', '/iː/', '/iː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Fifth letter of the alphabet. Vowel letter.', TRUE),
('F', 'F (ép-phờ)', '/ef/', '/ef/', '/ef/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Sixth letter of the alphabet. Consonant letter.', TRUE),
('G', 'G (gi)', '/dʒiː/', '/dʒiː/', '/dʒiː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Seventh letter of the alphabet. Consonant letter.', TRUE),
('H', 'H (hát)', '/eɪtʃ/', '/eɪtʃ/', '/eɪtʃ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Eighth letter of the alphabet. Consonant letter.', TRUE),
('I', 'I (ai)', '/aɪ/', '/aɪ/', '/aɪ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Ninth letter of the alphabet. Vowel letter.', TRUE),
('J', 'J (giây)', '/dʒeɪ/', '/dʒeɪ/', '/dʒeɪ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Tenth letter of the alphabet. Consonant letter.', TRUE),
('K', 'K (cây)', '/keɪ/', '/keɪ/', '/keɪ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Eleventh letter of the alphabet. Consonant letter.', TRUE),
('L', 'L (eo)', '/el/', '/el/', '/el/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twelfth letter of the alphabet. Consonant letter.', TRUE),
('M', 'M (em)', '/em/', '/em/', '/em/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Thirteenth letter of the alphabet. Consonant letter.', TRUE),
('N', 'N (en)', '/en/', '/en/', '/en/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Fourteenth letter of the alphabet. Consonant letter.', TRUE),
('O', 'O (âu)', '/əʊ/', '/əʊ/', '/oʊ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Fifteenth letter of the alphabet. Vowel letter.', TRUE),
('P', 'P (pi)', '/piː/', '/piː/', '/piː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Sixteenth letter of the alphabet. Consonant letter.', TRUE),
('Q', 'Q (kiu)', '/kjuː/', '/kjuː/', '/kjuː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Seventeenth letter of the alphabet. Consonant letter.', TRUE),
('R', 'R (a)', '/ɑː(r)/', '/ɑː(r)/', '/ɑːr/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Eighteenth letter of the alphabet. Consonant letter.', TRUE),
('S', 'S (ét)', '/es/', '/es/', '/es/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Nineteenth letter of the alphabet. Consonant letter.', TRUE),
('T', 'T (ti)', '/tiː/', '/tiː/', '/tiː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twentieth letter of the alphabet. Consonant letter.', TRUE),
('U', 'U (iu)', '/juː/', '/juː/', '/juː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-first letter of the alphabet. Vowel letter.', TRUE),
('V', 'V (vi)', '/viː/', '/viː/', '/viː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-second letter of the alphabet. Consonant letter.', TRUE),
('W', 'W (đắp-bờ-liu)', '/ˈdʌbljuː/', '/ˈdʌbljuː/', '/ˈdʌbljuː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-third letter of the alphabet. Consonant letter.', TRUE),
('X', 'X (éc)', '/eks/', '/eks/', '/eks/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-fourth letter of the alphabet. Consonant letter.', TRUE),
('Y', 'Y (uai)', '/waɪ/', '/waɪ/', '/waɪ/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-fifth letter of the alphabet. Sometimes vowel, sometimes consonant.', TRUE),
('Z', 'Z (dét/di)', '/zed/', '/zed/', '/ziː/', 'noun', 'A1', 'beginner', '["alphabet", "letters", "basic"]', 'Twenty-sixth letter of the alphabet. UK: zed, US: zee. Consonant letter.', TRUE);

-- ============================================================
-- Link Alphabet to Lesson 1
-- ============================================================

INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson1_id, 'vocabulary', id, 'study',
    ASCII(english_word) - 64  -- A=1, B=2, etc.
FROM master_vocabulary
WHERE english_word IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z')
AND topics LIKE '%alphabet%';

-- ============================================================
-- Update Unit Stats
-- ============================================================

UPDATE map_units SET
    total_vocabulary = (
        SELECT COUNT(DISTINCT lc.master_vocabulary_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        WHERE ul.unit_id = @unit_id AND lc.master_vocabulary_id IS NOT NULL
    )
WHERE id = @unit_id;

-- Update Word Map Stats
UPDATE word_maps SET
    total_vocabulary = (
        SELECT COUNT(DISTINCT lc.master_vocabulary_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        JOIN map_units mu ON ul.unit_id = mu.id
        WHERE mu.map_id = @map_id AND lc.master_vocabulary_id IS NOT NULL
    )
WHERE id = @map_id;

-- Verification
SELECT 'Alphabet imported:' as info;
SELECT COUNT(*) as alphabet_count FROM master_vocabulary WHERE topics LIKE '%alphabet%';

SELECT 'Lesson 1 content:' as info;
SELECT COUNT(*) as content_count FROM lesson_content WHERE lesson_id = @lesson1_id;

SELECT 'Import completed!' as status;
