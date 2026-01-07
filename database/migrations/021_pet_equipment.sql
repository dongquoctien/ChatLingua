-- Pet Equipment System Migration
-- Adds equipment/accessories for pets and updates pet acquisition rules

-- ========================================
-- 1. PET EQUIPMENT TYPES (Templates)
-- ========================================
CREATE TABLE IF NOT EXISTS pet_equipment_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    equipment_slot ENUM('head', 'body', 'accessory', 'weapon', 'back', 'feet') NOT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',

    -- Stats bonuses
    happiness_bonus INT NOT NULL DEFAULT 0,
    energy_bonus INT NOT NULL DEFAULT 0,
    xp_bonus_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    coin_bonus_percent DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Visual
    sprite_data JSON COMMENT 'SVG/sprite data for rendering on pet',
    preview_url VARCHAR(500),

    -- Pricing
    price_coins INT NOT NULL DEFAULT 0,
    price_gems INT NOT NULL DEFAULT 0,

    -- Requirements
    required_pet_level INT NOT NULL DEFAULT 1,
    required_evolution_stage INT NOT NULL DEFAULT 1,
    compatible_pet_types JSON COMMENT 'Array of pet_type_ids, null = all pets',

    -- Availability
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_limited BOOLEAN NOT NULL DEFAULT FALSE,
    available_until TIMESTAMP NULL,

    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- 2. USER PET EQUIPMENT (Owned Equipment)
-- ========================================
CREATE TABLE IF NOT EXISTS user_pet_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    equipment_type_id INT NOT NULL,

    -- Equipped on which pet (null = in inventory)
    equipped_pet_id INT NULL,
    equipped_slot ENUM('head', 'body', 'accessory', 'weapon', 'back', 'feet') NULL,

    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    equipped_at TIMESTAMP NULL,

    UNIQUE KEY unique_user_equipment (user_id, equipment_type_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_type_id) REFERENCES pet_equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (equipped_pet_id) REFERENCES user_pets(id) ON DELETE SET NULL
);

-- Index for quick lookup of pet's equipped items
CREATE INDEX idx_pet_equipment ON user_pet_equipment(equipped_pet_id);

-- ========================================
-- 3. UPDATE PET_TYPES - Add acquisition info
-- ========================================
ALTER TABLE pet_types
    ADD COLUMN acquisition_type ENUM('shop', 'achievement', 'event', 'starter_free') NOT NULL DEFAULT 'shop' AFTER is_starter,
    ADD COLUMN shop_price_coins INT NOT NULL DEFAULT 0 AFTER acquisition_type,
    ADD COLUMN shop_price_gems INT NOT NULL DEFAULT 0 AFTER shop_price_coins,
    ADD COLUMN required_achievement VARCHAR(50) NULL AFTER shop_price_gems,
    ADD COLUMN equipment_slots VARCHAR(200) DEFAULT 'head,body,accessory' AFTER required_achievement;

