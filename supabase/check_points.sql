-- Quick diagnostic: Check if points exist in logs and character_stats
-- Run this first to see what's in your database

-- 1. Check logs - see if points are being saved
SELECT 
  category,
  COUNT(*) as count,
  SUM(points) as total_points,
  AVG(points) as avg_points,
  MIN(points) as min_points,
  MAX(points) as max_points
FROM public.logs
WHERE category != 'weekly'  -- Exclude weekly ritual
GROUP BY category
ORDER BY category;

-- 2. Check character_stats - see what's stored
SELECT 
  u.username,
  u.display_name,
  cs.total_points,
  cs.strength,
  cs.intelligence,
  cs.charisma,
  cs.willpower,
  cs.updated_at
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

-- 3. Compare: What should total_points be vs what it is
SELECT 
  u.username,
  cs.total_points as stored_points,
  (SELECT SUM(points) FROM public.logs WHERE user_id = u.id AND category != 'weekly') as calculated_points,
  (SELECT COUNT(*) FROM public.logs WHERE user_id = u.id) as total_logs
FROM public.users u
LEFT JOIN public.character_stats cs ON u.id = cs.user_id
ORDER BY cs.total_points DESC NULLS LAST;

