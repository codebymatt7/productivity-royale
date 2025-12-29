-- Create a function to handle log updates and recalculate points
CREATE OR REPLACE FUNCTION update_character_stats_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- First, subtract the old points
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
    UPDATE public.character_stats
    SET total_points = total_points - OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;

  -- Then, add the new points
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
    UPDATE public.character_stats
    SET total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats when a log is updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_log_updated' 
    AND tgrelid = 'public.logs'::regclass
  ) THEN
    CREATE TRIGGER on_log_updated
      AFTER UPDATE ON public.logs
      FOR EACH ROW
      WHEN (OLD.points IS DISTINCT FROM NEW.points OR OLD.category IS DISTINCT FROM NEW.category)
      EXECUTE FUNCTION update_character_stats_on_update();
  END IF;
END $$;