-- Update existing pets with acquisition info
-- Starter pets are free (but we'll change this - only first pet is free)
UPDATE pet_types SET acquisition_type = 'starter_free', shop_price_coins = 0, shop_price_gems = 0 WHERE is_starter = TRUE;
-- Non-starter evolved pets must be obtained through evolution
UPDATE pet_types SET acquisition_type = 'shop', shop_price_coins = 0, shop_price_gems = 0 WHERE evolution_stage > 1;

-- Set prices for starter pets in shop (after first free pet)
UPDATE pet_types SET shop_price_coins = 500 WHERE slug = 'kitten';
UPDATE pet_types SET shop_price_coins = 500 WHERE slug = 'puppy';
UPDATE pet_types SET shop_price_coins = 500 WHERE slug = 'fox-kit';
UPDATE pet_types SET shop_price_coins = 500 WHERE slug = 'owlet';

-- ========================================
-- 4. ADD EXCLUSIVE/ACHIEVEMENT PETS
-- ========================================
INSERT INTO pet_types (name, slug, description, .rarity, evolution_chain_id, evolution_stage, xp_multiplier, coin_multiplier, special_ability, ability_description, is_starter, acquisition_type, shop_price_coins, shop_price_gems, required_achievement, equipment_slots) VALUES
-- Achievement-locked exclusive pets
('Phoenix Chick', 'phoenix-chick', 'A legendary phoenix born from the flames of dedication! Only for true masters.', 'legendary', 5, 1, 1.30, 1.25, 'rebirth_flame', 'Protects your streak from breaking once per week', FALSE, 'achievement', 0, 0, 'STREAK_100', 'head,body,accessory,back'),
('Dragon Hatchling', 'dragon-hatchling', 'A mystical dragon hatched from an ancient egg. For vocabulary masters only!', 'legendary', 6, 1, 1.35, 1.30, 'dragon_wisdom', 'Double XP from vocabulary exercises', FALSE, 'achievement', 0, 0, 'VOCAB_500', 'head,body,accessory,weapon,back'),
('Scholar Penguin', 'scholar-penguin', 'A studious penguin that has read thousands of books. For level masters!', 'epic', 7, 1, 1.25, 1.20, 'book_worm', 'Bonus XP from all learning activities', FALSE, 'achievement', 0, 0, 'LEVEL_10', 'head,body,accessory'),
-- Shop-only premium pets
('Golden Hamster', 'golden-hamster', 'A shiny golden hamster with incredible luck!', 'epic', 8, 1, 1.20, 1.30, 'lucky_wheel', '10% chance for double rewards', FALSE, 'shop', 2000, 0, NULL, 'head,body,accessory'),
('Mystic Bunny', 'mystic-bunny', 'A magical bunny with sparkling fur!', 'rare', 9, 1, 1.15, 1.15, 'hop_boost', 'Faster energy recovery', FALSE, 'shop', 1000, 0, NULL, 'head,body,accessory'),
('Crystal Panda', 'crystal-panda', 'A rare panda with crystalline markings!', 'epic', 10, 1, 1.25, 1.25, 'zen_master', 'Happiness decays slower', FALSE, 'shop', 1500, 0, NULL, 'head,body,accessory'),
-- Gem-only exclusive pets
('Celestial Unicorn', 'celestial-unicorn', 'A divine unicorn from the stars! The rarest of all companions.', 'legendary', 11, 1, 1.40, 1.35, 'starlight', 'All bonuses increased by 20%', FALSE, 'shop', 0, 500, NULL, 'head,body,accessory,back,weapon');

-- ========================================
-- 5. SEED DATA: Pet Equipment
-- ========================================

-- HEAD equipment
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, happiness_bonus, xp_bonus_percent, price_coins, sprite_data, sort_order) VALUES
('Party Hat', 'party-hat', 'A colorful party hat for celebrations!', 'head', 'common', 5, 0, 100, '{"type":"hat","color":"#FF6B6B","shape":"cone"}', 1),
('Wizard Hat', 'wizard-hat', 'A mystical hat that enhances learning.', 'head', 'uncommon', 8, 3, 300, '{"type":"hat","color":"#6C5CE7","shape":"wizard"}', 2),
('Crown', 'crown', 'A golden crown fit for royalty!', 'head', 'rare', 12, 5, 800, '{"type":"hat","color":"#FDCB6E","shape":"crown"}', 3),
('Halo', 'halo', 'A divine halo floating above your pet.', 'head', 'epic', 15, 8, 1500, '{"type":"hat","color":"#FFD700","shape":"halo"}', 4),
('Devil Horns', 'devil-horns', 'Mischievous horns for your pet!', 'head', 'uncommon', 10, 2, 400, '{"type":"hat","color":"#E74C3C","shape":"horns"}', 5),
('Pirate Hat', 'pirate-hat', 'Arrr! A pirate hat for adventure!', 'head', 'rare', 10, 5, 600, '{"type":"hat","color":"#2D3436","shape":"pirate"}', 6),
('Ninja Headband', 'ninja-headband', 'A sleek headband for stealthy learners.', 'head', 'uncommon', 8, 4, 350, '{"type":"hat","color":"#E74C3C","shape":"headband"}', 7),
('Santa Hat', 'santa-hat', 'Ho ho ho! Spread holiday cheer!', 'head', 'rare', 15, 5, 500, '{"type":"hat","color":"#E74C3C","shape":"santa"}', 8);

