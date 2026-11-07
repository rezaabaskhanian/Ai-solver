-- +migrate Up
-- Academic profile attributes for student goals, grade, XP, streak, and gamification
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS target_goal VARCHAR(255) DEFAULT 'پزشکی دانشگاه تهران',
  ADD COLUMN IF NOT EXISTS grade INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS track VARCHAR(50) DEFAULT 'tajrobi',
  ADD COLUMN IF NOT EXISTS level INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS xp INT DEFAULT 2450,
  ADD COLUMN IF NOT EXISTS gems INT DEFAULT 320,
  ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS streak_record INT DEFAULT 18;

-- +migrate Down
ALTER TABLE users
  DROP COLUMN IF EXISTS target_goal,
  DROP COLUMN IF EXISTS grade,
  DROP COLUMN IF EXISTS track,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS xp,
  DROP COLUMN IF EXISTS gems,
  DROP COLUMN IF EXISTS streak_days,
  DROP COLUMN IF EXISTS streak_record;

