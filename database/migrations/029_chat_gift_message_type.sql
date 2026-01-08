-- Migration: Add 'gift' to chat_messages message_type enum
-- Date: 2026-01-08
-- Description: Adds 'gift' message type to support gift notifications in chat

-- Add 'gift' to message_type enum
ALTER TABLE chat_messages
MODIFY COLUMN message_type ENUM(
  'text',
  'achievement',
  'exercise',
  'game',
  'vocabulary',
  'image',
  'link',
  'shared_conversation',
  'gift'
) DEFAULT 'text';
