-- Pet System Migration
-- Creates tables for virtual pet companions feature

-- ========================================
-- Pet Types (Available Pets)
-- ========================================
CREATE TABLE IF NOT EXISTS pet_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    base_rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    evolution_chain_id INT,
    evolution_stage INT NOT NULL DEFAULT 1,
    evolves_from_id INT,
    evolution_requirement JSON COMMENT 'Required stats to evolve: {level, days_active, total_interactions}',
    sprite_sheet_url VARCHAR(500),
    xp_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    coin_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    special_ability VARCHAR(50),
    ability_description TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_starter BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (evolves_from_id) REFERENCES pet_types(id) ON DELETE SET NULL
);


-- ========================================
-- User Pets (Owned Pets)
-- ========================================
CREATE TABLE IF NOT EXISTS user_pets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    pet_type_id INT NOT NULL,
    nickname VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    happiness INT NOT NULL DEFAULT 80 CHECK (happiness >= 0 AND happiness <= 100),
    energy INT NOT NULL DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
    hunger INT NOT NULL DEFAULT 0 CHECK (hunger >= 0 AND hunger <= 100),
    experience INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    current_stage INT NOT NULL DEFAULT 1,
    evolution_progress JSON COMMENT 'Progress toward evolution requirements',
    last_fed_at TIMESTAMP NULL,
    last_played_at TIMESTAMP NULL,
    last_interaction_at TIMESTAMP NULL,
    total_interactions INT NOT NULL DEFAULT 0,
    streak_days_together INT NOT NULL DEFAULT 0,
    evolved_at TIMESTAMP NULL,
    adopted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_type_id) REFERENCES pet_types(id) ON DELETE RESTRICT
);

-- ========================================
-- Pet Items (Food, Toys, Accessories)
-- ========================================
CREATE TABLE IF NOT EXISTS pet_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    item_category ENUM('food', 'toy', 'accessory', 'medicine', 'special') NOT NULL,
    happiness_bonus INT NOT NULL DEFAULT 0,
    energy_bonus INT NOT NULL DEFAULT 0,
    hunger_reduction INT NOT NULL DEFAULT 0,
    experience_bonus INT NOT NULL DEFAULT 0,
    price_coins INT NOT NULL DEFAULT 0,
    price_gems INT NOT NULL DEFAULT 0,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    icon_url VARCHAR(500),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- User Pet Items (Inventory)
-- ========================================
CREATE TABLE IF NOT EXISTS user_pet_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    pet_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_item (user_id, pet_item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_item_id) REFERENCES pet_items(id) ON DELETE CASCADE
);

-- ========================================
-- Pet Activities (History Log)
-- ========================================
CREATE TABLE IF NOT EXISTS pet_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_pet_id INT NOT NULL,
    activity_type ENUM('feed', 'play', 'pet', 'train', 'walk', 'gift', 'evolve', 'learn_together') NOT NULL,
    happiness_change INT DEFAULT 0,
    energy_change INT DEFAULT 0,
    hunger_change INT DEFAULT 0,
    experience_gained INT DEFAULT 0,
    trigger_source ENUM('user', 'system', 'schedule') NOT NULL DEFAULT 'user',
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_pet_id) REFERENCES user_pets(id) ON DELETE CASCADE
);

-- ========================================
-- SEED DATA: Starter Pet Types
-- ========================================

