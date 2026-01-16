# ChatLingua Version 3 - Word Map English System

## Executive Summary

Version 3 introduces a professional educational Word Map system, transforming ChatLingua from a conversation-based learning app into a comprehensive curriculum-based learning platform supporting both free-form learning and structured textbook courses.

---

## Part 1: Problem Analysis

### 1.1 Current System Issues

| Issue | Description | Impact |
|-------|-------------|--------|
| **Vocabulary 1-1 Design** | `vocabulary` table has `user_id` = unique per user | Data duplication, no sharing |
| **Grammar 1-1 Design** | `grammar_points` table same issue | Data duplication |
| **Exercises 1-1 Design** | `exercises` tied to single user | Cannot share/reuse |
| **No Curriculum Support** | Only conversation-based learning | Not suitable for structured courses |
| **No Progress Tracking** | No unit/lesson completion tracking | Users cannot follow curriculum |
| **No Unlock System** | All content available immediately | No learning path enforcement |

### 1.2 Evolve 1 Textbook Structure Analysis

```
Evolve 1 (CEFR A1 - Beginner)
├── 12 Units
│   ├── Unit 1: I am...
│   ├── Unit 2: Great people
│   ├── Unit 3: Come in
│   ├── [Review 1: Units 1-3]
│   ├── Unit 4: I love it
│   ├── Unit 5: Mondays and fun days
│   ├── Unit 6: Zoom in, zoom out
│   ├── [Review 2: Units 4-6]
│   ├── Unit 7: Now is good
│   ├── Unit 8: You're good!
│   ├── Unit 9: Places to go
│   ├── [Review 3: Units 7-9]
│   ├── Unit 10: Get ready
│   ├── Unit 11: Colorful memories
│   └── Unit 12: Outdoors
│       └── [Review 4: Units 10-12]
│
├── Each Unit Contains:
│   ├── Lesson 1-4: Core lessons (Vocabulary, Grammar, Speaking)
│   ├── Lesson 5: Time to speak (Project-based)
│   └── Progress Check
│
├── Resources:
│   ├── Student Book (177 pages)
│   ├── Teacher's Book (310 pages)
│   ├── Workbook
│   ├── Video Resource Book
│   ├── 18 Videos (Drama + Documentary)
│   └── 130+ Audio tracks
```

---

## Part 2: New Architecture Design

### 2.1 Core Principles

1. **Master-User Separation**: Global content vs user progress
2. **Curriculum-Based Learning**: Map → Unit → Lesson → Content
3. **Progressive Unlock**: Study → Exam → Unlock Next
4. **Gamification Integration**: XP, Achievements, Pet integration
5. **Backward Compatibility**: Existing features continue to work

### 2.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChatLingua Version 3                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Daily Learning │    │  Word Map       │                    │
│  │  (Conversations)│    │  (Curriculum)   │                    │
│  │  - Free form    │    │  - Structured   │                    │
│  │  - MCP-based    │    │  - Admin-built  │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐
│  │              MASTER CONTENT LIBRARY                         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  │ master_     │  │ master_     │  │ master_     │        │
│  │  │ vocabulary  │  │ grammar     │  │ exercises   │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │
│  └─────────────────────────────────────────────────────────────┘
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐
│  │              USER PROGRESS LAYER                            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  │ user_       │  │ user_       │  │ user_       │        │
│  │  │ vocabulary  │  │ grammar     │  │ exercises   │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │
│  └─────────────────────────────────────────────────────────────┘
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐
│  │              GAMIFICATION LAYER                             │
│  │  Pet System │ XP/Currency │ Achievements │ Leaderboard     │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Database Schema Design

### 3.1 Master Content Tables (Admin-managed, shared by all users)

#### 3.1.1 `master_vocabulary`
```sql
CREATE TABLE master_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    english_word VARCHAR(255) NOT NULL,
    vietnamese_word VARCHAR(255) NOT NULL,
    phonetic VARCHAR(100),
    pronunciation_uk VARCHAR(100),
    pronunciation_us VARCHAR(100),
    audio_uk_url VARCHAR(500),
    audio_us_url VARCHAR(500),
    part_of_speech ENUM('noun', 'verb', 'adjective', 'adverb', 'preposition',
                        'conjunction', 'pronoun', 'interjection', 'phrase') NOT NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',

    -- Oxford-style dictionary fields
    definitions JSON,
    word_forms JSON,
    word_family JSON,
    synonyms JSON,
    antonyms JSON,
    collocations JSON,
    idioms JSON,
    usage_notes TEXT,
    grammar_info JSON,
    register ENUM('formal', 'informal', 'neutral', 'slang', 'technical') DEFAULT 'neutral',
    extra_examples JSON,
    frequency_rank INT,
    topics JSON,
    word_origin TEXT,
    see_also JSON,

    -- Metadata
    created_by INT COMMENT 'Admin user ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE KEY unique_word_pos (english_word, part_of_speech),
    INDEX idx_cefr (cefr_level),
    INDEX idx_difficulty (difficulty_level),
    FULLTEXT INDEX ft_search (english_word, vietnamese_word)
);
```

#### 3.1.2 `master_grammar`
```sql
CREATE TABLE master_grammar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grammar_rule VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL COMMENT 'tenses, articles, prepositions, etc.',
    subcategory VARCHAR(100),
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',

    -- Content
    explanation TEXT NOT NULL,
    explanation_vi TEXT NOT NULL,
    formula VARCHAR(500) COMMENT 'e.g., Subject + will + V(base)',
    examples JSON NOT NULL COMMENT '[{en: "...", vi: "..."}]',
    common_mistakes JSON COMMENT '[{wrong: "...", correct: "...", explanation: "..."}]',
    usage_tips TEXT,
    related_grammar_ids JSON COMMENT 'Related grammar rules',

    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE KEY unique_rule_category (grammar_rule, category),
    INDEX idx_category (category),
    INDEX idx_cefr (cefr_level)
);
```

#### 3.1.3 `master_exercises`
```sql
CREATE TABLE master_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exercise_type ENUM(
        'multiple_choice', 'fill_blank', 'translation', 'sentence_building',
        'matching', 'spelling', 'listening', 'error_correction',
        'verb_conjugation', 'cloze', 'article_usage', 'preposition_fill'
    ) NOT NULL,
    question TEXT NOT NULL,
    options JSON COMMENT 'For multiple choice',
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    explanation_vi TEXT,
    exercise_data JSON COMMENT 'Type-specific data',
    audio_url VARCHAR(500),
    image_url VARCHAR(500),

    -- Classification
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
    time_limit_seconds INT DEFAULT 60,
    points INT DEFAULT 10,

    -- Relations
    related_vocabulary_ids JSON COMMENT 'master_vocabulary IDs',
    related_grammar_ids JSON COMMENT 'master_grammar IDs',

    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    INDEX idx_type (exercise_type),
    INDEX idx_difficulty (difficulty_level)
);
```

### 3.2 Word Map Curriculum Tables

#### 3.2.1 `word_maps`
```sql
CREATE TABLE word_maps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'e.g., Evolve 1',
    description TEXT,
    cover_image_url VARCHAR(500),
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NOT NULL,
    publisher VARCHAR(100) COMMENT 'e.g., Cambridge',
    total_units INT DEFAULT 0,
    estimated_hours INT COMMENT 'Total learning hours',

    -- Pricing/Access
    is_free BOOLEAN DEFAULT FALSE,
    price_coins INT DEFAULT 0 COMMENT 'In-app currency price',

    -- Order & Display
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_map_name (name),
    INDEX idx_cefr (cefr_level),
    INDEX idx_display_order (display_order)
);
```

#### 3.2.2 `map_units`
```sql
CREATE TABLE map_units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    map_id INT NOT NULL,
    unit_number INT NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT 'e.g., I am...',
    description TEXT,
    thumbnail_url VARCHAR(500),

    -- Progression
    is_review_unit BOOLEAN DEFAULT FALSE COMMENT 'Review units after every 3 units',
    review_unit_ids JSON COMMENT 'For review units: [unit_id, unit_id, unit_id]',
    prerequisite_unit_id INT COMMENT 'Must complete this unit first',

    -- Boss Exams (2-3 exams at end of unit)
    boss_exam_count INT DEFAULT 2,
    boss_passing_score INT DEFAULT 100 COMMENT 'Must score 100% to pass',

    -- Content counts (auto-calculated)
    total_lessons INT DEFAULT 0,
    total_vocabulary INT DEFAULT 0,
    total_grammar INT DEFAULT 0,

    -- XP rewards
    completion_xp INT DEFAULT 100,

    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    UNIQUE KEY unique_map_unit (map_id, unit_number),
    INDEX idx_map_order (map_id, display_order)
);
```

#### 3.2.3 `unit_lessons`
```sql
CREATE TABLE unit_lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    lesson_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    lesson_type ENUM(
        'vocabulary',      -- Vocabulary focus
        'grammar',         -- Grammar focus
        'listening',       -- Listening skills
        'speaking',        -- Speaking/Time to speak
        'reading',         -- Reading comprehension
        'writing',         -- Writing skills
        'mixed',           -- Combined skills
        'review'           -- Lesson review
    ) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),

    -- Lesson content references
    video_url VARCHAR(500) COMMENT 'If lesson has video',
    audio_url VARCHAR(500) COMMENT 'If lesson has audio',
    pdf_page_start INT COMMENT 'Reference to textbook page',
    pdf_page_end INT,

    -- Progression
    prerequisite_lesson_id INT COMMENT 'Must complete this lesson first',

    -- Boss Exam for this lesson
    has_boss_exam BOOLEAN DEFAULT TRUE,
    boss_passing_score INT DEFAULT 100,

    -- Time estimates
    estimated_minutes INT DEFAULT 30,

    -- XP rewards
    study_xp INT DEFAULT 20 COMMENT 'XP for completing study',
    exam_xp INT DEFAULT 30 COMMENT 'XP for passing exam',

    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    UNIQUE KEY unique_unit_lesson (unit_id, lesson_number),
    INDEX idx_unit_order (unit_id, display_order)
);
```

#### 3.2.4 `lesson_content`
```sql
CREATE TABLE lesson_content (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    content_type ENUM('vocabulary', 'grammar', 'exercise', 'text', 'audio', 'video', 'image') NOT NULL,

    -- Reference to master content
    master_vocabulary_id INT,
    master_grammar_id INT,
    master_exercise_id INT,

    -- For non-master content (custom lesson content)
    custom_content JSON COMMENT 'For text, audio, video, image content',

    -- Display
    display_order INT DEFAULT 0,
    section VARCHAR(50) COMMENT 'study, practice, warmup, etc.',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (master_vocabulary_id) REFERENCES master_vocabulary(id) ON DELETE SET NULL,
    FOREIGN KEY (master_grammar_id) REFERENCES master_grammar(id) ON DELETE SET NULL,
    FOREIGN KEY (master_exercise_id) REFERENCES master_exercises(id) ON DELETE SET NULL,
    INDEX idx_lesson_order (lesson_id, display_order)
);
```

#### 3.2.5 `lesson_exams` (Boss Exams)
```sql
CREATE TABLE lesson_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT COMMENT 'Lesson boss exam',
    unit_id INT COMMENT 'Unit boss exam (if lesson_id is NULL)',
    exam_number INT DEFAULT 1 COMMENT '1, 2, 3 for multiple exams',
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Exam config
    time_limit_seconds INT DEFAULT 300,
    passing_score INT DEFAULT 100 COMMENT 'Must score this % to pass',
    max_attempts INT DEFAULT NULL COMMENT 'NULL = unlimited',
    shuffle_questions BOOLEAN DEFAULT TRUE,
    show_answers_after BOOLEAN DEFAULT TRUE,

    -- Questions (references to master_exercises)
    exercise_ids JSON NOT NULL COMMENT '[exercise_id, ...]',
    total_questions INT NOT NULL,
    total_points INT NOT NULL,

    -- Rewards
    pass_xp INT DEFAULT 50,
    perfect_score_bonus_xp INT DEFAULT 20,

    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    INDEX idx_lesson (lesson_id),
    INDEX idx_unit (unit_id)
);
```

### 3.3 User Progress Tables

#### 3.3.1 `user_vocabulary`
```sql
CREATE TABLE user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_vocabulary_id INT NOT NULL,

    -- Learning source
    source_type ENUM('conversation', 'word_map', 'manual', 'game') NOT NULL,
    source_id INT COMMENT 'conversation_id, lesson_id, etc.',

    -- SM2 Spaced Repetition fields
    mastery_level INT DEFAULT 0 COMMENT '0-100',
    times_practiced INT DEFAULT 0,
    last_practiced_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL,
    review_interval INT DEFAULT 0 COMMENT 'Days',
    ease_factor DECIMAL(4,2) DEFAULT 2.50,
    repetition_count INT DEFAULT 0,
    lapse_count INT DEFAULT 0,
    review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new',

    -- User customizations
    user_notes TEXT COMMENT 'Personal notes',
    is_favorited BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_vocabulary_id) REFERENCES master_vocabulary(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vocab (user_id, master_vocabulary_id),
    INDEX idx_user_review (user_id, next_review_at),
    INDEX idx_user_status (user_id, review_status)
);
```

#### 3.3.2 `user_grammar`
```sql
CREATE TABLE user_grammar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_grammar_id INT NOT NULL,

    -- Learning source
    source_type ENUM('conversation', 'word_map', 'manual') NOT NULL,
    source_id INT,

    -- SM2 Spaced Repetition fields
    mastery_level INT DEFAULT 0,
    times_practiced INT DEFAULT 0,
    last_practiced_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL,
    review_interval INT DEFAULT 0,
    ease_factor DECIMAL(4,2) DEFAULT 2.50,
    repetition_count INT DEFAULT 0,
    lapse_count INT DEFAULT 0,
    review_status ENUM('new', 'learning', 'reviewing', 'mastered') DEFAULT 'new',

    user_notes TEXT,
    is_favorited BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_grammar_id) REFERENCES master_grammar(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_grammar (user_id, master_grammar_id),
    INDEX idx_user_review (user_id, next_review_at)
);
```

#### 3.3.3 `user_exercise_attempts`
```sql
CREATE TABLE user_exercise_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    master_exercise_id INT NOT NULL,

    -- Context
    context_type ENUM('practice', 'lesson_exam', 'unit_exam', 'game', 'review') NOT NULL,
    context_id INT COMMENT 'lesson_exam_id, game_id, etc.',

    -- Attempt data
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT DEFAULT 0,
    points_earned INT DEFAULT 0,

    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (master_exercise_id) REFERENCES master_exercises(id) ON DELETE CASCADE,
    INDEX idx_user_exercise (user_id, master_exercise_id),
    INDEX idx_context (context_type, context_id)
);
```

#### 3.3.4 `user_map_progress`
```sql
CREATE TABLE user_map_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT NOT NULL,

    -- Activation
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Progress
    current_unit_id INT,
    current_lesson_id INT,
    completion_percentage DECIMAL(5,2) DEFAULT 0,

    -- Stats
    total_study_time_minutes INT DEFAULT 0,
    total_xp_earned INT DEFAULT 0,
    units_completed INT DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    exams_passed INT DEFAULT 0,

    -- Timestamps
    last_activity_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    FOREIGN KEY (current_unit_id) REFERENCES map_units(id) ON DELETE SET NULL,
    FOREIGN KEY (current_lesson_id) REFERENCES unit_lessons(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_map (user_id, map_id),
    INDEX idx_user_active (user_id, is_active)
);
```

#### 3.3.5 `user_unit_progress`
```sql
CREATE TABLE user_unit_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    unit_id INT NOT NULL,
    map_progress_id INT NOT NULL,

    -- Status
    status ENUM('locked', 'unlocked', 'in_progress', 'completed') DEFAULT 'locked',
    unlocked_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    -- Progress
    lessons_completed INT DEFAULT 0,
    boss_exams_passed INT DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,

    -- Best scores
    best_boss_exam_score DECIMAL(5,2) DEFAULT 0,
    total_attempts INT DEFAULT 0,

    -- Stats
    study_time_minutes INT DEFAULT 0,
    xp_earned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES map_units(id) ON DELETE CASCADE,
    FOREIGN KEY (map_progress_id) REFERENCES user_map_progress(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_unit (user_id, unit_id),
    INDEX idx_map_progress (map_progress_id),
    INDEX idx_status (user_id, status)
);
```

