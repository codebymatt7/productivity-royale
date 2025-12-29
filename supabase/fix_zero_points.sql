-- Fix users with 0 points by ensuring character_stats exists and recalculating
-- This will fix any users stuck at 0 points

-- Step 1: Ensure ALL users have character_stats entries
INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
SELECT 
  id, 
  0, 0, 0, 0, 0,  -- Default values
  NOW()
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Recalculate ALL character_stats from logs (this will fix 0 point issues)
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

-- Step 3: Show results with comparison
SELECT 
  u.username,
  u.display_name,
  cs.total_points as stored_points,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_points,
  (SELECT COUNT(*) FROM public.logs WHERE user_id = u.id) as total_logs,
  CASE 
    WHEN cs.total_points = 0 AND (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') > 0 
    THEN '⚠️ MISMATCH - Points exist in logs but stats show 0'
    WHEN cs.total_points = (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly')
    THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH'
  END as status
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

