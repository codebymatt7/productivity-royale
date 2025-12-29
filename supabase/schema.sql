-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character stats table (1-to-1 with users)
CREATE TABLE IF NOT EXISTS public.character_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  strength INTEGER DEFAULT 0,
  intelligence INTEGER DEFAULT 0,
  charisma INTEGER DEFAULT 0,
  willpower INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs table for daily activities
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  category TEXT NOT NULL, -- 'workout', 'reading', 'social', 'meditation', 'diet', 'sleep', 'penalty', 'weekly'
  value INTEGER DEFAULT 0, -- For storing specific values (pages read, people met, hours slept, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  log_date DATE NOT NULL, -- The calendar date this log is for
  UNIQUE(user_id, category, log_date) -- Ensure one log per category per day per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_log_date ON public.logs(log_date);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON public.logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_character_stats_user_id ON public.character_stats(user_id);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow reading usernames for leaderboard (public read for id and username only)
CREATE POLICY "Public read usernames for leaderboard" ON public.users
  FOR SELECT USING (true);

-- Character stats policies
CREATE POLICY "Users can read own stats" ON public.character_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Allow reading stats for leaderboard (public read)
CREATE POLICY "Public read stats for leaderboard" ON public.character_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update own stats" ON public.character_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.character_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Logs policies
CREATE POLICY "Users can read own logs" ON public.logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON public.logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON public.logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update character stats when a log is created
CREATE OR REPLACE FUNCTION update_character_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the appropriate stat based on category
  IF NEW.category = 'workout' THEN
    UPDATE public.character_stats
    SET strength = strength + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'reading' THEN
    UPDATE public.character_stats
    SET intelligence = intelligence + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'social' THEN
    UPDATE public.character_stats
    SET charisma = charisma + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'meditation' THEN
    UPDATE public.character_stats
    SET willpower = willpower + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'diet' THEN
    UPDATE public.character_stats
    SET willpower = willpower + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'sleep' THEN
    UPDATE public.character_stats
    SET willpower = willpower + NEW.points,
        total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'penalty' OR NEW.category = 'weekly' THEN
    -- Penalties and weekly entries affect total_points but not specific stats
    UPDATE public.character_stats
    SET total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  -- Create character_stats entry if it doesn't exist
  INSERT INTO public.character_stats (user_id, total_points, updated_at)
  VALUES (NEW.user_id, NEW.points, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stats
CREATE TRIGGER on_log_created
  AFTER INSERT ON public.logs
  FOR EACH ROW
  EXECUTE FUNCTION update_character_stats();

