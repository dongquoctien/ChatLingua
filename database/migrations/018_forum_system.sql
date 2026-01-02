-- =====================================================
-- Forum System Migration
-- Created: 2024-12-30
-- Description: Community forum for sharing conversations
-- =====================================================

-- =====================================================
-- FORUM CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,

  name VARCHAR(100) NOT NULL,
  name_vi VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(500) NULL,
  icon VARCHAR(50) NULL,
  color VARCHAR(20) NULL,

  parent_id INT NULL,
  sort_order INT DEFAULT 0,

  post_count INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_id) REFERENCES forum_categories(id) ON DELETE SET NULL,

  INDEX idx_parent (parent_id),
  INDEX idx_sort (sort_order),
  INDEX idx_active (is_active)
);

-- =====================================================
-- FORUM TAGS
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,

  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,

  usage_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_usage (usage_count DESC),
  INDEX idx_name (name)
);

-- =====================================================
-- FORUM POSTS (Shared Conversations)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,

  author_id INT NOT NULL,
  conversation_id INT NOT NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,

  vietnamese_text TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  topic VARCHAR(100) NULL,
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,

  vocabulary_count INT DEFAULT 0,
  grammar_count INT DEFAULT 0,
  exercise_count INT DEFAULT 0,

  category_id INT NULL,

  view_count INT DEFAULT 0,
  upvote_count INT DEFAULT 0,
  downvote_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  import_count INT DEFAULT 0,

  score INT DEFAULT 0,
  hot_score DECIMAL(10,6) DEFAULT 0,

  status ENUM(
    'draft',
    'pending_review',
    'published',
    'rejected',
    'hidden',
    'deleted'
  ) DEFAULT 'published',

  rejection_reason VARCHAR(500) NULL,

  is_featured BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  is_anonymous BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL,

  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE SET NULL,

  INDEX idx_author (author_id),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_difficulty (difficulty_level),
  INDEX idx_score (score DESC),
  INDEX idx_hot_score (hot_score DESC),
  INDEX idx_created (created_at DESC),
  INDEX idx_published (published_at DESC),
  FULLTEXT INDEX ft_search (title, description, vietnamese_text, english_translation)
);

-- =====================================================
-- POST-TAG RELATIONSHIP
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,

  PRIMARY KEY (post_id, tag_id),

  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES forum_tags(id) ON DELETE CASCADE
);

-- =====================================================
-- INCLUDED CONTENT (What's shared with the post)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_post_content (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,

  content_type ENUM('vocabulary', 'grammar', 'exercise') NOT NULL,
  content_id INT NOT NULL,

  snapshot JSON NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,

  INDEX idx_post (post_id),
  INDEX idx_type (content_type),
  UNIQUE KEY unique_content (post_id, content_type, content_id)
);

-- =====================================================
-- VOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_votes (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  post_id INT NOT NULL,

  vote_type ENUM('upvote', 'downvote') NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,

  UNIQUE KEY unique_vote (user_id, post_id),
  INDEX idx_post (post_id)
);

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,

  post_id INT NOT NULL,
  user_id INT NOT NULL,

  parent_id INT NULL,

  content TEXT NOT NULL,

  upvote_count INT DEFAULT 0,

  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES forum_comments(id) ON DELETE CASCADE,

  INDEX idx_post (post_id, created_at),
  INDEX idx_user (user_id),
  INDEX idx_parent (parent_id)
);

-- =====================================================
-- COMMENT VOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_comment_votes (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  comment_id INT NOT NULL,

  vote_type ENUM('upvote', 'downvote') NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES forum_comments(id) ON DELETE CASCADE,

  UNIQUE KEY unique_comment_vote (user_id, comment_id)
);

-- =====================================================
-- IMPORTS (Track who imported what)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_imports (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  post_id INT NOT NULL,

  conversation_id INT NULL,

  imported_vocabulary BOOLEAN DEFAULT TRUE,
  imported_grammar BOOLEAN DEFAULT TRUE,
  imported_exercises BOOLEAN DEFAULT TRUE,

  vocabulary_imported INT DEFAULT 0,
  grammar_imported INT DEFAULT 0,
  exercises_imported INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,

  UNIQUE KEY unique_import (user_id, post_id),
  INDEX idx_post (post_id),
  INDEX idx_user (user_id)
);

