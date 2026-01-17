-- ============================================================
-- Import Prepare 2e Level 1 - Unit 0 Exercises
-- Run this AFTER import_prepare2e_l1_unit0.sql and alphabet.sql
-- ============================================================

-- Get IDs
SET @map_id = (SELECT id FROM word_maps WHERE name = 'Prepare 2e Level 1');
SET @unit_id = (SELECT id FROM map_units WHERE map_id = @map_id AND unit_number = 0);
SET @lesson1_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 1);
SET @lesson2_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 2);
SET @lesson3_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 3);
SET @lesson4_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 4);
SET @lesson5_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 5);
SET @lesson6_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 6);
SET @lesson7_id = (SELECT id FROM unit_lessons WHERE unit_id = @unit_id AND lesson_number = 7);

-- ============================================================
-- LESSON 2: Numbers 1-20 Exercises
-- ============================================================

-- Multiple Choice: Number to Word
INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'What is the word for the number 5?', '["four", "five", "six", "seven"]', 'five', 'The number 5 is written as "five" in English.', 'Số 5 được viết là "five" trong tiếng Anh.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is the word for the number 12?', '["eleven", "twelve", "thirteen", "ten"]', 'twelve', 'The number 12 is written as "twelve" in English.', 'Số 12 được viết là "twelve" trong tiếng Anh.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is the word for the number 17?', '["sixteen", "seventeen", "eighteen", "fifteen"]', 'seventeen', 'The number 17 is written as "seventeen" in English.', 'Số 17 được viết là "seventeen" trong tiếng Anh.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'How do you write 8 in words?', '["seven", "nine", "eight", "six"]', 'eight', 'The number 8 is written as "eight" in English.', 'Số 8 được viết là "eight" trong tiếng Anh.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'How do you write 15 in words?', '["fourteen", "sixteen", "fifteen", "thirteen"]', 'fifteen', 'The number 15 is written as "fifteen" in English.', 'Số 15 được viết là "fifteen" trong tiếng Anh.', 'beginner', 'A1', 30, 10, TRUE);

-- Translation: English to Vietnamese
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('translation', 'Translate to Vietnamese: "three"', 'ba', 'Three = ba (số 3)', 'Three = ba (số 3)', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "eleven"', 'mười một', 'Eleven = mười một (số 11)', 'Eleven = mười một (số 11)', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "twenty"', 'hai mươi', 'Twenty = hai mươi (số 20)', 'Twenty = hai mươi (số 20)', 'beginner', 'A1', 30, 10, TRUE);

-- Fill Blank: Write the number word
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, exercise_data, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('fill_blank', 'Write the number: 7 = _______', 'seven', 'The number 7 is "seven".', 'Số 7 là "seven".', '{"blank_position": "end"}', 'beginner', 'A1', 45, 10, TRUE),
('fill_blank', 'Write the number: 14 = _______', 'fourteen', 'The number 14 is "fourteen".', 'Số 14 là "fourteen".', '{"blank_position": "end"}', 'beginner', 'A1', 45, 10, TRUE),
('fill_blank', 'Write the number: 19 = _______', 'nineteen', 'The number 19 is "nineteen".', 'Số 19 là "nineteen".', '{"blank_position": "end"}', 'beginner', 'A1', 45, 10, TRUE);

-- ============================================================
-- LESSON 3: Days of the Week Exercises
-- ============================================================

INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'Which day comes after Monday?', '["Sunday", "Tuesday", "Wednesday", "Saturday"]', 'Tuesday', 'The order is: Monday → Tuesday → Wednesday', 'Thứ tự là: Thứ Hai → Thứ Ba → Thứ Tư', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Which day comes before Friday?', '["Saturday", "Sunday", "Thursday", "Wednesday"]', 'Thursday', 'The order is: Wednesday → Thursday → Friday', 'Thứ tự là: Thứ Tư → Thứ Năm → Thứ Sáu', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is the first day of the week (British)?', '["Sunday", "Monday", "Saturday", "Tuesday"]', 'Monday', 'In British English, the week starts on Monday.', 'Trong tiếng Anh Anh, tuần bắt đầu từ Thứ Hai.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is "Chủ Nhật" in English?', '["Saturday", "Sunday", "Friday", "Monday"]', 'Sunday', 'Chủ Nhật = Sunday', 'Chủ Nhật = Sunday', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is "Thứ Tư" in English?', '["Thursday", "Tuesday", "Wednesday", "Friday"]', 'Wednesday', 'Thứ Tư = Wednesday', 'Thứ Tư = Wednesday', 'beginner', 'A1', 30, 10, TRUE);

