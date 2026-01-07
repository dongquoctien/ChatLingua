-- ============================================================
-- Migration 019: Fix currency_transactions table schema
-- ============================================================
-- The currency_transactions table was created in 010_games.sql
-- with a different schema. 018_shop_system.sql tried to create
-- a new version but CREATE TABLE IF NOT EXISTS didn't update it.
-- This migration adds the missing columns.

-- Add balance_after column if not exists
SET @columnExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_transactions'
    AND COLUMN_NAME = 'balance_after'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE currency_transactions ADD COLUMN balance_after INT NOT NULL DEFAULT 0 AFTER amount',
    'SELECT "balance_after column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add transaction_type column if not exists (uses source in old schema)
SET @columnExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_transactions'
    AND COLUMN_NAME = 'transaction_type'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE currency_transactions ADD COLUMN transaction_type VARCHAR(50) NOT NULL DEFAULT "purchase" AFTER balance_after',
    'SELECT "transaction_type column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add reference_type column if not exists
SET @columnExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_transactions'
    AND COLUMN_NAME = 'reference_type'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE currency_transactions ADD COLUMN reference_type VARCHAR(50) NULL AFTER transaction_type',
    'SELECT "reference_type column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add reference_id column if not exists
SET @columnExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_transactions'
    AND COLUMN_NAME = 'reference_id'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE currency_transactions ADD COLUMN reference_id INT NULL AFTER reference_type',
    'SELECT "reference_id column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate data from old 'source' column to new 'transaction_type' if source exists
SET @sourceExists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_transactions'
    AND COLUMN_NAME = 'source'
);

-- If source column exists, migrate data
-- Note: We'll keep both columns for compatibility

SELECT 'Migration 019 completed - currency_transactions table schema fixed' as status;
