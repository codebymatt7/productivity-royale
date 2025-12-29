-- Fix all points issues:
-- 1. Remove all penalty logs (they'll be recalculated correctly by the new system)
-- 2. Remove weekly logs from point calculations (weekly shouldn't affect points)
-- 3. Recalculate all character_stats correctly

-- Step 1: Delete all penalty logs (safe - they're recalculated daily by the app)
DELETE FROM public.logs
WHERE category = 'penalty';

-- Step 2: Recalculate character_stats from logs (excluding weekly)
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

-- Step 3: Ensure all users have character_stats entries
INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
SELECT 
  id, 
  0, 0, 0, 0, 0,  -- Default values
  NOW()
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Show results
SELECT 
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_from_logs,
  (SELECT COUNT(*) FROM public.logs WHERE user_id = u.id AND category = 'penalty') as remaining_penalties
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

