-- Migration: 013_chat_system.sql
-- Description: Real-time chat system for ChatLingua

-- =====================================================
-- USER STATUS (extended from users table)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_status (
  user_id INT PRIMARY KEY,

  -- Online status
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP NULL,

  -- Custom status
  status_type ENUM(
    'online',
    'offline',
    'away',
    'busy',
    'playing_game',
    'studying',
    'do_not_disturb',
    'invisible'
  ) DEFAULT 'offline',

  status_text VARCHAR(100) NULL,            -- Custom status message

  -- Activity context
  current_activity ENUM(
    'none',
    'playing_word_scramble',
    'playing_memory_match',
    'playing_speed_challenge',
    'playing_hangman',
    'doing_exercises',
    'reviewing_vocabulary',
    'learning_grammar',
    'taking_quiz'
  ) DEFAULT 'none',

  activity_metadata JSON NULL,              -- Game name, exercise type, etc.

  -- Settings
  show_online_status BOOLEAN DEFAULT TRUE,  -- Privacy setting
  allow_messages_from ENUM('everyone', 'friends_only', 'nobody') DEFAULT 'everyone',

  -- Socket connection
  socket_id VARCHAR(100) NULL,              -- Current socket connection ID
  connected_at TIMESTAMP NULL,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- CHAT CONVERSATIONS (1-1 chat rooms)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Participants (always 2 for 1-1 chat)
  participant1_id INT NOT NULL,
  participant2_id INT NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Last message for preview
  last_message_id INT NULL,
  last_message_at TIMESTAMP NULL,

  -- Foreign keys
  FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Ensure unique conversation between 2 users (lower ID first)
  UNIQUE KEY unique_conversation (participant1_id, participant2_id),

  -- Indexes
  INDEX idx_participant1 (participant1_id),
  INDEX idx_participant2 (participant2_id),
  INDEX idx_last_message (last_message_at DESC)
);

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,

  -- Message content
  message_type ENUM(
    'text',           -- Plain text
    'achievement',    -- Shared achievement
    'exercise',       -- Shared exercise result
    'game',           -- Shared game result
    'vocabulary',     -- Shared vocabulary
    'image',          -- Image attachment
    'link'            -- URL with preview
  ) DEFAULT 'text',

  content TEXT NOT NULL,                    -- Text content or JSON for special types
  metadata JSON NULL,                       -- Additional data for special message types

  -- Status
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP NULL,

  -- Foreign keys
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_conversation (conversation_id, created_at DESC),
  INDEX idx_sender (sender_id)
);

-- =====================================================
-- MESSAGE READ STATUS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_read (message_id, user_id)
);

-- =====================================================
-- BLOCKED USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  blocker_id INT NOT NULL,                  -- User who blocks
  blocked_id INT NOT NULL,                  -- User being blocked

  reason VARCHAR(255) NULL,                 -- Optional reason
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_block (blocker_id, blocked_id),
  INDEX idx_blocker (blocker_id),
  INDEX idx_blocked (blocked_id)
);

-- =====================================================
-- CONVERSATION SETTINGS (per user per conversation)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_conversation_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,

  -- Notification settings
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP NULL,               -- NULL = muted forever

  -- UI settings
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Customization
  nickname VARCHAR(50) NULL,                -- Nickname for the other person

  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_setting (conversation_id, user_id)
);

-- =====================================================
-- SHARED CONTENT TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_shared_content (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,

  -- Content reference
  content_type ENUM('achievement', 'exercise', 'game', 'vocabulary', 'quiz') NOT NULL,
  content_id INT NOT NULL,                  -- ID of the shared item

  -- Snapshot of shared data (in case original is deleted)
  snapshot JSON NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,

  INDEX idx_content (content_type, content_id)
);

-- =====================================================
-- ADD FOREIGN KEY FOR LAST MESSAGE
-- =====================================================
ALTER TABLE chat_conversations
ADD CONSTRAINT fk_last_message
FOREIGN KEY (last_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- =====================================================
-- INITIAL DATA: Create user_status for existing users
-- =====================================================
INSERT INTO user_status (user_id, status_type, is_online)
SELECT id, 'offline', FALSE FROM users
ON DUPLICATE KEY UPDATE user_id = user_id;

-- =====================================================
-- NOTE: Trigger removed - user_status creation is handled
-- in StatusService.getUserStatus() with INSERT ON DUPLICATE KEY
-- =====================================================
