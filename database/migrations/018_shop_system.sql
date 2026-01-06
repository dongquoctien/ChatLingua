-- Migration: Shop & Customization System
-- Allows users to purchase cosmetic items with earned coins
-- Created: 2025-01-04

-- ============================================================
-- Step 1: Create shop_categories table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(500) NULL,
  icon VARCHAR(50) NULL,

  parent_id INT NULL,
  sort_order INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_id) REFERENCES shop_categories(id) ON DELETE SET NULL,

  INDEX idx_parent (parent_id),
  INDEX idx_sort (sort_order),
  INDEX idx_slug (slug)
);

-- ============================================================
-- Step 2: Create shop_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_items (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Basic info
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NULL,

  -- Category
  category_id INT NOT NULL,

  -- Item type
  item_type ENUM(
    'avatar_frame',
    'avatar_effect',
    'avatar_badge',
    'profile_theme',
    'profile_banner',
    'name_effect',
    'chat_bubble',
    'emoji_pack',
    'sticker_pack',
    'game_theme',
    'card_back',
    'sound_pack',
    'booster',
    'title',
    'pet'
  ) NOT NULL,

  -- Pricing
  price_coins INT NOT NULL DEFAULT 0,
  price_gems INT DEFAULT 0,
  original_price INT NULL,

  -- Rarity
  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  is_limited BOOLEAN DEFAULT FALSE,
  limited_quantity INT NULL,
  sold_count INT DEFAULT 0,

  -- Time-limited
  available_from TIMESTAMP NULL,
  available_until TIMESTAMP NULL,

  -- Requirements
  required_level INT DEFAULT 0,
  required_achievement VARCHAR(50) NULL,

  -- Asset data
  asset_url VARCHAR(500) NULL,
  preview_url VARCHAR(500) NULL,
  asset_data JSON NULL,

  -- Consumable items
  is_consumable BOOLEAN DEFAULT FALSE,
  effect_duration_minutes INT NULL,

  -- Stats
  purchase_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES shop_categories(id) ON DELETE CASCADE,

  INDEX idx_category (category_id),
  INDEX idx_type (item_type),
  INDEX idx_rarity (rarity),
  INDEX idx_price (price_coins),
  INDEX idx_available (is_available, available_from, available_until),
  INDEX idx_slug (slug)
);

-- ============================================================
-- Step 3: Create user_currency table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_currency (
  user_id INT PRIMARY KEY,

  coins INT DEFAULT 0,
  gems INT DEFAULT 0,

  total_coins_earned INT DEFAULT 0,
  total_coins_spent INT DEFAULT 0,
  total_gems_earned INT DEFAULT 0,
  total_gems_spent INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Step 4: Create currency_transactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS currency_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,

  currency_type ENUM('coins', 'gems') NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,

  transaction_type ENUM(
    'game_reward',
    'daily_bonus',
    'achievement',
    'quest',
    'purchase',
    'gift_sent',
    'gift_received',
    'refund',
    'admin_grant'
  ) NOT NULL,

  reference_type VARCHAR(50) NULL,
  reference_id INT NULL,

  description VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_type (transaction_type)
);

-- ============================================================
-- Step 5: Create user_inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  item_id INT NOT NULL,

  quantity INT DEFAULT 1,

  is_equipped BOOLEAN DEFAULT FALSE,

  activated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,

  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  purchase_price INT NOT NULL,
  gifted_by INT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  FOREIGN KEY (gifted_by) REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE KEY unique_user_item (user_id, item_id),
  INDEX idx_user (user_id),
  INDEX idx_equipped (user_id, is_equipped),
  INDEX idx_expires (expires_at)
);