-- =====================================================
-- COLLECTIONS (User-curated lists)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_collections (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  slug VARCHAR(150) NOT NULL,

  is_public BOOLEAN DEFAULT TRUE,

  post_count INT DEFAULT 0,
  follower_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_slug (user_id, slug),
  INDEX idx_user (user_id),
  INDEX idx_public (is_public, follower_count DESC)
);

-- =====================================================
-- COLLECTION ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_collection_items (
  id INT PRIMARY KEY AUTO_INCREMENT,

  collection_id INT NOT NULL,
  post_id INT NOT NULL,

  sort_order INT DEFAULT 0,
  note VARCHAR(500) NULL,

  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (collection_id) REFERENCES forum_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,

  UNIQUE KEY unique_item (collection_id, post_id),
  INDEX idx_collection (collection_id, sort_order)
);

-- =====================================================
-- COLLECTION FOLLOWERS
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_collection_followers (
  collection_id INT NOT NULL,
  user_id INT NOT NULL,

  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (collection_id, user_id),

  FOREIGN KEY (collection_id) REFERENCES forum_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- BOOKMARKS (Save posts for later)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NOT NULL,
  post_id INT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,

  UNIQUE KEY unique_bookmark (user_id, post_id),
  INDEX idx_user (user_id, created_at DESC)
);

-- =====================================================
-- REPORTS (Content moderation)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,

  reporter_id INT NOT NULL,

  content_type ENUM('post', 'comment') NOT NULL,
  content_id INT NOT NULL,

  reason ENUM(
    'spam',
    'inappropriate',
    'copyright',
    'harassment',
    'misinformation',
    'duplicate',
    'other'
  ) NOT NULL,

  description TEXT NULL,

  status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  resolution_note TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_status (status),
  INDEX idx_content (content_type, content_id)
);

-- =====================================================
-- AUTHOR REPUTATION (Separate from user_xp)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_reputation (
  user_id INT PRIMARY KEY,

  reputation INT DEFAULT 0,

  total_posts INT DEFAULT 0,
  total_imports INT DEFAULT 0,
  total_upvotes_received INT DEFAULT 0,
  total_downvotes_received INT DEFAULT 0,
  total_comments INT DEFAULT 0,

  badges JSON NULL,

  `rank` ENUM(
    'newcomer',
    'contributor',
    'active_contributor',
    'trusted_contributor',
    'expert',
    'master',
    'legend'
  ) DEFAULT 'newcomer',

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_reputation (reputation DESC),
  INDEX idx_rank (`rank`)
);

