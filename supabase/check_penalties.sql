-- Check what penalties exist and their impact
-- This will help us understand why points are negative

-- 1. See all penalty logs
SELECT 
  user_id,
  log_date,
  activity_name,
  points,
  created_at
FROM public.logs
WHERE category = 'penalty'
ORDER BY created_at DESC;

-- 2. Sum of penalties vs positive points per user
SELECT 
  u.username,
  u.display_name,
  COALESCE(SUM(CASE WHEN l.category = 'penalty' THEN l.points ELSE 0 END), 0) as total_penalties,
  COALESCE(SUM(CASE WHEN l.category != 'penalty' AND l.category != 'weekly' AND l.points > 0 THEN l.points ELSE 0 END), 0) as total_positive_points,
  COALESCE(SUM(CASE WHEN l.category != 'weekly' THEN l.points ELSE 0 END), 0) as net_points
FROM public.users u
LEFT JOIN public.logs l ON u.id = l.user_id
GROUP BY u.id, u.username, u.display_name
ORDER BY net_points DESC;

-- 3. Breakdown by category
SELECT 
  u.username,
  l.category,
  COUNT(*) as count,
  SUM(l.points) as total_points
FROM public.users u
LEFT JOIN public.logs l ON u.id = l.user_id
WHERE l.category IS NOT NULL
GROUP BY u.id, u.username, l.category
ORDER BY u.username, l.category;