#### 3.3.6 `user_lesson_progress`
```sql
CREATE TABLE user_lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    unit_progress_id INT NOT NULL,

    -- Status
    status ENUM('locked', 'unlocked', 'studying', 'exam_ready', 'completed') DEFAULT 'locked',
    unlocked_at TIMESTAMP NULL,
    study_started_at TIMESTAMP NULL,
    study_completed_at TIMESTAMP NULL,
    exam_passed_at TIMESTAMP NULL,

    -- Study progress
    content_viewed JSON COMMENT '{content_id: true, ...}',
    content_progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Exam progress
    boss_exam_passed BOOLEAN DEFAULT FALSE,
    best_exam_score DECIMAL(5,2) DEFAULT 0,
    exam_attempts INT DEFAULT 0,

    -- Stats
    study_time_minutes INT DEFAULT 0,
    xp_earned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES unit_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_progress_id) REFERENCES user_unit_progress(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    INDEX idx_unit_progress (unit_progress_id)
);
```

#### 3.3.7 `user_exam_attempts`
```sql
CREATE TABLE user_exam_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    lesson_progress_id INT COMMENT 'For lesson exams',
    unit_progress_id INT COMMENT 'For unit boss exams',

    -- Attempt info
    attempt_number INT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,

    -- Results
    score DECIMAL(5,2) NOT NULL,
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    time_taken_seconds INT NOT NULL,
    answers JSON NOT NULL COMMENT '[{exercise_id, user_answer, is_correct, time_spent}]',

    -- Status
    is_passed BOOLEAN NOT NULL,
    xp_earned INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES lesson_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_progress_id) REFERENCES user_lesson_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_progress_id) REFERENCES user_unit_progress(id) ON DELETE CASCADE,
    INDEX idx_user_exam (user_id, exam_id),
    INDEX idx_lesson_progress (lesson_progress_id),
    INDEX idx_unit_progress (unit_progress_id)
);
```

### 3.4 Social Features Tables

#### 3.4.1 `map_user_positions` (Avatar positions on map)
```sql
CREATE TABLE map_user_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    map_id INT NOT NULL,

    -- Current position
    current_unit_id INT,
    current_lesson_id INT,
    position_type ENUM('studying', 'exam', 'completed') DEFAULT 'studying',

    -- Display info (cached for performance)
    user_display_name VARCHAR(100),
    user_avatar_url VARCHAR(500),
    completion_percentage DECIMAL(5,2) DEFAULT 0,

    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (map_id) REFERENCES word_maps(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_map (user_id, map_id),
    INDEX idx_map_positions (map_id, current_unit_id, current_lesson_id)
);
```

### 3.5 Media Resources Tables

#### 3.5.1 `media_resources`
```sql
CREATE TABLE media_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource_type ENUM('audio', 'video', 'image', 'pdf') NOT NULL,

    -- Source info
    source_map_id INT COMMENT 'Which Word Map this belongs to',
    original_filename VARCHAR(255),

    -- Parsed metadata
    unit_reference INT COMMENT 'Extracted unit number',
    page_reference INT COMMENT 'Extracted page number',
    exercise_reference VARCHAR(50) COMMENT 'Extracted exercise reference',

    -- Storage
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes INT,
    duration_seconds INT COMMENT 'For audio/video',

    -- Metadata
    title VARCHAR(255),
    description TEXT,
    transcript TEXT COMMENT 'For audio/video',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_map_id) REFERENCES word_maps(id) ON DELETE SET NULL,
    INDEX idx_map_type (source_map_id, resource_type),
    INDEX idx_unit_page (unit_reference, page_reference)
);
```

---

## Part 4: Migration Strategy

### 4.1 Phase 1: Create New Tables (Non-breaking)

```sql
-- Run these migrations FIRST - they don't affect existing data

-- 1. Master content tables
CREATE TABLE master_vocabulary ...
CREATE TABLE master_grammar ...
CREATE TABLE master_exercises ...

-- 2. Word Map curriculum tables
CREATE TABLE word_maps ...
CREATE TABLE map_units ...
CREATE TABLE unit_lessons ...
CREATE TABLE lesson_content ...
CREATE TABLE lesson_exams ...

-- 3. User progress tables (new)
CREATE TABLE user_vocabulary ...
CREATE TABLE user_grammar ...
CREATE TABLE user_exercise_attempts ...
CREATE TABLE user_map_progress ...
CREATE TABLE user_unit_progress ...
CREATE TABLE user_lesson_progress ...
CREATE TABLE user_exam_attempts ...

-- 4. Social & media tables
CREATE TABLE map_user_positions ...
CREATE TABLE media_resources ...
```

### 4.2 Phase 2: Data Migration (Chi tiết)

#### 4.2.1 Migrate Vocabulary

```sql
-- Step 1: Migrate vocabulary to master_vocabulary (deduplicated by english_word + part_of_speech)
INSERT INTO master_vocabulary (
    english_word, vietnamese_word, phonetic, pronunciation_uk, pronunciation_us,
    audio_uk_url, audio_us_url, part_of_speech, cefr_level, difficulty_level,
    definitions, word_forms, word_family, synonyms, antonyms, collocations,
    idioms, usage_notes, grammar_info, register, extra_examples, frequency_rank,
    topics, word_origin, see_also, created_by, is_active
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
    v.difficulty_level,
    v.definitions,
    v.word_forms,
    v.word_family,
    v.synonyms,
    v.antonyms,
    v.collocations,
    v.idioms,
    v.usage_notes,
    v.grammar_info,
    v.register,
    v.extra_examples,
    v.frequency_rank,
    v.topics,
    v.word_origin,
    v.see_also,
    1,  -- created_by = admin user
    TRUE
FROM vocabulary v
WHERE v.id IN (
    -- Select the BEST entry for each word+part_of_speech (most complete dictionary data)
    SELECT (
        SELECT v2.id FROM vocabulary v2
        WHERE v2.english_word = v1.english_word
          AND v2.part_of_speech = v1.part_of_speech
        ORDER BY
            (v2.definitions IS NOT NULL) DESC,
            (v2.word_family IS NOT NULL) DESC,
            (v2.synonyms IS NOT NULL) DESC,
            (v2.collocations IS NOT NULL) DESC,
            v2.id ASC
        LIMIT 1
    )
    FROM vocabulary v1
    GROUP BY v1.english_word, v1.part_of_speech
);

-- Step 2: Create mapping table for old vocabulary ID -> master_vocabulary ID
CREATE TEMPORARY TABLE vocab_id_mapping AS
SELECT
    v.id AS old_vocab_id,
    v.user_id,
    mv.id AS master_vocab_id,
    v.mastery_level,
    v.times_practiced,
    v.last_practiced_at,
    v.next_review_at,
    v.review_interval,
    v.ease_factor,
    v.repetition_count,
    v.lapse_count,
    v.review_status
FROM vocabulary v
JOIN master_vocabulary mv
    ON mv.english_word = v.english_word
    AND mv.part_of_speech = v.part_of_speech;

-- Step 3: Create user_vocabulary entries (preserving SM2 progress)
INSERT INTO user_vocabulary (
    user_id, master_vocabulary_id, source_type, source_id,
    mastery_level, times_practiced, last_practiced_at,
    next_review_at, review_interval, ease_factor, repetition_count,
    lapse_count, review_status, created_at
)
SELECT
    vim.user_id,
    vim.master_vocab_id,
    'conversation',
    (SELECT vc.conversation_id FROM vocabulary_contexts vc WHERE vc.vocabulary_id = vim.old_vocab_id LIMIT 1),
    COALESCE(vim.mastery_level, 0),
    COALESCE(vim.times_practiced, 0),
    vim.last_practiced_at,
    vim.next_review_at,
    COALESCE(vim.review_interval, 0),
    COALESCE(vim.ease_factor, 2.50),
    COALESCE(vim.repetition_count, 0),
    COALESCE(vim.lapse_count, 0),
    COALESCE(vim.review_status, 'new'),
    NOW()
FROM vocab_id_mapping vim
-- Handle duplicate user+vocab by keeping highest mastery
WHERE vim.old_vocab_id = (
    SELECT v2.old_vocab_id FROM vocab_id_mapping v2
    WHERE v2.user_id = vim.user_id AND v2.master_vocab_id = vim.master_vocab_id
    ORDER BY v2.mastery_level DESC, v2.times_practiced DESC
    LIMIT 1
);

-- Step 4: Migrate vocabulary_reviews with new IDs
INSERT INTO vocabulary_reviews_v3 (
    user_id, user_vocabulary_id, quality,
    ease_factor_before, ease_factor_after,
    interval_before, interval_after,
    review_type, time_spent_seconds, direction, reviewed_at
)
SELECT
    vr.user_id,
    uv.id,
    vr.quality,
    vr.ease_factor_before,
    vr.ease_factor_after,
    vr.interval_before,
    vr.interval_after,
    vr.review_type,
    vr.time_spent_seconds,
    vr.direction,
    vr.reviewed_at
FROM vocabulary_reviews vr
JOIN vocab_id_mapping vim ON vr.vocabulary_id = vim.old_vocab_id
JOIN user_vocabulary uv ON uv.user_id = vim.user_id AND uv.master_vocabulary_id = vim.master_vocab_id;

-- Step 5: Migrate daily_review_queue
INSERT INTO daily_review_queue_v3 (
    user_id, user_vocabulary_id, queue_date, priority,
    queue_order, is_completed, completed_at, quality_rating
)
SELECT
    drq.user_id,
    uv.id,
    drq.queue_date,
    drq.priority,
    drq.queue_order,
    drq.is_completed,
    drq.completed_at,
    drq.quality_rating
FROM daily_review_queue drq
JOIN vocab_id_mapping vim ON drq.vocabulary_id = vim.old_vocab_id
JOIN user_vocabulary uv ON uv.user_id = vim.user_id AND uv.master_vocabulary_id = vim.master_vocab_id;
```

#### 4.2.2 Migrate Grammar Points

```sql
-- Step 1: Migrate to master_grammar (deduplicated by grammar_rule + category)
INSERT INTO master_grammar (
    grammar_rule, category, subcategory, cefr_level, difficulty_level,
    explanation, explanation_vi, formula, examples, common_mistakes,
    usage_tips, related_grammar_ids, created_by, is_active
)
SELECT
    gp.grammar_rule,
    gp.category,
    NULL,  -- subcategory will be added later
    COALESCE(gp.cefr_level, 'A1'),
    gp.difficulty_level,
    gp.explanation,
    gp.explanation,  -- explanation_vi = same initially
    NULL,  -- formula
    JSON_ARRAY(JSON_OBJECT('en', gp.example_en, 'vi', gp.example_vi)),
    NULL,  -- common_mistakes
    NULL,  -- usage_tips
    NULL,  -- related_grammar_ids
    1,
    TRUE
FROM grammar_points gp
WHERE gp.id IN (
    SELECT MIN(id) FROM grammar_points
    GROUP BY grammar_rule, category
);

-- Step 2: Create mapping table
CREATE TEMPORARY TABLE grammar_id_mapping AS
SELECT
    gp.id AS old_grammar_id,
    gp.user_id,
    gp.conversation_id,
    mg.id AS master_grammar_id,
    gp.times_practiced,
    gp.next_review_at,
    gp.review_interval,
    gp.ease_factor,
    gp.repetition_count,
    gp.lapse_count,
    gp.review_status,
    gp.mastery_level,
    gp.last_reviewed_at
FROM grammar_points gp
JOIN master_grammar mg
    ON mg.grammar_rule = gp.grammar_rule
    AND (mg.category = gp.category OR (mg.category IS NULL AND gp.category IS NULL));

-- Step 3: Create user_grammar entries
INSERT INTO user_grammar (
    user_id, master_grammar_id, source_type, source_id,
    mastery_level, times_practiced, last_practiced_at,
    next_review_at, review_interval, ease_factor, repetition_count,
    lapse_count, review_status, created_at
)
SELECT
    gim.user_id,
    gim.master_grammar_id,
    'conversation',
    gim.conversation_id,
    COALESCE(gim.mastery_level, 0),
    COALESCE(gim.times_practiced, 0),
    gim.last_reviewed_at,
    gim.next_review_at,
    COALESCE(gim.review_interval, 0),
    COALESCE(gim.ease_factor, 2.50),
    COALESCE(gim.repetition_count, 0),
    COALESCE(gim.lapse_count, 0),
    COALESCE(gim.review_status, 'new'),
    NOW()
FROM grammar_id_mapping gim
WHERE gim.old_grammar_id = (
    SELECT g2.old_grammar_id FROM grammar_id_mapping g2
    WHERE g2.user_id = gim.user_id AND g2.master_grammar_id = gim.master_grammar_id
    ORDER BY g2.mastery_level DESC, g2.times_practiced DESC
    LIMIT 1
);

-- Step 4: Migrate grammar_reviews
INSERT INTO grammar_reviews_v3 (
    user_id, user_grammar_id, quality,
    ease_factor_before, ease_factor_after,
    interval_before, interval_after,
    review_type, time_spent_seconds, reviewed_at
)
SELECT
    gr.user_id,
    ug.id,
    gr.quality,
    gr.ease_factor_before,
    gr.ease_factor_after,
    gr.interval_before,
    gr.interval_after,
    gr.review_type,
    gr.time_spent_seconds,
    gr.reviewed_at
FROM grammar_reviews gr
JOIN grammar_id_mapping gim ON gr.grammar_point_id = gim.old_grammar_id
JOIN user_grammar ug ON ug.user_id = gim.user_id AND ug.master_grammar_id = gim.master_grammar_id;
```

#### 4.2.3 Migrate Exercises

```sql
-- Step 1: Migrate to master_exercises (keeping all exercises, updating references)
INSERT INTO master_exercises (
    exercise_type, question, options, correct_answer, explanation, explanation_vi,
    exercise_data, audio_url, image_url, difficulty_level, cefr_level,
    time_limit_seconds, points, related_vocabulary_ids, related_grammar_ids,
    created_by, is_active
)
SELECT
    e.exercise_type,
    e.question,
    e.options,
    e.correct_answer,
    e.explanation,
    e.explanation,  -- explanation_vi
    e.exercise_data,
    e.audio_url,
    NULL,  -- image_url
    e.difficulty_level,
    'A1',  -- cefr_level default
    COALESCE(e.time_limit_seconds, 60),
    10,  -- default points
    -- Map related_vocabulary_ids to master_vocabulary IDs
    (
        SELECT JSON_ARRAYAGG(mv.id)
        FROM JSON_TABLE(
            e.related_vocabulary_ids,
            '$[*]' COLUMNS (vocab_id INT PATH '$')
        ) jt
        JOIN vocab_id_mapping vim ON jt.vocab_id = vim.old_vocab_id
        JOIN master_vocabulary mv ON mv.id = vim.master_vocab_id
    ),
    -- Map related_grammar_ids similarly
    (
        SELECT JSON_ARRAYAGG(mg.id)
        FROM JSON_TABLE(
            COALESCE(e.related_grammar_ids, '[]'),
            '$[*]' COLUMNS (grammar_id INT PATH '$')
        ) jt
        JOIN grammar_id_mapping gim ON jt.grammar_id = gim.old_grammar_id
        JOIN master_grammar mg ON mg.id = gim.master_grammar_id
    ),
    1,
    TRUE
FROM exercises e;

-- Step 2: Create exercise mapping
CREATE TEMPORARY TABLE exercise_id_mapping AS
SELECT
    e.id AS old_exercise_id,
    e.user_id,
    me.id AS master_exercise_id
FROM exercises e
JOIN master_exercises me ON me.question = e.question AND me.exercise_type = e.exercise_type;

-- Step 3: Migrate exercise_attempts to user_exercise_attempts
INSERT INTO user_exercise_attempts (
    user_id, master_exercise_id, context_type, context_id,
    user_answer, is_correct, time_spent_seconds, points_earned, attempted_at
)
SELECT
    ea.user_id,
    eim.master_exercise_id,
    'practice',  -- context_type
    NULL,  -- context_id
    ea.user_answer,
    ea.is_correct,
    ea.time_spent_seconds,
    CASE WHEN ea.is_correct THEN 10 ELSE 0 END,
    ea.attempted_at
FROM exercise_attempts ea
JOIN exercise_id_mapping eim ON ea.exercise_id = eim.old_exercise_id;

-- Step 4: Update exercise_sessions to use new exercise IDs
-- This requires updating the exercise_ids JSON in exercise_sessions
UPDATE exercise_sessions es
SET exercise_ids = (
    SELECT JSON_ARRAYAGG(eim.master_exercise_id)
    FROM JSON_TABLE(
        es.exercise_ids,
        '$[*]' COLUMNS (ex_id INT PATH '$')
    ) jt
    JOIN exercise_id_mapping eim ON jt.ex_id = eim.old_exercise_id
)
WHERE es.exercise_ids IS NOT NULL;

-- Step 5: Update exercise_session_answers
UPDATE exercise_session_answers esa
JOIN exercise_id_mapping eim ON esa.exercise_id = eim.old_exercise_id
SET esa.exercise_id = eim.master_exercise_id;
```

