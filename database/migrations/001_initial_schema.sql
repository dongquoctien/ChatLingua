-- ChatLingua Database Schema
-- Run this migration to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vietnamese_text TEXT NOT NULL,
    english_translation TEXT,
    ai_analysis JSON,
    topic VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
);

-- Vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    vietnamese_word VARCHAR(255) NOT NULL,
    english_word VARCHAR(255) NOT NULL,
    phonetic VARCHAR(100),
    part_of_speech ENUM('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase') NOT NULL,
    example_sentence_vi TEXT,
    example_sentence_en TEXT,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    mastery_level INT DEFAULT 0,
    times_practiced INT DEFAULT 0,
    last_practiced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_vocab (user_id),
    INDEX idx_conversation_vocab (conversation_id)
);

-- Grammar points table
CREATE TABLE IF NOT EXISTS grammar_points (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    grammar_rule VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    example_vi TEXT,
    example_en TEXT,
    category VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    times_practiced INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_grammar (user_id)
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT,
    user_id INT NOT NULL,
    exercise_type ENUM('multiple_choice', 'fill_blank', 'translation') NOT NULL,
    question TEXT NOT NULL,
    options JSON,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    related_vocabulary_ids JSON,
    related_grammar_ids JSON,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    is_combined BOOLEAN DEFAULT FALSE,
    source_conversation_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, exercise_type)
);

-- Exercise attempts table
CREATE TABLE IF NOT EXISTS exercise_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exercise_id INT NOT NULL,
    user_id INT NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_exercise (user_id, exercise_id)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exercise_ids JSON NOT NULL,
    time_limit_seconds INT,
    max_attempts INT DEFAULT 3,
    passing_score INT DEFAULT 70,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_quiz (user_id)
);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    attempt_number INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    time_taken_seconds INT NOT NULL,
    answers JSON NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    is_passed BOOLEAN NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_quiz_attempt (user_id, quiz_id),
    INDEX idx_completed (completed_at)
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_conversations INT DEFAULT 0,
    total_vocabulary_learned INT DEFAULT 0,
    total_grammar_points INT DEFAULT 0,
    total_exercises_completed INT DEFAULT 0,
    total_quizzes_taken INT DEFAULT 0,
    average_quiz_score DECIMAL(5,2) DEFAULT 0,
    best_quiz_score DECIMAL(5,2) DEFAULT 0,
    fastest_quiz_time_seconds INT,
    current_streak_days INT DEFAULT 0,
    longest_streak_days INT DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily activity log
CREATE TABLE IF NOT EXISTS daily_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_date DATE NOT NULL,
    conversations_count INT DEFAULT 0,
    vocabulary_added INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    quizzes_taken INT DEFAULT 0,
    study_time_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, activity_date),
    INDEX idx_user_date (user_id, activity_date)
);

-- Insert default user for MCP testing
INSERT INTO users (id, username, password_hash, display_name)
VALUES (1, 'default', '$2a$12$placeholder', 'Default User')
ON DUPLICATE KEY UPDATE username = 'default';

-- Initialize statistics for default user
INSERT INTO user_statistics (user_id)
VALUES (1)
ON DUPLICATE KEY UPDATE user_id = 1;
