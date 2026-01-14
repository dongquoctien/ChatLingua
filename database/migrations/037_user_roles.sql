-- ============================================================
-- Migration 037: Add User Roles
-- Adds role column to users table for admin access control
-- ============================================================

-- Add role column to users table
ALTER TABLE users
ADD COLUMN role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user' AFTER is_active;

-- Create index for role lookups
CREATE INDEX idx_users_role ON users(role);

-- Update any existing admin users (adjust usernames as needed)
-- UPDATE users SET role = 'admin' WHERE username IN ('admin', 'tom');

SELECT 'Migration 037 complete - User roles added' as status;
