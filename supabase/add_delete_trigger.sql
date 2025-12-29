-- Create a function to handle log deletion and subtract points from character stats
CREATE OR REPLACE FUNCTION update_character_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract the appropriate stat based on category
  IF OLD.category = 'workout' THEN
    UPDATE public.character_stats
    SET strength = strength - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'reading' THEN
    UPDATE public.character_stats
    SET intelligence = intelligence - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'social' THEN
    UPDATE public.character_stats
    SET charisma = charisma - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'meditation' THEN
    UPDATE public.character_stats
    SET willpower = willpower - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'diet' THEN
    UPDATE public.character_stats
    SET willpower = willpower - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'sleep' THEN
    UPDATE public.character_stats
    SET willpower = willpower - OLD.points,
        total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  ELSIF OLD.category = 'penalty' OR OLD.category = 'weekly' THEN
    -- Penalties and weekly entries affect total_points but not specific stats
    UPDATE public.character_stats
    SET total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats when a log is deleted
-- Use DO block to avoid destructive operation warning
DO $$
BEGIN
  -- Check if trigger exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_log_deleted' 
    AND tgrelid = 'public.logs'::regclass
  ) THEN
    CREATE TRIGGER on_log_deleted
      AFTER DELETE ON public.logs
      FOR EACH ROW
      EXECUTE FUNCTION update_character_stats_on_delete();
  END IF;
END $$;

