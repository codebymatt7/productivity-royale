-- Add value column to logs table
ALTER TABLE public.logs 
ADD COLUMN IF NOT EXISTS value INTEGER DEFAULT 0;

-- Update existing logs to have value = points for backward compatibility
UPDATE public.logs 
SET value = points 
WHERE value IS NULL OR value = 0;

