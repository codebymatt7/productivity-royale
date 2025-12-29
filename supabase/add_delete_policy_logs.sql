-- Add DELETE policy for logs table
-- This allows users to delete their own logs (needed for uncomplete functionality)

DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'logs' 
    AND policyname = 'Users can delete own logs'
  ) THEN
    CREATE POLICY "Users can delete own logs" ON public.logs
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

