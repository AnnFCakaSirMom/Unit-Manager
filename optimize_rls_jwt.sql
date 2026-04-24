-- ==============================================================================
-- RLS N+1 OPTIMIZATION: JWT-Based Role Claims
-- Version: 1.0 | Applies on top of secure_hierarchy.sql v2.5
-- ==============================================================================
-- Purpose: Eliminates the N+1 query problem in get_my_role_weight() by
--   reading the user's role directly from the JWT token instead of querying
--   the profiles table on every single row evaluated by RLS policies.
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste and run this entire script
--   3. No restart or logout required. Changes take effect immediately.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- STEP 1: Trigger function – syncs 'role' to JWT app_metadata on change
-- ------------------------------------------------------------------------------
-- Fires AFTER INSERT or UPDATE of role/user_id on profiles.
-- Safely skips profiles not yet linked to an auth user (user_id IS NULL).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Guard: Skip profiles not yet linked to an auth user
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Guard: Skip if role didn't actually change (avoids unnecessary writes)
  IF TG_OP = 'UPDATE' AND OLD.role = NEW.role AND OLD.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Write the role into the auth user's app_metadata in auth.users
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) 
                          || jsonb_build_object('user_role', NEW.role)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ------------------------------------------------------------------------------
-- STEP 2: Attach trigger to profiles table
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;

CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role, user_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_role_to_jwt();


-- ------------------------------------------------------------------------------
-- STEP 3: Update get_my_role_weight() – fast JWT path with safe fallback
-- ------------------------------------------------------------------------------
-- Fast path: reads role from JWT app_metadata (0 extra DB queries).
-- Fallback:  reads from profiles table for users whose JWT hasn't been
--            refreshed yet (e.g. immediately after first login / backfill).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_role_weight()
RETURNS INTEGER AS $$
DECLARE
  my_role TEXT;
BEGIN
  -- Fast path: read role from JWT (zero extra queries)
  my_role := auth.jwt() -> 'app_metadata' ->> 'user_role';

  -- Fallback: profiles table (covers users without JWT claim yet)
  IF my_role IS NULL THEN
    SELECT role INTO my_role
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN role_to_weight(COALESCE(my_role, 'Guest'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ------------------------------------------------------------------------------
-- STEP 4: Backfill – populate app_metadata for all currently linked profiles
-- ------------------------------------------------------------------------------
-- This ensures existing logged-in users benefit immediately, without needing
-- to wait for a role change to trigger the new trigger function.
-- Only affects profiles with a linked auth user (user_id IS NOT NULL).
-- ------------------------------------------------------------------------------
UPDATE auth.users au
SET raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('user_role', p.role)
FROM public.profiles p
WHERE p.user_id = au.id
  AND p.user_id IS NOT NULL;


-- ==============================================================================
-- DONE.
-- Verification query (optional – run separately to confirm):
--   SELECT au.email, au.raw_app_meta_data ->> 'user_role' AS jwt_role, p.role AS profile_role
--   FROM auth.users au
--   JOIN public.profiles p ON p.user_id = au.id
--   ORDER BY au.email;
-- ==============================================================================