-- Insert all pet types first (without evolves_from_id)
INSERT INTO pet_types (name, slug, description, base_rarity, evolution_chain_id, evolution_stage, sprite_sheet_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_starter, evolution_requirement) VALUES
-- Evolution Chain 1: Cat
('Kitten', 'kitten', 'A playful little kitten that loves to learn new words!', 'common', 1, 1, '/assets/pets/kitten.png', 1.05, 1.05, 'word_hunter', 'Slightly increases vocabulary quiz accuracy', TRUE, NULL),
('Cat', 'cat', 'A clever cat that helps you remember words better.', 'uncommon', 1, 2, '/assets/pets/cat.png', 1.10, 1.10, 'memory_boost', 'Increases spaced repetition effectiveness', FALSE, '{"level": 5, "days_active": 7}'),
('Lion Cat', 'lion-cat', 'A majestic lion cat with powerful learning abilities!', 'rare', 1, 3, '/assets/pets/lion-cat.png', 1.20, 1.20, 'roar_of_knowledge', 'Bonus XP for completing daily streaks', FALSE, '{"level": 15, "days_active": 30, "total_interactions": 100}'),
-- Evolution Chain 2: Dog
('Puppy', 'puppy', 'An enthusiastic puppy always ready to help you study!', 'common', 2, 1, '/assets/pets/puppy.png', 1.05, 1.05, 'eager_learner', 'Slightly increases exercise completion speed', TRUE, NULL),
('Dog', 'dog', 'A loyal dog that stays by your side through every lesson.', 'uncommon', 2, 2, '/assets/pets/dog.png', 1.10, 1.10, 'loyal_companion', 'Reduces streak break penalties', FALSE, '{"level": 5, "days_active": 7}'),
('Wolf Dog', 'wolf-dog', 'A mighty wolf dog with unstoppable learning spirit!', 'rare', 2, 3, '/assets/pets/wolf-dog.png', 1.20, 1.20, 'pack_leader', 'Bonus coins from all activities', FALSE, '{"level": 15, "days_active": 30, "total_interactions": 100}'),
-- Evolution Chain 3: Fox
('Fox Kit', 'fox-kit', 'A curious little fox that loves exploring new grammar rules!', 'common', 3, 1, '/assets/pets/fox-kit.png', 1.05, 1.05, 'quick_wit', 'Slightly faster hint cooldowns', TRUE, NULL),
('Fox', 'fox', 'A sly fox that helps you spot tricky grammar patterns.', 'uncommon', 3, 2, '/assets/pets/fox.png', 1.10, 1.10, 'grammar_sense', 'Increases grammar exercise accuracy', FALSE, '{"level": 5, "days_active": 7}'),
('Nine-Tail Fox', 'nine-tail-fox', 'A mystical nine-tail fox with ancient wisdom!', 'rare', 3, 3, '/assets/pets/nine-tail-fox.png', 1.25, 1.15, 'wisdom_tails', 'Extra XP from all learning activities', FALSE, '{"level": 15, "days_active": 30, "total_interactions": 100}'),
-- Evolution Chain 4: Owl
('Owlet', 'owlet', 'A tiny owl that studies even at night!', 'common', 4, 1, '/assets/pets/owlet.png', 1.05, 1.05, 'night_study', 'Slightly more XP from late-night sessions', TRUE, NULL),
('Owl', 'owl', 'A wise owl that helps you remember everything you learn.', 'uncommon', 4, 2, '/assets/pets/owl.png', 1.10, 1.10, 'perfect_memory', 'Increases flashcard review efficiency', FALSE, '{"level": 5, "days_active": 7}'),
('Great Owl', 'great-owl', 'A legendary owl with incredible wisdom and knowledge!', 'rare', 4, 3, '/assets/pets/great-owl.png', 1.25, 1.20, 'all_knowing', 'Bonus XP and coins from all activities', FALSE, '{"level": 15, "days_active": 30, "total_interactions": 100}');

-- Update evolves_from_id references (can't do subquery in same table during insert)
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'kitten') AS t) WHERE slug = 'cat';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'cat') AS t) WHERE slug = 'lion-cat';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'puppy') AS t) WHERE slug = 'dog';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'dog') AS t) WHERE slug = 'wolf-dog';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'fox-kit') AS t) WHERE slug = 'fox';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'fox') AS t) WHERE slug = 'nine-tail-fox';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'owlet') AS t) WHERE slug = 'owl';
UPDATE pet_types SET evolves_from_id = (SELECT id FROM (SELECT id FROM pet_types WHERE slug = 'owl') AS t) WHERE slug = 'great-owl';

-- ========================================
-- SEED DATA: Pet Items
-- ========================================

-- Food items
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, hunger_reduction, price_coins, rarity) VALUES
('Basic Kibble', 'basic-kibble', 'Simple but nutritious pet food.', 'food', 5, 20, 10, 'common'),
('Premium Kibble', 'premium-kibble', 'High-quality pet food your pet will love!', 'food', 10, 30, 25, 'uncommon'),
('Gourmet Meal', 'gourmet-meal', 'A delicious gourmet meal for special occasions.', 'food', 20, 50, 75, 'rare'),
('Golden Feast', 'golden-feast', 'The finest meal fit for a king!', 'food', 30, 80, 200, 'epic'),
('Treats', 'treats', 'Tasty snacks your pet will adore.', 'food', 15, 10, 15, 'common');

-- Toy items
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, experience_bonus, price_coins, rarity) VALUES
('Ball', 'ball', 'A simple ball for fetch and play.', 'toy', 10, -10, 5, 20, 'common'),
('Squeaky Toy', 'squeaky-toy', 'Makes fun sounds when played with!', 'toy', 15, -15, 8, 40, 'uncommon'),
('Puzzle Toy', 'puzzle-toy', 'Stimulates your pet''s mind while playing.', 'toy', 20, -10, 15, 100, 'rare'),
('Magic Wand', 'magic-wand', 'A mysterious toy that never gets boring!', 'toy', 30, -20, 25, 250, 'epic');

-- Medicine items
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, price_coins, rarity) VALUES
('Energy Drink', 'energy-drink', 'Restores your pet''s energy quickly.', 'medicine', 0, 50, 50, 'uncommon'),
('Super Vitamins', 'super-vitamins', 'Boosts all stats temporarily.', 'medicine', 20, 30, 150, 'rare');

-- Special items
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, experience_bonus, price_gems, rarity) VALUES
('XP Booster', 'xp-booster', 'Doubles pet XP gain for 1 hour.', 'special', 10, 100, 50, 'epic'),
('Evolution Stone', 'evolution-stone', 'Helps your pet evolve faster.', 'special', 25, 500, 100, 'legendary');