### 4.3 Phase 3: Code Changes (Backward Compatible)

#### 4.3.1 Affected Files Summary

| Layer | Files Affected | Changes Required |
|-------|---------------|------------------|
| **Backend Services** | 7 files | Add abstraction layer, support both old & new tables |
| **Backend Routes** | 5 files | Maintain old API contracts, add new v3 endpoints |
| **MCP Tools** | 13 files | Dual-write to old & new tables |
| **Frontend Components** | 30+ files | No changes initially - old APIs maintained |
| **Shared Types** | 4 files | Add new V3 types, keep old types |

#### 4.3.2 Backend Services Changes

**File: `packages/backend/src/services/vocabulary.service.ts`**
```typescript
// BEFORE: Direct query to vocabulary table
async getVocabulary(userId: number, options: GetVocabularyOptions) {
  const query = `SELECT * FROM vocabulary WHERE user_id = ?`;
  // ...
}

// AFTER: Abstraction layer with feature flag
async getVocabulary(userId: number, options: GetVocabularyOptions) {
  if (USE_V3_TABLES) {
    // Query from user_vocabulary + master_vocabulary
    const query = `
      SELECT
        uv.*,
        mv.english_word, mv.vietnamese_word, mv.phonetic,
        mv.pronunciation_uk, mv.pronunciation_us,
        mv.definitions, mv.word_family, mv.synonyms, mv.collocations
      FROM user_vocabulary uv
      JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
      WHERE uv.user_id = ?
    `;
    // ...
  } else {
    // Old behavior - query vocabulary table
    const query = `SELECT * FROM vocabulary WHERE user_id = ?`;
    // ...
  }
}

// NEW METHOD for V3
async getMasterVocabulary(vocabId: number): Promise<MasterVocabulary> {
  const query = `SELECT * FROM master_vocabulary WHERE id = ?`;
  // ...
}
```

**File: `packages/backend/src/services/exercise.service.ts`**
```typescript
// BEFORE: Query exercises table
async getExercises(userId: number, options: GetExercisesOptions) {
  const query = `SELECT * FROM exercises WHERE user_id = ?`;
  // ...
}

// AFTER: Support both tables
async getExercises(userId: number, options: GetExercisesOptions) {
  if (USE_V3_TABLES) {
    // Query master_exercises (no user_id filter - shared exercises)
    const query = `
      SELECT me.*,
        (SELECT COUNT(*) FROM user_exercise_attempts uea
         WHERE uea.master_exercise_id = me.id AND uea.user_id = ?) as user_attempts,
        (SELECT MAX(is_correct) FROM user_exercise_attempts uea
         WHERE uea.master_exercise_id = me.id AND uea.user_id = ?) as ever_correct
      FROM master_exercises me
      WHERE me.is_active = TRUE
    `;
    // ...
  } else {
    // Old behavior
    const query = `SELECT * FROM exercises WHERE user_id = ?`;
    // ...
  }
}

// BEFORE: Submit to exercise_attempts
async submitAnswer(exerciseId: number, userId: number, answer: SubmitAnswerRequest) {
  const insertQuery = `INSERT INTO exercise_attempts (...) VALUES (...)`;
  // ...
}

// AFTER: Dual-write
async submitAnswer(exerciseId: number, userId: number, answer: SubmitAnswerRequest) {
  // Always write to old table (backward compat)
  await this.db.query(`INSERT INTO exercise_attempts (...) VALUES (...)`);

  if (USE_V3_TABLES) {
    // Also write to new table
    await this.db.query(`INSERT INTO user_exercise_attempts (...) VALUES (...)`);
  }
}
```

**File: `packages/backend/src/services/spaced-repetition.service.ts`**
```typescript
// BEFORE: Query daily_review_queue with vocabulary join
async getDailyQueue(userId: number) {
  const query = `
    SELECT drq.*, v.*
    FROM daily_review_queue drq
    JOIN vocabulary v ON drq.vocabulary_id = v.id
    WHERE drq.user_id = ?
  `;
}

// AFTER: Support V3 tables
async getDailyQueue(userId: number) {
  if (USE_V3_TABLES) {
    const query = `
      SELECT drq.*, uv.*, mv.*
      FROM daily_review_queue_v3 drq
      JOIN user_vocabulary uv ON drq.user_vocabulary_id = uv.id
      JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
      WHERE drq.user_id = ?
    `;
  } else {
    // Old query
  }
}

// Update SM2 fields on both tables during transition
async submitReview(userId: number, vocabId: number, quality: number) {
  // Update old vocabulary table
  await this.updateOldVocabulary(vocabId, sm2Result);

  if (USE_V3_TABLES) {
    // Also update user_vocabulary
    await this.updateUserVocabulary(userId, vocabId, sm2Result);
  }
}
```

#### 4.3.3 MCP Tools Changes

**File: `packages/mcp-server/src/tools/analyze-conversation.ts`**
```typescript
// BEFORE: Insert into vocabulary
const insertVocab = `
  INSERT INTO vocabulary (user_id, conversation_id, english_word, ...)
  VALUES (?, ?, ?, ...)
`;

// AFTER: Dual-write with master lookup
async analyzeConversation(params: AnalyzeParams) {
  for (const vocab of params.vocabulary) {
    // Step 1: Find or create master_vocabulary entry
    let masterVocabId = await this.findMasterVocabulary(
      vocab.englishWord,
      vocab.partOfSpeech
    );

    if (!masterVocabId) {
      masterVocabId = await this.createMasterVocabulary(vocab);
    }

    // Step 2: Create user_vocabulary entry (V3)
    if (USE_V3_TABLES) {
      await this.createUserVocabulary(userId, masterVocabId, 'conversation', conversationId);
    }

    // Step 3: Also insert into old vocabulary table (backward compat)
    const oldVocabId = await this.insertOldVocabulary(userId, conversationId, vocab);

    vocabularyIds.push(oldVocabId);
  }
}
```

**File: `packages/mcp-server/src/tools/generate-exercises.ts`**
```typescript
// BEFORE: Insert into exercises
const insertExercise = `INSERT INTO exercises (user_id, ...) VALUES (?, ...)`;

// AFTER: Dual-write
async generateExercises(params: GenerateExercisesParams) {
  for (const exercise of params.exercises) {
    // Step 1: Create/find master_exercise
    let masterExerciseId: number;

    if (USE_V3_TABLES) {
      masterExerciseId = await this.createMasterExercise(exercise);
    }

    // Step 2: Also insert into old exercises table (backward compat)
    const oldExerciseId = await this.insertOldExercise(userId, exercise);

    exerciseIds.push(oldExerciseId);
  }
}
```

**File: `packages/mcp-server/src/tools/submit-review.ts`**
```typescript
// BEFORE: Update vocabulary directly
async submitReview(params: SubmitReviewParams) {
  const updateQuery = `
    UPDATE vocabulary
    SET next_review_at = ?, review_interval = ?, ease_factor = ?
    WHERE id = ?
  `;
}

// AFTER: Dual-write
async submitReview(params: SubmitReviewParams) {
  const { vocabularyId, quality, userId } = params;

  // Calculate SM2
  const sm2Result = this.calculateSM2(quality, currentState);

  // Update old vocabulary table
  await this.updateOldVocabulary(vocabularyId, sm2Result);

  // Insert into old vocabulary_reviews
  await this.insertOldReview(vocabularyId, userId, quality, sm2Result);

  if (USE_V3_TABLES) {
    // Find corresponding user_vocabulary
    const userVocabId = await this.findUserVocabulary(userId, vocabularyId);

    // Update user_vocabulary
    await this.updateUserVocabulary(userVocabId, sm2Result);

    // Insert into vocabulary_reviews_v3
    await this.insertV3Review(userVocabId, userId, quality, sm2Result);
  }
}
```

#### 4.3.4 Configuration Flag

**File: `packages/backend/src/config/features.ts`**
```typescript
export const FEATURE_FLAGS = {
  // Set to true when ready to use V3 tables
  USE_V3_TABLES: process.env.USE_V3_TABLES === 'true' || false,

  // Set to true to enable dual-write (write to both old & new tables)
  DUAL_WRITE_ENABLED: process.env.DUAL_WRITE_ENABLED === 'true' || true,

  // Set to true when old tables should be deprecated
  DEPRECATE_V2_TABLES: process.env.DEPRECATE_V2_TABLES === 'true' || false,
};
```

#### 4.3.5 New Types for V3

**File: `packages/shared/src/types/vocabulary-v3.ts`**
```typescript
export interface MasterVocabulary {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  partOfSpeech: PartOfSpeech;
  cefrLevel: CefrLevel;
  difficultyLevel: DifficultyLevel;
  definitions: Definition[] | null;
  wordForms: WordForms | null;
  wordFamily: WordFamily | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  collocations: Collocations | null;
  // ... other fields
}

export interface UserVocabulary {
  id: number;
  userId: number;
  masterVocabularyId: number;
  sourceType: 'conversation' | 'word_map' | 'manual' | 'game';
  sourceId: number | null;
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt: Date | null;
  nextReviewAt: Date | null;
  reviewInterval: number;
  easeFactor: number;
  repetitionCount: number;
  lapseCount: number;
  reviewStatus: ReviewStatus;
  userNotes: string | null;
  isFavorited: boolean;
}

// Combined type for API responses (maintains backward compatibility)
export interface VocabularyWithProgress extends MasterVocabulary {
  userProgress: UserVocabulary;
}
```

### 4.4 Phase 4: API Versioning

#### 4.4.1 New V3 API Endpoints

```typescript
// New routes file: packages/backend/src/routes/v3/vocabulary.routes.ts

// V3 endpoints (new structure)
router.get('/api/v3/vocabulary', getMasterVocabularyList);
router.get('/api/v3/vocabulary/:id', getMasterVocabulary);
router.get('/api/v3/user/vocabulary', getUserVocabularyProgress);
router.post('/api/v3/user/vocabulary/:masterVocabId/learn', addToUserVocabulary);

// V3 review endpoints
router.get('/api/v3/review/queue', getV3ReviewQueue);
router.post('/api/v3/review/:userVocabId', submitV3Review);

// V3 exercise endpoints
router.get('/api/v3/exercises', getMasterExercises);
router.post('/api/v3/exercises/:masterExerciseId/attempt', submitExerciseAttempt);
```

#### 4.4.2 Old Endpoints (Maintained for Backward Compatibility)

```typescript
// Existing routes continue to work
// packages/backend/src/routes/vocabulary.routes.ts

// These continue to work, but internally use V3 tables when enabled
router.get('/api/vocabulary', getVocabulary);  // Returns combined data
router.get('/api/vocabulary/:id', getVocabularyById);
router.get('/api/vocabulary/:id/detail', getDictionaryEntry);
router.post('/api/vocabulary/:id/review', submitReview);

// Frontend continues to use these endpoints without changes
```

### 4.5 Phase 5: Deprecation Timeline

| Week | Action |
|------|--------|
| Week 1-2 | Create new tables, run data migration |
| Week 3-4 | Enable dual-write, test V3 endpoints |
| Week 5-6 | Enable USE_V3_TABLES for reads |
| Week 7-8 | Monitor, fix bugs |
| Week 9-10 | Add deprecation warnings to old endpoints |
| Week 11-12 | Frontend migration to V3 endpoints |
| Month 4 | Disable old table writes |
| Month 5 | Remove old table code |
| Month 6 | Drop old tables |

### 4.6 Rollback Plan

```sql
-- If V3 migration fails, rollback steps:

-- 1. Disable V3 feature flags
UPDATE system_config SET value = 'false' WHERE key = 'USE_V3_TABLES';

-- 2. If data was corrupted, restore from backup
-- (Ensure backup was taken before migration)

-- 3. If needed, sync V3 changes back to V2 tables
INSERT INTO vocabulary (...)
SELECT ... FROM user_vocabulary uv
JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
WHERE uv.created_at > @migration_timestamp;
```

### 4.7 Detailed File Changes Checklist

#### 4.7.1 Backend Services (7 files) - ✅ V3 SERVICES CREATED

| File | Changes | Status |
|------|---------|--------|
| `packages/backend/src/services/v3/master-vocabulary.service.ts` | Master vocab CRUD | ✅ DONE |
| `packages/backend/src/services/v3/master-grammar.service.ts` | Master grammar CRUD | ✅ DONE |
| `packages/backend/src/services/v3/master-exercises.service.ts` | Master exercises CRUD | ✅ DONE |
| `packages/backend/src/services/v3/user-vocabulary.service.ts` | User vocab with SM2 | ✅ DONE |
| `packages/backend/src/services/v3/user-grammar.service.ts` | User grammar with SM2 | ✅ DONE |
| `packages/backend/src/services/v3/user-progress.service.ts` | Map/Unit/Lesson progress | ✅ DONE |
| `packages/backend/src/services/v3/word-map.service.ts` | Word Map management | ✅ DONE |
| `packages/backend/src/services/v3/exam.service.ts` | Exam handling | ✅ DONE |
| `packages/backend/src/services/dual-write.service.ts` | V2/V3 sync | ✅ DONE |

#### 4.7.2 Backend Routes (8 files) - ✅ ALL CREATED

| File | Changes | Status |
|------|---------|--------|
| `packages/backend/src/routes/v3/index.ts` | Route aggregator | ✅ DONE |
| `packages/backend/src/routes/v3/word-maps.routes.ts` | Word Map API | ✅ DONE |
| `packages/backend/src/routes/v3/progress.routes.ts` | Progress API | ✅ DONE |
| `packages/backend/src/routes/v3/master-vocabulary.routes.ts` | Admin vocab API | ✅ DONE |
| `packages/backend/src/routes/v3/master-grammar.routes.ts` | Admin grammar API | ✅ DONE |
| `packages/backend/src/routes/v3/master-exercises.routes.ts` | Admin exercises API | ✅ DONE |
| `packages/backend/src/routes/v3/user-vocabulary.routes.ts` | User vocab API | ✅ DONE |
| `packages/backend/src/routes/v3/user-grammar.routes.ts` | User grammar API | ✅ DONE |

#### 4.7.3 MCP Tools (20+ tools) - ✅ ALL CREATED

| Tool Category | Files | Status |
|---------------|-------|--------|
| Word Map Management | getWordMaps, getWordMapDetail, activateWordMap, getLessonContent, completeLessonStudy | ✅ DONE |
| Exam Tools | startLessonExam, submitExamAnswers, getExamResults, getExamHistory | ✅ DONE |
| Progress Tracking | getUserProgress, getVocabularyReviewQueue, submitVocabularyReview, getLeaderboard, getStudyStats | ✅ DONE |
| Admin Import | importVocabulary, importGrammar, importExercises, createWordMap, addLessonContent, importAudioTracks | ✅ DONE |

