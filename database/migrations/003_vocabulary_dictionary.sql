-- Migration: Vocabulary Dictionary Enhancement
-- Adds Oxford-style dictionary fields to vocabulary table

-- Add pronunciation fields
ALTER TABLE vocabulary
    ADD COLUMN pronunciation_uk VARCHAR(100) DEFAULT NULL COMMENT 'UK IPA pronunciation',
    ADD COLUMN pronunciation_us VARCHAR(100) DEFAULT NULL COMMENT 'US IPA pronunciation',
    ADD COLUMN audio_uk_url VARCHAR(500) DEFAULT NULL COMMENT 'UK audio file URL',
    ADD COLUMN audio_us_url VARCHAR(500) DEFAULT NULL COMMENT 'US audio file URL';

-- Add word forms and definitions
ALTER TABLE vocabulary
    ADD COLUMN word_forms JSON DEFAULT NULL COMMENT '{"plural": "contracts", "past": "contracted", "pastParticiple": "contracted", "presentParticiple": "contracting", "thirdPerson": "contracts", "comparative": "", "superlative": ""}',
    ADD COLUMN definitions JSON DEFAULT NULL COMMENT 'Array of definition objects with examples, grammar, patterns';

-- Add vocabulary enrichment fields
ALTER TABLE vocabulary
    ADD COLUMN word_family JSON DEFAULT NULL COMMENT '{"noun": ["contract", "contractor"], "verb": ["contract"], "adjective": ["contractual"], "adverb": ["contractually"]}',
    ADD COLUMN synonyms JSON DEFAULT NULL COMMENT '["agreement", "deal", "arrangement"]',
    ADD COLUMN antonyms JSON DEFAULT NULL COMMENT '[]',
    ADD COLUMN collocations JSON DEFAULT NULL COMMENT '{"adjective": ["long-term", "permanent"], "verbContract": ["have", "sign"], "contractVerb": ["expire"], "contractNoun": ["worker"], "preposition": ["under contract"], "phrases": ["breach of contract"]}',
    ADD COLUMN idioms JSON DEFAULT NULL COMMENT '[{"phrase": "put out a contract on", "meaning": "hire someone to kill", "meaningVi": "thue nguoi giet"}]';

-- Add usage and grammar info
ALTER TABLE vocabulary
    ADD COLUMN usage_notes TEXT DEFAULT NULL COMMENT 'Usage notes and tips',
    ADD COLUMN grammar_info JSON DEFAULT NULL COMMENT '{"countable": true, "transitive": null, "patterns": ["contract with sb", "under contract"]}',
    ADD COLUMN register ENUM('formal', 'informal', 'neutral', 'slang', 'technical') DEFAULT 'neutral' COMMENT 'Language register',
    ADD COLUMN extra_examples JSON DEFAULT NULL COMMENT 'Additional example sentences beyond definitions';

-- Add classification and metadata
ALTER TABLE vocabulary
    ADD COLUMN frequency_rank INT DEFAULT NULL COMMENT 'Oxford 3000/5000 frequency rank',
    ADD COLUMN cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') DEFAULT NULL COMMENT 'CEFR proficiency level',
    ADD COLUMN topics JSON DEFAULT NULL COMMENT '[{"name": "Business", "level": "B2"}, {"name": "Law and justice", "level": "B2"}]',
    ADD COLUMN word_origin TEXT DEFAULT NULL COMMENT 'Etymology - word origin history',
    ADD COLUMN see_also JSON DEFAULT NULL COMMENT '["social contract", "contract verb"]';

-- Add index for word search
ALTER TABLE vocabulary
    ADD INDEX idx_english_word (english_word),
    ADD INDEX idx_cefr_level (cefr_level);

-- Example of definitions JSON structure:
-- [
--   {
--     "senseId": 1,
--     "definition": "an official written agreement",
--     "definitionVi": "hop dong, van ban thoa thuan phap ly",
--     "grammar": "[countable]",
--     "register": null,
--     "examples": [
--       {"en": "to sign/break a contract", "vi": "ky/pha vo hop dong"},
--       {"en": "All employees have a written contract of employment.", "vi": "Tat ca nhan vien deu co hop dong lao dong bang van ban."}
--     ],
--     "patterns": ["contract with somebody", "contract between A and B", "under contract"],
--     "topics": [{"name": "Business", "level": "B2"}]
--   },
--   {
--     "senseId": 2,
--     "definition": "an agreement to kill somebody for money",
--     "definitionVi": "hop dong giet nguoi",
--     "grammar": "[countable]",
--     "register": "informal",
--     "examples": [
--       {"en": "She took out a contract on her ex-husband.", "vi": "Co ay thue nguoi giet chong cu."}
--     ],
--     "patterns": ["contract on somebody"],
--     "topics": [{"name": "Discussion and agreement", "level": "C2"}]
--   }
-- ]

-- Example of collocations JSON structure:
-- {
--   "adjective": ["long-term", "permanent", "guaranteed"],
--   "verbContract": ["have", "bid for", "bid on", "sign"],
--   "contractVerb": ["expire", "be worth something"],
--   "contractNoun": ["work", "worker", "manufacturer"],
--   "preposition": ["in a/the contract", "on a contract", "under contract (to)"],
--   "phrases": ["breach of contract", "a contract of employment", "a contract of sale"]
-- }
