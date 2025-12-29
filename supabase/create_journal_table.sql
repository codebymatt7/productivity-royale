-- Create journal_logs table if it doesn't exist
-- Run this in your Supabase SQL Editor if you get "table not found" errors

CREATE TABLE IF NOT EXISTS public.journal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  morning_intention TEXT,
  evening_reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_logs_user_id ON public.journal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_logs_date ON public.journal_logs(date);
CREATE INDEX IF NOT EXISTS idx_journal_logs_user_date ON public.journal_logs(user_id, date);

-- RLS Policies
ALTER TABLE public.journal_logs ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist (safer, no destructive operations)
DO $$
BEGIN
  -- Read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_logs' 
    AND policyname = 'Users can read own journal logs'
  ) THEN
    CREATE POLICY "Users can read own journal logs" ON public.journal_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_logs' 
    AND policyname = 'Users can insert own journal logs'
  ) THEN
    CREATE POLICY "Users can insert own journal logs" ON public.journal_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_logs' 
    AND policyname = 'Users can update own journal logs'
  ) THEN
    CREATE POLICY "Users can update own journal logs" ON public.journal_logs
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

