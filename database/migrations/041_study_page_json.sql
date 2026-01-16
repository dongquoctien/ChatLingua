-- Migration: Study Page JSON Storage
-- This migration adds tables for storing JSON-based study page content

-- ============================================================
-- Study Unit Data (JSON storage for entire unit study content)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_unit_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    map_unit_id INT NOT NULL,
    unit_data JSON NOT NULL COMMENT 'StudyUnit JSON data with pages and sections',
    version INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_unit_published (map_unit_id, is_published),
    FOREIGN KEY (map_unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Study Page Data (JSON storage for per-lesson study content)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_page_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_lesson_id INT NOT NULL,
    page_data JSON NOT NULL COMMENT 'Array of StudyPage JSON data',
    version INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_lesson_published (unit_lesson_id, is_published),
    FOREIGN KEY (unit_lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_study_unit_map_unit ON study_unit_data(map_unit_id);
CREATE INDEX idx_study_unit_published ON study_unit_data(is_published);
CREATE INDEX idx_study_page_lesson ON study_page_data(unit_lesson_id);
CREATE INDEX idx_study_page_published ON study_page_data(is_published);

-- ============================================================
-- Insert sample Unit 0 data (Welcome to English)
-- ============================================================
INSERT INTO study_unit_data (map_unit_id, unit_data, version, is_published, created_by)
SELECT
    mu.id,
    '{
        "unitId": "prepare-2e-l1-unit-0",
        "unitNumber": 0,
        "title": "Welcome to English!",
        "cefrLevel": "A1",
        "pages": [
            {
                "pageId": "page-0-1",
                "pageNumber": 1,
                "layout": "two-column",
                "sections": [
                    {
                        "sectionId": "vocab-alphabet",
                        "type": "vocabulary-section",
                        "header": {
                            "title": "VOCABULARY",
                            "subtitle": "The alphabet",
                            "color": "teal"
                        },
                        "exercises": [
                            {
                                "exerciseId": "ex-alphabet-1",
                                "number": 1,
                                "type": "listen-repeat",
                                "instruction": "Listen and repeat.",
                                "audio": {
                                    "trackNumber": "01",
                                    "fileName": "track01-alphabet.mp3",
                                    "baseUrl": "/audio/word-maps/prepare-2e-l1/sb/"
                                },
                                "content": {
                                    "type": "alphabet-grid",
                                    "columns": 7,
                                    "items": [
                                        { "letter": "A a", "phonetic": "/eɪ/" },
                                        { "letter": "B b", "phonetic": "/biː/" },
                                        { "letter": "C c", "phonetic": "/siː/" },
                                        { "letter": "D d", "phonetic": "/diː/" },
                                        { "letter": "E e", "phonetic": "/iː/" },
                                        { "letter": "F f", "phonetic": "/ef/" },
                                        { "letter": "G g", "phonetic": "/dʒiː/" },
                                        { "letter": "H h", "phonetic": "/eɪtʃ/" },
                                        { "letter": "I i", "phonetic": "/aɪ/" },
                                        { "letter": "J j", "phonetic": "/dʒeɪ/" },
                                        { "letter": "K k", "phonetic": "/keɪ/" },
                                        { "letter": "L l", "phonetic": "/el/" },
                                        { "letter": "M m", "phonetic": "/em/" },
                                        { "letter": "N n", "phonetic": "/en/" },
                                        { "letter": "O o", "phonetic": "/əʊ/" },
                                        { "letter": "P p", "phonetic": "/piː/" },
                                        { "letter": "Q q", "phonetic": "/kjuː/" },
                                        { "letter": "R r", "phonetic": "/ɑː/" },
                                        { "letter": "S s", "phonetic": "/es/" },
                                        { "letter": "T t", "phonetic": "/tiː/" },
                                        { "letter": "U u", "phonetic": "/juː/" },
                                        { "letter": "V v", "phonetic": "/viː/" },
                                        { "letter": "W w", "phonetic": "/ˈdʌbljuː/" },
                                        { "letter": "X x", "phonetic": "/eks/" },
                                        { "letter": "Y y", "phonetic": "/waɪ/" },
                                        { "letter": "Z z", "phonetic": "/zed/" }
                                    ]
                                }
                            },
                            {
                                "exerciseId": "ex-alphabet-2",
                                "number": 2,
                                "type": "listen-write",
                                "instruction": "Listen. Write the letters you hear.",
                                "audio": {
                                    "trackNumber": "02",
                                    "fileName": "track02-letters.mp3",
                                    "baseUrl": "/audio/word-maps/prepare-2e-l1/sb/"
                                },
                                "interactive": {
                                    "type": "fill-blanks",
                                    "data": {
                                        "type": "fill-blanks",
                                        "sentences": [
                                            { "text": "1. ___, ___, ___", "blanks": [{ "position": 0, "answer": "A" }, { "position": 1, "answer": "B" }, { "position": 2, "answer": "C" }] },
                                            { "text": "2. ___, ___, ___", "blanks": [{ "position": 0, "answer": "L" }, { "position": 1, "answer": "M" }, { "position": 2, "answer": "N" }] },
                                            { "text": "3. ___, ___, ___", "blanks": [{ "position": 0, "answer": "X" }, { "position": 1, "answer": "Y" }, { "position": 2, "answer": "Z" }] }
                                        ]
                                    }
                                },
                                "content": {
                                    "type": "text",
                                    "text": "Write the letters you hear in the spaces."
                                }
                            }
                        ]
                    },
                    {
                        "sectionId": "vocab-numbers",
                        "type": "vocabulary-section",
                        "header": {
                            "title": "VOCABULARY",
                            "subtitle": "Numbers 1-20",
                            "color": "teal"
                        },
                        "exercises": [
                            {
                                "exerciseId": "ex-numbers-1",
                                "number": 3,
                                "type": "listen-repeat",
                                "instruction": "Listen and repeat.",
                                "audio": {
                                    "trackNumber": "03",
                                    "fileName": "track03-numbers.mp3",
                                    "baseUrl": "/audio/word-maps/prepare-2e-l1/sb/"
                                },
                                "content": {
                                    "type": "number-grid",
                                    "columns": 4,
                                    "items": [
                                        { "number": 1, "word": "one" },
                                        { "number": 2, "word": "two" },
                                        { "number": 3, "word": "three" },
                                        { "number": 4, "word": "four" },
                                        { "number": 5, "word": "five" },
                                        { "number": 6, "word": "six" },
                                        { "number": 7, "word": "seven" },
                                        { "number": 8, "word": "eight" },
                                        { "number": 9, "word": "nine" },
                                        { "number": 10, "word": "ten" },
                                        { "number": 11, "word": "eleven" },
                                        { "number": 12, "word": "twelve" },
                                        { "number": 13, "word": "thirteen" },
                                        { "number": 14, "word": "fourteen" },
                                        { "number": 15, "word": "fifteen" },
                                        { "number": 16, "word": "sixteen" },
                                        { "number": 17, "word": "seventeen" },
                                        { "number": 18, "word": "eighteen" },
                                        { "number": 19, "word": "nineteen" },
                                        { "number": 20, "word": "twenty" }
                                    ]
                                }
                            },
                            {
                                "exerciseId": "ex-numbers-2",
                                "number": 4,
                                "type": "match",
                                "instruction": "Match the numbers with the words.",
                                "interactive": {
                                    "type": "matching",
                                    "data": {
                                        "type": "matching",
                                        "pairs": [
                                            { "left": "7", "right": "seven" },
                                            { "left": "15", "right": "fifteen" },
                                            { "left": "12", "right": "twelve" },
                                            { "left": "19", "right": "nineteen" },
                                            { "left": "20", "right": "twenty" }
                                        ]
                                    }
                                },
                                "content": {
                                    "type": "text",
                                    "text": "Draw lines to connect the numbers with their words."
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }',
    1,
    TRUE,
    NULL
FROM map_units mu
JOIN word_maps wm ON mu.map_id = wm.id
WHERE wm.name = 'Prepare 2nd Edition Level 1' AND mu.unit_number = 0
LIMIT 1;