-- BODY equipment (clothes)
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, happiness_bonus, coin_bonus_percent, price_coins, sprite_data, sort_order) VALUES
('T-Shirt', 't-shirt', 'A comfy casual t-shirt.', 'body', 'common', 5, 0, 80, '{"type":"shirt","color":"#74B9FF","style":"tshirt"}', 10),
('Hoodie', 'hoodie', 'A cozy hoodie for cold days.', 'body', 'uncommon', 8, 3, 250, '{"type":"shirt","color":"#636E72","style":"hoodie"}', 11),
('Tuxedo', 'tuxedo', 'A fancy tuxedo for special occasions.', 'body', 'rare', 12, 5, 700, '{"type":"shirt","color":"#2D3436","style":"tuxedo"}', 12),
('Knight Armor', 'knight-armor', 'Sturdy armor for brave pets!', 'body', 'epic', 15, 8, 1200, '{"type":"shirt","color":"#B2BEC3","style":"armor"}', 13),
('Superhero Cape Suit', 'superhero-suit', 'A full superhero outfit!', 'body', 'epic', 18, 10, 1800, '{"type":"shirt","color":"#E74C3C","style":"superhero"}', 14),
('Pajamas', 'pajamas', 'Soft pajamas for sleepy pets.', 'body', 'common', 10, 0, 150, '{"type":"shirt","color":"#A29BFE","style":"pajamas"}', 15),
('Lab Coat', 'lab-coat', 'For scientific pets!', 'body', 'uncommon', 8, 4, 300, '{"type":"shirt","color":"#FFFFFF","style":"labcoat"}', 16),
('Kimono', 'kimono', 'An elegant traditional kimono.', 'body', 'rare', 12, 6, 900, '{"type":"shirt","color":"#FD79A8","style":"kimono"}', 17);

-- ACCESSORY equipment (neck, collar, scarf)
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, happiness_bonus, xp_bonus_percent, coin_bonus_percent, price_coins, sprite_data, sort_order) VALUES
('Basic Collar', 'basic-collar', 'A simple pet collar.', 'accessory', 'common', 3, 1, 1, 50, '{"type":"collar","color":"#E74C3C","style":"basic"}', 20),
('Bow Tie', 'bow-tie', 'A dapper bow tie.', 'accessory', 'uncommon', 6, 2, 2, 200, '{"type":"collar","color":"#E74C3C","style":"bowtie"}', 21),
('Scarf', 'scarf', 'A warm knitted scarf.', 'accessory', 'common', 5, 2, 0, 120, '{"type":"collar","color":"#00B894","style":"scarf"}', 22),
('Golden Necklace', 'golden-necklace', 'A luxurious golden necklace.', 'accessory', 'rare', 10, 4, 5, 600, '{"type":"collar","color":"#FDCB6E","style":"necklace"}', 23),
('Magic Amulet', 'magic-amulet', 'An enchanted amulet with special powers.', 'accessory', 'epic', 15, 8, 8, 1500, '{"type":"collar","color":"#6C5CE7","style":"amulet"}', 24),
('Bell Collar', 'bell-collar', 'A cute collar with a jingling bell.', 'accessory', 'common', 8, 0, 0, 100, '{"type":"collar","color":"#FDCB6E","style":"bell"}', 25),
('Bandana', 'bandana', 'A cool bandana for stylish pets.', 'accessory', 'uncommon', 7, 3, 2, 180, '{"type":"collar","color":"#E74C3C","style":"bandana"}', 26);

-- BACK equipment (wings, capes, backpacks)
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, xp_bonus_percent, coin_bonus_percent, price_coins, price_gems, sprite_data, sort_order) VALUES
('Small Wings', 'small-wings', 'Cute little wings for your pet.', 'back', 'uncommon', 3, 3, 400, 0, '{"type":"back","style":"wings","color":"#FFFFFF"}', 30),
('Angel Wings', 'angel-wings', 'Beautiful angelic wings.', 'back', 'rare', 6, 6, 1000, 0, '{"type":"back","style":"wings","color":"#FFEAA7"}', 31),
('Demon Wings', 'demon-wings', 'Dark and powerful demon wings.', 'back', 'rare', 6, 6, 1000, 0, '{"type":"back","style":"wings","color":"#2D3436"}', 32),
('Butterfly Wings', 'butterfly-wings', 'Colorful butterfly wings!', 'back', 'epic', 8, 8, 0, 100, '{"type":"back","style":"wings","color":"#A29BFE"}', 33),
('Dragon Wings', 'dragon-wings', 'Fearsome dragon wings!', 'back', 'legendary', 12, 12, 0, 250, '{"type":"back","style":"wings","color":"#E74C3C"}', 34),
('Cape', 'cape', 'A flowing hero cape.', 'back', 'uncommon', 4, 2, 350, 0, '{"type":"back","style":"cape","color":"#E74C3C"}', 35),
('Backpack', 'backpack', 'A useful backpack for adventures.', 'back', 'common', 2, 5, 200, 0, '{"type":"back","style":"backpack","color":"#74B9FF"}', 36),
('Jet Pack', 'jet-pack', 'Blast off with this jet pack!', 'back', 'epic', 10, 10, 2000, 0, '{"type":"back","style":"jetpack","color":"#636E72"}', 37);

