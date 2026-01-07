-- Migration: Update pet images to use SQKhor SVGs
-- SQKhor provides beautiful pixel art SVG pets
-- Created: 2026-01-05

-- ============================================================
-- Update existing pets to use SQKhor SVG images
-- ============================================================

-- Cat evolution chain
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/cat.svg' WHERE slug = 'kitten';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/cat-sit.svg' WHERE slug = 'cat';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/lion.svg' WHERE slug = 'lion-cat';

-- Dog evolution chain
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/dog.svg' WHERE slug = 'puppy';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/dog-beagle.svg' WHERE slug = 'dog';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/dog-shiba.svg' WHERE slug = 'wolf-dog';

-- Fox evolution chain
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/fox.svg' WHERE slug = 'fox-kit';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/fox.svg' WHERE slug = 'fox';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/fox.svg' WHERE slug = 'nine-tail-fox';

-- Owl evolution chain
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/owl-2.svg' WHERE slug = 'owlet';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/owl-1.svg' WHERE slug = 'owl';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/owl-1.svg' WHERE slug = 'great-owl';

-- Farm animals
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/duck.svg' WHERE slug = 'duck';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/rabbit-white.svg' WHERE slug = 'rabbit';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/frog.svg' WHERE slug = 'frog';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/pig.svg' WHERE slug = 'pig';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/cow.svg' WHERE slug = 'cow';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/horse.svg' WHERE slug = 'horse';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/sheep.svg' WHERE slug = 'goat';

-- Wild animals
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/panda.svg' WHERE slug = 'panda';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/penguin.svg' WHERE slug = 'penguin';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/monkey.svg' WHERE slug = 'monkey';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/bear.svg' WHERE slug = 'bear';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/elephant.svg' WHERE slug = 'elephant';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/whale.svg' WHERE slug = 'whale';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/sloth.svg' WHERE slug = 'sloth';

-- Special pets
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/rabbit-grey.svg' WHERE slug = 'mystic-bunny';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/panda.svg' WHERE slug = 'crystal-panda';
UPDATE pet_types SET image_url = '/assets/icons/pixel/sqkhor/individual/penguin.svg' WHERE slug = 'scholar-penguin';

-- ============================================================
-- Add new SQKhor pets (Pokemon-style and more)
-- ============================================================