-- Sentence Building: Order the days
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, exercise_data, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('sentence_building', 'Put in order: Tuesday, Monday, Wednesday', 'Monday, Tuesday, Wednesday', 'The correct order of days.', 'Thứ tự đúng của các ngày.', '{"words": ["Tuesday", "Monday", "Wednesday"]}', 'beginner', 'A1', 45, 15, TRUE),
('sentence_building', 'Put in order: Saturday, Thursday, Friday', 'Thursday, Friday, Saturday', 'The correct order of days.', 'Thứ tự đúng của các ngày.', '{"words": ["Saturday", "Thursday", "Friday"]}', 'beginner', 'A1', 45, 15, TRUE);

-- ============================================================
-- LESSON 4: Months Exercises
-- ============================================================

INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'Which month comes after January?', '["March", "February", "December", "April"]', 'February', 'The order is: January → February → March', 'Thứ tự là: Tháng 1 → Tháng 2 → Tháng 3', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Which is the last month of the year?', '["November", "October", "December", "January"]', 'December', 'December is the 12th and last month.', 'Tháng 12 (December) là tháng cuối cùng trong năm.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Which month has 28 or 29 days?', '["January", "February", "March", "April"]', 'February', 'February has 28 days (29 in leap years).', 'Tháng 2 có 28 ngày (29 ngày trong năm nhuận).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is "Tháng Bảy" in English?', '["June", "July", "August", "September"]', 'July', 'Tháng Bảy = July (tháng 7)', 'Tháng Bảy = July (tháng 7)', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What is "Tháng Mười" in English?', '["September", "October", "November", "December"]', 'October', 'Tháng Mười = October (tháng 10)', 'Tháng Mười = October (tháng 10)', 'beginner', 'A1', 30, 10, TRUE);

-- Translation
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('translation', 'Translate to Vietnamese: "March"', 'Tháng Ba', 'March = Tháng Ba (tháng 3)', 'March = Tháng Ba (tháng 3)', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "September"', 'Tháng Chín', 'September = Tháng Chín (tháng 9)', 'September = Tháng Chín (tháng 9)', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "November"', 'Tháng Mười Một', 'November = Tháng Mười Một (tháng 11)', 'November = Tháng Mười Một (tháng 11)', 'beginner', 'A1', 30, 10, TRUE);

-- ============================================================
-- LESSON 5: Classroom Objects Exercises
-- ============================================================

INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'What do you write with?', '["book", "pen", "ruler", "board"]', 'pen', 'You write with a pen.', 'Bạn viết bằng bút mực (pen).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What do you use to measure?', '["pencil", "rubber", "ruler", "book"]', 'ruler', 'You use a ruler to measure.', 'Bạn dùng thước kẻ (ruler) để đo.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What do you use to erase mistakes?', '["pen", "pencil", "rubber", "book"]', 'rubber', 'You use a rubber (eraser) to erase.', 'Bạn dùng cục tẩy (rubber) để xóa.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Where do teachers write?', '["book", "desk", "board", "pencil case"]', 'board', 'Teachers write on the board.', 'Giáo viên viết trên bảng (board).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Where do you keep pencils?', '["book", "board", "ruler", "pencil case"]', 'pencil case', 'You keep pencils in a pencil case.', 'Bạn để bút chì trong hộp bút (pencil case).', 'beginner', 'A1', 30, 10, TRUE);

