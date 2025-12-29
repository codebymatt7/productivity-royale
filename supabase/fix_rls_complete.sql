-- Complete RLS fix - run this if the previous migration didn't work
-- This will ensure the policy exists and is correct

-- Step 1: Check current policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Step 2 & 3: Create the policy if it doesn't exist (safer, no destructive operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data" ON public.users
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Step 4: Verify it was created
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND policyname = 'Users can insert own data';

-- If you see a row returned, the policy is now active!

