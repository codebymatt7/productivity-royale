-- Recalculate all character_stats.total_points from logs
-- This will fix any discrepancies if triggers didn't fire correctly

-- First, reset all stats to 0
UPDATE public.character_stats
SET 
  strength = 0,
  intelligence = 0,
  charisma = 0,
  willpower = 0,
  total_points = 0;

-- Recalculate from all logs
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
    AND category NOT IN ('weekly')
  ), 0),
  updated_at = NOW();

-- Ensure all users have character_stats entries
INSERT INTO public.character_stats (user_id, total_points, updated_at)
SELECT id, 0, NOW()
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

