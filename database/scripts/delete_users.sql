-- ============================================================
-- Script to delete users and all related data
-- Users to delete: 5, 6, 7, 9, 10, 11, 12, 13
-- ============================================================

SET @user_ids = '5, 6, 7, 9, 10, 11, 12, 13';

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Chat related tables
-- ============================================================
DELETE FROM chat_message_reads WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM chat_messages WHERE sender_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM chat_conversation_settings WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM chat_conversations WHERE participant1_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR participant2_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM chat_shared_imports WHERE recipient_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Forum related tables
-- ============================================================
DELETE FROM forum_bookmarks WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_collection_followers WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_collections WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_comment_votes WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_comments WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_imports WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_votes WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_posts WHERE author_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_reports WHERE reporter_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR reviewed_by IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_reputation WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM forum_view_history WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Shop related tables
-- ============================================================
DELETE FROM shop_gifts WHERE sender_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR recipient_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM shop_purchases WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR gift_recipient_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM shop_wishlists WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Pet related tables
-- ============================================================
DELETE FROM pet_care_log WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_daily_pet_tasks WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_pet_equipment WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_pet_items WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_pets WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Game related tables
-- ============================================================
DELETE FROM game_leaderboards WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM game_sessions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_game_achievements WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_power_ups WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Learning content (conversations, vocabulary, grammar, exercises)
-- ============================================================
-- Note: exercises reference vocabulary and conversations, so delete in order
DELETE FROM exercise_attempts WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM exercise_sessions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM exercises WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

DELETE FROM grammar_exercise_attempts WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM grammar_exercises WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM grammar_reviews WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM grammar_reviews_v3 WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM grammar_learning_goals WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM grammar_points WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

DELETE FROM vocabulary_reviews WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM vocabulary_reviews_v3 WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM vocabulary WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

DELETE FROM conversations WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Quiz related tables
-- ============================================================
DELETE FROM quiz_attempts WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM quizzes WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Review queues and streaks
-- ============================================================
DELETE FROM daily_grammar_queue WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM daily_grammar_queue_v3 WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM daily_review_queue WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM daily_review_queue_v3 WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM review_streaks WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Word Map / V3 related tables
-- ============================================================
DELETE FROM user_exam_attempts WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_exercise_attempts WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_lesson_content_progress WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_lesson_progress WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_unit_progress WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_map_progress WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_map_achievements WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM map_leaderboards WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM map_user_positions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_vocabulary WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_grammar WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Gamification tables
-- ============================================================
DELETE FROM currency_transactions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_currency WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM xp_transactions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_xp WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_achievements WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM daily_challenges WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM weekly_leaderboards WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- User profile and settings tables
-- ============================================================
DELETE FROM daily_activity_log WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM learning_goals WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM study_sessions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_difficulty_profile WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_equipped_items WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_inventory WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_island_buildings WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_quest_progress WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_statistics WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM user_word_cards WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);
DELETE FROM notification_queue WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Social/blocking tables
-- ============================================================
DELETE FROM user_blocks WHERE blocker_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR blocked_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Sync requests
-- ============================================================
DELETE FROM sync_requests WHERE requester_user_id IN (5, 6, 7, 9, 10, 11, 12, 13) OR syncer_user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- MCP auth sessions
-- ============================================================
DELETE FROM mcp_auth_sessions WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- User status
-- ============================================================
DELETE FROM user_status WHERE user_id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- ============================================================
-- Finally, delete the users themselves
-- ============================================================
DELETE FROM users WHERE id IN (5, 6, 7, 9, 10, 11, 12, 13);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show remaining users
SELECT id, username, email, created_at FROM users ORDER BY id;
