-- ============================================================
-- SECURITY FIX: Allow users to create their own Pending profile
-- Purpose: Enables the "Begär åtkomst" (Request Access) button
--          to work by allowing authenticated users to insert
--          their own row into the profiles table.
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Add the INSERT policy
-- This allows any authenticated user to create a profile, 
-- but ONLY if the 'user_id' matches their own Auth ID.
CREATE POLICY "profiles_self_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- STEP 2: Verify the policy exists
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_self_insert';
