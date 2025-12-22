-- Exercise Sessions Migration
-- Adds support for batch exercise practice with history tracking

-- Exercise sessions table (tracks each practice session)
CREATE TABLE IF NOT EXISTS exercise_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    total_time_seconds INT DEFAULT 0,
    score_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    exercise_types JSON COMMENT 'List of exercise types included in this session',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_completed (user_id, completed_at DESC)
);

-- Exercise session answers table (stores each answer for review)
CREATE TABLE IF NOT EXISTS exercise_session_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    question_order INT NOT NULL COMMENT 'Order of question in the session (1, 2, 3...)',
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT NULL,
    time_spent_seconds INT DEFAULT 0,
    answered_at TIMESTAMP NULL,

    FOREIGN KEY (session_id) REFERENCES exercise_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_exercise (session_id, exercise_id),
    INDEX idx_session_order (session_id, question_order)
);

-- Add correct_answers column to daily_activity_log if not exists
-- This tracks correct answers per day for statistics
ALTER TABLE daily_activity_log
ADD COLUMN IF NOT EXISTS correct_answers INT DEFAULT 0 AFTER exercises_completed;

-- Add total_correct_answers to user_statistics if not exists
ALTER TABLE user_statistics
ADD COLUMN IF NOT EXISTS total_correct_answers INT DEFAULT 0 AFTER total_exercises_completed;