-- Fill Blank: a/an
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, exercise_data, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('fill_blank', 'This is _____ apple.', 'an', 'Use "an" before vowel sounds. Apple starts with "a".', 'Dùng "an" trước nguyên âm. Apple bắt đầu bằng "a".', '{"blank_position": "middle"}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'This is _____ pen.', 'a', 'Use "a" before consonant sounds. Pen starts with "p".', 'Dùng "a" trước phụ âm. Pen bắt đầu bằng "p".', '{"blank_position": "middle"}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'This is _____ ruler.', 'a', 'Use "a" before consonant sounds. Ruler starts with "r".', 'Dùng "a" trước phụ âm. Ruler bắt đầu bằng "r".', '{"blank_position": "middle"}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'This is _____ orange.', 'an', 'Use "an" before vowel sounds. Orange starts with "o".', 'Dùng "an" trước nguyên âm. Orange bắt đầu bằng "o".', '{"blank_position": "middle"}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'This is _____ book.', 'a', 'Use "a" before consonant sounds. Book starts with "b".', 'Dùng "a" trước phụ âm. Book bắt đầu bằng "b".', '{"blank_position": "middle"}', 'beginner', 'A1', 30, 10, TRUE);

-- ============================================================
-- LESSON 6: Colours Exercises
-- ============================================================

INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'What colour is the sky?', '["green", "blue", "red", "yellow"]', 'blue', 'The sky is blue.', 'Bầu trời màu xanh dương (blue).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What colour is grass?', '["blue", "red", "green", "orange"]', 'green', 'Grass is green.', 'Cỏ màu xanh lá (green).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What colour is snow?', '["black", "grey", "white", "brown"]', 'white', 'Snow is white.', 'Tuyết màu trắng (white).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What colour is a banana?', '["red", "green", "yellow", "blue"]', 'yellow', 'A banana is yellow.', 'Quả chuối màu vàng (yellow).', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'What colour is chocolate?', '["white", "brown", "yellow", "green"]', 'brown', 'Chocolate is brown.', 'Sô-cô-la màu nâu (brown).', 'beginner', 'A1', 30, 10, TRUE);

-- Translation
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('translation', 'Translate to Vietnamese: "red"', 'đỏ', 'Red = đỏ', 'Red = đỏ', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "black"', 'đen', 'Black = đen', 'Black = đen', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "orange"', 'cam', 'Orange = cam (màu cam)', 'Orange = cam (màu cam)', 'beginner', 'A1', 30, 10, TRUE),
('translation', 'Translate to Vietnamese: "grey"', 'xám', 'Grey = xám', 'Grey = xám', 'beginner', 'A1', 30, 10, TRUE);

-- ============================================================
-- LESSON 7: Grammar Exercises (a/an, this/that/these/those)
-- ============================================================

-- a/an exercises
INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', 'Choose the correct article: _____ eraser', '["a", "an"]', 'an', 'Use "an" before vowel sounds. Eraser starts with "e".', 'Dùng "an" trước nguyên âm. Eraser bắt đầu bằng "e".', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Choose the correct article: _____ desk', '["a", "an"]', 'a', 'Use "a" before consonant sounds. Desk starts with "d".', 'Dùng "a" trước phụ âm. Desk bắt đầu bằng "d".', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Choose the correct article: _____ umbrella', '["a", "an"]', 'an', 'Use "an" before vowel sounds. Umbrella starts with "u".', 'Dùng "an" trước nguyên âm. Umbrella bắt đầu bằng "u".', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Choose the correct article: _____ hour', '["a", "an"]', 'an', 'Use "an" because "hour" has a silent "h" - it sounds like it starts with a vowel.', 'Dùng "an" vì "hour" có "h" câm - nghe như bắt đầu bằng nguyên âm.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', 'Choose the correct article: _____ university', '["a", "an"]', 'a', 'Use "a" because "university" sounds like it starts with "y" (consonant sound).', 'Dùng "a" vì "university" nghe như bắt đầu bằng "y" (phụ âm).', 'beginner', 'A1', 30, 10, TRUE);

