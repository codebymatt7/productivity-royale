-- Check if the trigger exists and is working
-- This will help diagnose why points aren't updating

-- 1. Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgtype::text as trigger_type,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.logs'::regclass
AND tgname = 'on_log_created';

-- 2. Check if the function exists
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'update_character_stats';

-- 3. Check recent logs to see if points are being inserted
SELECT 
  id,
  user_id,
  category,
  points,
  log_date,
  activity_name,
  created_at
FROM public.logs
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if character_stats are being updated
SELECT 
  cs.user_id,
  u.username,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  cs.updated_at,
  (SELECT SUM(points) FROM public.logs WHERE user_id = cs.user_id AND category != 'weekly') as calculated_from_logs
FROM public.character_stats cs
LEFT JOIN public.users u ON cs.user_id = u.id
ORDER BY cs.updated_at DESC
LIMIT 10;

