-- Fix the trigger to ensure character_stats entries exist before updating
-- This ensures points are always added correctly

CREATE OR REPLACE FUNCTION update_character_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure character_stats entry exists first (create if missing)
  INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
  VALUES (NEW.user_id, 0, 0, 0, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Now update the appropriate stat based on category
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_log_created ON public.logs;
CREATE TRIGGER on_log_created
  AFTER INSERT ON public.logs
  FOR EACH ROW
  EXECUTE FUNCTION update_character_stats();

