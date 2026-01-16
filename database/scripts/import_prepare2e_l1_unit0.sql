-- ============================================================
-- Import Prepare 2e Level 1 - Unit 0: In the Classroom
-- This script imports vocabulary, grammar, and creates structure
-- ============================================================

-- ============================================================
-- STEP 1: Create Word Map (if not exists)
-- ============================================================
INSERT IGNORE INTO word_maps (
    name, description, cover_image_url, cefr_level, publisher,
    total_units, estimated_hours, is_free, is_featured, is_active, is_published,
    display_order
) VALUES (
    'Prepare 2e Level 1',
    'Cambridge Prepare Second Edition Level 1 - A complete English course for beginners (CEFR A1). Covers essential vocabulary, grammar, listening, speaking, reading and writing skills through 20 units plus a starter unit.',
    '/images/word-maps/prepare-2e-l1/cover.png',
    'A1',
    'Cambridge',
    21, -- 20 units + 1 starter
    60, -- estimated hours
    TRUE, -- is_free
    TRUE, -- is_featured
    TRUE, -- is_active
    TRUE, -- is_published
    1 -- display_order
);

-- Get the map ID
SET @map_id = (SELECT id FROM word_maps WHERE name = 'Prepare 2e Level 1');

-- ============================================================
-- STEP 2: Create Unit 0 - Starter Unit
-- ============================================================
INSERT IGNORE INTO map_units (
    map_id, unit_number, title, description,
    is_review_unit, boss_exam_count, boss_passing_score,
    total_lessons, completion_xp, completion_coins,
    display_order, is_active
) VALUES (
    @map_id,
    0,
    'Unit 0: In the Classroom',
    'Starter Unit - Introduction to basic classroom language including the alphabet, numbers 1-20, days of the week, months, classroom objects, and colours.',
    FALSE,
    1, -- boss_exam_count
    80, -- boss_passing_score (easier for starter unit)
    7, -- total_lessons
    50, -- completion_xp
    30, -- completion_coins
    0, -- display_order
    TRUE
);

SET @unit_id = (SELECT id FROM map_units WHERE map_id = @map_id AND unit_number = 0);

-- ============================================================
-- STEP 3: Create 7 Lessons for Unit 0
-- ============================================================

-- Lesson 1: The Alphabet
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 1, 'The Alphabet', 'vocabulary',
    'Learn the English alphabet (A-Z) and how to spell words.',
    10, 10, TRUE, 80,
    20, 15, 20, 10, 1
);
SET @lesson1_id = LAST_INSERT_ID();

-- Lesson 2: Numbers 1-20
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 2, 'Numbers 1-20', 'vocabulary',
    'Learn to count from 1 to 20 in English.',
    10, 11, TRUE, 80,
    20, 15, 20, 10, 2
);
SET @lesson2_id = LAST_INSERT_ID();

-- Lesson 3: Days of the Week
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 3, 'Days of the Week', 'vocabulary',
    'Learn the seven days of the week in English.',
    11, 11, TRUE, 80,
    15, 10, 15, 8, 3
);
SET @lesson3_id = LAST_INSERT_ID();

-- Lesson 4: Months of the Year
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 4, 'Months of the Year', 'vocabulary',
    'Learn the twelve months of the year in English.',
    13, 13, TRUE, 80,
    20, 15, 20, 10, 4
);
SET @lesson4_id = LAST_INSERT_ID();

-- Lesson 5: Classroom Objects
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 5, 'Classroom Objects', 'vocabulary',
    'Learn vocabulary for common objects in the classroom.',
    12, 12, TRUE, 80,
    20, 15, 20, 10, 5
);
SET @lesson5_id = LAST_INSERT_ID();

-- Lesson 6: Colours
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 6, 'Colours', 'vocabulary',
    'Learn the names of colours in English.',
    12, 12, TRUE, 80,
    15, 10, 15, 8, 6
);
SET @lesson6_id = LAST_INSERT_ID();

