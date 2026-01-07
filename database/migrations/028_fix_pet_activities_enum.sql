-- Migration 028: Fix pet_activities ENUM to add 'heart' for gift-giving care type
-- This is needed because daily tasks can reward hearts to pets, which gets logged as activity_type='heart'

-- Add 'heart' to the activity_type ENUM
ALTER TABLE pet_activities
MODIFY COLUMN activity_type ENUM(
  'feed',
  'play',
  'pet',
  'train',
  'walk',
  'gift',
  'evolve',
  'learn_together',
  'heal',
  'revive',
  'death',
  'heart'
) NOT NULL;
