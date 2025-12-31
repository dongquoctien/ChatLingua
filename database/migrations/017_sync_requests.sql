-- Migration: Sync Requests Feature
-- Allows users without MCP to request conversation sync from MCP helpers
-- Created: 2024-12-31

-- ============================================================
-- Step 1: Create sync_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Requester info
  requester_user_id INT NOT NULL,

  -- Request content
  vietnamese_text TEXT NOT NULL,
  english_translation TEXT NULL COMMENT 'Optional: user can provide translation',
  topic VARCHAR(100) NULL COMMENT 'Suggested topic',
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') NULL,
  notes TEXT NULL COMMENT 'Additional notes from requester',

  -- Request status
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',

  -- Sync result
  syncer_user_id INT NULL COMMENT 'User who performed the sync',
  conversation_id INT NULL COMMENT 'Resulting conversation after sync',
  sync_started_at TIMESTAMP NULL,
  sync_completed_at TIMESTAMP NULL,
  sync_notes TEXT NULL COMMENT 'Notes from syncer',

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (syncer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,

  -- Indexes
  INDEX idx_status (status),
  INDEX idx_requester (requester_user_id),
  INDEX idx_syncer (syncer_user_id),
  INDEX idx_created (created_at),
  INDEX idx_priority_status (priority, status, created_at)
);

-- ============================================================
-- Step 2: Update notification_queue ENUM
-- ============================================================
-- Note: MySQL requires recreating the ENUM to add new values
-- We'll use ALTER TABLE MODIFY to add new notification types

ALTER TABLE notification_queue
MODIFY COLUMN notification_type ENUM(
  'achievement',
  'level_up',
  'challenge',
  'streak',
  'leaderboard',
  'sync_completed',
  'sync_started',
  'new_sync_request'
) NOT NULL;

-- ============================================================
-- Step 3: Add helper role to users (optional enhancement)
-- ============================================================
-- For now, any authenticated user can be a helper
-- Future: uncomment to add role-based access
-- ALTER TABLE users ADD COLUMN is_helper BOOLEAN DEFAULT FALSE;
-- ALTER TABLE users ADD COLUMN helper_sync_count INT DEFAULT 0;

-- ============================================================
-- Step 4: Create sync_request_stats view for quick stats
-- ============================================================
CREATE OR REPLACE VIEW sync_request_stats_view AS
SELECT
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as total_in_progress,
  COUNT(CASE WHEN status = 'completed' AND DATE(sync_completed_at) = CURDATE() THEN 1 END) as completed_today,
  COUNT(CASE WHEN status = 'completed' AND sync_completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as completed_this_week,
  COUNT(*) as total_requests
FROM sync_requests;