**Location:** `packages/mcp-server/src/tools/v3/`

#### 4.7.4 Frontend Components - ✅ ALL CREATED

| Component | File | Status |
|-----------|------|--------|
| Word Map List | `word-map-list.component.ts` | ✅ DONE |
| Word Map Detail | `word-map-detail.component.ts` | ✅ DONE |
| Unit Detail | `unit-detail.component.ts` | ✅ DONE |
| Lesson Study | `lesson-study.component.ts` | ✅ DONE |
| Lesson Exam | `lesson-exam.component.ts` | ✅ DONE |
| Progress | `word-map-progress.component.ts` | ✅ DONE |
| Review | `word-map-review.component.ts` | ✅ DONE |
| Leaderboard | `word-map-leaderboard.component.ts` | ✅ DONE |
| Service | `word-map.service.ts` | ✅ DONE |

**Location:** `packages/frontend/src/app/features/word-maps/`

#### 4.7.5 Shared Types - ✅ ALL CREATED

| File | Purpose | Status |
|------|---------|--------|
| `packages/shared/src/types/word-map.ts` | Word Map types | ✅ DONE |
| `packages/shared/src/types/vocabulary-v3.ts` | V3 vocabulary types | ✅ DONE |
| `packages/shared/src/types/grammar-v3.ts` | V3 grammar types | ✅ DONE |
| `packages/shared/src/types/exercise-v3.ts` | V3 exercise types | ✅ DONE |
| `packages/shared/src/types/progress.ts` | Progress types | ✅ DONE |

#### 4.7.6 New Files Created - ✅ ALL DONE

| File | Purpose | Status |
|------|---------|--------|
| `packages/backend/src/config/features.ts` | Feature flags for V3 | ✅ DONE |
| `database/migrations/031_master_content_tables.sql` | Master tables | ✅ DONE |
| `database/migrations/032_word_map_tables.sql` | Word Map tables | ✅ DONE |
| `database/migrations/033_user_progress_tables.sql` | Progress tables | ✅ DONE |
| `database/migrations/035_migrate_existing_data.sql` | Data migration | ✅ DONE |

---

## Part 5: MCP Tools - New Tools

### 5.1 Word Map Management Tools (Admin)

```typescript
// Tool: create_word_map
{
  name: "create_word_map",
  description: "[ADMIN] Create a new Word Map curriculum",
  parameters: {
    name: string,           // "Evolve 1"
    description: string,
    cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    publisher: string,      // "Cambridge"
    is_free: boolean,
    price_coins: number
  }
}

// Tool: import_evolve_content
{
  name: "import_evolve_content",
  description: "[ADMIN] Import content from Evolve PDF/Audio into Word Map",
  parameters: {
    map_id: number,
    content_type: "vocabulary" | "grammar" | "audio" | "all",
    source_files: string[]  // File paths
  }
}

// Tool: create_unit
// Tool: create_lesson
// Tool: add_lesson_content
// Tool: create_lesson_exam
```

### 5.2 User Progress Tools

```typescript
// Tool: activate_word_map
{
  name: "activate_word_map",
  description: "Activate a Word Map for user learning",
  parameters: {
    map_id: number,
    user_id?: number
  }
}

// Tool: get_map_progress
{
  name: "get_map_progress",
  description: "Get user's progress on a Word Map",
  parameters: {
    map_id: number,
    include_details: boolean
  }
}

// Tool: complete_lesson_study
{
  name: "complete_lesson_study",
  description: "Mark lesson study phase as complete, unlock exam",
  parameters: {
    lesson_id: number
  }
}

// Tool: submit_exam_attempt
{
  name: "submit_exam_attempt",
  description: "Submit exam answers and get results",
  parameters: {
    exam_id: number,
    answers: Array<{exercise_id: number, answer: string, time_spent: number}>
  }
}

// Tool: get_map_leaderboard
{
  name: "get_map_leaderboard",
  description: "Get user positions/avatars on Word Map",
  parameters: {
    map_id: number,
    unit_id?: number
  }
}
```

### 5.3 Content Import Tools

```typescript
// Tool: import_audio_tracks
{
  name: "import_audio_tracks",
  description: "[ADMIN] Import audio tracks and auto-link to units/lessons",
  parameters: {
    map_id: number,
    audio_folder: string,   // Path to audio folder
    naming_pattern: string  // e.g., "Track {track}.{sub} [EV_SB1_U{unit}_p{page}_Ex{ex}]"
  }
}

// Tool: import_video_content
// Tool: parse_pdf_structure
```

---

## Part 6: Frontend Changes

### 6.1 New Pages/Components

```
/word-maps                    - List of available Word Maps
/word-maps/:mapId             - Map overview with unit tree
/word-maps/:mapId/unit/:unitId    - Unit detail with lessons
/word-maps/:mapId/lesson/:lessonId - Lesson study page
/word-maps/:mapId/exam/:examId     - Exam taking page
/word-maps/:mapId/leaderboard      - Map-wide leaderboard with avatars
```

### 6.2 Map Visualization Component

- Tree/path visualization showing units and lessons
- User avatar positions
- Lock/unlock status indicators
- Progress bars
- Boss exam indicators

### 6.3 Study Mode Component

- Vocabulary cards with full dictionary data
- Grammar explanations with examples
- Audio/video integration
- Progress tracking within lesson

### 6.4 Exam Mode Component

- Timer
- Question navigation
- Answer submission
- Results with explanations
- Unlock animation on pass

---

## Part 7: Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED
- [x] Create all new database tables (031, 032, 033 migrations)
- [x] Create migration scripts (035_migrate_existing_data.sql)
- [x] Run data migration
- [x] Test data integrity

### Phase 2: Backend (Week 3-4) ✅ COMPLETED
- [x] Create master content services (master-vocabulary, master-grammar, master-exercises)
- [x] Create user progress services (user-vocabulary, user-grammar, user-progress)
- [x] Create exam services (exam.service.ts)
- [x] Update existing services for backward compatibility (dual-write.service.ts)
- [x] Create MCP admin tools

### Phase 3: MCP Integration (Week 5) ✅ COMPLETED
- [x] Create Word Map management tools (20+ tools in packages/mcp-server/src/tools/v3/)
- [x] Create content import tools (importVocabulary, importGrammar, importExercises)
- [x] Create progress tracking tools (getUserProgress, getStudyStats)
- [x] Create exam submission tools (startLessonExam, submitExamAnswers)

### Phase 4: Content Import (Week 6) 🔄 PARTIAL
- [x] Import Evolve 1 structure (units, lessons) - Sample data in migration 032
- [ ] Import vocabulary from Teacher's Book
- [ ] Import grammar points
- [ ] Import and link audio files
- [ ] Import and link video files
- [ ] Create exercises for each lesson
- [ ] Create exams for each lesson/unit

### Phase 5: Frontend (Week 7-8) ✅ COMPLETED
- [x] Create Word Map list page (word-map-list.component.ts)
- [x] Create Map visualization component (word-map-detail.component.ts)
- [x] Create Unit/Lesson pages (unit-detail.component.ts, lesson-study.component.ts)
- [x] Create Study mode (lesson-study.component.ts)
- [x] Create Exam mode (lesson-exam.component.ts)
- [x] Create Leaderboard with avatars (word-map-leaderboard.component.ts)

### Phase 6: Integration (Week 9) 🔄 PARTIAL
- [x] Integrate gamification (XP, achievements) - XP rewards in exam.service.ts
- [ ] Integrate pet system
- [ ] Integrate daily challenges
- [ ] Test end-to-end flow

### Phase 7: Testing & Launch (Week 10) ⏳ PENDING
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Launch

---

## Part 8: Recommendations & Enhancements

### 8.1 Additional Features to Consider

1. **Offline Mode**: Download lessons for offline study
2. **Study Groups**: Join groups studying same map
3. **Teacher Mode**: Teachers can track student progress
4. **Custom Maps**: Users can create personal word maps
5. **Spaced Repetition Integration**: SR for map vocabulary
6. **Voice Recording**: Practice speaking with playback

### 8.2 Performance Optimizations

1. **Caching**: Redis cache for map structures
2. **CDN**: Audio/video files on CDN
3. **Lazy Loading**: Load lesson content on demand
4. **Denormalization**: Cache user position data

### 8.3 Analytics to Track

1. Lesson completion rates
2. Exam pass rates and scores
3. Time spent per lesson
4. Most difficult vocabulary/grammar
5. User retention by map progress
6. Gamification engagement

---

## Appendix A: Evolve 1 Content Mapping

```
Evolve 1 Content → ChatLingua Structure

Student Book (177 pages)
├── Units 1-12 → 12 map_units
├── Each Unit → 5 unit_lessons
│   ├── Lessons 1-4: Core content
│   └── Lesson 5: Time to speak
├── Reviews 1-4 → 4 review units (is_review_unit = true)

Teacher's Book (310 pages)
├── Teacher's Notes → lesson descriptions
├── Grammar Practice → master_grammar
├── Vocabulary Practice → master_vocabulary
├── Photocopiable Activities → master_exercises
├── Audio Scripts → media_resources (transcripts)

Audio Tracks (130+ tracks)
├── Track naming: "Track X.YY [EV_SB1_U{unit}_p{page}_Ex{exercise}]"
├── Auto-parse → link to lesson_content
├── Store in media_resources

Videos (18 files)
├── Drama Episodes 1-12 → link to units
├── Documentary U2,4,6,8,10,12 → link to units
```

---

## Appendix B: File Structure for Version 3

```
D:\Github\ChatLingua\
├── database/
│   └── migrations/
│       ├── 031_master_content_tables.sql
│       ├── 032_word_map_tables.sql
│       ├── 033_user_progress_tables.sql
│       ├── 034_social_media_tables.sql
│       └── 035_migrate_existing_data.sql
│
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── services/
│   │       │   ├── master-vocabulary.service.ts
│   │       │   ├── master-grammar.service.ts
│   │       │   ├── master-exercises.service.ts
│   │       │   ├── word-map.service.ts
│   │       │   ├── map-progress.service.ts
│   │       │   └── exam.service.ts
│   │       └── routes/
│   │           ├── word-maps.routes.ts
│   │           └── progress.routes.ts
│   │
│   ├── mcp-server/
│   │   └── src/
│   │       └── tools/
│   │           ├── admin/
│   │           │   ├── create-word-map.ts
│   │           │   ├── import-content.ts
│   │           │   └── manage-lessons.ts
│   │           └── user/
│   │               ├── activate-map.ts
│   │               ├── get-progress.ts
│   │               └── submit-exam.ts
│   │
│   └── frontend/
│       └── src/
│           └── app/
│               └── word-maps/
│                   ├── word-maps.module.ts
│                   ├── map-list/
│                   ├── map-view/
│                   ├── lesson-study/
│                   ├── exam/
│                   └── leaderboard/
│
└── version3/
    ├── PLAN_VERSION_3.md (this file)
    └── docs/
        ├── database-schema.md
        ├── api-documentation.md
        └── migration-guide.md
```

---

## Part 9: Media Storage & Static Files

### 9.1 Storage Strategy (No CDN Required)

**Decision**: Use backend `public/` folder for all media files.

**Rationale**:
- ✅ Already configured in Express.js
- ✅ Free (no CDN costs)
- ✅ Works on deployed website
- ✅ TTS audio already working in `public/audio/tts/`
- ✅ Sufficient for < 10,000 concurrent users

### 9.2 Folder Structure

```
packages/backend/public/
├── audio/
│   ├── tts/                           # TTS generated files (existing)
│   │   └── *.mp3
│   └── word-maps/                     # Course audio files
│       └── {map-slug}/                # e.g., prepare-2e-l1, evolve-1
│           ├── unit-{n}/              # Unit-specific audio
│           │   ├── track-001.mp3
│           │   ├── track-002.mp3
│           │   └── ...
│           └── shared/                # Shared audio across units
│               └── *.mp3
│
├── images/
│   └── word-maps/
│       └── {map-slug}/
│           ├── unit-{n}/
│           │   ├── vocab-section-1.png
│           │   ├── grammar-box-1.png
│           │   ├── exercise-1.png
│           │   └── ...
│           ├── cover.png              # Map cover image
│           └── thumbnails/            # Unit thumbnails
│               └── unit-{n}.png
│
└── videos/                            # Optional - for video lessons
    └── word-maps/
        └── {map-slug}/
            └── unit-{n}/
                └── *.mp4
```

### 9.3 URL Access Pattern

```
Base URL: http://localhost:3000/ (or production domain)

Audio:  /audio/word-maps/prepare-2e-l1/unit-0/track-001.mp3
Image:  /images/word-maps/prepare-2e-l1/unit-0/vocab-section-1.png
Video:  /videos/word-maps/prepare-2e-l1/unit-1/lesson-intro.mp4
```

### 9.4 Backend Static File Configuration

**Current** (`packages/backend/src/index.ts`):
```typescript
app.use(express.static(path.join(process.cwd(), 'public')));
```

**Optimized** (to be implemented):
```typescript
import compression from 'compression';

// Enable GZIP compression
app.use(compression());

// Audio files - cache for 7 days
app.use('/audio', express.static(path.join(process.cwd(), 'public/audio'), {
  maxAge: '7d',
  immutable: true,
  etag: true
}));

// Images - cache for 30 days
app.use('/images', express.static(path.join(process.cwd(), 'public/images'), {
  maxAge: '30d',
  immutable: true,
  etag: true
}));

// Videos - cache for 7 days, enable range requests
app.use('/videos', express.static(path.join(process.cwd(), 'public/videos'), {
  maxAge: '7d',
  immutable: true,
  acceptRanges: true  // Enable seeking in video
}));
```

### 9.5 File Size Guidelines

| Type | Recommended | Max | Format |
|------|-------------|-----|--------|
| Audio (lesson) | < 2MB | 5MB | MP3 128kbps |
| Audio (pronunciation) | < 100KB | 500KB | MP3 64kbps |
| Images (content) | < 200KB | 500KB | PNG/WebP |
| Images (thumbnail) | < 50KB | 100KB | WebP |
| Videos | < 50MB | 100MB | MP4 H.264 |

### 9.6 When to Consider CDN

Upgrade to CDN (Cloudflare, AWS CloudFront, etc.) when:
- Concurrent users > 5,000-10,000
- Server bandwidth consistently > 80%
- Global user base (need edge caching)
- Budget allows (~$10-50/month for basic CDN)

---

## Part 10: Study Content Types & Custom Content

### 10.1 Current Problem

The `lesson_content` table supports various content types via `custom_content` JSON field, but **the frontend does not render them**.

**Database Schema** (exists):
```sql
content_type ENUM('vocabulary', 'grammar', 'exercise', 'text', 'audio', 'video', 'image')
custom_content JSON COMMENT 'For text/audio/video/image: {title, content, url, transcript}'
section ENUM('warmup', 'study', 'practice', 'review', 'extension')
```

**Frontend** (missing):
- `lesson-study.component.ts` only renders: `vocabulary`, `grammar`, `exercises`
- Does NOT render: `text`, `audio`, `video`, `image` from `customContent`

### 10.2 Custom Content JSON Structure

#### 10.2.1 Text Content
```json
{
  "contentType": "text",
  "customContent": {
    "title": "Lesson Introduction",
    "content": "<p>In this lesson, you will learn...</p>",
    "format": "html"  // or "markdown"
  },
  "section": "warmup"
}
```

#### 10.2.2 Audio Content
```json
{
  "contentType": "audio",
  "customContent": {
    "title": "Track 1.02 - Listening Exercise A",
    "url": "/audio/word-maps/prepare-2e-l1/unit-0/track-002.mp3",
    "transcript": "Hello, my name is...",
    "transcriptVi": "Xin chào, tên tôi là...",
    "duration": 45,
    "autoplay": false
  },
  "section": "study"
}
```

