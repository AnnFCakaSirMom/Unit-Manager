-- ==============================================================================
-- SECURITY FIX: CRIT-5 & CRIT-6
-- Audit Date: 2026-05-03
-- ==============================================================================
-- CRIT-5: Replace overly-permissive FOR ALL policies with granular per-operation
--         policies. Officers (weight >= 3) can read/write but NOT delete.
--         DELETE is restricted to Admin+ (weight >= 5) on all tables.
-- CRIT-6: Drop the legacy is_admin() function (no SET search_path, insecure).
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste and run this entire script.
--   3. Verify with the queries at the bottom.
-- ==============================================================================


-- ==============================================================================
-- CRIT-6: Drop legacy is_admin() function (do this first)
-- ==============================================================================
-- This function has no SET search_path = public, making it vulnerable to
-- search_path injection. It is superseded by get_my_role_weight().
-- Dropping it is safe: all current policies use the new JWT-based functions.

DROP FUNCTION IF EXISTS public.is_admin();


-- ==============================================================================
-- CRIT-5: Granular Policies — Replace FOR ALL across all affected tables
-- ==============================================================================
-- Strategy:
--   SELECT  → Officer+ (weight >= 3), or self for own data
--   INSERT  → Officer+ (weight >= 3), or self for own data
--   UPDATE  → Officer+ (weight >= 3), or self for own data
--   DELETE  → Admin+ (weight >= 5) ONLY — no Officer delete
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- TABLE: profile_units
-- Members can manage their OWN units; Officers can manage all.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profile_units_all" ON public.profile_units;

CREATE POLICY "profile_units_select" ON public.profile_units
FOR SELECT USING (
  get_my_role_weight() >= 3
  OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "profile_units_insert" ON public.profile_units
FOR INSERT WITH CHECK (
  get_my_role_weight() >= 3
  OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "profile_units_update" ON public.profile_units
FOR UPDATE USING (
  get_my_role_weight() >= 3
  OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Admin+ only (prevents Officers from wiping a player's entire unit list)
CREATE POLICY "profile_units_delete" ON public.profile_units
FOR DELETE USING (get_my_role_weight() >= 5);


-- ------------------------------------------------------------------------------
-- TABLE: player_info
-- Members can manage their OWN notes; Officers can manage all.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "player_info_all" ON public.player_info;

CREATE POLICY "player_info_select" ON public.player_info
FOR SELECT USING (
  get_my_role_weight() >= 3
  OR player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "player_info_insert" ON public.player_info
FOR INSERT WITH CHECK (
  get_my_role_weight() >= 3
  OR player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "player_info_update" ON public.player_info
FOR UPDATE USING (
  get_my_role_weight() >= 3
  OR player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Admin+ only
CREATE POLICY "player_info_delete" ON public.player_info
FOR DELETE USING (get_my_role_weight() >= 5);


-- ------------------------------------------------------------------------------
-- TABLE: groups
-- Officer+ for all operations except delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "groups_officer_all" ON public.groups;

CREATE POLICY "groups_select" ON public.groups
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "groups_insert" ON public.groups
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "groups_update" ON public.groups
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Admin+ only (prevents an Officer from deleting all TW groups)
CREATE POLICY "groups_delete" ON public.groups
FOR DELETE USING (get_my_role_weight() >= 5);


-- ------------------------------------------------------------------------------
-- TABLE: group_members
-- Officer+ for all operations except delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "group_members_officer_all" ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "group_members_insert" ON public.group_members
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "group_members_update" ON public.group_members
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Officer+ allowed here — removing a member from a group is a normal op
-- Admin+ still implicitly covered since they also have weight >= 3.
CREATE POLICY "group_members_delete" ON public.group_members
FOR DELETE USING (get_my_role_weight() >= 3);


-- ------------------------------------------------------------------------------
-- TABLE: tw_import_list
-- Officer+ for all ops. DELETE kept at Officer+ (temporary staging table).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tw_import_list_officer_all" ON public.tw_import_list;

CREATE POLICY "tw_import_list_select" ON public.tw_import_list
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "tw_import_list_insert" ON public.tw_import_list
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "tw_import_list_update" ON public.tw_import_list
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Officer+ (clearing the import list after a TW is a routine operation)
CREATE POLICY "tw_import_list_delete" ON public.tw_import_list
FOR DELETE USING (get_my_role_weight() >= 3);


-- ------------------------------------------------------------------------------
-- TABLE: tw_attendance_records
-- Officer+ for all ops except delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tw_attendance_officer_all" ON public.tw_attendance_records;

CREATE POLICY "tw_attendance_select" ON public.tw_attendance_records
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "tw_attendance_insert" ON public.tw_attendance_records
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "tw_attendance_update" ON public.tw_attendance_records
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Admin+ only (prevents accidental or malicious record wipes by Officers)
CREATE POLICY "tw_attendance_delete" ON public.tw_attendance_records
FOR DELETE USING (get_my_role_weight() >= 5);


-- ------------------------------------------------------------------------------
-- TABLE: tw_events
-- Officer+ for all ops except delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tw_events_officer_all" ON public.tw_events;

CREATE POLICY "tw_events_select" ON public.tw_events
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "tw_events_insert" ON public.tw_events
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "tw_events_update" ON public.tw_events
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Admin+ only
CREATE POLICY "tw_events_delete" ON public.tw_events
FOR DELETE USING (get_my_role_weight() >= 5);


-- ------------------------------------------------------------------------------
-- TABLE: tw_seasons
-- Officer+ for all ops except delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tw_seasons_officer_all" ON public.tw_seasons;

CREATE POLICY "tw_seasons_select" ON public.tw_seasons
FOR SELECT USING (get_my_role_weight() >= 3);

CREATE POLICY "tw_seasons_insert" ON public.tw_seasons
FOR INSERT WITH CHECK (get_my_role_weight() >= 3);

CREATE POLICY "tw_seasons_update" ON public.tw_seasons
FOR UPDATE USING (get_my_role_weight() >= 3);

-- DELETE: Admin+ only (deleting a season cascades to events and records)
CREATE POLICY "tw_seasons_delete" ON public.tw_seasons
FOR DELETE USING (get_my_role_weight() >= 5);


-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- 1. Confirm is_admin() is gone:
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_admin';
-- Expected: 0 rows

-- 2. Confirm no FOR ALL policies remain on the affected tables:
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

-- 3. Spot-check DELETE policies — confirm Admin+ restriction on key tables:
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'DELETE'
  AND tablename IN ('profile_units', 'groups', 'tw_seasons', 'tw_attendance_records')
ORDER BY tablename;
-- Expected: qual should reference 'get_my_role_weight() >= 5' for these tables
