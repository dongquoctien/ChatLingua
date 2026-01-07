-- Migration: Add weekly stock system for pet items
-- Creates server-wide limited stock that resets weekly

-- Add stock columns to pet_items
ALTER TABLE pet_items
ADD COLUMN weekly_stock INT DEFAULT NULL COMMENT 'Max items available per week (NULL = unlimited)',
ADD COLUMN current_stock INT DEFAULT NULL COMMENT 'Current remaining stock this week',
ADD COLUMN stock_reset_at TIMESTAMP NULL COMMENT 'When stock was last reset';

-- Set initial weekly stock limits based on rarity
-- Common items: unlimited (NULL)
-- Uncommon items: 100/week
-- Rare items: 50/week
-- Epic items: 20/week
-- Legendary items: 10/week

UPDATE pet_items SET weekly_stock = NULL, current_stock = NULL WHERE rarity = 'common';
UPDATE pet_items SET weekly_stock = 100, current_stock = 100, stock_reset_at = NOW() WHERE rarity = 'uncommon';
UPDATE pet_items SET weekly_stock = 50, current_stock = 50, stock_reset_at = NOW() WHERE rarity = 'rare';
UPDATE pet_items SET weekly_stock = 20, current_stock = 20, stock_reset_at = NOW() WHERE rarity = 'epic';
UPDATE pet_items SET weekly_stock = 10, current_stock = 10, stock_reset_at = NOW() WHERE rarity = 'legendary';

-- Special items have even more limited stock
UPDATE pet_items SET weekly_stock = 5, current_stock = 5, stock_reset_at = NOW() WHERE item_category = 'special';

-- Create purchase log table to track who bought what (for analytics)
CREATE TABLE IF NOT EXISTS pet_item_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_coins INT NOT NULL DEFAULT 0,
    price_gems INT NOT NULL DEFAULT 0,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES pet_items(id) ON DELETE CASCADE,
    INDEX idx_user_purchases (user_id, purchased_at),
    INDEX idx_item_purchases (item_id, purchased_at)
);

-- Create scheduled event to reset stock weekly (every Monday at 00:00 UTC)
-- Note: Requires EVENT scheduler to be enabled: SET GLOBAL event_scheduler = ON;
DROP EVENT IF EXISTS reset_pet_item_stock_weekly;
CREATE EVENT reset_pet_item_stock_weekly
ON SCHEDULE EVERY 1 WEEK
STARTS (SELECT DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY))
DO
  UPDATE pet_items
  SET current_stock = weekly_stock, stock_reset_at = NOW()
  WHERE weekly_stock IS NOT NULL;

-- Stored procedure to reset stock manually (admin use)
DROP PROCEDURE IF EXISTS sp_reset_pet_item_stock;
DELIMITER //
CREATE PROCEDURE sp_reset_pet_item_stock()
BEGIN
    UPDATE pet_items
    SET current_stock = weekly_stock, stock_reset_at = NOW()
    WHERE weekly_stock IS NOT NULL;

    SELECT CONCAT('Reset stock for ', ROW_COUNT(), ' items') AS result;
END //
DELIMITER ;
