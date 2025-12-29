-- Diagnostic script to check why a specific user has 0 points
-- Replace 'YOUR_USER_ID' with your actual user ID from the users table

-- First, let's see all users and their points
SELECT 
  u.id,
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  cs.updated_at,
  (SELECT COUNT(*) FROM public.logs WHERE user_id = u.id) as total_logs,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_from_logs
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

-- Check if character_stats entry exists for all users
SELECT 
  u.id,
  u.username,
  CASE WHEN cs.user_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as stats_entry
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id;

-- Check recent logs to see if points are being saved
SELECT 
  user_id,
  category,
  points,
  activity_name,
  log_date,
  created_at
FROM public.logs
WHERE category != 'weekly'
ORDER BY created_at DESC
LIMIT 20;

-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.logs'::regclass
AND tgname = 'on_log_created';

