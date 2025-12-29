-- Fix penalty points: Remove excessive penalties and recalculate correctly
-- This script will:
-- 1. Remove all existing penalty logs (they'll be recalculated correctly)
-- 2. Recalculate total_points from scratch

-- Step 1: Delete all existing penalty logs (we'll let the system recalculate them correctly)
-- Note: This is safe because penalties are recalculated daily
DELETE FROM public.logs
WHERE category = 'penalty';

-- Step 2: Recalculate all character_stats from remaining logs
UPDATE public.character_stats cs
SET 
  strength = COALESCE((
    SELECT SUM(points) 
    FROM public.logs 
    WHERE user_id = cs.user_id 
    AND category = 'workout'
  ), 0),
  intelligence = COALESCE((
    SELECT SUM(points) 
    FROM public.logs 
    WHERE user_id = cs.user_id 
    AND category = 'reading'
  ), 0),
  charisma = COALESCE((
    SELECT SUM(points) 
    FROM public.logs 
    WHERE user_id = cs.user_id 
    AND category = 'social'
  ), 0),
  willpower = COALESCE((
    SELECT SUM(points) 
    FROM public.logs 
    WHERE user_id = cs.user_id 
    AND category IN ('meditation', 'diet', 'sleep')
  ), 0),
  total_points = COALESCE((
    SELECT SUM(points) 
    FROM public.logs 
    WHERE user_id = cs.user_id
    AND category != 'weekly'  -- Weekly ritual doesn't affect points
  ), 0),
  updated_at = NOW();

-- Step 3: Show results
SELECT 
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

