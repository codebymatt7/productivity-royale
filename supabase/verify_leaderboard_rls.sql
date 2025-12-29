-- Verify and fix leaderboard RLS policies
-- This ensures all users can see all other users and their stats

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'character_stats')
ORDER BY tablename, policyname;

-- Ensure public read policies exist for both tables
DO $$
BEGIN
  -- Users table: Ensure public read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Public read usernames for leaderboard'
  ) THEN
    CREATE POLICY "Public read usernames for leaderboard" ON public.users
      FOR SELECT USING (true);
    RAISE NOTICE 'Created public read policy for users table';
  ELSE
    RAISE NOTICE 'Public read policy for users already exists';
  END IF;

  -- Character_stats table: Ensure public read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'character_stats' 
    AND policyname = 'Public read stats for leaderboard'
  ) THEN
    CREATE POLICY "Public read stats for leaderboard" ON public.character_stats
      FOR SELECT USING (true);
    RAISE NOTICE 'Created public read policy for character_stats table';
  ELSE
    RAISE NOTICE 'Public read policy for character_stats already exists';
  END IF;
END $$;

-- Verify policies are active
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'character_stats')
  AND policyname LIKE '%leaderboard%'
ORDER BY tablename;