#### 10.2.3 Video Content
```json
{
  "contentType": "video",
  "customContent": {
    "title": "Unit 1 Video - Meeting People",
    "url": "/videos/word-maps/evolve-1/unit-1/drama.mp4",
    "posterUrl": "/images/word-maps/evolve-1/unit-1/video-poster.png",
    "transcript": "...",
    "transcriptVi": "...",
    "duration": 180,
    "subtitles": "/videos/word-maps/evolve-1/unit-1/drama.vtt"
  },
  "section": "study"
}
```

#### 10.2.4 Image Content (PDF Crop)
```json
{
  "contentType": "image",
  "customContent": {
    "title": "Vocabulary Section A - Jobs",
    "url": "/images/word-maps/prepare-2e-l1/unit-0/vocab-jobs.png",
    "alt": "Vocabulary about jobs and occupations",
    "caption": "Exercise: Match the pictures with the words",
    "sourceRef": "Student Book p.8",
    "zoomable": true
  },
  "section": "study"
}
```

### 10.3 Study Flow with Custom Content

```
Lesson Study Flow:
┌─────────────────────────────────────────────────────────────┐
│  1. WARMUP Section                                          │
│     - Text: Lesson introduction                             │
│     - Image: Topic overview from textbook                   │
├─────────────────────────────────────────────────────────────┤
│  2. STUDY Section                                           │
│     - Audio: Listening tracks (with transcript)             │
│     - Image: Vocabulary sections from PDF                   │
│     - Vocabulary: Flashcards (from master_vocabulary)       │
│     - Image: Grammar box from PDF                           │
│     - Grammar: Interactive grammar (from master_grammar)    │
│     - Video: Related video content                          │
├─────────────────────────────────────────────────────────────┤
│  3. PRACTICE Section                                        │
│     - Exercise: Practice exercises (from master_exercises)  │
│     - Audio: Pronunciation practice                         │
├─────────────────────────────────────────────────────────────┤
│  4. REVIEW Section                                          │
│     - Summary text                                          │
│     - Key points image                                      │
├─────────────────────────────────────────────────────────────┤
│  5. Complete → Unlock Exam                                  │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 Frontend Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AudioPlayerComponent` | Play audio with controls, transcript toggle | HIGH |
| `VideoPlayerComponent` | Play video with subtitles, transcript | MEDIUM |
| `ImageViewerComponent` | Display images, zoom, pinch support | HIGH |
| `TextContentComponent` | Render HTML/markdown text content | MEDIUM |
| `TranscriptComponent` | Show/hide transcript for audio/video | HIGH |

### 10.5 Implementation Steps

```typescript
// packages/frontend/src/app/features/word-maps/lesson-study/lesson-study.component.ts

// ADD: Computed for custom content
customContentList = computed(() => this.lessonContent()?.customContent || []);

// ADD: Group content by section
warmupContent = computed(() =>
  this.customContentList().filter(c => c.section === 'warmup')
);
studyContent = computed(() =>
  this.customContentList().filter(c => c.section === 'study')
);
practiceContent = computed(() =>
  this.customContentList().filter(c => c.section === 'practice')
);
```

```html
<!-- ADD to lesson-study.component.html -->

<!-- Warmup Section -->
@if (warmupContent().length > 0) {
  <div class="warmup-section">
    <h3>Before We Start</h3>
    @for (content of warmupContent(); track content.id) {
      <app-content-renderer [content]="content" />
    }
  </div>
}

<!-- Study Section - interleave custom content with vocab/grammar -->
@for (content of studyContent(); track content.id) {
  @switch (content.contentType) {
    @case ('audio') {
      <app-audio-player [config]="content.customContent" />
    }
    @case ('video') {
      <app-video-player [config]="content.customContent" />
    }
    @case ('image') {
      <app-image-viewer [config]="content.customContent" />
    }
    @case ('text') {
      <app-text-content [config]="content.customContent" />
    }
  }
}
```

---

## Part 11: PDF Image Extraction Workflow

### 11.1 Extraction Strategy

**Approach**: Crop by content sections (NOT full page)

**Benefits**:
- Better UX - students see exactly what they need
- Smaller file sizes - faster loading
- Responsive-friendly - works on mobile
- Can annotate/highlight specific sections

### 11.2 Content Sections to Extract

| Section Type | Description | Example |
|--------------|-------------|---------|
| `vocab-section` | Vocabulary list/images | Pictures with word labels |
| `grammar-box` | Grammar rule box | Highlighted grammar explanation |
| `exercise-instruction` | Exercise header | "Match the pictures with words" |
| `dialogue-box` | Conversation examples | Sample dialogues |
| `tip-box` | Tips/notes | Cultural notes, pronunciation tips |
| `illustration` | Standalone images | Topic illustrations |

### 11.3 Naming Convention

```
{content-type}-{unit}-{lesson}-{order}.png

Examples:
vocab-section-u0-l1-01.png
grammar-box-u1-l2-01.png
exercise-instruction-u1-l3-01.png
dialogue-box-u2-l1-01.png
```

### 11.4 AI-Assisted Extraction Workflow

```
Step 1: PDF Analysis
┌─────────────────────────────────────────┐
│ AI reads PDF page                        │
│ → Identifies content regions             │
│ → Suggests crop coordinates              │
│ → Classifies content type                │
└─────────────────────────────────────────┘
           ↓
Step 2: Crop Extraction
┌─────────────────────────────────────────┐
│ Tool crops regions from PDF              │
│ → Saves as PNG/WebP                      │
│ → Optimizes file size                    │
│ → Generates metadata JSON                │
└─────────────────────────────────────────┘
           ↓
Step 3: Content Linking
┌─────────────────────────────────────────┐
│ AI creates lesson_content entries        │
│ → Links images to lessons                │
│ → Sets section (warmup/study/practice)   │
│ → Adds titles, captions, alt text        │
└─────────────────────────────────────────┘
```

### 11.5 MCP Tool for PDF Extraction

```typescript
// Tool: extract_pdf_content
{
  name: "extract_pdf_content",
  description: "[ADMIN] Extract and crop content sections from PDF",
  parameters: {
    pdfPath: string,           // Path to PDF file
    mapId: number,             // Word Map ID
    unitNumber: number,        // Unit number
    pageRange: {               // Pages to process
      start: number,
      end: number
    },
    extractionMode: "auto" | "manual",  // AI auto-detect or manual coords
    outputFolder?: string      // Custom output folder
  },
  returns: {
    extractedImages: Array<{
      filename: string,
      contentType: string,
      pageNumber: number,
      coordinates: { x, y, width, height },
      suggestedTitle: string,
      suggestedSection: string
    }>
  }
}
```

### 11.6 Image Optimization Pipeline

```
Original PDF Region
       ↓
   Crop to content
       ↓
   Convert to PNG
       ↓
   Resize if > 1200px width
       ↓
   Compress (quality 85%)
       ↓
   Optional: Convert to WebP
       ↓
   Save to public/images/
```

---

## Part 12: Implementation TODO Checklist

### 12.1 HIGH Priority - Study Content Features

- [ ] **Audio Player Component** ⏳ PENDING
  - File: `packages/frontend/src/app/shared/components/audio-player/`
  - Features: Play/pause, progress bar, speed control, transcript toggle
  - Est: 4 hours

- [ ] **Image Viewer Component** ⏳ PENDING
  - File: `packages/frontend/src/app/shared/components/image-viewer/`
  - Features: Zoom, pinch-to-zoom (mobile), fullscreen
  - Est: 3 hours

- [ ] **Update lesson-study.component** ⏳ PENDING
  - Add customContent rendering
  - Group content by section
  - Interleave with vocabulary/grammar
  - Est: 4 hours

- [ ] **Backend: Add compression middleware** ⏳ PENDING
  - File: `packages/backend/src/index.ts`
  - Add `compression` package
  - Configure cache headers
  - Est: 1 hour

### 12.2 MEDIUM Priority - Content Management

- [x] **MCP Tool: link_media_resource** ✅ DONE
  - Link uploaded media to lessons
  - File: `packages/mcp-server/src/tools/v3/content-import-tools.ts`

- [ ] **MCP Tool: extract_pdf_content** ⏳ PENDING (if needed)
  - AI-assisted PDF crop extraction
  - Est: 8 hours

- [ ] **Video Player Component** ⏳ PENDING
  - File: `packages/frontend/src/app/shared/components/video-player/`
  - Features: Controls, subtitles, transcript
  - Est: 4 hours

- [ ] **Text Content Component** ⏳ PENDING
  - Render HTML/markdown content
  - Est: 2 hours

### 12.3 LOW Priority - Enhancements

- [ ] **Transcript Component** ⏳ PENDING
  - Shared transcript viewer for audio/video
  - Highlight current sentence during playback
  - Est: 4 hours

- [ ] **Offline Support** ⏳ PENDING
  - Download lesson content for offline use
  - Service worker caching
  - Est: 8 hours

### 12.4 Database Updates Needed

```sql
-- No schema changes needed - custom_content JSON already supports all types
-- Only need to ensure lesson_content.section values are used:
-- 'warmup', 'study', 'practice', 'review', 'extension'
```

### 12.5 Dependency Changes

```json
// packages/backend/package.json - ADD:
{
  "dependencies": {
    "compression": "^1.7.4"
  }
}

// packages/frontend - No new dependencies needed
// (Audio/Video use native HTML5 elements)
```

---

## Part 13: Prepare 2e Level 1 - Content Sync Plan

### 13.1 Overview

- **Textbook**: Cambridge Prepare 2nd Edition Level 1
- **CEFR Level**: A1 (Beginner)
- **Units**: 20 units + Starter unit
- **Audio**: 200+ tracks in `D:\English\Prepare 2e Level 1\`

### 13.2 Audio File Location

```
D:\English\Prepare 2e Level 1\
├── SB (Student Book)/
│   └── 00 Student's Book Audio/
│       ├── PREPARE2_L1_SB_001.mp3
│       ├── PREPARE2_L1_SB_002.mp3
│       └── ... (200+ files)
└── WB (Workbook)/
    └── Audio/
        └── ... (additional tracks)
```

### 13.3 Audio Copy Script

```bash
# Copy Student Book audio to backend public folder
mkdir -p packages/backend/public/audio/word-maps/prepare-2e-l1

# Copy and rename files
cp "D:\English\Prepare 2e Level 1\SB\00 Student's Book Audio\*.mp3" \
   packages/backend/public/audio/word-maps/prepare-2e-l1/
```

### 13.4 Unit 0 (Starter) Content

Based on `Prepare2e-Level1-Unit0-SyncPlan.md`:

| Content Type | Count | Status |
|--------------|-------|--------|
| Audio Tracks | 10 | Pending copy |
| Vocabulary | 86 items | Pending import |
| Grammar | 2 points | Pending import |
| Exercises | ~187 | Pending create |
| PDF Images | TBD | Need extraction |

### 13.5 Sync Workflow

```
1. Copy audio files to public/audio/word-maps/prepare-2e-l1/
2. Extract images from PDF (if available)
3. Run MCP import_evolve_content with vocabulary/grammar
4. Create exercises via MCP generate_exercises
5. Link media resources to lessons
6. Test lesson study flow
```

---

## Part 14: MCP Media Sync Tools

### 14.1 Problem Statement

Khi sử dụng MCP để import nội dung từ PDF, audio, hoặc video:
- File media nằm ở thư mục nguồn (ví dụ: `D:\English\Prepare 2e Level 1\`)
- Cần tự động copy/di chuyển vào `packages/backend/public/`
- Cần cập nhật URL trong database để trỏ đến file đã copy

### 14.2 New MCP Tool: sync_media_files

```typescript
// packages/mcp-server/src/tools/admin/sync-media-files.ts

{
  name: "sync_media_files",
  description: "[ADMIN] Copy media files from source to backend public folder and update database URLs",
  parameters: {
    sourceFolder: {
      type: "string",
      description: "Source folder containing media files (e.g., 'D:\\English\\Prepare 2e Level 1\\SB\\00 Student's Book Audio')"
    },
    targetFolder: {
      type: "string",
      description: "Target folder relative to backend/public (e.g., 'audio/word-maps/prepare-2e-l1')"
    },
    filePattern: {
      type: "string",
      description: "Glob pattern for files to copy (e.g., '*.mp3', '*.png')",
      default: "*.*"
    },
    renamePattern: {
      type: "string",
      description: "Optional rename pattern (e.g., 'track-{n}.mp3' to rename PREPARE2_L1_SB_001.mp3 -> track-001.mp3)",
      optional: true
    },
    mapId: {
      type: "number",
      description: "Word Map ID to update lesson_content URLs",
      optional: true
    },
    dryRun: {
      type: "boolean",
      description: "Preview changes without copying files",
      default: false
    }
  },
  returns: {
    copiedFiles: Array<{
      sourcePath: string,
      targetPath: string,
      newUrl: string,
      size: number
    }>,
    totalSize: number,
    updatedRecords: number
  }
}
```

### 14.3 Sync Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User calls sync_media_files tool                        │
│ - sourceFolder: "D:\English\Prepare 2e Level 1\SB\Audio"       │
│ - targetFolder: "audio/word-maps/prepare-2e-l1"                │
│ - filePattern: "*.mp3"                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: MCP Tool executes                                       │
│ - Scans source folder for matching files                        │
│ - Creates target folder if not exists                           │
│ - Copies files with optional renaming                           │
│ - Calculates final URLs                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Database Update (if mapId provided)                     │
│ - Finds lesson_content records with old URLs                    │
│ - Updates URLs to new public folder paths                       │
│ - Returns summary of changes                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 14.4 Example Usage

```
User: "Sync audio files for Prepare 2e Level 1"

Claude calls:
sync_media_files({
  sourceFolder: "D:\\English\\Prepare 2e Level 1\\SB\\00 Student's Book Audio",
  targetFolder: "audio/word-maps/prepare-2e-l1/sb",
  filePattern: "*.mp3",
  mapId: 1,
  dryRun: false
})

Result:
{
  copiedFiles: [
    {
      sourcePath: "D:\\English\\...\\PREPARE2_L1_SB_001.mp3",
      targetPath: "packages/backend/public/audio/word-maps/prepare-2e-l1/sb/PREPARE2_L1_SB_001.mp3",
      newUrl: "/audio/word-maps/prepare-2e-l1/sb/PREPARE2_L1_SB_001.mp3",
      size: 2048576
    },
    // ... more files
  ],
  totalSize: 52428800, // 50MB
  updatedRecords: 45
}
```

### 14.5 Additional Media Tools

```typescript
// Tool: list_media_files
{
  name: "list_media_files",
  description: "List media files in source folder for preview before sync",
  parameters: {
    folder: string,
    pattern: string,
    recursive: boolean
  }
}

// Tool: validate_media_urls
{
  name: "validate_media_urls",
  description: "Check all media URLs in database and report missing files",
  parameters: {
    mapId?: number,
    contentType?: 'audio' | 'image' | 'video'
  }
}