-- Lesson 7: Grammar - a/an & this/that/these/those
INSERT IGNORE INTO unit_lessons (
    unit_id, lesson_number, title, lesson_type, description,
    pdf_page_start, pdf_page_end, has_boss_exam, boss_passing_score,
    estimated_minutes, study_xp, exam_xp, coins_reward, display_order
) VALUES (
    @unit_id, 7, 'Grammar: Articles and Demonstratives', 'grammar',
    'Learn to use a/an and this/that/these/those correctly.',
    12, 12, TRUE, 80,
    25, 20, 25, 15, 7
);
SET @lesson7_id = LAST_INSERT_ID();

-- ============================================================
-- STEP 4: Import Vocabulary - Numbers 1-20
-- ============================================================

-- Numbers 1-20
INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, is_active)
VALUES
('one', 'một', '/wʌn/', '/wʌn/', '/wʌn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('two', 'hai', '/tuː/', '/tuː/', '/tuː/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('three', 'ba', '/θriː/', '/θriː/', '/θriː/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('four', 'bốn', '/fɔː(r)/', '/fɔː(r)/', '/fɔːr/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('five', 'năm', '/faɪv/', '/faɪv/', '/faɪv/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('six', 'sáu', '/sɪks/', '/sɪks/', '/sɪks/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('seven', 'bảy', '/ˈsevn/', '/ˈsevn/', '/ˈsevn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('eight', 'tám', '/eɪt/', '/eɪt/', '/eɪt/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('nine', 'chín', '/naɪn/', '/naɪn/', '/naɪn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('ten', 'mười', '/ten/', '/ten/', '/ten/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('eleven', 'mười một', '/ɪˈlevn/', '/ɪˈlevn/', '/ɪˈlevn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('twelve', 'mười hai', '/twelv/', '/twelv/', '/twelv/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('thirteen', 'mười ba', '/ˌθɜːˈtiːn/', '/ˌθɜːˈtiːn/', '/ˌθɜːrˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('fourteen', 'mười bốn', '/ˌfɔːˈtiːn/', '/ˌfɔːˈtiːn/', '/ˌfɔːrˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('fifteen', 'mười lăm', '/ˌfɪfˈtiːn/', '/ˌfɪfˈtiːn/', '/ˌfɪfˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('sixteen', 'mười sáu', '/ˌsɪksˈtiːn/', '/ˌsɪksˈtiːn/', '/ˌsɪksˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('seventeen', 'mười bảy', '/ˌsevnˈtiːn/', '/ˌsevnˈtiːn/', '/ˌsevnˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('eighteen', 'mười tám', '/ˌeɪˈtiːn/', '/ˌeɪˈtiːn/', '/ˌeɪˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('nineteen', 'mười chín', '/ˌnaɪnˈtiːn/', '/ˌnaɪnˈtiːn/', '/ˌnaɪnˈtiːn/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE),
('twenty', 'hai mươi', '/ˈtwenti/', '/ˈtwenti/', '/ˈtwenti/', 'noun', 'A1', 'beginner', '["numbers", "basic", "counting"]', TRUE);

-- ============================================================
-- STEP 5: Import Vocabulary - Days of the Week
-- ============================================================

INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, is_active)
VALUES
('Monday', 'Thứ Hai', '/ˈmʌndeɪ/', '/ˈmʌndeɪ/', '/ˈmʌndeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Tuesday', 'Thứ Ba', '/ˈtjuːzdeɪ/', '/ˈtjuːzdeɪ/', '/ˈtuːzdeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Wednesday', 'Thứ Tư', '/ˈwenzdeɪ/', '/ˈwenzdeɪ/', '/ˈwenzdeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Thursday', 'Thứ Năm', '/ˈθɜːzdeɪ/', '/ˈθɜːzdeɪ/', '/ˈθɜːrzdeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Friday', 'Thứ Sáu', '/ˈfraɪdeɪ/', '/ˈfraɪdeɪ/', '/ˈfraɪdeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Saturday', 'Thứ Bảy', '/ˈsætədeɪ/', '/ˈsætədeɪ/', '/ˈsætərdeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE),
('Sunday', 'Chủ Nhật', '/ˈsʌndeɪ/', '/ˈsʌndeɪ/', '/ˈsʌndeɪ/', 'noun', 'A1', 'beginner', '["days", "time", "calendar"]', TRUE);

-- ============================================================
-- STEP 6: Import Vocabulary - Months
-- ============================================================

INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, is_active)
VALUES
('January', 'Tháng Một', '/ˈdʒænjuəri/', '/ˈdʒænjuəri/', '/ˈdʒænjueri/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('February', 'Tháng Hai', '/ˈfebruəri/', '/ˈfebruəri/', '/ˈfebrueri/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('March', 'Tháng Ba', '/mɑːtʃ/', '/mɑːtʃ/', '/mɑːrtʃ/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('April', 'Tháng Tư', '/ˈeɪprəl/', '/ˈeɪprəl/', '/ˈeɪprəl/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('May', 'Tháng Năm', '/meɪ/', '/meɪ/', '/meɪ/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('June', 'Tháng Sáu', '/dʒuːn/', '/dʒuːn/', '/dʒuːn/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('July', 'Tháng Bảy', '/dʒuˈlaɪ/', '/dʒuˈlaɪ/', '/dʒuˈlaɪ/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('August', 'Tháng Tám', '/ˈɔːɡəst/', '/ˈɔːɡəst/', '/ˈɔːɡəst/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('September', 'Tháng Chín', '/sepˈtembə(r)/', '/sepˈtembə(r)/', '/sepˈtembər/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('October', 'Tháng Mười', '/ɒkˈtəʊbə(r)/', '/ɒkˈtəʊbə(r)/', '/ɑːkˈtoʊbər/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('November', 'Tháng Mười Một', '/nəʊˈvembə(r)/', '/nəʊˈvembə(r)/', '/noʊˈvembər/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE),
('December', 'Tháng Mười Hai', '/dɪˈsembə(r)/', '/dɪˈsembə(r)/', '/dɪˈsembər/', 'noun', 'A1', 'beginner', '["months", "time", "calendar"]', TRUE);

-- ============================================================
-- STEP 7: Import Vocabulary - Classroom Objects
-- ============================================================

INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, usage_notes, is_active)
VALUES
('board', 'bảng', '/bɔːd/', '/bɔːd/', '/bɔːrd/', 'noun', 'A1', 'beginner', '["classroom", "school", "objects"]', 'a board (singular)', TRUE),
('teacher', 'giáo viên', '/ˈtiːtʃə(r)/', '/ˈtiːtʃə(r)/', '/ˈtiːtʃər/', 'noun', 'A1', 'beginner', '["classroom", "school", "people"]', 'a teacher (singular)', TRUE),
('girl', 'con gái', '/ɡɜːl/', '/ɡɜːl/', '/ɡɜːrl/', 'noun', 'A1', 'beginner', '["people", "classroom"]', 'a girl (singular)', TRUE),
('boy', 'con trai', '/bɔɪ/', '/bɔɪ/', '/bɔɪ/', 'noun', 'A1', 'beginner', '["people", "classroom"]', 'a boy (singular)', TRUE),
('apple', 'quả táo', '/ˈæpl/', '/ˈæpl/', '/ˈæpl/', 'noun', 'A1', 'beginner', '["food", "fruit", "classroom"]', 'an apple (uses "an")', TRUE),
('rubber', 'cục tẩy', '/ˈrʌbə(r)/', '/ˈrʌbə(r)/', '/ˈrʌbər/', 'noun', 'A1', 'beginner', '["classroom", "school", "stationery"]', 'a rubber / rubbers (British English for eraser)', TRUE),
('pen', 'bút mực', '/pen/', '/pen/', '/pen/', 'noun', 'A1', 'beginner', '["classroom", "school", "stationery"]', 'a pen / pens', TRUE),
('ruler', 'thước kẻ', '/ˈruːlə(r)/', '/ˈruːlə(r)/', '/ˈruːlər/', 'noun', 'A1', 'beginner', '["classroom", "school", "stationery"]', 'a ruler / rulers', TRUE),
('picture', 'bức tranh', '/ˈpɪktʃə(r)/', '/ˈpɪktʃə(r)/', '/ˈpɪktʃər/', 'noun', 'A1', 'beginner', '["classroom", "art"]', 'a picture (singular)', TRUE),
('pencil', 'bút chì', '/ˈpensl/', '/ˈpensl/', '/ˈpensl/', 'noun', 'A1', 'beginner', '["classroom", "school", "stationery"]', 'a pencil / pencils', TRUE),
('pencil case', 'hộp bút', '/ˈpensl keɪs/', '/ˈpensl keɪs/', '/ˈpensl keɪs/', 'noun', 'A1', 'beginner', '["classroom", "school", "stationery"]', 'a pencil case (singular)', TRUE),
('book', 'sách', '/bʊk/', '/bʊk/', '/bʊk/', 'noun', 'A1', 'beginner', '["classroom", "school", "reading"]', 'a book / books', TRUE);

-- ============================================================
-- STEP 8: Import Vocabulary - Colours
-- ============================================================

INSERT IGNORE INTO master_vocabulary (english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us, part_of_speech, cefr_level, difficulty_level, topics, extra_examples, is_active)
VALUES
('black', 'đen', '/blæk/', '/blæk/', '/blæk/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The pen is black.", "vi": "Cây bút màu đen."}]', TRUE),
('blue', 'xanh dương', '/bluː/', '/bluː/', '/bluː/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The book is blue.", "vi": "Quyển sách màu xanh dương."}]', TRUE),
('brown', 'nâu', '/braʊn/', '/braʊn/', '/braʊn/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The desk is brown.", "vi": "Cái bàn màu nâu."}]', TRUE),
('green', 'xanh lá', '/ɡriːn/', '/ɡriːn/', '/ɡriːn/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The apple is green.", "vi": "Quả táo màu xanh."}]', TRUE),
('grey', 'xám', '/ɡreɪ/', '/ɡreɪ/', '/ɡreɪ/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The pencil is grey.", "vi": "Cây bút chì màu xám."}]', TRUE),
('orange', 'cam', '/ˈɒrɪndʒ/', '/ˈɒrɪndʒ/', '/ˈɔːrɪndʒ/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The orange is orange.", "vi": "Quả cam màu cam."}]', TRUE),
('red', 'đỏ', '/red/', '/red/', '/red/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The ruler is red.", "vi": "Cây thước màu đỏ."}]', TRUE),
('white', 'trắng', '/waɪt/', '/waɪt/', '/waɪt/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The board is white.", "vi": "Cái bảng màu trắng."}]', TRUE),
('yellow', 'vàng', '/ˈjeləʊ/', '/ˈjeləʊ/', '/ˈjeloʊ/', 'adjective', 'A1', 'beginner', '["colours", "basic"]', '[{"en": "The pencil is yellow.", "vi": "Cây bút chì màu vàng."}]', TRUE);

-- ============================================================
-- STEP 9: Import Grammar Points
-- ============================================================

-- Grammar Point 1: a / an (Indefinite Articles)
INSERT IGNORE INTO master_grammar (
    grammar_rule, category, subcategory, cefr_level, difficulty_level,
    explanation, explanation_vi, formula,
    examples, common_mistakes, usage_tips, is_active
) VALUES (
    'a / an (Indefinite Articles)',
    'articles',
    'indefinite',
    'A1',
    'beginner',
    'Use "a" before words that begin with a consonant sound. Use "an" before words that begin with a vowel sound. These are called indefinite articles because they refer to any one of a group, not a specific one.',
    'Dùng "a" trước các từ bắt đầu bằng phụ âm. Dùng "an" trước các từ bắt đầu bằng nguyên âm (a, e, i, o, u). Đây được gọi là mạo từ không xác định vì chúng chỉ một trong một nhóm, không phải một cái cụ thể.',
    'a + consonant sound (a book, a pen)\nan + vowel sound (an apple, an orange)',
    '[{"en": "a ruler", "vi": "một cây thước"}, {"en": "a book", "vi": "một quyển sách"}, {"en": "a desk", "vi": "một cái bàn"}, {"en": "a pen", "vi": "một cây bút"}, {"en": "an apple", "vi": "một quả táo"}, {"en": "an orange", "vi": "một quả cam"}, {"en": "an eraser", "vi": "một cục tẩy"}]',
    '[{"wrong": "a apple", "correct": "an apple", "explanation": "Apple starts with a vowel sound, so use an"}, {"wrong": "an book", "correct": "a book", "explanation": "Book starts with a consonant sound, so use a"}, {"wrong": "a hour", "correct": "an hour", "explanation": "Hour has a silent h, so it starts with a vowel sound"}]',
    'Remember: It is about the SOUND, not the letter. "Hour" starts with "h" but uses "an" because the "h" is silent.',
    TRUE
);

-- Grammar Point 2: this / that / these / those (Demonstratives)
INSERT IGNORE INTO master_grammar (
    grammar_rule, category, subcategory, cefr_level, difficulty_level,
    explanation, explanation_vi, formula,
    examples, common_mistakes, usage_tips, is_active
) VALUES (
    'this / that / these / those (Demonstratives)',
    'determiners',
    'demonstratives',
    'A1',
    'beginner',
    'Use "this" and "these" for things near you. Use "that" and "those" for things far from you. "This" and "that" are for singular nouns. "These" and "those" are for plural nouns.',
    'Dùng "this" và "these" cho vật ở gần bạn. Dùng "that" và "those" cho vật ở xa bạn. "This" và "that" dùng cho danh từ số ít. "These" và "those" dùng cho danh từ số nhiều.',
    'this (singular, near) - này\nthat (singular, far) - kia\nthese (plural, near) - những cái này\nthose (plural, far) - những cái kia',
    '[{"en": "This pencil is red.", "vi": "Cây bút chì này màu đỏ."}, {"en": "That book is green.", "vi": "Quyển sách kia màu xanh."}, {"en": "These pencils are orange.", "vi": "Những cây bút chì này màu cam."}, {"en": "Those books are blue.", "vi": "Những quyển sách kia màu xanh."}]',
    '[{"wrong": "This books", "correct": "These books", "explanation": "Books is plural, so use these"}, {"wrong": "Those pencil", "correct": "That pencil / Those pencils", "explanation": "Match singular/plural: that+singular, those+plural"}]',
    'Point to objects when teaching this grammar. Near = this/these, Far = that/those.',
    TRUE
);

-- ============================================================
-- STEP 10: Link Vocabulary to Lessons
-- ============================================================

-- Get lesson IDs
SET @lesson1_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 1);
SET @lesson2_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 2);
SET @lesson3_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 3);
SET @lesson4_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 4);
SET @lesson5_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 5);
SET @lesson6_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 6);
SET @lesson7_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 7);

-- Link Numbers to Lesson 2
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson2_id, 'vocabulary', id, 'study',
    CASE english_word
        WHEN 'one' THEN 1 WHEN 'two' THEN 2 WHEN 'three' THEN 3 WHEN 'four' THEN 4
        WHEN 'five' THEN 5 WHEN 'six' THEN 6 WHEN 'seven' THEN 7 WHEN 'eight' THEN 8
        WHEN 'nine' THEN 9 WHEN 'ten' THEN 10 WHEN 'eleven' THEN 11 WHEN 'twelve' THEN 12
        WHEN 'thirteen' THEN 13 WHEN 'fourteen' THEN 14 WHEN 'fifteen' THEN 15
        WHEN 'sixteen' THEN 16 WHEN 'seventeen' THEN 17 WHEN 'eighteen' THEN 18
        WHEN 'nineteen' THEN 19 WHEN 'twenty' THEN 20
    END
FROM master_vocabulary
WHERE english_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty')
AND topics LIKE '%numbers%';

-- Link Days to Lesson 3
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson3_id, 'vocabulary', id, 'study',
    CASE english_word
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
    END
FROM master_vocabulary
WHERE english_word IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- Link Months to Lesson 4
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson4_id, 'vocabulary', id, 'study',
    CASE english_word
        WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3 WHEN 'April' THEN 4
        WHEN 'May' THEN 5 WHEN 'June' THEN 6 WHEN 'July' THEN 7 WHEN 'August' THEN 8
        WHEN 'September' THEN 9 WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
    END
FROM master_vocabulary
WHERE english_word IN ('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');

-- Link Classroom Objects to Lesson 5
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson5_id, 'vocabulary', id, 'study', ROW_NUMBER() OVER (ORDER BY id)
FROM master_vocabulary
WHERE english_word IN ('board', 'teacher', 'girl', 'boy', 'apple', 'rubber', 'pen', 'ruler', 'picture', 'pencil', 'pencil case', 'book')
AND topics LIKE '%classroom%';

-- Link Colours to Lesson 6
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order)
SELECT @lesson6_id, 'vocabulary', id, 'study', ROW_NUMBER() OVER (ORDER BY id)
FROM master_vocabulary
WHERE english_word IN ('black', 'blue', 'brown', 'green', 'grey', 'orange', 'red', 'white', 'yellow')
AND topics LIKE '%colours%';

-- Link Grammar to Lesson 7
INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_grammar_id, section, display_order)
SELECT @lesson7_id, 'grammar', id, 'study', 1
FROM master_grammar WHERE grammar_rule = 'a / an (Indefinite Articles)';

INSERT IGNORE INTO lesson_content (lesson_id, content_type, master_grammar_id, section, display_order)
SELECT @lesson7_id, 'grammar', id, 'study', 2
FROM master_grammar WHERE grammar_rule = 'this / that / these / those (Demonstratives)';

-- ============================================================
-- STEP 11: Update Unit Stats
-- ============================================================

UPDATE map_units SET
    total_vocabulary = (
        SELECT COUNT(DISTINCT lc.master_vocabulary_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        WHERE ul.unit_id = @unit_id AND lc.master_vocabulary_id IS NOT NULL
    ),
    total_grammar = (
        SELECT COUNT(DISTINCT lc.master_grammar_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        WHERE ul.unit_id = @unit_id AND lc.master_grammar_id IS NOT NULL
    )
WHERE id = @unit_id;

-- ============================================================
-- STEP 12: Update Word Map Stats
-- ============================================================

UPDATE word_maps SET
    total_vocabulary = (
        SELECT COUNT(DISTINCT lc.master_vocabulary_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        JOIN map_units mu ON ul.unit_id = mu.id
        WHERE mu.map_id = @map_id AND lc.master_vocabulary_id IS NOT NULL
    ),
    total_grammar = (
        SELECT COUNT(DISTINCT lc.master_grammar_id)
        FROM lesson_content lc
        JOIN unit_lessons ul ON lc.lesson_id = ul.id
        JOIN map_units mu ON ul.unit_id = mu.id
        WHERE mu.map_id = @map_id AND lc.master_grammar_id IS NOT NULL
    )
WHERE id = @map_id;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check Word Map
SELECT 'Word Map Created:' as info;
SELECT id, name, cefr_level, total_units, total_vocabulary, total_grammar FROM word_maps WHERE name = 'Prepare 2e Level 1';

-- Check Unit
SELECT 'Unit Created:' as info;
SELECT id, unit_number, title, total_lessons, total_vocabulary, total_grammar FROM map_units WHERE map_id = @map_id;

-- Check Lessons
SELECT 'Lessons Created:' as info;
SELECT id, lesson_number, title, lesson_type, estimated_minutes FROM unit_lessons WHERE unit_id = @unit_id ORDER BY lesson_number;

-- Check Vocabulary Count
SELECT 'Vocabulary Imported:' as info;
SELECT COUNT(*) as total_vocabulary FROM master_vocabulary WHERE topics LIKE '%numbers%' OR topics LIKE '%days%' OR topics LIKE '%months%' OR topics LIKE '%classroom%' OR topics LIKE '%colours%';

-- Check Grammar Count
SELECT 'Grammar Imported:' as info;
SELECT COUNT(*) as total_grammar FROM master_grammar WHERE cefr_level = 'A1' AND category IN ('articles', 'determiners');

-- Check Lesson Content Links
SELECT 'Lesson Content Links:' as info;
SELECT ul.title, lc.content_type, COUNT(*) as content_count
FROM lesson_content lc
JOIN unit_lessons ul ON lc.lesson_id = ul.id
WHERE ul.unit_id = @unit_id
GROUP BY ul.id, lc.content_type
ORDER BY ul.lesson_number;

SELECT 'Import completed successfully!' as status;
