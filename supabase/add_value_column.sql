-- Add value column to logs table if it doesn't exist
-- Run this in your Supabase SQL Editor

ALTER TABLE public.logs 
ADD COLUMN IF NOT EXISTS value INTEGER DEFAULT 0;