// Tool: optimize_media
{
  name: "optimize_media",
  description: "Compress/resize media files in public folder",
  parameters: {
    folder: string,
    type: 'audio' | 'image' | 'video',
    quality: number
  }
}
```

---

## Part 15: MCP ChatLingua Integration

### 15.1 MCP Server Overview

MCP ChatLingua Server (`packages/mcp-server/`) cung cấp các tools để Claude Desktop/Claude Code tương tác với hệ thống học tập.

**Connection**: Configured in Claude Desktop settings or `.mcp.json`

### 15.2 Tool Categories

#### 15.2.1 Learning Flow Tools (User)

| Tool | Description | Primary Use |
|------|-------------|-------------|
| `analyze_conversation` | Step 1/3 - Analyze Vietnamese text, extract vocabulary | Daily conversation sync |
| `enrich_vocabulary` | Step 2/3 - Add dictionary data to vocabulary | Enhance word details |
| `generate_exercises` | Step 3/3 - Create practice exercises | Exercise generation |
| `get_vocabulary_list` | Get user's vocabulary | Review words learned |
| `get_review_queue` | Get SM2 spaced repetition queue | Daily review |
| `submit_review` | Submit review result with quality rating | Track progress |
| `get_learning_summary` | Progress stats (streak, XP, etc.) | Dashboard data |

#### 15.2.2 Word Map Tools (User)

| Tool | Description | Primary Use |
|------|-------------|-------------|
| `get_word_maps` | List available Word Maps | Browse courses |
| `get_word_map_detail` | Word Map with units/lessons | View curriculum |
| `activate_word_map` | Activate map for learning | Start a course |
| `get_lesson_content` | Get lesson content | Study lessons |
| `complete_lesson_study` | Mark lesson as studied | Progress tracking |
| `start_lesson_exam` | Start exam attempt | Take exams |
| `submit_exam_answers` | Submit exam answers | Complete exams |
| `get_user_progress` | Overall progress | Track achievement |

#### 15.2.3 Admin Tools (Content Management)

| Tool | Description | Primary Use |
|------|-------------|-------------|
| `import_vocabulary` | Import to master_vocabulary | Bulk vocab import |
| `import_grammar` | Import to master_grammar | Bulk grammar import |
| `import_exercises` | Import to master_exercises | Bulk exercise import |
| `create_word_map` | Create Word Map with units/lessons | Course creation |
| `add_lesson_content` | Link content to lessons | Curriculum building |
| `import_evolve_content` | Import from Evolve textbook format | Textbook sync |
| `link_media_resource` | Link audio/video/image to lesson | Media management |
| `sync_media_files` | **NEW** - Copy media to backend | Media deployment |

#### 15.2.4 Sync Request Tools (Collaboration)

| Tool | Description | Primary Use |
|------|-------------|-------------|
| `get_pending_sync_requests` | List pending requests | Find work to do |
| `start_sync_request` | Claim a sync request | Begin syncing |
| `complete_sync_request` | Mark sync as complete | Finish syncing |
| `sync_all_pending_requests` | Batch process requests | Bulk syncing |

### 15.3 Typical Workflows

#### 15.3.1 Daily Conversation Sync (User)

```
User tells Claude about their day in Vietnamese
                    ↓
Claude calls: analyze_conversation
  - Extracts vocabulary with basic info
  - Returns vocabularyIds
                    ↓
Claude calls: enrich_vocabulary (with vocabularyIds)
  - Adds definitions, examples, word family
  - Updates vocabulary records
                    ↓
Claude calls: generate_exercises (with conversationId)
  - Creates 10-15 exercises
  - Links to vocabulary
                    ↓
User receives: New words + exercises ready for review
```

#### 15.3.2 Word Map Content Import (Admin)

```
Admin has new textbook to import
                    ↓
Step 1: create_word_map
  - Creates map with units and lessons
  - Returns mapId, unitIds, lessonIds
                    ↓
Step 2: sync_media_files
  - Copies audio/images from source
  - Files now in backend/public/
                    ↓
Step 3: import_evolve_content
  - Imports vocabulary, grammar
  - Links to master tables
                    ↓
Step 4: add_lesson_content
  - Links master content to lessons
  - Sets sections (warmup, study, practice)
  - Adds media URLs
                    ↓
Step 5: import_exercises or generate_exercises
  - Creates practice exercises
  - Creates exam questions
                    ↓
Word Map ready for students!
```

### 15.4 Authentication

- **MCP OAuth2 Device Flow**: Users authenticate via `/mcp-auth` page
- **JWT Token**: Stored in MCP session, refreshed automatically
- **User Context**: All tools receive userId from authenticated session

### 15.5 Error Handling

```typescript
// Standard MCP error response
{
  error: {
    code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NOT_FOUND" | "SERVER_ERROR",
    message: "Human readable error message",
    details?: object
  }
}

// Success response
{
  success: true,
  data: { ... }
}
```

---

## Part 16: Deployment Strategy - Hybrid Approach

### 16.1 Overview

**Strategy**: Code qua Git + CI/CD, media sync riêng

| Content Type | Deployment Method | Reason |
|--------------|-------------------|--------|
| Source code | Git → GitHub Actions | Version control, review |
| Config files | Git → GitHub Actions | Track changes |
| Media files | Direct sync/rsync | Large files, không cần version |
| Database | Migrations | Track schema changes |

### 16.2 Git Ignore Rules

```gitignore
# .gitignore - ADD these rules

# ====================================
# Media files - sync separately
# ====================================

# Audio files
packages/backend/public/audio/word-maps/**/*.mp3
packages/backend/public/audio/word-maps/**/*.wav
packages/backend/public/audio/word-maps/**/*.ogg

# Image files (except placeholders)
packages/backend/public/images/word-maps/**/*.png
packages/backend/public/images/word-maps/**/*.jpg
packages/backend/public/images/word-maps/**/*.jpeg
packages/backend/public/images/word-maps/**/*.webp
packages/backend/public/images/word-maps/**/*.gif

# Video files
packages/backend/public/videos/**/*.mp4
packages/backend/public/videos/**/*.webm
packages/backend/public/videos/**/*.mov

# Keep folder structure (add .gitkeep files)
!packages/backend/public/audio/word-maps/.gitkeep
!packages/backend/public/images/word-maps/.gitkeep
!packages/backend/public/videos/.gitkeep

# ====================================
# TTS generated files - regenerated on server
# ====================================
packages/backend/public/audio/tts/

# ====================================
# Source media files (development only)
# ====================================
/media-source/
```

### 16.3 Folder Structure with .gitkeep

```
packages/backend/public/
├── audio/
│   ├── tts/                    # Generated - ignored
│   └── word-maps/
│       ├── .gitkeep            # Committed - keeps folder structure
│       ├── prepare-2e-l1/      # Media - ignored
│       └── evolve-1/           # Media - ignored
│
├── images/
│   └── word-maps/
│       ├── .gitkeep            # Committed
│       └── */                  # Media - ignored
│
└── videos/
    ├── .gitkeep                # Committed
    └── */                      # Media - ignored
```

### 16.4 Media Sync Scripts

#### 16.4.1 Local Development Sync

```bash
#!/bin/bash
# scripts/sync-media-dev.sh - Run on development machine

# Variables
BACKEND_PUBLIC="packages/backend/public"
SOURCE_BASE="D:/English"  # Windows path

# Prepare 2e Level 1 Audio
echo "Syncing Prepare 2e Level 1 audio..."
mkdir -p "$BACKEND_PUBLIC/audio/word-maps/prepare-2e-l1/sb"
cp -r "$SOURCE_BASE/Prepare 2e Level 1/SB/00 Student's Book Audio/"*.mp3 \
      "$BACKEND_PUBLIC/audio/word-maps/prepare-2e-l1/sb/"

# Evolve 1 Audio (if exists)
if [ -d "$SOURCE_BASE/Evolve 1" ]; then
  echo "Syncing Evolve 1 audio..."
  mkdir -p "$BACKEND_PUBLIC/audio/word-maps/evolve-1"
  cp -r "$SOURCE_BASE/Evolve 1/Audio/"*.mp3 \
        "$BACKEND_PUBLIC/audio/word-maps/evolve-1/"
fi

echo "Media sync complete!"
echo "Total audio files: $(find $BACKEND_PUBLIC/audio -name '*.mp3' | wc -l)"
```

#### 16.4.2 Server Deployment Sync

```bash
#!/bin/bash
# scripts/sync-media-server.sh - Run from local to production server

# Variables
SERVER_USER="deploy"
SERVER_HOST="chatlingua.example.com"
SERVER_PATH="/var/www/chatlingua/packages/backend/public"
LOCAL_MEDIA="packages/backend/public"

# Sync with rsync (efficient - only changed files)
echo "Syncing media to production server..."

rsync -avz --progress \
  --exclude="tts/" \
  --include="audio/word-maps/**" \
  --include="images/word-maps/**" \
  --include="videos/**" \
  --exclude="*" \
  "$LOCAL_MEDIA/" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

echo "Server media sync complete!"
```

#### 16.4.3 Windows PowerShell Version

```powershell
# scripts/sync-media-dev.ps1 - Windows PowerShell version

$BackendPublic = "packages\backend\public"
$SourceBase = "D:\English"

# Create directories
New-Item -ItemType Directory -Force -Path "$BackendPublic\audio\word-maps\prepare-2e-l1\sb"
New-Item -ItemType Directory -Force -Path "$BackendPublic\images\word-maps\prepare-2e-l1"

# Copy Prepare 2e Level 1 audio
Write-Host "Syncing Prepare 2e Level 1 audio..."
Copy-Item "$SourceBase\Prepare 2e Level 1\SB\00 Student's Book Audio\*.mp3" `
          "$BackendPublic\audio\word-maps\prepare-2e-l1\sb\" -Force

Write-Host "Media sync complete!"
$audioCount = (Get-ChildItem -Path "$BackendPublic\audio" -Recurse -Filter "*.mp3").Count
Write-Host "Total audio files: $audioCount"
```

### 16.5 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy ChatLingua

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/chatlingua
            git pull origin main
            npm ci --production
            npm run build
            pm2 restart chatlingua

      # NOTE: Media files are NOT deployed via GitHub Actions
      # Use sync-media-server.sh script manually or via separate workflow
```

### 16.6 Media Deployment Workflow

```
Development                         Production
┌─────────────────────┐            ┌─────────────────────┐
│ 1. Import content   │            │                     │
│    via MCP tools    │            │                     │
│                     │            │                     │
│ 2. MCP calls        │            │                     │
│    sync_media_files │            │                     │
│    (copies to local │            │                     │
│    backend/public)  │            │                     │
│                     │            │                     │
│ 3. Test locally     │            │                     │
└─────────────────────┘            └─────────────────────┘
         │                                  │
         │ rsync / scp                      │
         │ (scripts/sync-media-server.sh)   │
         └──────────────────────────────────┘

Git push (code only)
┌─────────────────────┐            ┌─────────────────────┐
│ Local repo          │  ───────►  │ GitHub              │
│ (.gitignore media)  │            │                     │
└─────────────────────┘            └─────────────────────┘
                                            │
                                   GitHub Actions
                                            │
                                            ▼
                                   ┌─────────────────────┐
                                   │ Production Server   │
                                   │ (code updated,      │
                                   │  media unchanged)   │
                                   └─────────────────────┘
```

### 16.7 Checklist for Media Deployment

**Before First Deployment:**
- [ ] Add .gitignore rules for media folders
- [ ] Add .gitkeep files to maintain folder structure
- [ ] Create sync scripts (bash + PowerShell)
- [ ] Test rsync connection to server
- [ ] Set up SSH keys for deployment

**For Each New Word Map:**
1. [ ] Import content via MCP tools
2. [ ] Run `sync_media_files` to copy media locally
3. [ ] Test lesson content locally
4. [ ] Run `sync-media-server.sh` to deploy media
5. [ ] Verify media accessible on production
6. [ ] Git commit/push code changes (URLs, etc.)

### 16.8 Advantages of Hybrid Approach

| Aspect | Git + CI/CD (Code) | Direct Sync (Media) |
|--------|-------------------|---------------------|
| Version control | ✅ Full history | ❌ Not needed |
| Code review | ✅ PR reviews | ❌ N/A |
| Deploy speed | ⚡ Fast (small files) | ⚡ Fast (only changes) |
| Storage | ✅ Git repo small | ✅ Server only |
| Bandwidth | ✅ Efficient | ✅ rsync = efficient |
| Rollback | ✅ Git revert | ⚠️ Manual backup |

---

## Part 17: Word Map Gamification & Integration

### 17.1 Overview

Tích hợp Word Map learning với hệ thống gamification hiện có và các tính năng học tập khác.

**Goals:**
1. XP và Pet stats khi học Word Map
2. Achievements cho Word Map
3. Vocabulary page với filter Word Map / Conversations
4. Tích hợp Word Map vocabulary vào Games và Daily Review

---

### 17.2 XP & Pet Stats Integration

#### 17.2.1 XP Rewards for Word Map Activities

| Activity | XP Reward | Notes |
|----------|-----------|-------|
| Complete lesson study | `lesson.study_xp` (default: 20) | Per lesson |
| Pass lesson exam | `lesson.exam_xp` (default: 50) | First pass only |
| Pass lesson exam retry | `lesson.exam_xp * 0.5` | Reduced XP for retries |
| Pass unit boss exam | `unit.completion_xp` (default: 100) | First pass only |
| Complete unit (all lessons) | 50 XP bonus | One-time bonus |
| Complete Word Map | 500 XP bonus | One-time bonus |
| Daily streak in Word Map | 10 XP/day | Consecutive days |

#### 17.2.2 Pet Stats Integration

**File: `packages/backend/src/services/v3/user-progress.service.ts`**

```typescript
// Add to completeLessonStudy method
async completeLessonStudy(userId: number, lessonId: number, data: CompleteLessonStudyDTO) {
  // ... existing code ...

  // Award XP
  const xpEarned = lesson.study_xp || 20;
  await this.userXpService.addXp(userId, xpEarned, 'word_map_study', {
    lessonId,
    mapId: lesson.map_id,
    vocabularyCount: data.vocabularyMastered,
    grammarCount: data.grammarMastered
  });

  // Update pet stats - studying activity
  await this.petService.recordActivity(userId, {
    activityType: 'study',
    xpEarned,
    duration: data.timeSpentSeconds,
    source: 'word_map',
    metadata: { lessonId, mapId: lesson.map_id }
  });

  // Trigger pet happiness boost for learning
  await this.petService.updateStats(userId, {
    happinessBoost: Math.min(10, Math.floor(data.vocabularyMastered / 2)),
    intelligenceBoost: Math.min(5, data.grammarMastered)
  });
}

// Add to submitExamAnswers method
async submitExamAnswers(userId: number, attemptId: number, answers: ExamAnswerDTO[]) {
  // ... existing code ...

  if (result.passed) {
    // Award XP
    const xpMultiplier = attemptNumber === 1 ? 1 : 0.5;
    const xpEarned = Math.floor((lesson.exam_xp || 50) * xpMultiplier);

    await this.userXpService.addXp(userId, xpEarned, 'word_map_exam', {
      lessonId,
      examId,
      score: result.score,
      attemptNumber
    });

    // Update pet stats - achievement activity
    await this.petService.recordActivity(userId, {
      activityType: 'achievement',
      xpEarned,
      source: 'word_map_exam',
      metadata: { examId, score: result.score }
    });
  }
}
```

#### 17.2.3 Pet Daily Tasks for Word Map

Thêm daily tasks mới cho pet liên quan đến Word Map learning:

**Table: `pet_daily_task_types`** (add rows)

```sql
INSERT INTO pet_daily_task_types (task_type, title, description, reward_type, reward_amount, required_count) VALUES
('word_map_study', 'Study Word Map Lesson', 'Complete 1 Word Map lesson study', 'xp', 15, 1),
('word_map_vocab', 'Learn Word Map Vocabulary', 'Study 10 new vocabulary from Word Map', 'coins', 20, 10),
('word_map_exam', 'Pass Word Map Exam', 'Pass any Word Map lesson exam', 'gems', 5, 1),
('word_map_review', 'Review Word Map Vocabulary', 'Review 20 Word Map vocabulary items', 'xp', 25, 20);
```

---

### 17.3 Word Map Achievements System

#### 17.3.1 New Achievement Categories

**Table: `achievements`** (add rows)

```sql
-- Word Map Progress Achievements
INSERT INTO achievements (code, name, description, category, icon, tier, requirement_type, requirement_value, xp_reward, coin_reward) VALUES
-- Lesson Milestones
('word_map_first_lesson', 'First Steps', 'Complete your first Word Map lesson', 'word_map', 'fa-shoe-prints', 'bronze', 'lessons_completed', 1, 50, 100),
('word_map_10_lessons', 'Steady Learner', 'Complete 10 Word Map lessons', 'word_map', 'fa-book-open', 'silver', 'lessons_completed', 10, 150, 300),
('word_map_50_lessons', 'Dedicated Student', 'Complete 50 Word Map lessons', 'word_map', 'fa-graduation-cap', 'gold', 'lessons_completed', 50, 500, 1000),
('word_map_100_lessons', 'Knowledge Seeker', 'Complete 100 Word Map lessons', 'word_map', 'fa-brain', 'platinum', 'lessons_completed', 100, 1000, 2500),

