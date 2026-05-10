-- ==============================================================================
-- THE SHIELD v2.6: JWT-Optimized & Scalar-Safe Hierarchical Security
-- ==============================================================================
-- 1. Run this script in the Supabase SQL Editor.
-- 2. Fixed: "more than one row returned by a subquery" error.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS (Security Definer + search_path to bypass RLS recursion)
-- ------------------------------------------------------------------------------

-- Map role names to numerical weights for comparison
CREATE OR REPLACE FUNCTION role_to_weight(r TEXT) 
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE r
    WHEN 'Owner' THEN 6
    WHEN 'Admin' THEN 5
    WHEN 'Gatekeeper' THEN 4
    WHEN 'Officer' THEN 3
    WHEN 'Member' THEN 2
    WHEN 'Pending' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get the role weight of the currently authenticated user.
-- Fast path: reads from JWT app_metadata (0 extra DB queries).
-- Fallback:  reads from profiles table for users without a JWT claim yet.
CREATE OR REPLACE FUNCTION get_my_role_weight()
RETURNS INTEGER AS $$
DECLARE
  my_role TEXT;
BEGIN
  -- Fast path: read role from JWT (zero extra queries per row)
  my_role := auth.jwt() -> 'app_metadata' ->> 'user_role';

  -- Fallback: profiles table (covers users whose JWT hasn't refreshed yet)
  IF my_role IS NULL THEN
    SELECT role INTO my_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  RETURN role_to_weight(COALESCE(my_role, 'Guest'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sync role changes to JWT app_metadata so get_my_role_weight() stays fast
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.role = NEW.role AND OLD.user_id = NEW.user_id THEN RETURN NEW; END IF;
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('user_role', NEW.role)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role, user_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_role_to_jwt();

-- Check if current user can manage a target role weight
CREATE OR REPLACE FUNCTION can_manage_role_weight(target_role_name TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  my_weight INTEGER;
  target_weight INTEGER;
BEGIN
  my_weight := get_my_role_weight();
  target_weight := role_to_weight(target_role_name);
  
  -- Owner Immunity
  IF target_role_name = 'Owner' THEN
    RETURN my_weight = 6;
  END IF;
  
  -- Hierarchy: Strictly greater than
  RETURN my_weight > target_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- TABLE: profiles
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS claimed_name TEXT;

DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update hierarchy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete protection" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;

-- SELECT: Members sees ONLY self. Officer+ sees ALL.
CREATE POLICY "Profiles visibility" ON public.profiles
FOR SELECT USING (
  get_my_role_weight() >= 3 OR user_id = auth.uid()
);

-- INSERT: Gatekeeper+ can create profiles
CREATE POLICY "Profiles insert" ON public.profiles
FOR INSERT WITH CHECK (
  get_my_role_weight() >= 4
);

-- UPDATE: Hierarchy based. 
-- Users can update themselves but NOT their own role. 
-- Managers can update anyone below them (including role changes).
CREATE POLICY "Profiles update hierarchy" ON public.profiles
FOR UPDATE USING (
  user_id = auth.uid() OR can_manage_role_weight(role)
) WITH CHECK (
  (
    user_id = auth.uid() 
    AND (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
    )
  ) 
  OR 
  (can_manage_role_weight(role))
);

-- DELETE: Admin+ only, and cannot delete Owner (unless self is Owner)
CREATE POLICY "Profiles delete protection" ON public.profiles
FOR DELETE USING (
  get_my_role_weight() >= 5 AND (
    role != 'Owner' OR get_my_role_weight() = 6
  )
);

-- ------------------------------------------------------------------------------
-- TABLE: profile_units & player_info
-- ------------------------------------------------------------------------------
ALTER TABLE public.profile_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Units visibility" ON public.profile_units;
DROP POLICY IF EXISTS "Units management" ON public.profile_units;

CREATE POLICY "Units visibility" ON public.profile_units
FOR SELECT USING (
  get_my_role_weight() >= 3 OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Units management" ON public.profile_units
FOR ALL USING (
  get_my_role_weight() >= 3 OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- TABLE: groups & group_members
-- ------------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Groups Officer access" ON public.groups;
DROP POLICY IF EXISTS "Group members Officer access" ON public.group_members;

CREATE POLICY "Groups Officer access" ON public.groups
FOR ALL USING (get_my_role_weight() >= 3);

CREATE POLICY "Group members Officer access" ON public.group_members
FOR ALL USING (get_my_role_weight() >= 3);

-- ------------------------------------------------------------------------------
-- TABLE: tw_attendance_records & tw_events & tw_seasons
-- ------------------------------------------------------------------------------
ALTER TABLE public.tw_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tw_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TW Officer visibility" ON public.tw_attendance_records;
DROP POLICY IF EXISTS "TW Officer management" ON public.tw_attendance_records;
DROP POLICY IF EXISTS "TW Events access" ON public.tw_events;
DROP POLICY IF EXISTS "TW Seasons access" ON public.tw_seasons;

CREATE POLICY "TW Officer visibility" ON public.tw_attendance_records FOR SELECT USING (get_my_role_weight() >= 3);
CREATE POLICY "TW Officer management" ON public.tw_attendance_records FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "TW Events access" ON public.tw_events FOR ALL USING (get_my_role_weight() >= 3);
CREATE POLICY "TW Seasons access" ON public.tw_seasons FOR ALL USING (get_my_role_weight() >= 3);

-- ==============================================================================
-- DONE. Hierarchical Security Hardened, Scalar-Safe & JWT-Optimized (v2.6).
-- Run optimize_rls_jwt.sql in Supabase SQL Editor to apply the JWT backfill.
-- ==============================================================================