-- ============================================================
-- Step 6: Create user_equipped_items table (quick lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_equipped_items (
  user_id INT PRIMARY KEY,

  avatar_frame_id INT NULL,
  avatar_effect_id INT NULL,
  avatar_badge_id INT NULL,
  profile_theme_id INT NULL,
  profile_banner_id INT NULL,
  name_effect_id INT NULL,
  chat_bubble_id INT NULL,
  title_id INT NULL,
  pet_id INT NULL,
  game_theme_id INT NULL,
  card_back_id INT NULL,
  sound_pack_id INT NULL,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (avatar_frame_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (avatar_effect_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (avatar_badge_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (profile_theme_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (profile_banner_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (name_effect_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (chat_bubble_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (title_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (pet_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (game_theme_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (card_back_id) REFERENCES shop_items(id) ON DELETE SET NULL,
  FOREIGN KEY (sound_pack_id) REFERENCES shop_items(id) ON DELETE SET NULL
);

-- ============================================================
-- Step 7: Create shop_purchases table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  item_id INT NOT NULL,

  quantity INT DEFAULT 1,
  unit_price INT NOT NULL,
  total_price INT NOT NULL,
  currency_type ENUM('coins', 'gems') DEFAULT 'coins',

  discount_percent INT DEFAULT 0,
  original_total INT NULL,

  is_gift BOOLEAN DEFAULT FALSE,
  gift_recipient_id INT NULL,
  gift_message VARCHAR(500) NULL,

  status ENUM('completed', 'refunded', 'pending') DEFAULT 'completed',
  refunded_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  FOREIGN KEY (gift_recipient_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_item (item_id)
);

-- ============================================================
-- Step 8: Create shop_daily_deals table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_daily_deals (
  id INT PRIMARY KEY AUTO_INCREMENT,

  item_id INT NOT NULL,

  discount_percent INT NOT NULL,
  deal_price INT NOT NULL,

  deal_date DATE NOT NULL,
  slot_number INT NOT NULL,

  max_purchases INT DEFAULT 1,
  total_limit INT NULL,

  purchases_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,

  UNIQUE KEY unique_deal (deal_date, slot_number),
  INDEX idx_date (deal_date)
);

-- ============================================================
-- Step 9: Create shop_gifts table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_gifts (
  id INT PRIMARY KEY AUTO_INCREMENT,

  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  item_id INT NOT NULL,

  message VARCHAR(500) NULL,

  status ENUM('pending', 'claimed', 'expired', 'returned') DEFAULT 'pending',

  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,

  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,

  INDEX idx_recipient (recipient_id, status),
  INDEX idx_sender (sender_id),
  INDEX idx_expires (expires_at)
);

-- ============================================================
-- Step 10: Create shop_wishlists table
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_wishlists (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  item_id INT NOT NULL,

  notify_on_sale BOOLEAN DEFAULT TRUE,

  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,

  UNIQUE KEY unique_wishlist (user_id, item_id),
  INDEX idx_user (user_id)
);

-- ============================================================
-- Step 11: Create shop_bundles tables
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_bundles (
  id INT PRIMARY KEY AUTO_INCREMENT,

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NULL,

  price_coins INT NOT NULL,
  original_price INT NOT NULL,
  discount_percent INT NOT NULL,

  is_available BOOLEAN DEFAULT TRUE,
  available_from TIMESTAMP NULL,
  available_until TIMESTAMP NULL,

  preview_url VARCHAR(500) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_available (is_available)
);

CREATE TABLE IF NOT EXISTS shop_bundle_items (
  bundle_id INT NOT NULL,
  item_id INT NOT NULL,

  PRIMARY KEY (bundle_id, item_id),

  FOREIGN KEY (bundle_id) REFERENCES shop_bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

-- ============================================================
-- Step 12: Insert initial categories
-- ============================================================
INSERT INTO shop_categories (name, slug, description, icon, sort_order) VALUES
('Avatar', 'avatar', 'Customize your avatar', 'fa-user-circle', 1),
('Profile', 'profile', 'Personalize your profile', 'fa-id-card', 2),
('Chat', 'chat', 'Chat customization', 'fa-comments', 3),
('Games', 'games', 'Game themes and styles', 'fa-gamepad', 4),
('Boosters', 'boosters', 'Power-ups and boosters', 'fa-bolt', 5),
('Special', 'special', 'Special items', 'fa-star', 6);

-- Sub-categories
INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Frames', 'avatar-frames', 'Avatar frames and borders', 'fa-square', id, 1 FROM shop_categories WHERE slug = 'avatar';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Effects', 'avatar-effects', 'Avatar visual effects', 'fa-magic', id, 2 FROM shop_categories WHERE slug = 'avatar';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Badges', 'avatar-badges', 'Displayable badges', 'fa-certificate', id, 3 FROM shop_categories WHERE slug = 'avatar';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Themes', 'profile-themes', 'Profile color themes', 'fa-palette', id, 1 FROM shop_categories WHERE slug = 'profile';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Banners', 'profile-banners', 'Profile banners', 'fa-image', id, 2 FROM shop_categories WHERE slug = 'profile';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Titles', 'titles', 'Display titles', 'fa-tag', id, 3 FROM shop_categories WHERE slug = 'profile';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Pets', 'pets', 'Companion pets', 'fa-paw', id, 4 FROM shop_categories WHERE slug = 'profile';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Chat Bubbles', 'chat-bubbles', 'Chat bubble styles', 'fa-comment', id, 1 FROM shop_categories WHERE slug = 'chat';

INSERT INTO shop_categories (name, slug, description, icon, parent_id, sort_order)
SELECT 'Sticker Packs', 'sticker-packs', 'Sticker packs', 'fa-smile', id, 2 FROM shop_categories WHERE slug = 'chat';

-- ============================================================
-- Step 13: Insert sample items
-- ============================================================

-- Avatar Frames
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Basic Silver', 'basic-silver-frame', 'Simple silver border', id, 'avatar_frame', 100, 'common', '/assets/shop/frames/silver.png', '/assets/shop/frames/silver-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Basic Gold', 'basic-gold-frame', 'Simple gold border', id, 'avatar_frame', 200, 'common', '/assets/shop/frames/gold.png', '/assets/shop/frames/gold-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Gradient Blue', 'gradient-blue-frame', 'Blue gradient effect', id, 'avatar_frame', 500, 'uncommon', '/assets/shop/frames/gradient-blue.png', '/assets/shop/frames/gradient-blue-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Neon Glow', 'neon-glow-frame', 'Animated neon effect', id, 'avatar_frame', 1000, 'rare', '/assets/shop/frames/neon.png', '/assets/shop/frames/neon-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Diamond', 'diamond-frame', 'Sparkling diamond border', id, 'avatar_frame', 3000, 'epic', '/assets/shop/frames/diamond.png', '/assets/shop/frames/diamond-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Holographic', 'holographic-frame', 'Holographic shifting effect', id, 'avatar_frame', 10000, 'legendary', '/assets/shop/frames/holographic.png', '/assets/shop/frames/holographic-preview.png'
FROM shop_categories WHERE slug = 'avatar-frames';

-- Avatar Effects
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Sparkle', 'sparkle-effect', 'Subtle sparkle particles', id, 'avatar_effect', 300, 'common', '/assets/shop/effects/sparkle.json', '/assets/shop/effects/sparkle-preview.png'
FROM shop_categories WHERE slug = 'avatar-effects';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Hearts', 'hearts-effect', 'Floating hearts', id, 'avatar_effect', 300, 'common', '/assets/shop/effects/hearts.json', '/assets/shop/effects/hearts-preview.png'
FROM shop_categories WHERE slug = 'avatar-effects';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Fire Aura', 'fire-aura-effect', 'Fire particles around avatar', id, 'avatar_effect', 1200, 'rare', '/assets/shop/effects/fire.json', '/assets/shop/effects/fire-preview.png'
FROM shop_categories WHERE slug = 'avatar-effects';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Galaxy', 'galaxy-effect', 'Space/galaxy particles', id, 'avatar_effect', 4000, 'epic', '/assets/shop/effects/galaxy.json', '/assets/shop/effects/galaxy-preview.png'
FROM shop_categories WHERE slug = 'avatar-effects';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Dragon', 'dragon-effect', 'Dragon aura effect', id, 'avatar_effect', 10000, 'legendary', '/assets/shop/effects/dragon.json', '/assets/shop/effects/dragon-preview.png'
FROM shop_categories WHERE slug = 'avatar-effects';

-- Avatar Badges
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url)
SELECT 'Flame Badge', 'flame-badge', 'Fire emoji badge', id, 'avatar_badge', 200, 'common', '/assets/shop/badges/flame.png'
FROM shop_categories WHERE slug = 'avatar-badges';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url)
SELECT 'Star Badge', 'star-badge', 'Star emoji badge', id, 'avatar_badge', 200, 'common', '/assets/shop/badges/star.png'
FROM shop_categories WHERE slug = 'avatar-badges';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url)
SELECT 'Crown Badge', 'crown-badge', 'Crown badge', id, 'avatar_badge', 500, 'uncommon', '/assets/shop/badges/crown.png'
FROM shop_categories WHERE slug = 'avatar-badges';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url)
SELECT 'Diamond Badge', 'diamond-badge', 'Diamond badge', id, 'avatar_badge', 1000, 'rare', '/assets/shop/badges/diamond.png'
FROM shop_categories WHERE slug = 'avatar-badges';

-- Profile Themes
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Ocean Blue', 'ocean-blue-theme', 'Blue color scheme', id, 'profile_theme', 500, 'common',
  '{"primary": "#0077b6", "secondary": "#90e0ef", "background": "#caf0f8"}'
FROM shop_categories WHERE slug = 'profile-themes';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Forest Green', 'forest-green-theme', 'Green nature theme', id, 'profile_theme', 500, 'common',
  '{"primary": "#2d6a4f", "secondary": "#95d5b2", "background": "#d8f3dc"}'
FROM shop_categories WHERE slug = 'profile-themes';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Purple Galaxy', 'purple-galaxy-theme', 'Space themed', id, 'profile_theme', 1500, 'rare',
  '{"primary": "#7b2cbf", "secondary": "#c77dff", "background": "#10002b"}'
FROM shop_categories WHERE slug = 'profile-themes';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Neon Cyberpunk', 'neon-cyberpunk-theme', 'Cyberpunk style', id, 'profile_theme', 3000, 'epic',
  '{"primary": "#ff00ff", "secondary": "#00ffff", "background": "#0a0a0a"}'
FROM shop_categories WHERE slug = 'profile-themes';

-- Titles
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'The Learner', 'the-learner-title', 'Display title: The Learner', id, 'title', 300, 'common',
  '{"displayText": "The Learner", "color": "#6b7280"}'
FROM shop_categories WHERE slug = 'titles';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Word Master', 'word-master-title', 'Display title: Word Master', id, 'title', 800, 'uncommon',
  '{"displayText": "Word Master", "color": "#059669"}'
FROM shop_categories WHERE slug = 'titles';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Grammar Guru', 'grammar-guru-title', 'Display title: Grammar Guru', id, 'title', 1500, 'rare',
  '{"displayText": "Grammar Guru", "color": "#2563eb"}'
FROM shop_categories WHERE slug = 'titles';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_data)
SELECT 'Legend', 'legend-title', 'Display title: Legend', id, 'title', 10000, 'legendary',
  '{"displayText": "Legend", "color": "#f59e0b", "animated": true}'
FROM shop_categories WHERE slug = 'titles';

-- Pets
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Cat', 'cat-pet', 'Animated cat companion', id, 'pet', 1000, 'common', '/assets/shop/pets/cat.json', '/assets/shop/pets/cat-preview.png'
FROM shop_categories WHERE slug = 'pets';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Dog', 'dog-pet', 'Animated dog companion', id, 'pet', 1000, 'common', '/assets/shop/pets/dog.json', '/assets/shop/pets/dog-preview.png'
FROM shop_categories WHERE slug = 'pets';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, asset_url, preview_url)
SELECT 'Panda', 'panda-pet', 'Animated panda companion', id, 'pet', 1500, 'uncommon', '/assets/shop/pets/panda.json', '/assets/shop/pets/panda-preview.png'
FROM shop_categories WHERE slug = 'pets';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, required_level, asset_url, preview_url)
SELECT 'Owl', 'owl-pet', 'Animated owl companion', id, 'pet', 2500, 'rare', 5, '/assets/shop/pets/owl.json', '/assets/shop/pets/owl-preview.png'
FROM shop_categories WHERE slug = 'pets';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, required_level, required_achievement, asset_url, preview_url)
SELECT 'Dragon', 'dragon-pet', 'Legendary dragon companion - requires Lexicon Legend achievement', id, 'pet', 15000, 'legendary', 10, 'VOCAB_500', '/assets/shop/pets/dragon.json', '/assets/shop/pets/dragon-preview.png'
FROM shop_categories WHERE slug = 'pets';

-- Boosters
INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, is_consumable, effect_duration_minutes, asset_data)
SELECT '2x XP (1 hour)', 'xp-boost-1h', 'Double XP for 1 hour', id, 'booster', 200, 'common', TRUE, 60, '{"multiplier": 2, "type": "xp"}'
FROM shop_categories WHERE slug = 'boosters';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, is_consumable, effect_duration_minutes, asset_data)
SELECT '2x XP (24 hours)', 'xp-boost-24h', 'Double XP for 24 hours', id, 'booster', 1000, 'rare', TRUE, 1440, '{"multiplier": 2, "type": "xp"}'
FROM shop_categories WHERE slug = 'boosters';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, is_consumable, effect_duration_minutes, asset_data)
SELECT '2x Coins (1 hour)', 'coin-boost-1h', 'Double coins for 1 hour', id, 'booster', 200, 'common', TRUE, 60, '{"multiplier": 2, "type": "coins"}'
FROM shop_categories WHERE slug = 'boosters';

INSERT INTO shop_items (name, slug, description, category_id, item_type, price_coins, rarity, is_consumable, asset_data)
SELECT 'Streak Freeze', 'streak-freeze', 'Save your streak for one day', id, 'booster', 500, 'uncommon', TRUE, '{"type": "streak_freeze"}'
FROM shop_categories WHERE slug = 'boosters';

-- ============================================================
-- Step 14: Create trigger to init user currency
-- ============================================================
DROP TRIGGER IF EXISTS after_user_insert_currency;
DELIMITER //
CREATE TRIGGER after_user_insert_currency
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO user_currency (user_id, coins, gems, total_coins_earned)
  VALUES (NEW.id, 100, 0, 100)
  ON DUPLICATE KEY UPDATE user_id = user_id;

  INSERT INTO user_equipped_items (user_id)
  VALUES (NEW.id)
  ON DUPLICATE KEY UPDATE user_id = user_id;

  -- Record welcome bonus transaction
  INSERT INTO currency_transactions (user_id, currency_type, amount, balance_after, transaction_type, description)
  VALUES (NEW.id, 'coins', 100, 100, 'daily_bonus', 'Welcome bonus');
END//
DELIMITER ;

-- ============================================================
-- Step 15: Create trigger to update purchase stats
-- ============================================================
DROP TRIGGER IF EXISTS after_purchase_insert;
DELIMITER //
CREATE TRIGGER after_purchase_insert
AFTER INSERT ON shop_purchases
FOR EACH ROW
BEGIN
  UPDATE shop_items
  SET purchase_count = purchase_count + NEW.quantity,
      sold_count = sold_count + NEW.quantity
  WHERE id = NEW.item_id;
END//
DELIMITER ;

-- ============================================================
-- Step 16: Init currency for existing users
-- ============================================================
INSERT IGNORE INTO user_currency (user_id, coins, gems, total_coins_earned)
SELECT id, 100, 0, 100 FROM users;

INSERT IGNORE INTO user_equipped_items (user_id)
SELECT id FROM users;

-- ============================================================
-- Step 17: Update notification_queue ENUM for shop notifications
-- ============================================================
ALTER TABLE notification_queue
MODIFY COLUMN notification_type ENUM(
  'achievement',
  'level_up',
  'challenge',
  'streak',
  'leaderboard',
  'sync_completed',
  'sync_started',
  'new_sync_request',
  'gift_received',
  'deal_available',
  'item_sale'
) NOT NULL;
