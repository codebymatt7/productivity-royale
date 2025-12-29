-- Fix leaderboard RLS policies to ensure all users can see all users and stats
-- This ensures the leaderboard works properly

-- Drop existing public read policies if they exist (to recreate them correctly)
DO $$
BEGIN
  -- Drop and recreate users public read policy
  DROP POLICY IF EXISTS "Public read usernames for leaderboard" ON public.users;
  CREATE POLICY "Public read usernames for leaderboard" ON public.users
    FOR SELECT USING (true);
  
  -- Drop and recreate character_stats public read policy
  DROP POLICY IF EXISTS "Public read stats for leaderboard" ON public.character_stats;
  CREATE POLICY "Public read stats for leaderboard" ON public.character_stats
    FOR SELECT USING (true);
END $$;

