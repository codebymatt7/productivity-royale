-- Fix the trigger to exclude weekly ritual from point calculations
-- Weekly ritual should NOT affect points (as per user requirement)

CREATE OR REPLACE FUNCTION update_character_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure character_stats entry exists first (create if missing)
  INSERT INTO public.character_stats (user_id, strength, intelligence, charisma, willpower, total_points, updated_at)
  VALUES (NEW.user_id, 0, 0, 0, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Now update the appropriate stat based on category
  -- NOTE: Weekly ritual is intentionally excluded - it doesn't affect points
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
  ELSIF NEW.category = 'penalty' THEN
    -- Penalties affect total_points but not specific stats
    UPDATE public.character_stats
    SET total_points = total_points + NEW.points,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  -- Weekly category is intentionally excluded - it doesn't affect points
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

