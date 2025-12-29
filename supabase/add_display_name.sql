-- Add display_name column to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing users to use username as display_name if display_name is null
UPDATE public.users 
SET display_name = username 
WHERE display_name IS NULL;

