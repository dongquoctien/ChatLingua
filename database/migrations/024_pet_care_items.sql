-- Migration: 024_pet_care_items.sql
-- Description: Add heart category, hp_bonus column, and complete pet care items
-- Date: 2026-01-05

-- =============================================
-- 1. Add 'heart' category to pet_items ENUM
-- =============================================
ALTER TABLE pet_items
MODIFY COLUMN item_category ENUM('food', 'toy', 'heart', 'medicine', 'accessory', 'special') NOT NULL;

-- =============================================
-- 2. Add hp_bonus column for healing items
-- =============================================
ALTER TABLE pet_items
ADD COLUMN hp_bonus INT NOT NULL DEFAULT 0 AFTER hunger_reduction;

-- =============================================
-- 3. Add Legendary Food Items
-- =============================================
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, hunger_reduction, hp_bonus, experience_bonus, price_coins, price_gems, rarity, icon_url) VALUES
('Divine Ambrosia', 'divine-ambrosia', 'The food of the gods! Fully satisfies hunger and greatly boosts happiness.', 'food', 50, 10, 100, 20, 10, 1000, 5, 'legendary', '/assets/icons/pixel/sqkhor/individual/birthday-cake.svg');

-- =============================================
-- 4. Add Legendary Toy Items
-- =============================================
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, hunger_reduction, hp_bonus, experience_bonus, price_coins, price_gems, rarity, icon_url) VALUES
('Rainbow Crystal', 'rainbow-crystal', 'A magical crystal that mesmerizes your pet with endless entertainment!', 'toy', 50, -10, 0, 0, 50, 1500, 8, 'legendary', '/assets/icons/pixel/sqkhor/individual/gemini.svg');

-- =============================================
-- 5. Add Heart Category Items (NEW - for petting/loving)
-- =============================================
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, hunger_reduction, hp_bonus, experience_bonus, price_coins, price_gems, rarity, icon_url) VALUES
-- Common
('Pet Treat', 'pet-treat', 'A small treat to show your pet some love.', 'heart', 15, 5, 0, 0, 2, 20, 0, 'common', '/assets/icons/pixel/sqkhor/individual/cookie.svg'),
-- Uncommon
('Cuddle Session', 'cuddle-session', 'Quality time with your beloved pet.', 'heart', 25, 10, 0, 5, 5, 50, 0, 'uncommon', '/assets/icons/pixel/sqkhor/individual/teddy-bear.svg'),
-- Rare
('Spa Day', 'spa-day', 'A relaxing spa treatment for your pet.', 'heart', 40, 20, 0, 10, 10, 150, 0, 'rare', '/assets/icons/pixel/sqkhor/individual/sparkles.svg'),
-- Epic
('Love Potion', 'love-potion', 'A magical potion that fills your pet with love and joy!', 'heart', 60, 30, 0, 15, 15, 500, 2, 'epic', '/assets/icons/pixel/sqkhor/individual/potion-red.svg'),
-- Legendary
('Soul Bond', 'soul-bond', 'Create an unbreakable bond with your pet. Maximum happiness and health!', 'heart', 100, 50, 0, 30, 30, 2000, 10, 'legendary', '/assets/icons/pixel/sqkhor/individual/star.svg');

-- =============================================
-- 6. Add More Medicine Items (for HP healing)
-- =============================================
INSERT INTO pet_items (name, slug, description, item_category, happiness_bonus, energy_bonus, hunger_reduction, hp_bonus, experience_bonus, price_coins, price_gems, rarity, icon_url) VALUES
-- Common
('Basic Bandage', 'basic-bandage', 'A simple bandage to heal minor wounds.', 'medicine', 0, 0, 0, 20, 0, 50, 0, 'common', '/assets/icons/pixel/sqkhor/individual/band-aid.svg'),
-- Epic
('Healing Elixir', 'healing-elixir', 'A powerful elixir that restores health and all stats.', 'medicine', 20, 30, 20, 60, 5, 400, 2, 'epic', '/assets/icons/pixel/sqkhor/individual/potion-green.svg'),
-- Legendary (can revive dying pet)
('Phoenix Feather', 'phoenix-feather', 'A legendary feather that fully restores HP and clears all negative effects.', 'medicine', 30, 50, 30, 100, 20, 1000, 5, 'legendary', '/assets/icons/pixel/sqkhor/individual/fire.svg'),
-- Legendary (can revive dead pet within 12h)
('Resurrection Scroll', 'resurrection-scroll', 'An ancient scroll that can bring a recently deceased pet back to life!', 'medicine', 50, 100, 50, 100, 50, 5000, 25, 'legendary', '/assets/icons/pixel/sqkhor/individual/scroll.svg');

-- =============================================
-- 7. Update existing medicine items with hp_bonus
-- =============================================
UPDATE pet_items SET hp_bonus = 30, icon_url = '/assets/icons/pixel/sqkhor/individual/coffee.svg' WHERE slug = 'energy-drink';
UPDATE pet_items SET hp_bonus = 50, icon_url = '/assets/icons/pixel/sqkhor/individual/pill.svg' WHERE slug = 'super-vitamins';

-- =============================================
-- 8. Update existing items with icons
-- =============================================
-- Food icons
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/bread.svg' WHERE slug = 'basic-kibble';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/burger.svg' WHERE slug = 'premium-kibble';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/pizza-whole.svg' WHERE slug = 'gourmet-meal';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/pancakes.svg' WHERE slug = 'golden-feast';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/candy.svg' WHERE slug = 'treats';

-- Toy icons
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/basketball.svg' WHERE slug = 'ball';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/duck.svg' WHERE slug = 'squeaky-toy';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/rubiks-cube.svg' WHERE slug = 'puzzle-toy';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/magic-wand.svg' WHERE slug = 'magic-wand';

-- Special icons
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/lightning.svg' WHERE slug = 'xp-booster';
UPDATE pet_items SET icon_url = '/assets/icons/pixel/sqkhor/individual/gemini.svg' WHERE slug = 'evolution-stone';

-- =============================================
-- 9. Add Pet Care shop category
-- =============================================
INSERT INTO shop_categories (name, slug, description, icon, sort_order, is_active) VALUES
('Pet Care', 'pet-care', 'Food, toys, and care items for your beloved pet', 'fa-heart', 8, TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description), icon = VALUES(icon);

-- =============================================
-- 10. Summary of Pet Care Items
-- =============================================
-- Food: 6 items (common x2, uncommon x1, rare x1, epic x1, legendary x1)
-- Toy: 5 items (common x1, uncommon x1, rare x1, epic x1, legendary x1)
-- Heart: 5 items (common x1, uncommon x1, rare x1, epic x1, legendary x1) - NEW
-- Medicine: 6 items (common x1, uncommon x1, rare x1, epic x1, legendary x2)
-- Special: 2 items (epic x1, legendary x1)
-- Total: 24 pet care items
