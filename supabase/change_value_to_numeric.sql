-- Change value column from INTEGER to NUMERIC to support decimals (for sleep hours)
ALTER TABLE public.logs
ALTER COLUMN value TYPE NUMERIC USING value::NUMERIC;

