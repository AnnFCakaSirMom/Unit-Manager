-- ==============================================================================
-- CLEANUP: Drop All Remaining Legacy FOR ALL Policies
-- Audit Date: 2026-05-03
-- ==============================================================================
-- Problem: Legacy FOR ALL policies from older migration scripts still exist
-- alongside the new granular policies from fix_crit5_crit6.sql.
-- In PostgreSQL, permissive policies are OR'd together, so any surviving
-- FOR ALL policy grants Officers full DELETE access — bypassing CRIT-5 fixes.
--
-- This script drops every legacy policy by its exact name as found in the
-- verification query output.
--
-- HOW TO APPLY:
--   1. Run fix_crit5_crit6.sql first (if not already done).
--   2. Paste and run this entire script in the Supabase SQL Editor.
--   3. Re-run verification query 2 from fix_crit5_crit6.sql to confirm 0 rows.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- group_members: 3 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group members Officer access"             ON public.group_members;
DROP POLICY IF EXISTS "Leadership only access to group_members"  ON public.group_members;
DROP POLICY IF EXISTS "Only leadership can manage group members" ON public.group_members;

-- ------------------------------------------------------------------------------
-- groups: 3 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Groups Officer access"            ON public.groups;
DROP POLICY IF EXISTS "Leadership only access to groups" ON public.groups;
DROP POLICY IF EXISTS "Only leadership can manage groups" ON public.groups;

-- ------------------------------------------------------------------------------
-- player_info: 2 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all access for owners" ON public.player_info;
DROP POLICY IF EXISTS "Leadership write access"      ON public.player_info;

-- ------------------------------------------------------------------------------
-- profile_units: 1 legacy FOR ALL policy
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Units management" ON public.profile_units;

-- ------------------------------------------------------------------------------
-- tw_attendance_records: 2 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manageable by leadership" ON public.tw_attendance_records;
DROP POLICY IF EXISTS "TW Officer management"    ON public.tw_attendance_records;

-- ------------------------------------------------------------------------------
-- tw_events: 2 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manageable by leadership" ON public.tw_events;
DROP POLICY IF EXISTS "TW Events access"         ON public.tw_events;

-- ------------------------------------------------------------------------------
-- tw_import_list: 1 legacy FOR ALL policy
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "TW Import Officer access" ON public.tw_import_list;

-- ------------------------------------------------------------------------------
-- tw_seasons: 2 legacy FOR ALL policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manageable by leadership" ON public.tw_seasons;
DROP POLICY IF EXISTS "TW Seasons access"        ON public.tw_seasons;


-- ==============================================================================
-- VERIFICATION — Re-run check 2 from fix_crit5_crit6.sql
-- ==============================================================================

-- Should return 0 rows. Any remaining row is a policy still granting
-- full Officer-level DELETE and must be dropped manually.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profile_units', 'player_info', 'groups', 'group_members',
    'tw_import_list', 'tw_attendance_records', 'tw_events', 'tw_seasons'
  )
  AND cmd = 'ALL'
ORDER BY tablename;
-- Expected: 0 rows
