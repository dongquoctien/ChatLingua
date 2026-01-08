-- Migration: Add meme eggs and pets with hatch rates
-- Date: 2026-01-08

-- Add new meme pet types (if they don't exist)
INSERT IGNORE INTO pet_types (name, slug, description, rarity, xp_multiplier, coin_multiplier, special_ability, ability_description, is_available, acquisition_type, image_url) VALUES
('Ghost Blue', 'ghost-blue', 'A spooky blue ghost that haunts your learning sessions', 'rare', 1.15, 1.10, 'phantom_boost', 'Occasionally grants bonus XP from beyond', 1, 'egg', '/assets/icons/pixel/pets/ghost-blue.svg'),
('Ghost Orange', 'ghost-orange', 'A friendly orange ghost companion', 'rare', 1.15, 1.10, 'spirit_guide', 'Helps find rare vocabulary', 1, 'egg', '/assets/icons/pixel/pets/ghost-orange.svg'),
('Spooderman', 'spooderman', 'Your friendly neighborhood learning buddy', 'epic', 1.25, 1.20, 'web_slinger', 'Catches bonus words in exercises', 1, 'egg', '/assets/icons/pixel/pets/spooderman.svg'),
('Rickroll', 'rickroll', 'Never gonna give you up, never gonna let you down', 'legendary', 1.35, 1.30, 'never_give_up', 'Guarantees no streak breaks', 1, 'egg', '/assets/icons/pixel/pets/rickroll.svg'),
('Sacabambaspis', 'sacabambaspis', 'The prehistoric friend that just wants to be happy', 'epic', 1.25, 1.20, 'ancient_wisdom', 'Reveals etymology hints', 1, 'egg', '/assets/icons/pixel/pets/sacabambaspis.svg'),
('Sad Pepe', 'sad-pepe', 'Feels bad man... but learning makes him happy', 'rare', 1.15, 1.15, 'feels_good', 'Increases happiness recovery rate', 1, 'egg', '/assets/icons/pixel/pets/sad-pepe.svg'),
('Stonks', 'stonks', 'Your investment in learning is always going up', 'epic', 1.20, 1.40, 'stonks_only_go_up', 'Dramatically increases coin earnings', 1, 'egg', '/assets/icons/pixel/pets/stonks.svg'),
('Surprised Pikachu', 'surprised-pikachu', 'Shocked by how much you are learning!', 'legendary', 1.35, 1.30, 'electric_surge', 'Random bonus XP bursts', 1, 'egg', '/assets/icons/pixel/pets/surprised-pikachu.svg'),
('Take My Money', 'take-my-money', 'Throws coins at your progress', 'rare', 1.10, 1.35, 'money_shower', 'Extra coins from all activities', 1, 'egg', '/assets/icons/pixel/pets/take-my-money.svg'),
('This Is Fine', 'this-is-fine', 'Everything is fine... especially your learning', 'epic', 1.25, 1.20, 'calm_in_chaos', 'Reduces stress during timed exercises', 1, 'egg', '/assets/icons/pixel/pets/this-is-fine.svg'),
('Ghost Pink', 'ghost-pink', 'A cute pink ghost that loves vocabulary', 'uncommon', 1.10, 1.05, 'pink_spirit', 'Small XP boost', 1, 'egg', '/assets/icons/pixel/pets/ghost-pink.svg'),
('Ghost Red', 'ghost-red', 'A fiery red ghost with determination', 'uncommon', 1.10, 1.05, 'red_determination', 'Small streak protection', 1, 'egg', '/assets/icons/pixel/pets/ghost-red.svg');

-- Add Red Meme Egg type
INSERT IGNORE INTO pet_types (name, slug, description, rarity, is_available, acquisition_type, is_egg, hatch_xp_required, hatch_hours_min, shop_price_coins, shop_price_gems, image_url) VALUES
('Red Meme Egg', 'egg-red-meme', 'A mysterious red egg containing rare meme pets! Has a chance to hatch legendary memes.', 'epic', 1, 'shop', 1, 800, 4, 2500, 50, '/assets/eggs/egg-red-meme.svg');

-- Add Orange Meme Egg type
INSERT IGNORE INTO pet_types (name, slug, description, rarity, is_available, acquisition_type, is_egg, hatch_xp_required, hatch_hours_min, shop_price_coins, shop_price_gems, image_url) VALUES
('Orange Meme Egg', 'egg-orange-meme', 'A bright orange egg with classic meme pets inside! Great for collectors.', 'rare', 1, 'shop', 1, 600, 3, 1800, 35, '/assets/eggs/egg-orange-meme.svg');

-- Get IDs dynamically and insert hatch rates for Red Meme Egg
-- Red egg pets: ghost-blue, ghost-orange, nyan-cat, spooderman, rickroll, sacabambaspis, sad-pepe
INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'ghost-blue'),
  30
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'ghost-blue');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'ghost-orange'),
  30
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'ghost-orange');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'nyan-cat'),
  5
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'nyan-cat');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'spooderman'),
  15
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'spooderman');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'rickroll'),
  5
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'rickroll');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'sacabambaspis'),
  15
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'sacabambaspis');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-red-meme'),
  (SELECT id FROM pet_types WHERE slug = 'sad-pepe'),
  30
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-red-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'sad-pepe');

-- Insert hatch rates for Orange Meme Egg
-- Orange egg pets: stonks, surprised-pikachu, take-my-money, this-is-fine, ghost-pink, ghost-red
INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'stonks'),
  15
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'stonks');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'surprised-pikachu'),
  5
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'surprised-pikachu');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'take-my-money'),
  30
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'take-my-money');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'this-is-fine'),
  15
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'this-is-fine');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'ghost-pink'),
  50
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'ghost-pink');

INSERT IGNORE INTO egg_hatch_pool (egg_type_id, pet_type_id, weight)
SELECT
  (SELECT id FROM pet_types WHERE slug = 'egg-orange-meme'),
  (SELECT id FROM pet_types WHERE slug = 'ghost-red'),
  50
WHERE EXISTS (SELECT 1 FROM pet_types WHERE slug = 'egg-orange-meme')
  AND EXISTS (SELECT 1 FROM pet_types WHERE slug = 'ghost-red');