-- Insert new pet types with SQKhor images (if they don't exist)
INSERT IGNORE INTO pet_types (name, slug, description, .rarity, evolution_chain_id, evolution_stage, image_url, xp_multiplier, coin_multiplier, special_ability, ability_description, is_starter, acquisition_type, shop_price_coins, shop_price_gems)
VALUES
-- Pokemon-inspired pets
('Pikachu', 'pikachu', 'An electric mouse that sparks joy in learning!', 'epic', 10, 1, '/assets/icons/pixel/sqkhor/individual/pikachu.svg', 1.20, 1.15, 'electric_boost', 'Increases quiz speed bonus by 15%', FALSE, 'shop', 2000, 100),
('Eevee', 'eevee', 'A cute fox-like pet with endless potential!', 'rare', 11, 1, '/assets/icons/pixel/sqkhor/individual/eevee.svg', 1.15, 1.10, 'adapt', 'Bonus XP for trying new exercises', FALSE, 'shop', 1500, 75),
('Bulbasaur', 'bulbasaur', 'A plant dinosaur that grows with your vocabulary!', 'rare', 12, 1, '/assets/icons/pixel/sqkhor/individual/bulbasaur.svg', 1.15, 1.10, 'growth', 'Bonus coins for vocabulary mastery', FALSE, 'shop', 1500, 75),
('Charmander', 'charmander', 'A fire lizard with burning passion for learning!', 'rare', 13, 1, '/assets/icons/pixel/sqkhor/individual/charmander.svg', 1.15, 1.10, 'fire_spirit', 'Extends streak protection by 1 hour', FALSE, 'shop', 1500, 75),
('Squirtle', 'squirtle', 'A water turtle that makes learning flow smoothly!', 'rare', 14, 1, '/assets/icons/pixel/sqkhor/individual/squirtle.svg', 1.15, 1.10, 'water_flow', 'Reduces cooldowns by 10%', FALSE, 'shop', 1500, 75),
('Psyduck', 'psyduck', 'A confused duck that somehow helps you focus!', 'uncommon', 15, 1, '/assets/icons/pixel/sqkhor/individual/psyduck.svg', 1.10, 1.05, 'confusion', 'Random bonus XP bursts', FALSE, 'shop', 800, 40),

-- Unique animals
('Capybara', 'capybara', 'The chillest pet that keeps you calm during exams!', 'rare', 16, 1, '/assets/icons/pixel/sqkhor/individual/capybara.svg', 1.10, 1.20, 'zen_mode', 'Reduces stress penalties', FALSE, 'shop', 1200, 60),
('Alpaca', 'alpaca', 'A fluffy friend that makes learning cozy!', 'uncommon', 17, 1, '/assets/icons/pixel/sqkhor/individual/alpaca.svg', 1.10, 1.10, 'fluffy', 'Bonus happiness from activities', FALSE, 'shop', 600, 30),
('Raccoon', 'raccoon', 'A clever critter that finds bonus rewards!', 'uncommon', 18, 1, '/assets/icons/pixel/sqkhor/individual/raccoon.svg', 1.05, 1.15, 'treasure_hunter', 'Small chance for bonus coins', FALSE, 'shop', 700, 35),
('Koala', 'koala', 'A sleepy friend that values quality over quantity!', 'uncommon', 19, 1, '/assets/icons/pixel/sqkhor/individual/koala.svg', 1.15, 1.05, 'quality_time', 'Bonus XP for perfect scores', FALSE, 'shop', 650, 32),
('Tiger', 'tiger', 'A fierce learner that tackles challenges head-on!', 'epic', 20, 1, '/assets/icons/pixel/sqkhor/individual/tiger.svg', 1.25, 1.15, 'fierce_focus', 'Bonus XP for hard difficulty', FALSE, 'shop', 2500, 125),

-- Aquatic pets
('Dolphin', 'dolphin', 'A smart swimmer that helps with memory!', 'rare', 21, 1, '/assets/icons/pixel/sqkhor/individual/dolphin.svg', 1.20, 1.05, 'echolocation', 'Better hints during exercises', FALSE, 'shop', 1000, 50),
('Crab', 'crab', 'A sideways thinker that finds creative solutions!', 'uncommon', 22, 1, '/assets/icons/pixel/sqkhor/individual/crab.svg', 1.05, 1.10, 'sideways', 'Bonus for alternative answers', FALSE, 'shop', 500, 25),
('Clownfish', 'clownfish', 'A colorful friend that makes learning fun!', 'common', 23, 1, '/assets/icons/pixel/sqkhor/individual/clownfish.svg', 1.05, 1.05, 'colorful', 'Bonus happiness from games', TRUE, 'shop', 300, 15),

-- Insects
('Bee', 'bee', 'A busy bee that rewards consistent practice!', 'uncommon', 24, 1, '/assets/icons/pixel/sqkhor/individual/bee.svg', 1.10, 1.10, 'busy_bee', 'Bonus for daily practice', FALSE, 'shop', 550, 28),

-- Cat variants
('Black Cat', 'cat-black', 'A mysterious black cat with lucky charm!', 'uncommon', 25, 1, '/assets/icons/pixel/sqkhor/individual/cat-black.svg', 1.10, 1.15, 'lucky_charm', 'Better rare item drops', FALSE, 'shop', 700, 35),
('Orange Cat', 'cat-orange', 'A playful orange tabby full of energy!', 'common', 26, 1, '/assets/icons/pixel/sqkhor/individual/cat-orange.svg', 1.05, 1.05, 'playful', 'Bonus from playing games', TRUE, 'shop', 250, 12),
('Nyan Cat', 'nyan-cat', 'The legendary rainbow cat of the internet!', 'legendary', 27, 1, '/assets/icons/pixel/sqkhor/individual/nyan-cat.svg', 1.50, 1.50, 'rainbow_power', 'All bonuses increased!', FALSE, 'achievement', 0, 0);

-- ============================================================
-- DONE
-- ============================================================
