-- Migration: 014_chat_shared_imports.sql
-- Description: Add conversation sharing via chat feature

-- =====================================================
-- UPDATE MESSAGE TYPE ENUM
-- =====================================================
ALTER TABLE chat_messages
MODIFY COLUMN message_type ENUM(
  'text',
  'achievement',
  'exercise',
  'game',
  'vocabulary',
  'image',
  'link',
  'shared_conversation'
) DEFAULT 'text';

-- =====================================================
-- SHARED CONVERSATION IMPORTS TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_shared_imports (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Link to chat message
  message_id INT NOT NULL,

  -- Who imported
  recipient_id INT NOT NULL,

  -- Source conversation (from sharer)
  source_conversation_id INT NULL,

  -- Created conversation (for recipient)
  created_conversation_id INT NULL,

  -- What was imported
  imported_vocabulary BOOLEAN DEFAULT TRUE,
  imported_grammar BOOLEAN DEFAULT TRUE,
  imported_exercises BOOLEAN DEFAULT FALSE,

  -- Import stats
  vocabulary_imported INT DEFAULT 0,
  vocabulary_skipped INT DEFAULT 0,
  grammar_imported INT DEFAULT 0,
  grammar_skipped INT DEFAULT 0,
  exercises_imported INT DEFAULT 0,

  -- Timestamps
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (created_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,

  -- Each recipient can only import a shared message once
  UNIQUE KEY unique_import (message_id, recipient_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_shared_imports_recipient ON chat_shared_imports(recipient_id);
CREATE INDEX idx_shared_imports_message ON chat_shared_imports(message_id);
CREATE INDEX idx_shared_imports_source ON chat_shared_imports(source_conversation_id);
