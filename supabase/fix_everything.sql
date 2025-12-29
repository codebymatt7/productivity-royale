-- Complete fix: Enable trigger, remove penalties, recalculate points
-- Run this to fix everything at once

-- Step 1: Enable the trigger (it was disabled!)
ALTER TABLE public.logs ENABLE TRIGGER on_log_created;

-- Step 2: Remove all penalty logs
DELETE FROM public.logs
WHERE category = 'penalty';

-- Step 3: Recalculate all character_stats from logs
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

-- Step 4: Ensure all users have character_stats entries
INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
SELECT 
  id, 
  0, 0, 0, 0, 0,  -- Default values
  NOW()
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.character_stats)
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Show results
SELECT 
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_from_logs,
  CASE 
    WHEN cs.total_points = (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly')
    THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH'
  END as status
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