-- Unit Milestones
('word_map_first_unit', 'Unit Master', 'Complete your first Word Map unit', 'word_map', 'fa-flag-checkered', 'bronze', 'units_completed', 1, 100, 200),
('word_map_5_units', 'Chapter Champion', 'Complete 5 Word Map units', 'word_map', 'fa-trophy', 'silver', 'units_completed', 5, 300, 600),
('word_map_10_units', 'Section Specialist', 'Complete 10 Word Map units', 'word_map', 'fa-crown', 'gold', 'units_completed', 10, 750, 1500),

-- Map Completion
('word_map_first_complete', 'Course Graduate', 'Complete your first Word Map', 'word_map', 'fa-certificate', 'gold', 'maps_completed', 1, 500, 1000),
('word_map_3_complete', 'Multi-Course Master', 'Complete 3 Word Maps', 'word_map', 'fa-star', 'platinum', 'maps_completed', 3, 1500, 3000),

-- Exam Performance
('word_map_perfect_exam', 'Perfect Score', 'Score 100% on any Word Map exam', 'word_map', 'fa-100', 'silver', 'perfect_exam', 1, 200, 400),
('word_map_10_perfect', 'Perfectionist', 'Score 100% on 10 Word Map exams', 'word_map', 'fa-bullseye', 'gold', 'perfect_exam', 10, 750, 1500),
('word_map_first_try', 'First Time Lucky', 'Pass 10 exams on first attempt', 'word_map', 'fa-dice-one', 'silver', 'first_try_pass', 10, 300, 600),

-- Vocabulary from Word Map
('word_map_100_vocab', 'Word Collector', 'Learn 100 vocabulary from Word Maps', 'word_map', 'fa-book', 'silver', 'word_map_vocab', 100, 200, 400),
('word_map_500_vocab', 'Vocabulary Virtuoso', 'Learn 500 vocabulary from Word Maps', 'word_map', 'fa-books', 'gold', 'word_map_vocab', 500, 750, 1500),
('word_map_1000_vocab', 'Lexicon Legend', 'Learn 1000 vocabulary from Word Maps', 'word_map', 'fa-language', 'platinum', 'word_map_vocab', 1000, 2000, 4000),

-- Streak Achievements
('word_map_7_day_streak', 'Weekly Warrior', 'Study Word Map 7 days in a row', 'word_map', 'fa-fire', 'bronze', 'word_map_streak', 7, 100, 200),
('word_map_30_day_streak', 'Monthly Master', 'Study Word Map 30 days in a row', 'word_map', 'fa-fire-flame-curved', 'gold', 'word_map_streak', 30, 500, 1000),

-- CEFR Level Achievements
('word_map_a1_complete', 'A1 Beginner Complete', 'Complete all A1 level Word Maps', 'word_map', 'fa-medal', 'bronze', 'cefr_complete', 'A1', 300, 600),
('word_map_a2_complete', 'A2 Elementary Complete', 'Complete all A2 level Word Maps', 'word_map', 'fa-medal', 'silver', 'cefr_complete', 'A2', 500, 1000),
('word_map_b1_complete', 'B1 Intermediate Complete', 'Complete all B1 level Word Maps', 'word_map', 'fa-medal', 'gold', 'cefr_complete', 'B1', 750, 1500),
('word_map_b2_complete', 'B2 Upper-Intermediate Complete', 'Complete all B2 level Word Maps', 'word_map', 'fa-medal', 'platinum', 'cefr_complete', 'B2', 1000, 2000);
```

#### 17.3.2 Achievement Check Service

**File: `packages/backend/src/services/v3/word-map-achievements.service.ts`**

```typescript
import { achievementService } from '../achievement.service.js';
import pool from '../../config/database.js';

export class WordMapAchievementsService {

  async checkAndAwardAchievements(userId: number, event: WordMapEvent): Promise<AchievementUnlock[]> {
    const unlocked: AchievementUnlock[] = [];

    switch (event.type) {
      case 'lesson_completed':
        unlocked.push(...await this.checkLessonAchievements(userId));
        break;
      case 'unit_completed':
        unlocked.push(...await this.checkUnitAchievements(userId));
        break;
      case 'map_completed':
        unlocked.push(...await this.checkMapAchievements(userId, event.mapId));
        break;
      case 'exam_passed':
        unlocked.push(...await this.checkExamAchievements(userId, event.score, event.attemptNumber));
        break;
      case 'vocab_learned':
        unlocked.push(...await this.checkVocabAchievements(userId));
        break;
    }

    return unlocked;
  }

  private async checkLessonAchievements(userId: number): Promise<AchievementUnlock[]> {
    const [stats] = await pool.execute<UserMapStatsRow[]>(`
      SELECT SUM(lessons_completed) as total_lessons
      FROM user_map_progress
      WHERE user_id = ?
    `, [userId]);

    const totalLessons = stats[0]?.total_lessons || 0;
    const unlocked: AchievementUnlock[] = [];

    // Check milestone achievements
    const milestones = [
      { code: 'word_map_first_lesson', threshold: 1 },
      { code: 'word_map_10_lessons', threshold: 10 },
      { code: 'word_map_50_lessons', threshold: 50 },
      { code: 'word_map_100_lessons', threshold: 100 },
    ];

    for (const milestone of milestones) {
      if (totalLessons >= milestone.threshold) {
        const result = await achievementService.awardAchievement(userId, milestone.code);
        if (result.newlyUnlocked) {
          unlocked.push(result);
        }
      }
    }

    return unlocked;
  }

  private async checkExamAchievements(
    userId: number,
    score: number,
    attemptNumber: number
  ): Promise<AchievementUnlock[]> {
    const unlocked: AchievementUnlock[] = [];

    // Perfect score
    if (score === 100) {
      const [perfectCount] = await pool.execute<CountRow[]>(`
        SELECT COUNT(*) as count FROM user_exam_attempts
        WHERE user_id = ? AND score = 100
      `, [userId]);

      const count = perfectCount[0]?.count || 0;

      if (count >= 1) {
        const result = await achievementService.awardAchievement(userId, 'word_map_perfect_exam');
        if (result.newlyUnlocked) unlocked.push(result);
      }
      if (count >= 10) {
        const result = await achievementService.awardAchievement(userId, 'word_map_10_perfect');
        if (result.newlyUnlocked) unlocked.push(result);
      }
    }

    // First try pass
    if (attemptNumber === 1 && score >= 70) {
      const [firstTryCount] = await pool.execute<CountRow[]>(`
        SELECT COUNT(*) as count FROM user_exam_attempts
        WHERE user_id = ? AND attempt_number = 1 AND is_passed = TRUE
      `, [userId]);

      if ((firstTryCount[0]?.count || 0) >= 10) {
        const result = await achievementService.awardAchievement(userId, 'word_map_first_try');
        if (result.newlyUnlocked) unlocked.push(result);
      }
    }

    return unlocked;
  }

  private async checkVocabAchievements(userId: number): Promise<AchievementUnlock[]> {
    const [vocabStats] = await pool.execute<CountRow[]>(`
      SELECT COUNT(*) as count FROM user_vocabulary
      WHERE user_id = ? AND source_type = 'word_map'
    `, [userId]);

    const count = vocabStats[0]?.count || 0;
    const unlocked: AchievementUnlock[] = [];

    const milestones = [
      { code: 'word_map_100_vocab', threshold: 100 },
      { code: 'word_map_500_vocab', threshold: 500 },
      { code: 'word_map_1000_vocab', threshold: 1000 },
    ];

    for (const milestone of milestones) {
      if (count >= milestone.threshold) {
        const result = await achievementService.awardAchievement(userId, milestone.code);
        if (result.newlyUnlocked) unlocked.push(result);
      }
    }

    return unlocked;
  }
}

export const wordMapAchievementsService = new WordMapAchievementsService();
```

---

### 17.4 Vocabulary Page Filter System

#### 17.4.1 Filter Requirements

**UI Components:**

1. **Source Type Radio Buttons:**
   - `( ) All` - Show all vocabulary
   - `( ) Word Map` - Only Word Map vocabulary
   - `( ) Conversations` - Only Conversation vocabulary

2. **Word Map Filters (visible when "Word Map" selected):**
   - `[Select Map ▼]` - Dropdown to filter by specific Word Map
   - `[Select Unit ▼]` - Dropdown to filter by Unit (depends on selected Map)
   - `[Select Lesson ▼]` - Dropdown to filter by Lesson (depends on selected Unit)

#### 17.4.2 API Changes

**File: `packages/backend/src/routes/v3/vocabulary.routes.ts`**

```typescript
// GET /api/v3/user/vocabulary
// Query params:
// - sourceType: 'all' | 'word_map' | 'conversation' (default: 'all')
// - mapId: number (optional, requires sourceType='word_map')
// - unitId: number (optional, requires mapId)
// - lessonId: number (optional, requires unitId)
// - page: number (default: 1)
// - limit: number (default: 20)
// - search: string (optional, search in english/vietnamese word)
// - sortBy: 'created_at' | 'english_word' | 'mastery_level' | 'next_review_at'
// - sortOrder: 'asc' | 'desc'

router.get('/user/vocabulary', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const {
    sourceType = 'all',
    mapId,
    unitId,
    lessonId,
    page = 1,
    limit = 20,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const result = await userVocabularyService.getUserVocabularyFiltered(userId, {
    sourceType: sourceType as 'all' | 'word_map' | 'conversation',
    mapId: mapId ? Number(mapId) : undefined,
    unitId: unitId ? Number(unitId) : undefined,
    lessonId: lessonId ? Number(lessonId) : undefined,
    page: Number(page),
    limit: Number(limit),
    search: search as string | undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc'
  });

  res.json(result);
});