-- this/that/these/those exercises
INSERT INTO master_exercises (exercise_type, question, options, correct_answer, explanation, explanation_vi, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('multiple_choice', '_____ book (near, singular)', '["this", "that", "these", "those"]', 'this', 'Use "this" for singular + near.', 'Dùng "this" cho số ít + gần.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', '_____ books (near, plural)', '["this", "that", "these", "those"]', 'these', 'Use "these" for plural + near.', 'Dùng "these" cho số nhiều + gần.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', '_____ car (far, singular)', '["this", "that", "these", "those"]', 'that', 'Use "that" for singular + far.', 'Dùng "that" cho số ít + xa.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', '_____ trees (far, plural)', '["this", "that", "these", "those"]', 'those', 'Use "those" for plural + far.', 'Dùng "those" cho số nhiều + xa.', 'beginner', 'A1', 30, 10, TRUE),
('multiple_choice', '_____ pencil in my hand', '["this", "that", "these", "those"]', 'this', 'In your hand = near, pencil = singular. Use "this".', 'Trong tay = gần, pencil = số ít. Dùng "this".', 'beginner', 'A1', 30, 10, TRUE);

-- Fill blank for demonstratives
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, exercise_data, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('fill_blank', '_____ is my pencil. (pointing to pencil in hand)', 'This', 'Near + singular = this', 'Gần + số ít = this', '{"blank_position": "start", "options": ["This", "That", "These", "Those"]}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', '_____ are my books on the desk here.', 'These', 'Near + plural = these', 'Gần + số nhiều = these', '{"blank_position": "start", "options": ["This", "That", "These", "Those"]}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'Look at _____ bird in the sky!', 'that', 'Far + singular = that', 'Xa + số ít = that', '{"blank_position": "middle", "options": ["this", "that", "these", "those"]}', 'beginner', 'A1', 30, 10, TRUE),
('fill_blank', 'Can you see _____ mountains over there?', 'those', 'Far + plural = those', 'Xa + số nhiều = those', '{"blank_position": "middle", "options": ["this", "that", "these", "those"]}', 'beginner', 'A1', 30, 10, TRUE);

-- Error Correction
INSERT INTO master_exercises (exercise_type, question, correct_answer, explanation, explanation_vi, exercise_data, difficulty_level, cefr_level, time_limit_seconds, points, is_active)
VALUES
('error_correction', 'Find the error: "I have a apple."', 'I have an apple.', 'Apple starts with a vowel sound, so use "an".', 'Apple bắt đầu bằng nguyên âm, nên dùng "an".', '{"error_word": "a", "correct_word": "an"}', 'beginner', 'A1', 45, 15, TRUE),
('error_correction', 'Find the error: "These book is interesting."', 'This book is interesting.', '"Book" is singular, so use "this" not "these".', '"Book" là số ít, nên dùng "this" không phải "these".', '{"error_word": "These", "correct_word": "This"}', 'beginner', 'A1', 45, 15, TRUE),
('error_correction', 'Find the error: "Those pencil are red."', 'Those pencils are red.', 'With "those" (plural), use plural noun "pencils".', 'Với "those" (số nhiều), dùng danh từ số nhiều "pencils".', '{"error_word": "pencil", "correct_word": "pencils"}', 'beginner', 'A1', 45, 15, TRUE),
('error_correction', 'Find the error: "This books are new."', 'These books are new.', '"Books" is plural, so use "these" not "this".', '"Books" là số nhiều, nên dùng "these" không phải "this".', '{"error_word": "This", "correct_word": "These"}', 'beginner', 'A1', 45, 15, TRUE),
('error_correction', 'Find the error: "She is an teacher."', 'She is a teacher.', 'Teacher starts with a consonant sound, so use "a".', 'Teacher bắt đầu bằng phụ âm, nên dùng "a".', '{"error_word": "an", "correct_word": "a"}', 'beginner', 'A1', 45, 15, TRUE);

-- ============================================================
-- Link Exercises to Lessons
-- ============================================================

-- Note: This needs to be run after exercises are inserted
-- The linking would be done by matching exercise questions to appropriate lessons

-- Verification
SELECT 'Exercises created:' as info;
SELECT exercise_type, COUNT(*) as count FROM master_exercises WHERE cefr_level = 'A1' GROUP BY exercise_type;

SELECT 'Total exercises:' as info;
SELECT COUNT(*) as total FROM master_exercises WHERE cefr_level = 'A1';

SELECT 'Import completed!' as status;
