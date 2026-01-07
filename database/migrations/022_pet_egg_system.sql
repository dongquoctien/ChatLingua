-- Pet Egg System Migration
-- Converts pet system to use eggs that hatch into pets based on learning XP

-- ========================================
-- Phase 1: Add egg-related columns to pet_types (if they don't exist)
-- ========================================

-- Use procedure to conditionally add columns
DELIMITER //

DROP PROCEDURE IF EXISTS add_pet_egg_columns//

CREATE PROCEDURE add_pet_egg_columns()
BEGIN
  -- Add is_egg column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'is_egg') THEN
    ALTER TABLE pet_types ADD COLUMN is_egg BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add hatch_xp_required column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'hatch_xp_required') THEN
    ALTER TABLE pet_types ADD COLUMN hatch_xp_required INT DEFAULT 0;
  END IF;

  -- Add hatch_hours_min column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'hatch_hours_min') THEN
    ALTER TABLE pet_types ADD COLUMN hatch_hours_min INT DEFAULT 0;
  END IF;

  -- Add image_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'image_url') THEN
    ALTER TABLE pet_types ADD COLUMN image_url VARCHAR(255) NULL;
  END IF;

  -- Add shop_price_coins column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'shop_price_coins') THEN
    ALTER TABLE pet_types ADD COLUMN shop_price_coins INT DEFAULT 0;
  END IF;

  -- Add shop_price_gems column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'shop_price_gems') THEN
    ALTER TABLE pet_types ADD COLUMN shop_price_gems INT DEFAULT 0;
  END IF;

  -- Add acquisition_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_types' AND column_name = 'acquisition_type') THEN
    ALTER TABLE pet_types ADD COLUMN acquisition_type VARCHAR(50) DEFAULT 'egg';
  END IF;

  -- Add is_hatched column to user_pets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_pets' AND column_name = 'is_hatched') THEN
    ALTER TABLE user_pets ADD COLUMN is_hatched BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add hatch_xp_progress column to user_pets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_pets' AND column_name = 'hatch_xp_progress') THEN
    ALTER TABLE user_pets ADD COLUMN hatch_xp_progress INT DEFAULT 0;
  END IF;

  -- Add hatch_started_at column to user_pets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_pets' AND column_name = 'hatch_started_at') THEN
    ALTER TABLE user_pets ADD COLUMN hatch_started_at DATETIME NULL;
  END IF;
END//

DELIMITER ;

CALL add_pet_egg_columns();
DROP PROCEDURE IF EXISTS add_pet_egg_columns;

-- ========================================
-- Phase 3: Create egg hatch pool table
-- ========================================

CREATE TABLE IF NOT EXISTS egg_hatch_pool (
  id INT AUTO_INCREMENT PRIMARY KEY,
  egg_type_id INT NOT NULL,
  pet_type_id INT NOT NULL,
  weight INT DEFAULT 100 COMMENT 'Higher = more common',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (egg_type_id) REFERENCES pet_types(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_type_id) REFERENCES pet_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_egg_pet (egg_type_id, pet_type_id)
);

-- ========================================
-- Phase 4: Clear old pet types and insert new ones
-- ========================================

-- First, we need to handle foreign key constraints
-- Delete existing user_pets that reference old pet_types (for clean migration)
-- In production, you'd want to migrate existing pets instead