// GET /api/v3/user/vocabulary/filters
// Returns available filter options based on user's vocabulary
router.get('/user/vocabulary/filters', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const filters = await userVocabularyService.getAvailableFilters(userId);
  res.json(filters);
});
```

#### 17.4.3 Service Implementation

**File: `packages/backend/src/services/v3/user-vocabulary.service.ts`** (add methods)

```typescript
interface VocabularyFilterOptions {
  sourceType: 'all' | 'word_map' | 'conversation';
  mapId?: number;
  unitId?: number;
  lessonId?: number;
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

async getUserVocabularyFiltered(
  userId: number,
  options: VocabularyFilterOptions
): Promise<PaginatedResponse<UserVocabularyWithMaster>> {
  const { sourceType, mapId, unitId, lessonId, page, limit, search, sortBy, sortOrder } = options;
  const offset = (page - 1) * limit;

  let whereConditions = ['uv.user_id = ?'];
  const params: (string | number)[] = [userId];

  // Source type filter
  if (sourceType === 'word_map') {
    whereConditions.push('uv.source_type = ?');
    params.push('word_map');

    // Map filter
    if (mapId) {
      whereConditions.push('lc.map_id = ?');
      params.push(mapId);
    }

    // Unit filter
    if (unitId) {
      whereConditions.push('ul.unit_id = ?');
      params.push(unitId);
    }

    // Lesson filter
    if (lessonId) {
      whereConditions.push('uv.source_id = ?');
      params.push(lessonId);
    }
  } else if (sourceType === 'conversation') {
    whereConditions.push('uv.source_type = ?');
    params.push('conversation');
  }
  // 'all' = no source filter

  // Search filter
  if (search) {
    whereConditions.push('(mv.english_word LIKE ? OR mv.vietnamese_word LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Build query
  const query = `
    SELECT
      uv.*,
      mv.english_word, mv.vietnamese_word, mv.phonetic,
      mv.pronunciation_uk, mv.pronunciation_us,
      mv.part_of_speech, mv.cefr_level, mv.difficulty_level,
      mv.definitions, mv.word_family, mv.synonyms, mv.collocations,
      -- Source info
      CASE
        WHEN uv.source_type = 'word_map' THEN wm.name
        WHEN uv.source_type = 'conversation' THEN c.topic
        ELSE NULL
      END as source_name,
      CASE
        WHEN uv.source_type = 'word_map' THEN mu.name
        ELSE NULL
      END as unit_name,
      CASE
        WHEN uv.source_type = 'word_map' THEN ul.title
        ELSE NULL
      END as lesson_name
    FROM user_vocabulary uv
    JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
    -- Word Map joins (for filtering and source info)
    LEFT JOIN lesson_content lc ON uv.source_type = 'word_map'
      AND lc.content_type = 'vocabulary'
      AND lc.master_vocabulary_id = mv.id
    LEFT JOIN unit_lessons ul ON lc.lesson_id = ul.id
    LEFT JOIN map_units mu ON ul.unit_id = mu.id
    LEFT JOIN word_maps wm ON mu.map_id = wm.id
    -- Conversation join
    LEFT JOIN conversations c ON uv.source_type = 'conversation'
      AND uv.source_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY uv.id
    ORDER BY ${this.getSortColumn(sortBy)} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  params.push(String(limit), String(offset));

  const [rows] = await pool.execute<UserVocabularyRow[]>(query, params);

  // Count query
  const countQuery = `
    SELECT COUNT(DISTINCT uv.id) as total
    FROM user_vocabulary uv
    JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
    LEFT JOIN lesson_content lc ON uv.source_type = 'word_map'
      AND lc.content_type = 'vocabulary'
      AND lc.master_vocabulary_id = mv.id
    LEFT JOIN unit_lessons ul ON lc.lesson_id = ul.id
    LEFT JOIN map_units mu ON ul.unit_id = mu.id
    WHERE ${whereConditions.join(' AND ')}
  `;

  const [countResult] = await pool.execute<CountRow[]>(
    countQuery,
    params.slice(0, -2) // Remove LIMIT and OFFSET params
  );

  const total = countResult[0]?.total || 0;

  return {
    items: rows.map(this.mapUserVocabularyRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

async getAvailableFilters(userId: number): Promise<VocabularyFilterOptions> {
  // Get Word Maps that user has vocabulary from
  const [maps] = await pool.execute<MapFilterRow[]>(`
    SELECT DISTINCT wm.id, wm.name, wm.cefr_level
    FROM user_vocabulary uv
    JOIN lesson_content lc ON uv.source_type = 'word_map'
      AND lc.content_type = 'vocabulary'
      AND lc.master_vocabulary_id = uv.master_vocabulary_id
    JOIN unit_lessons ul ON lc.lesson_id = ul.id
    JOIN map_units mu ON ul.unit_id = mu.id
    JOIN word_maps wm ON mu.map_id = wm.id
    WHERE uv.user_id = ?
    ORDER BY wm.name
  `, [userId]);

  // Get Units for each map
  const [units] = await pool.execute<UnitFilterRow[]>(`
    SELECT DISTINCT mu.id, mu.name, mu.map_id, mu.order_index
    FROM user_vocabulary uv
    JOIN lesson_content lc ON uv.source_type = 'word_map'
      AND lc.content_type = 'vocabulary'
      AND lc.master_vocabulary_id = uv.master_vocabulary_id
    JOIN unit_lessons ul ON lc.lesson_id = ul.id
    JOIN map_units mu ON ul.unit_id = mu.id
    WHERE uv.user_id = ?
    ORDER BY mu.map_id, mu.order_index
  `, [userId]);

  // Get Lessons for each unit
  const [lessons] = await pool.execute<LessonFilterRow[]>(`
    SELECT DISTINCT ul.id, ul.title, ul.unit_id, ul.order_index
    FROM user_vocabulary uv
    JOIN lesson_content lc ON uv.source_type = 'word_map'
      AND lc.content_type = 'vocabulary'
      AND lc.master_vocabulary_id = uv.master_vocabulary_id
    JOIN unit_lessons ul ON lc.lesson_id = ul.id
    WHERE uv.user_id = ?
    ORDER BY ul.unit_id, ul.order_index
  `, [userId]);

  // Get source counts
  const [counts] = await pool.execute<SourceCountRow[]>(`
    SELECT
      source_type,
      COUNT(*) as count
    FROM user_vocabulary
    WHERE user_id = ?
    GROUP BY source_type
  `, [userId]);

  return {
    maps: maps.map(m => ({ id: m.id, name: m.name, cefrLevel: m.cefr_level })),
    units: units.map(u => ({ id: u.id, name: u.name, mapId: u.map_id })),
    lessons: lessons.map(l => ({ id: l.id, title: l.title, unitId: l.unit_id })),
    sourceCounts: {
      all: counts.reduce((sum, c) => sum + c.count, 0),
      word_map: counts.find(c => c.source_type === 'word_map')?.count || 0,
      conversation: counts.find(c => c.source_type === 'conversation')?.count || 0
    }
  };
}
```

#### 17.4.4 Frontend Implementation

**File: `packages/frontend/src/app/features/vocabulary/vocabulary-list.component.ts`** (add filter state)

```typescript
// Filter state
sourceType = signal<'all' | 'word_map' | 'conversation'>('all');
selectedMapId = signal<number | null>(null);
selectedUnitId = signal<number | null>(null);
selectedLessonId = signal<number | null>(null);

// Filter options (from API)
filterOptions = signal<VocabularyFilterOptions | null>(null);

// Computed: available units based on selected map
availableUnits = computed(() => {
  const options = this.filterOptions();
  const mapId = this.selectedMapId();
  if (!options || !mapId) return [];
  return options.units.filter(u => u.mapId === mapId);
});

// Computed: available lessons based on selected unit
availableLessons = computed(() => {
  const options = this.filterOptions();
  const unitId = this.selectedUnitId();
  if (!options || !unitId) return [];
  return options.lessons.filter(l => l.unitId === unitId);
});

// Load filter options on init
ngOnInit() {
  this.loadFilterOptions();
  this.loadVocabulary();
}

loadFilterOptions() {
  this.apiService.get<VocabularyFilterOptions>('/v3/user/vocabulary/filters')
    .subscribe(options => this.filterOptions.set(options));
}

// Handle source type change
onSourceTypeChange(type: 'all' | 'word_map' | 'conversation') {
  this.sourceType.set(type);
  // Reset map/unit/lesson filters when changing source type
  this.selectedMapId.set(null);
  this.selectedUnitId.set(null);
  this.selectedLessonId.set(null);
  this.loadVocabulary();
}

// Handle map change
onMapChange(mapId: number | null) {
  this.selectedMapId.set(mapId);
  this.selectedUnitId.set(null);
  this.selectedLessonId.set(null);
  this.loadVocabulary();
}

// Handle unit change
onUnitChange(unitId: number | null) {
  this.selectedUnitId.set(unitId);
  this.selectedLessonId.set(null);
  this.loadVocabulary();
}

// Handle lesson change
onLessonChange(lessonId: number | null) {
  this.selectedLessonId.set(lessonId);
  this.loadVocabulary();
}

loadVocabulary() {
  const params: Record<string, string> = {
    page: String(this.page()),
    limit: String(this.pageSize()),
    sourceType: this.sourceType()
  };

  if (this.sourceType() === 'word_map') {
    if (this.selectedMapId()) params.mapId = String(this.selectedMapId());
    if (this.selectedUnitId()) params.unitId = String(this.selectedUnitId());
    if (this.selectedLessonId()) params.lessonId = String(this.selectedLessonId());
  }

  this.apiService.get<PaginatedResponse<UserVocabulary>>('/v3/user/vocabulary', params)
    .subscribe(response => {
      this.vocabularyList.set(response.items);
      this.totalItems.set(response.total);
    });
}
```

**File: `packages/frontend/src/app/features/vocabulary/vocabulary-list.component.html`** (add filter UI)

```html
<!-- Filter Section -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
  <div class="space-y-4">

    <!-- Source Type Radio Buttons -->
    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="sourceType"
          value="all"
          [checked]="sourceType() === 'all'"
          (change)="onSourceTypeChange('all')"
          class="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500"
        >
        <span class="text-gray-700">
          All
          <span class="text-gray-500">({{ filterOptions()?.sourceCounts?.all || 0 }})</span>
        </span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="sourceType"
          value="word_map"
          [checked]="sourceType() === 'word_map'"
          (change)="onSourceTypeChange('word_map')"
          class="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500"
        >
        <span class="text-gray-700">
          Word Map
          <span class="text-gray-500">({{ filterOptions()?.sourceCounts?.word_map || 0 }})</span>
        </span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="sourceType"
          value="conversation"
          [checked]="sourceType() === 'conversation'"
          (change)="onSourceTypeChange('conversation')"
          class="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500"
        >
        <span class="text-gray-700">
          Conversations
          <span class="text-gray-500">({{ filterOptions()?.sourceCounts?.conversation || 0 }})</span>
        </span>
      </label>
    </div>

    <!-- Word Map Filters (visible when sourceType = 'word_map') -->
    @if (sourceType() === 'word_map') {
      <div class="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
        <!-- Map Select -->
        <div class="min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-1">Word Map</label>
          <select
            [value]="selectedMapId() ?? ''"
            (change)="onMapChange($event.target.value ? +$event.target.value : null)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">All Maps</option>
            @for (map of filterOptions()?.maps; track map.id) {
              <option [value]="map.id">{{ map.name }} ({{ map.cefrLevel }})</option>
            }
          </select>
        </div>

        <!-- Unit Select (visible when map selected) -->
        @if (selectedMapId()) {
          <div class="min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              [value]="selectedUnitId() ?? ''"
              (change)="onUnitChange($event.target.value ? +$event.target.value : null)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="">All Units</option>
              @for (unit of availableUnits(); track unit.id) {
                <option [value]="unit.id">{{ unit.name }}</option>
              }
            </select>
          </div>
        }

        <!-- Lesson Select (visible when unit selected) -->
        @if (selectedUnitId()) {
          <div class="min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">Lesson</label>
            <select
              [value]="selectedLessonId() ?? ''"
              (change)="onLessonChange($event.target.value ? +$event.target.value : null)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="">All Lessons</option>
              @for (lesson of availableLessons(); track lesson.id) {
                <option [value]="lesson.id">{{ lesson.title }}</option>
              }
            </select>
          </div>
        }
      </div>
    }

  </div>
</div>
```

---

### 17.5 Word Map Vocabulary in Games & Daily Review

#### 17.5.1 Daily Review Queue Integration

**Logic:** Word Map vocabulary được thêm vào Daily Review Queue dựa trên SM2 schedule.

**File: `packages/backend/src/services/v3/daily-review-queue.service.ts`** (modify)

```typescript
async buildDailyQueue(userId: number): Promise<DailyQueueResult> {
  const today = new Date().toISOString().split('T')[0];

  // Get vocabulary due for review from BOTH sources
  const [dueItems] = await pool.execute<DueVocabularyRow[]>(`
    SELECT
      uv.*,
      mv.english_word, mv.vietnamese_word, mv.phonetic,
      mv.part_of_speech, mv.definitions,
      uv.source_type,
      CASE
        WHEN uv.next_review_at < NOW() THEN 'overdue'
        WHEN DATE(uv.next_review_at) = CURDATE() THEN 'due'
        ELSE 'new'
      END as priority
    FROM user_vocabulary uv
    JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
    WHERE uv.user_id = ?
      AND (
        uv.next_review_at <= NOW()                    -- Overdue or due
        OR (uv.review_status = 'new' AND uv.next_review_at IS NULL)  -- New items
      )
    ORDER BY
      CASE
        WHEN uv.next_review_at < NOW() THEN 0        -- Overdue first
        WHEN DATE(uv.next_review_at) = CURDATE() THEN 1  -- Due today
        ELSE 2                                        -- New items last
      END,
      uv.next_review_at ASC
    LIMIT 50
  `, [userId]);

  // Clear existing queue for today and rebuild
  await pool.execute(`DELETE FROM daily_review_queue_v3 WHERE user_id = ? AND queue_date = ?`, [userId, today]);

  // Insert items into queue
  for (let i = 0; i < dueItems.length; i++) {
    await pool.execute(`
      INSERT INTO daily_review_queue_v3 (user_id, user_vocabulary_id, queue_date, priority, queue_order)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, dueItems[i].id, today, dueItems[i].priority, i + 1]);
  }

  return {
    total: dueItems.length,
    overdue: dueItems.filter(i => i.priority === 'overdue').length,
    due: dueItems.filter(i => i.priority === 'due').length,
    new: dueItems.filter(i => i.priority === 'new').length,
    wordMapItems: dueItems.filter(i => i.source_type === 'word_map').length,
    conversationItems: dueItems.filter(i => i.source_type === 'conversation').length
  };
}
```

#### 17.5.2 Games Vocabulary Pool Integration

**Requirements:**
- Word Map vocabulary được đưa vào games vocabulary pool
- User chỉ thấy vocabulary đã mở khóa (từ lessons đã unlock/complete)
- Có thể filter games theo source type

**File: `packages/backend/src/services/game.service.ts`** (modify)

```typescript
interface GameVocabularyOptions {
  userId: number;
  gameType: GameType;
  limit: number;
  sourceType?: 'all' | 'word_map' | 'conversation';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  mapId?: number;  // Filter by specific Word Map
}

async getGameVocabulary(options: GameVocabularyOptions): Promise<GameVocabulary[]> {
  const { userId, limit, sourceType = 'all', difficulty, mapId } = options;

  let whereConditions = ['uv.user_id = ?'];
  const params: (string | number)[] = [userId];

  // Source filter
  if (sourceType === 'word_map') {
    whereConditions.push('uv.source_type = ?');
    params.push('word_map');

    if (mapId) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          JOIN map_units mu ON ul.unit_id = mu.id
          WHERE lc.content_type = 'vocabulary'
            AND lc.master_vocabulary_id = mv.id
            AND mu.map_id = ?
        )
      `);
      params.push(mapId);
    }
  } else if (sourceType === 'conversation') {
    whereConditions.push('uv.source_type = ?');
    params.push('conversation');
  }

  // Difficulty filter
  if (difficulty) {
    whereConditions.push('mv.difficulty_level = ?');
    params.push(difficulty);
  }

  // Query vocabulary with full data for games
  const query = `
    SELECT
      mv.id as master_id,
      mv.english_word,
      mv.vietnamese_word,
      mv.phonetic,
      mv.pronunciation_uk,
      mv.part_of_speech,
      mv.definitions,
      mv.synonyms,
      mv.antonyms,
      mv.cefr_level,
      uv.mastery_level,
      uv.times_practiced,
      uv.source_type
    FROM user_vocabulary uv
    JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY
      -- Prioritize less practiced words
      uv.times_practiced ASC,
      -- Then by mastery (lower mastery = higher priority)
      uv.mastery_level ASC,
      RAND()
    LIMIT ?
  `;

  params.push(limit);

  const [rows] = await pool.execute<GameVocabularyRow[]>(query, params);

  return rows.map(this.mapGameVocabularyRow);
}
```

#### 17.5.3 Frontend Game Component Changes

**File: `packages/frontend/src/app/features/games/game-selector.component.ts`** (add source filter)

```typescript
// Source type selection
sourceType = signal<'all' | 'word_map' | 'conversation'>('all');

// Word Map selection (for word_map source)
selectedMapId = signal<number | null>(null);
availableMaps = signal<WordMapOption[]>([]);

ngOnInit() {
  this.loadAvailableMaps();
}

loadAvailableMaps() {
  // Get Word Maps that user has vocabulary from
  this.apiService.get<WordMapOption[]>('/v3/user/vocabulary/available-maps')
    .subscribe(maps => this.availableMaps.set(maps));
}

startGame(gameType: GameType) {
  const params: any = {
    sourceType: this.sourceType(),
    limit: this.getVocabLimitForGame(gameType)
  };

  if (this.sourceType() === 'word_map' && this.selectedMapId()) {
    params.mapId = this.selectedMapId();
  }

  this.router.navigate(['/games', gameType], { queryParams: params });
}
```

**Template update:**

```html
<!-- Game source selection -->
<div class="mb-6 p-4 bg-gray-50 rounded-lg">
  <h3 class="font-semibold text-gray-900 mb-3">Vocabulary Source</h3>

  <div class="flex flex-wrap gap-4 mb-4">
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="gameSource"
        value="all"
        [checked]="sourceType() === 'all'"
        (change)="sourceType.set('all')"
        class="w-4 h-4"
      >
      <span>All Vocabulary</span>
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="gameSource"
        value="word_map"
        [checked]="sourceType() === 'word_map'"
        (change)="sourceType.set('word_map')"
        class="w-4 h-4"
      >
      <span>Word Map Only</span>
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="gameSource"
        value="conversation"
        [checked]="sourceType() === 'conversation'"
        (change)="sourceType.set('conversation')"
        class="w-4 h-4"
      >
      <span>Conversations Only</span>
    </label>
  </div>

  <!-- Word Map selector (visible when word_map selected) -->
  @if (sourceType() === 'word_map' && availableMaps().length > 0) {
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Select Word Map</label>
      <select
        [value]="selectedMapId() ?? ''"
        (change)="selectedMapId.set($event.target.value ? +$event.target.value : null)"
        class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">All Word Maps</option>
        @for (map of availableMaps(); track map.id) {
          <option [value]="map.id">{{ map.name }} ({{ map.vocabularyCount }} words)</option>
        }
      </select>
    </div>
  }
</div>
```

---

### 17.6 Implementation Checklist

#### Phase 1: XP & Pet Stats (Priority: High) 🔄 PARTIAL
- [x] Update `user-progress.service.ts` - add XP awards for lesson/exam completion ✅
- [ ] Update `pet.service.ts` - add activity recording for Word Map learning ⏳
- [ ] Add pet daily tasks for Word Map ⏳
- [ ] Test XP accumulation across activities ⏳

#### Phase 2: Achievements (Priority: High) ⏳ PENDING
- [ ] Create SQL migration for Word Map achievements
- [ ] Implement `word-map-achievements.service.ts`
- [ ] Integrate achievement checks in lesson/exam completion
- [ ] Add achievement display in Word Map detail page
- [ ] Test all achievement triggers

#### Phase 3: Vocabulary Page Filters (Priority: Medium) ⏳ PENDING
- [ ] Backend: Add filter endpoints to vocabulary routes
- [ ] Backend: Implement `getUserVocabularyFiltered()` method
- [ ] Backend: Implement `getAvailableFilters()` method
- [ ] Frontend: Add filter UI to vocabulary-list component
- [ ] Frontend: Handle cascading filter changes (Map → Unit → Lesson)
- [ ] Test filter combinations

#### Phase 4: Games & Daily Review Integration (Priority: Medium) ⏳ PENDING
- [ ] Backend: Update daily review queue to include Word Map vocabulary
- [ ] Backend: Update game vocabulary service to support source filtering
- [ ] Frontend: Add source filter to game selector
- [ ] Frontend: Display source info in game UI
- [ ] Test gameplay with Word Map vocabulary

---

## Implementation Summary

| Category | Status | Completion |
|----------|--------|------------|
| Database Migrations | ✅ DONE | 100% |
| Backend Services (V3) | ✅ DONE | 100% |
| Backend Routes (V3) | ✅ DONE | 100% |
| Frontend Components | ✅ DONE | 100% |
| Shared Types | ✅ DONE | 100% |
| Feature Flags | ✅ DONE | 100% |
| MCP Tools (V3) | ✅ DONE | 100% |
| Content Import (Evolve 1) | 🔄 PARTIAL | 20% |
| Study Content UI (Audio/Video/Image) | ⏳ PENDING | 0% |
| Word Map Achievements | ⏳ PENDING | 0% |
| Pet System Integration | ⏳ PENDING | 0% |
| Vocabulary Page Filters | ⏳ PENDING | 0% |
| Games Integration | ⏳ PENDING | 0% |

---

**Document Version**: 1.4
**Updated**: 2026-01-12
**Author**: Claude (AI Assistant)
**Status**: Core V3 architecture COMPLETE. Pending: Content import, Study UI components, Gamification integration
