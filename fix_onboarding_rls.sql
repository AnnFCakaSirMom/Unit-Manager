-- ============================================================
-- SECURITY FIX: Allow users to create their own Pending profile
-- Purpose: Enables the "Request Access" button to work.
--          Allows authenticated users to insert their own row 
--          into the profiles table.
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Add the INSERT policy
-- This allows any authenticated user to create a profile, 
-- but ONLY if the 'id' and 'user_id' match their own Auth ID.
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;

CREATE POLICY "profiles_self_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id AND 
  auth.uid() = user_id
);

-- STEP 2: Verify the policy exists
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_self_insert';