-- WEAPON equipment (toys, wands, swords)
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, xp_bonus_percent, happiness_bonus, price_coins, price_gems, sprite_data, sort_order) VALUES
('Wooden Sword', 'wooden-sword', 'A toy wooden sword.', 'weapon', 'common', 2, 5, 150, 0, '{"type":"weapon","style":"sword","color":"#D4A574"}', 40),
('Magic Wand', 'magic-wand-equip', 'A sparkly magic wand.', 'weapon', 'uncommon', 5, 8, 400, 0, '{"type":"weapon","style":"wand","color":"#A29BFE"}', 41),
('Enchanted Staff', 'enchanted-staff', 'A powerful magical staff.', 'weapon', 'rare', 8, 10, 900, 0, '{"type":"weapon","style":"staff","color":"#6C5CE7"}', 42),
('Lightsaber', 'lightsaber', 'An epic laser sword!', 'weapon', 'epic', 12, 15, 0, 150, '{"type":"weapon","style":"lightsaber","color":"#74B9FF"}', 43),
('Legendary Blade', 'legendary-blade', 'The most powerful weapon!', 'weapon', 'legendary', 15, 20, 0, 300, '{"type":"weapon","style":"blade","color":"#FDCB6E"}', 44),
('Toy Hammer', 'toy-hammer', 'A squeaky toy hammer.', 'weapon', 'common', 2, 10, 100, 0, '{"type":"weapon","style":"hammer","color":"#E74C3C"}', 45),
('Book of Knowledge', 'book-of-knowledge', 'A magical book of wisdom.', 'weapon', 'rare', 10, 5, 800, 0, '{"type":"weapon","style":"book","color":"#2D3436"}', 46);

-- FEET equipment (shoes, boots)
INSERT INTO pet_equipment_types (name, slug, description, equipment_slot, rarity, energy_bonus, coin_bonus_percent, price_coins, sprite_data, sort_order) VALUES
('Sneakers', 'sneakers', 'Comfy sneakers for active pets.', 'feet', 'common', 5, 2, 120, '{"type":"feet","style":"sneakers","color":"#FFFFFF"}', 50),
('Boots', 'boots', 'Sturdy boots for all terrain.', 'feet', 'uncommon', 8, 3, 300, '{"type":"feet","style":"boots","color":"#8B4513"}', 51),
('Roller Skates', 'roller-skates', 'Zoom around with style!', 'feet', 'rare', 12, 5, 700, '{"type":"feet","style":"rollerskates","color":"#E74C3C"}', 52),
('Magic Boots', 'magic-boots', 'Enchanted boots with special powers.', 'feet', 'epic', 15, 8, 1200, '{"type":"feet","style":"magicboots","color":"#6C5CE7"}', 53),
('Socks', 'socks', 'Cozy warm socks.', 'feet', 'common', 3, 0, 60, '{"type":"feet","style":"socks","color":"#FD79A8"}', 54),
('Bunny Slippers', 'bunny-slippers', 'Adorable bunny slippers!', 'feet', 'uncommon', 10, 2, 250, '{"type":"feet","style":"slippers","color":"#FD79A8"}', 55);

-- ========================================
-- 6. UPDATE ACHIEVEMENTS FOR EXCLUSIVE PETS
-- ========================================
-- Add new achievements if they don't exist
INSERT IGNORE INTO achievements (achievement_code, name, description, category, xp_reward, icon, is_hidden) VALUES
('STREAK_100', 'Century Streak', 'Maintain a 100-day learning streak!', 'streak', 1000, 'fa-fire', FALSE),
('VOCAB_500', 'Lexicon Legend', 'Learn 500 vocabulary words!', 'learning', 500, 'fa-book', FALSE),
('LEVEL_10', 'Master Learner', 'Reach level 10!', 'milestone', 500, 'fa-star', FALSE);

-- ========================================
-- 7. USER_PETS - Track how pet was acquired
-- ========================================
ALTER TABLE user_pets
    ADD COLUMN acquisition_source ENUM('free_starter', 'shop_coins', 'shop_gems', 'achievement', 'event', 'gift') NOT NULL DEFAULT 'free_starter' AFTER adopted_at,
    ADD COLUMN acquisition_price INT NOT NULL DEFAULT 0 AFTER acquisition_source;

-- ========================================
-- 8. Add first_pet_free tracking to users
-- ========================================
ALTER TABLE users
    ADD COLUMN has_free_starter_pet BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing users with pets as having used their free pet
UPDATE users u SET has_free_starter_pet = TRUE WHERE EXISTS (SELECT 1 FROM user_pets up WHERE up.user_id = u.id);
