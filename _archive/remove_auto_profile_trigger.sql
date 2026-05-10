-- ============================================================
-- SCRIPT: Remove Auto-Profile Creation Trigger
-- PROJECT: The Shield / Unit Manager
-- PURPOSE: Stop Supabase from automatically creating ghost
--          profiles when a new user logs in via Discord OAuth.
-- RUN IN: Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Drop the trigger that fires on new auth users
-- (The trigger name is typically 'on_auth_user_created')
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Drop the function the trigger called
-- (The function name is typically 'handle_new_user')
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- VERIFICATION
-- Run this query after the above to confirm they are gone.
-- Expected result: 0 rows returned.
-- ============================================================
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================
-- OPTIONAL CLEANUP: Remove existing ghost profiles
-- WARNING: Only run this if the ghost profiles (e.g. "annfc")
-- have NOT been linked to a real player yet.
-- Double-check by looking at the profiles table first:
--   SELECT * FROM profiles WHERE role = 'Pending';
-- ============================================================

-- DELETE FROM profiles
-- WHERE role = 'Pending'
-- AND display_name IS NULL;  -- Extra safety: only delete truly empty profiles
