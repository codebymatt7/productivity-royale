-- Migration to fix RLS policies and ensure username uniqueness
-- Run this in your Supabase SQL Editor

-- 1. Add INSERT policy for users table (fixes signup error)
CREATE POLICY IF NOT EXISTS "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Ensure username is unique (should already exist, but adding for safety)
-- This constraint should already exist, but we'll verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- 3. Verify all RLS policies are in place
-- Users policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data" ON public.users
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