-- Update existing pet types to not be available (we'll insert fresh ones)
UPDATE pet_types SET is_available = FALSE WHERE slug IN (
  'kitten', 'cat', 'lion-cat', 'puppy', 'dog', 'wolf-dog',
  'fox-kit', 'fox', 'nine-tail-fox', 'owlet', 'owl', 'great-owl'
);

-- ========================================
-- Insert New Pet Types (Kenney Animal Pack)
-- ========================================

-- Common Pets (shop_price_coins = 0 because they're only from eggs)
INSERT INTO pet_types (name, slug, description, .rarity, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, is_egg, is_starter, acquisition_type, shop_price_coins)
VALUES
  ('Chick', 'chick', 'A fluffy little chick that cheers you on!', 'common', 1, '/assets/pets/chick.png', 1.05, 1.05, 'early_bird', 'Slightly more XP from morning sessions', TRUE, FALSE, FALSE, 'egg', 0),
  ('Duck', 'duck', 'A friendly duck that waddles along your learning journey.', 'common', 1, '/assets/pets/duck.png', 1.05, 1.05, 'water_wisdom', 'Slightly faster vocabulary review', TRUE, FALSE, FALSE, 'egg', 0),
  ('Rabbit', 'rabbit', 'A quick bunny that helps you learn faster!', 'common', 1, '/assets/pets/rabbit.png', 1.06, 1.04, 'quick_learner', 'Slightly faster exercise completion', TRUE, FALSE, FALSE, 'egg', 0),
  ('Frog', 'frog', 'A cheerful frog that leaps at every opportunity to learn.', 'common', 1, '/assets/pets/frog.png', 1.04, 1.06, 'leap_ahead', 'Slightly more coins from games', TRUE, FALSE, FALSE, 'egg', 0),
  ('Pig', 'pig', 'A happy pig that loves collecting rewards!', 'common', 1, '/assets/pets/pig.png', 1.03, 1.08, 'coin_collector', 'Bonus coins from all activities', TRUE, FALSE, FALSE, 'egg', 0)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  image_url = VALUES(image_url);

-- Uncommon Pets
INSERT INTO pet_types (name, slug, description, .rarity, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, is_egg, is_starter, acquisition_type, shop_price_coins)
VALUES
  ('Dog', 'dog', 'A loyal dog that stays by your side through every lesson.', 'uncommon', 1, '/assets/pets/dog.png', 1.10, 1.08, 'loyal_companion', 'Reduces streak break penalties', TRUE, FALSE, FALSE, 'egg', 0),
  ('Cow', 'cow', 'A patient cow that helps you take your time and learn well.', 'uncommon', 1, '/assets/pets/cow.png', 1.08, 1.10, 'steady_pace', 'Bonus XP from thorough reviews', TRUE, FALSE, FALSE, 'egg', 0),
  ('Goat', 'goat', 'A determined goat that never gives up!', 'uncommon', 1, '/assets/pets/goat.png', 1.09, 1.09, 'persistence', 'Extra XP from difficult exercises', TRUE, FALSE, FALSE, 'egg', 0),
  ('Horse', 'horse', 'A swift horse that gallops through lessons.', 'uncommon', 1, '/assets/pets/horse.png', 1.12, 1.05, 'speed_learner', 'Faster exercise completion bonuses', TRUE, FALSE, FALSE, 'egg', 0),
  ('Chicken', 'chicken', 'A proud chicken that celebrates every achievement!', 'uncommon', 1, '/assets/pets/chicken.png', 1.07, 1.10, 'celebration', 'Extra coins from achievements', TRUE, FALSE, FALSE, 'egg', 0)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  image_url = VALUES(image_url);

-- Rare Pets
INSERT INTO pet_types (name, slug, description, .rarity, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, is_egg, is_starter, acquisition_type, shop_price_coins)
VALUES
  ('Panda', 'panda', 'A wise panda that brings peace and focus to learning.', 'rare', 1, '/assets/pets/panda.png', 1.15, 1.10, 'zen_focus', 'Increased accuracy bonus', TRUE, FALSE, FALSE, 'egg', 0),
  ('Owl', 'owl', 'A wise owl that helps you remember everything.', 'rare', 1, '/assets/pets/owl.png', 1.18, 1.08, 'perfect_memory', 'Better spaced repetition results', TRUE, FALSE, FALSE, 'egg', 0),
  ('Penguin', 'penguin', 'A cool penguin that makes learning fun!', 'rare', 1, '/assets/pets/penguin.png', 1.12, 1.15, 'chill_vibes', 'Bonus XP and coins from games', TRUE, FALSE, FALSE, 'egg', 0),
  ('Parrot', 'parrot', 'A colorful parrot that helps with pronunciation!', 'rare', 1, '/assets/pets/parrot.png', 1.16, 1.12, 'echo_master', 'Bonus XP from listening exercises', TRUE, FALSE, FALSE, 'egg', 0),
  ('Monkey', 'monkey', 'A playful monkey that turns learning into an adventure!', 'rare', 1, '/assets/pets/monkey.png', 1.14, 1.14, 'playful_mind', 'Extra XP from game activities', TRUE, FALSE, FALSE, 'egg', 0)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  image_url = VALUES(image_url);

-- Epic Pets
INSERT INTO pet_types (name, slug, description, .rarity, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, is_egg, is_starter, acquisition_type, shop_price_coins)
VALUES
  ('Bear', 'bear', 'A powerful bear that gives strength to your learning.', 'epic', 1, '/assets/pets/bear.png', 1.20, 1.15, 'power_focus', 'Major XP boost from challenges', TRUE, FALSE, FALSE, 'egg', 0),
  ('Elephant', 'elephant', 'A gentle elephant that never forgets a lesson.', 'epic', 1, '/assets/pets/elephant.png', 1.22, 1.12, 'never_forget', 'Enhanced memory retention', TRUE, FALSE, FALSE, 'egg', 0),
  ('Giraffe', 'giraffe', 'A tall giraffe that sees the big picture in learning.', 'epic', 1, '/assets/pets/giraffe.png', 1.18, 1.18, 'long_view', 'Bonus XP from streak milestones', TRUE, FALSE, FALSE, 'egg', 0),
  ('Gorilla', 'gorilla', 'A mighty gorilla that powers through difficult content.', 'epic', 1, '/assets/pets/gorilla.png', 1.25, 1.10, 'brute_force', 'Extra XP from hard exercises', TRUE, FALSE, FALSE, 'egg', 0),
  ('Crocodile', 'crocodile', 'A patient crocodile that waits for the perfect moment.', 'epic', 1, '/assets/pets/crocodile.png', 1.15, 1.22, 'patient_hunter', 'Major coin bonuses from games', TRUE, FALSE, FALSE, 'egg', 0)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  image_url = VALUES(image_url);

-- Legendary Pets
INSERT INTO pet_types (name, slug, description, .rarity, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, is_egg, is_starter, acquisition_type, shop_price_coins)
VALUES
  ('Narwhal', 'narwhal', 'A magical narwhal with a horn of knowledge!', 'legendary', 1, '/assets/pets/narwhal.png', 1.30, 1.25, 'magic_horn', 'Massive XP and coin bonuses', TRUE, FALSE, FALSE, 'egg', 0),
  ('Whale', 'whale', 'A majestic whale that dives deep into wisdom.', 'legendary', 1, '/assets/pets/whale.png', 1.28, 1.28, 'deep_wisdom', 'Enhanced learning across all areas', TRUE, FALSE, FALSE, 'egg', 0),
  ('Sloth', 'sloth', 'A zen sloth that masters learning through patience.', 'legendary', 1, '/assets/pets/sloth.png', 1.35, 1.20, 'slow_mastery', 'Maximum XP from thorough learning', TRUE, FALSE, FALSE, 'egg', 0)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  image_url = VALUES(image_url);

-- ========================================
-- Insert Egg Types (purchasable from shop)
-- ========================================

INSERT INTO pet_types (name, slug, description, .rarity, is_egg, hatch_xp_required, hatch_hours_min, image_url, is_available, is_starter, acquisition_type, shop_price_coins, shop_price_gems)
VALUES
  ('Common Egg', 'egg-common', 'A simple egg that hatches into a common pet. Perfect for beginners!', 'common', TRUE, 100, 6, '/assets/eggs/egg-common.svg', TRUE, FALSE, 'shop', 500, 0),
  ('Uncommon Egg', 'egg-uncommon', 'A spotted egg with hints of nature. Contains uncommon pets!', 'uncommon', TRUE, 250, 12, '/assets/eggs/egg-uncommon.svg', TRUE, FALSE, 'shop', 1500, 0),
  ('Rare Egg', 'egg-rare', 'A glowing egg pulsing with energy. Rare pets await inside!', 'rare', TRUE, 500, 24, '/assets/eggs/egg-rare.svg', TRUE, FALSE, 'shop', 3000, 0),
  ('Epic Egg', 'egg-epic', 'A mystical egg surrounded by ancient runes. Epic pets lie within!', 'epic', TRUE, 1000, 48, '/assets/eggs/egg-epic.svg', TRUE, FALSE, 'achievement', 7500, 50),
  ('Legendary Egg', 'egg-legendary', 'A golden egg radiating power. Only the rarest pets emerge from here!', 'legendary', TRUE, 2000, 72, '/assets/eggs/egg-legendary.svg', TRUE, FALSE, 'achievement', 15000, 100)
ON DUPLICATE KEY UPDATE
  is_available = TRUE,
  is_egg = TRUE,
  hatch_xp_required = VALUES(hatch_xp_required),
  hatch_hours_min = VALUES(hatch_hours_min),
  image_url = VALUES(image_url);

-- ========================================
-- Populate Egg Hatch Pool
-- ========================================

-- Get IDs for eggs and pets (using variables for clarity)
-- Common Egg -> Common pets only
INSERT INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-common'),
  id,
  100
FROM pet_types
WHERE .rarity = 'common' AND is_egg = FALSE AND is_available = TRUE
ON DUPLICATE KEY UPDATE weight = 100;

-- Uncommon Egg -> Common (30 weight) + Uncommon (100 weight)
INSERT INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-uncommon'),
  id,
  CASE WHEN .rarity = 'common' THEN 30 ELSE 100 END
FROM pet_types
WHERE .rarity IN ('common', 'uncommon') AND is_egg = FALSE AND is_available = TRUE
ON DUPLICATE KEY UPDATE weight = VALUES(weight);

-- Rare Egg -> Uncommon (20 weight) + Rare (100 weight)
INSERT INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-rare'),
  id,
  CASE WHEN .rarity = 'uncommon' THEN 20 ELSE 100 END
FROM pet_types
WHERE .rarity IN ('uncommon', 'rare') AND is_egg = FALSE AND is_available = TRUE
ON DUPLICATE KEY UPDATE weight = VALUES(weight);

-- Epic Egg -> Rare (30 weight) + Epic (100 weight)
INSERT INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-epic'),
  id,
  CASE WHEN .rarity = 'rare' THEN 30 ELSE 100 END
FROM pet_types
WHERE .rarity IN ('rare', 'epic') AND is_egg = FALSE AND is_available = TRUE
ON DUPLICATE KEY UPDATE weight = VALUES(weight);

-- Legendary Egg -> Epic (20 weight) + Legendary (100 weight)
INSERT INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-legendary'),
  id,
  CASE WHEN .rarity = 'epic' THEN 20 ELSE 100 END
FROM pet_types
WHERE .rarity IN ('epic', 'legendary') AND is_egg = FALSE AND is_available = TRUE
ON DUPLICATE KEY UPDATE weight = VALUES(weight);

-- ========================================
-- Create Indexes for Performance (ignore errors if already exists)
-- ========================================

-- Using procedure to safely create indexes
DELIMITER //

DROP PROCEDURE IF EXISTS create_egg_indexes//

CREATE PROCEDURE create_egg_indexes()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END; -- Duplicate key name, ignore

  CREATE INDEX idx_pet_types_is_egg ON pet_types(is_egg);
  CREATE INDEX idx_pet_types_rarity ON pet_types(.rarity);
  CREATE INDEX idx_user_pets_is_hatched ON user_pets(is_hatched);
  CREATE INDEX idx_egg_hatch_pool_egg ON egg_hatch_pool(egg_type_id);
END//

DELIMITER ;

CALL create_egg_indexes();
DROP PROCEDURE IF EXISTS create_egg_indexes;

-- ========================================
-- Add shop_items entries for eggs (optional integration)
-- ========================================

-- Insert eggs into shop_items if that table exists
INSERT INTO shop_items (name, slug, description, category, rarity, price_coins, price_gems, image_url, is_available, item_type, metadata, sort_order)
SELECT
  name, slug, description, 'pets', .rarity, shop_price_coins, COALESCE(shop_price_gems, 0),
  image_url, TRUE, 'pet_egg', JSON_OBJECT('pet_type_id', id, 'hatch_xp_required', hatch_xp_required, 'hatch_hours_min', hatch_hours_min), 100
FROM pet_types
WHERE is_egg = TRUE AND is_available = TRUE
ON DUPLICATE KEY UPDATE
  price_coins = VALUES(price_coins),
  price_gems = VALUES(price_gems),
  metadata = VALUES(metadata),
  is_available = TRUE;

-- ========================================
-- Grant a free Common Egg to all users without pets
-- ========================================

-- This gives new users a starting egg
INSERT INTO user_pets (user_id, pet_type_id, is_active, is_hatched, hatch_xp_progress, hatch_started_at)
SELECT
  u.id,
  (SELECT id FROM pet_types WHERE slug = 'egg-common'),
  TRUE,
  FALSE,
  0,
  NOW()
FROM users u
LEFT JOIN user_pets up ON u.id = up.user_id
WHERE up.id IS NULL
ON DUPLICATE KEY UPDATE user_id = user_id;
