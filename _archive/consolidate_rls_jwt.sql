-- ==============================================================================
-- RLS CONSOLIDATION & SECURITY AUDIT (May 2026)
-- ==============================================================================
-- Purpose:
--   1. Removes ALL legacy policies, including those that might use insecure 'user_metadata'.
--   2. Consolidates multiple redundant policies into single, high-performance rules.
--   3. Standardizes the use of get_my_role_weight() (JWT-optimized) across all tables.
--   4. Addresses Supabase Security Advisor warnings regarding policy redundancy and performance.
--
-- HOW TO APPLY:
--   1. Run this script in the Supabase SQL Editor.
--   2. Ensure secure_hierarchy.sql v2.6+ has been run previously (for the weight functions).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CLEANUP: Drop ALL known legacy and redundant policy names
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE 
    t record;
BEGIN
    FOR t IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'profile_units', 'player_info', 
            'groups', 'group_members', 'tw_history', 
            'audit_logs', 'tw_attendance_records', 
            'tw_events', 'tw_seasons', 'tw_import_list'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t.policyname, t.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- TABLE: profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Members see only self. Officer+ (weight >= 3) see ALL.
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (get_my_role_weight() >= 3 OR user_id = auth.uid());

-- INSERT: Gatekeeper+ (weight >= 4) or users creating their OWN profile.
CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (get_my_role_weight() >= 4 OR user_id = auth.uid());

-- UPDATE: Hierarchy-based. Owners/Admins manage below them. Members manage self (excluding role).
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (user_id = auth.uid() OR can_manage_role_weight(role))
WITH CHECK (
    (user_id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id))
    OR (can_manage_role_weight(role))
);

-- DELETE: Admin+ (weight >= 5). Cannot delete Owner unless self is Owner.
CREATE POLICY "profiles_delete" ON public.profiles
FOR DELETE USING (get_my_role_weight() >= 5 AND (role != 'Owner' OR get_my_role_weight() = 6));

-- ------------------------------------------------------------------------------
-- TABLE: profile_units & player_info
-- ------------------------------------------------------------------------------
ALTER TABLE public.profile_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_info ENABLE ROW LEVEL SECURITY;

-- Consolidated policy for profile_units: Owner or Officer+ can manage.
CREATE POLICY "profile_units_all" ON public.profile_units
FOR ALL USING (
    get_my_role_weight() >= 3 
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Consolidated policy for player_info: Owner or Officer+ can manage.
CREATE POLICY "player_info_all" ON public.player_info
FOR ALL USING (
    get_my_role_weight() >= 3 
    OR player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- TABLES: groups, group_members, tw_import_list
-- ------------------------------------------------------------------------------
-- These tables are strictly for internal planning and are only accessible by Officer+ (weight >= 3).
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_import_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_officer_all" ON public.groups FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "group_members_officer_all" ON public.group_members FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "tw_import_list_officer_all" ON public.tw_import_list FOR ALL USING (get_my_role_weight() >= 3);

-- ------------------------------------------------------------------------------
-- TABLES: tw_attendance_records, tw_events, tw_seasons, tw_history
-- ------------------------------------------------------------------------------
-- Historical and planning data. Officer+ access.
ALTER TABLE public.tw_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tw_attendance_officer_all" ON public.tw_attendance_records FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "tw_events_officer_all" ON public.tw_events FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "tw_seasons_officer_all" ON public.tw_seasons FOR ALL USING (get_my_role_weight() >= 3);

-- TW History Select: Everyone (for historical interest)
CREATE POLICY "tw_history_select" ON public.tw_history FOR SELECT USING (true);
-- TW History Manage: Officer+
CREATE POLICY "tw_history_manage" ON public.tw_history FOR ALL USING (get_my_role_weight() >= 3);

-- ------------------------------------------------------------------------------
-- TABLE: audit_logs
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: Authenticated users can write logs (for system actions).
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- SELECT: Admin+ (weight >= 5) only.
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (get_my_role_weight() >= 5);

-- ------------------------------------------------------------------------------
-- FINAL VERIFICATION
-- ------------------------------------------------------------------------------
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
