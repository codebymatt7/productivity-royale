-- Enable the trigger that updates character_stats when logs are inserted
-- The trigger exists but is disabled (enabled = 0)

-- Enable the trigger
ALTER TABLE public.logs ENABLE TRIGGER on_log_created;

-- Verify it's enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED ✅'
    WHEN 'D' THEN 'DISABLED ❌'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgrelid = 'public.logs'::regclass
AND tgname = 'on_log_created';

