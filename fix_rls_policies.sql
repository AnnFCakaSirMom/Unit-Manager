-- ============================================================
-- SECURITY FIX: "The Shield" RLS Policies (v2.0)
-- Purpose: Allow Admins to manage everything, Members to manage self.
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Helper function to check if current user is Admin/Owner
-- This prevents infinite recursion in RLS policies.
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role IN ('Admin', 'Owner', 'Officer')) 
    FROM profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_info ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_member_update" ON profiles;

-- ============================================================
-- POLICIES FOR 'profiles'
-- ============================================================

-- SELECT: Everyone authenticated can see all profiles
CREATE POLICY "profiles_select_all" ON profiles
FOR SELECT TO authenticated USING (true);

-- ALL: Admins/Officers can do everything (Insert, Update, Delete)
CREATE POLICY "profiles_admin_all" ON profiles
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- UPDATE: Members can update their OWN profile
CREATE POLICY "profiles_member_update" ON profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ============================================================
-- POLICIES FOR 'profile_units' (The junction table)
-- ============================================================

DROP POLICY IF EXISTS "units_select_all" ON profile_units;
DROP POLICY IF EXISTS "units_admin_all" ON profile_units;
DROP POLICY IF EXISTS "units_member_manage" ON profile_units;

CREATE POLICY "units_select_all" ON profile_units 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "units_admin_all" ON profile_units 
FOR ALL TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "units_member_manage" ON profile_units 
FOR ALL TO authenticated 
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));


-- ============================================================
-- POLICIES FOR 'player_info' (The notes table)
-- ============================================================

DROP POLICY IF EXISTS "info_select_all" ON player_info;
DROP POLICY IF EXISTS "info_admin_all" ON player_info;

CREATE POLICY "info_select_all" ON player_info 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "info_admin_all" ON player_info 
FOR ALL TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'profile_units', 'player_info');