-- =====================================================
-- FORUM BADGES
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_badges (
  id INT PRIMARY KEY AUTO_INCREMENT,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,

  requirement_type ENUM(
    'posts_count',
    'imports_count',
    'upvotes_count',
    'reputation',
    'special'
  ) NOT NULL,
  requirement_value INT DEFAULT 0,

  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- VIEW HISTORY (For recommendations)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_view_history (
  id INT PRIMARY KEY AUTO_INCREMENT,

  user_id INT NULL,
  post_id INT NOT NULL,

  session_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,

  time_spent_seconds INT DEFAULT 0,
  scrolled_to_bottom BOOLEAN DEFAULT FALSE,

  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,

  INDEX idx_user (user_id, viewed_at DESC),
  INDEX idx_post (post_id, viewed_at DESC)
);

-- =====================================================
-- INITIAL DATA - CATEGORIES
-- =====================================================
INSERT INTO forum_categories (name, name_vi, slug, description, icon, color, sort_order) VALUES
('Daily Life', 'Cuoc song hang ngay', 'daily-life', 'Conversations about daily activities, routines, and common situations', 'fa-home', '#3B82F6', 1),
('Work & Business', 'Cong viec & Kinh doanh', 'work-business', 'Professional conversations, meetings, emails, and office situations', 'fa-briefcase', '#8B5CF6', 2),
('Travel', 'Du lich', 'travel', 'Conversations about traveling, booking, directions, and tourism', 'fa-plane', '#10B981', 3),
('Food & Dining', 'Am thuc', 'food-dining', 'Restaurant conversations, ordering food, recipes, and cooking', 'fa-utensils', '#F59E0B', 4),
('Shopping', 'Mua sam', 'shopping', 'Shopping conversations, bargaining, and customer service', 'fa-shopping-bag', '#EC4899', 5),
('Health', 'Suc khoe', 'health', 'Medical conversations, doctor visits, and health-related topics', 'fa-heartbeat', '#EF4444', 6),
('Education', 'Giao duc', 'education', 'School, university, courses, and learning-related conversations', 'fa-graduation-cap', '#6366F1', 7),
('Entertainment', 'Giai tri', 'entertainment', 'Movies, music, games, and leisure activities', 'fa-film', '#F97316', 8),
('Technology', 'Cong nghe', 'technology', 'Tech discussions, gadgets, software, and digital topics', 'fa-laptop', '#14B8A6', 9),
('Social', 'Xa hoi', 'social', 'Making friends, social events, and interpersonal conversations', 'fa-users', '#A855F7', 10);

-- =====================================================
-- INITIAL DATA - BADGES
-- =====================================================
INSERT INTO forum_badges (code, name, description, icon, color, requirement_type, requirement_value, rarity) VALUES
-- Posts badges
('first_post', 'First Share', 'Shared your first conversation', 'fa-star', '#F59E0B', 'posts_count', 1, 'common'),
('contributor_5', 'Active Sharer', 'Shared 5 conversations', 'fa-share-alt', '#3B82F6', 'posts_count', 5, 'common'),
('contributor_20', 'Generous Teacher', 'Shared 20 conversations', 'fa-chalkboard-teacher', '#8B5CF6', 'posts_count', 20, 'uncommon'),
('contributor_50', 'Content Creator', 'Shared 50 conversations', 'fa-crown', '#F59E0B', 'posts_count', 50, 'rare'),
('contributor_100', 'Community Pillar', 'Shared 100 conversations', 'fa-trophy', '#EF4444', 'posts_count', 100, 'epic'),

-- Import badges (how many times your content was imported)
('helpful_5', 'Helpful', '5 people imported your conversations', 'fa-hands-helping', '#10B981', 'imports_count', 5, 'common'),
('helpful_25', 'Very Helpful', '25 people imported your conversations', 'fa-hand-holding-heart', '#14B8A6', 'imports_count', 25, 'uncommon'),
('helpful_100', 'Community Hero', '100 people imported your conversations', 'fa-medal', '#F59E0B', 'imports_count', 100, 'rare'),
('helpful_500', 'Legendary Teacher', '500 people imported your conversations', 'fa-gem', '#EC4899', 'imports_count', 500, 'legendary'),

-- Upvote badges
('liked_10', 'Rising Star', 'Received 10 upvotes', 'fa-thumbs-up', '#3B82F6', 'upvotes_count', 10, 'common'),
('liked_50', 'Popular', 'Received 50 upvotes', 'fa-fire', '#F97316', 'upvotes_count', 50, 'uncommon'),
('liked_200', 'Beloved', 'Received 200 upvotes', 'fa-heart', '#EF4444', 'upvotes_count', 200, 'rare'),

-- Reputation badges
('rep_100', 'Trusted Member', 'Reached 100 reputation', 'fa-shield-alt', '#6366F1', 'reputation', 100, 'common'),
('rep_500', 'Respected', 'Reached 500 reputation', 'fa-award', '#8B5CF6', 'reputation', 500, 'uncommon'),
('rep_1000', 'Expert', 'Reached 1000 reputation', 'fa-certificate', '#F59E0B', 'reputation', 1000, 'rare'),
('rep_5000', 'Legend', 'Reached 5000 reputation', 'fa-crown', '#EF4444', 'reputation', 5000, 'legendary');

-- =====================================================
-- Initialize reputation for existing users
-- =====================================================
INSERT INTO forum_reputation (user_id, reputation, `rank`)
SELECT id, 0, 'newcomer' FROM users
ON DUPLICATE KEY UPDATE user_id = user_id;
