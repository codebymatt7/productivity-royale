-- Safe recalculation script - NO DELETIONS, just recalculates points
-- This will fix your points without removing any data

-- Step 1: Recalculate all character_stats from logs (this is safe, no deletions)
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

-- Step 2: Ensure all users have character_stats entries (create if missing)
INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
SELECT 
  id, 
  0, 0, 0, 0, 0,  -- Default values
  NOW()
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Show results so you can verify
SELECT 
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  (SELECT COUNT(*) FROM public.logs WHERE user_id = u.id) as total_logs,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_total
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

