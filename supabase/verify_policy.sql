-- Verify that the INSERT policy exists
-- Run this to check if the policy was created successfully

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND policyname = 'Users can insert own data';

-- If this returns a row, the policy exists. If it returns nothing, the policy doesn't exist.

