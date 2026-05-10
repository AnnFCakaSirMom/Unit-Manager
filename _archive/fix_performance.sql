-- ==============================================================================
-- PERFORMANCE & INTEGRITY: Part 3 Audit Fixes
-- Audit Date: 2026-05-03
-- ==============================================================================
-- 1. Missing indexes on audit_logs (debounce query and general filtering)
-- 2. Missing index on profile_units.profile_id (every player fetch joins this)
-- 3. Missing index on group_members.group_id  (every group fetch joins this)
-- 4. ON DELETE CASCADE on profile_units -> profiles (prevent zombie unit rows)
-- 5. ON DELETE CASCADE on group_members -> groups  (prevent zombie member rows)
-- 6. Mark get_my_role_weight() as STABLE (allows planner to cache per-statement)
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste and run this entire script.
--   3. Verify with the queries at the bottom.
-- ==============================================================================


-- ==============================================================================
-- 1. Index: audit_logs — composite for the 5-minute debounce query
-- ==============================================================================
-- The auditService debounce filters on actor_id + target_id + action_type + created_at.
-- Without this index, every SMALL_CHANGE action does a full table scan.
CREATE INDEX IF NOT EXISTS idx_audit_logs_debounce
  ON public.audit_logs (actor_id, target_id, action_type, created_at DESC);

-- General filtering index for the admin log viewer (date range + type queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);


-- ==============================================================================
-- 2. Index: profile_units.profile_id
-- ==============================================================================
-- Every fetchPlayersFromSupabase call does a nested join on this column.
-- Supabase may create this automatically for FK columns, but IF NOT EXISTS is safe.
CREATE INDEX IF NOT EXISTS idx_profile_units_profile_id
  ON public.profile_units (profile_id);


-- ==============================================================================
-- 3. Index: group_members.group_id
-- ==============================================================================
-- Every fetchGroupsFromSupabase call does a nested join on this column.
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
  ON public.group_members (group_id);


-- ==============================================================================
-- 4. ON DELETE CASCADE: profile_units -> profiles
-- ==============================================================================
-- Without CASCADE, deleting a profile leaves orphaned profile_units rows.
-- The app currently relies on manual deletion in playerService — if that fails
-- mid-operation, zombie unit rows accumulate permanently.
--
-- Step 1: Find and drop the existing FK constraint by name.
-- Step 2: Re-add with ON DELETE CASCADE.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.profile_units'::regclass
    AND confrelid = 'public.profiles'::regclass
    AND contype = 'f'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profile_units DROP CONSTRAINT %I', fk_name);
    RAISE NOTICE 'Dropped existing FK: %', fk_name;
  END IF;
END $$;

ALTER TABLE public.profile_units
  ADD CONSTRAINT profile_units_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;


-- ==============================================================================
-- 5. ON DELETE CASCADE: group_members -> groups
-- ==============================================================================
-- Without CASCADE, deleting a group leaves orphaned group_members rows.
-- groupService manually deletes members before deleting the group — if the
-- DELETE on group_members fails, the group row remains undeleteable.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.group_members'::regclass
    AND confrelid = 'public.groups'::regclass
    AND contype = 'f'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.group_members DROP CONSTRAINT %I', fk_name);
    RAISE NOTICE 'Dropped existing FK: %', fk_name;
  END IF;
END $$;

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.groups(id)
  ON DELETE CASCADE;


-- ==============================================================================
-- 6. Mark get_my_role_weight() as STABLE
-- ==============================================================================
-- STABLE tells PostgreSQL that within a single SQL statement, the function
-- returns the same result for the same inputs. Since auth.jwt() does not change
-- mid-statement, this is accurate. It allows the query planner to evaluate the
-- function once per statement instead of once per row, significantly reducing
-- overhead on large tables with many RLS-protected rows.
CREATE OR REPLACE FUNCTION get_my_role_weight()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE                            -- Safe: JWT does not change within a statement
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role TEXT;
BEGIN
  -- Fast path: read role from JWT (zero extra queries)
  my_role := auth.jwt() -> 'app_metadata' ->> 'user_role';

  -- Fallback: profiles table (covers users whose JWT hasn't refreshed yet)
  IF my_role IS NULL THEN
    SELECT role INTO my_role
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN role_to_weight(COALESCE(my_role, 'Guest'));
END;
$$;


-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- 1. Confirm all 4 indexes exist:
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_audit_logs_debounce',
    'idx_audit_logs_created_at',
    'idx_profile_units_profile_id',
    'idx_group_members_group_id'
  )
ORDER BY tablename, indexname;
-- Expected: 4 rows

-- 2. Confirm CASCADE FKs on profile_units and group_members:
SELECT conname, conrelid::regclass AS table_name, confdeltype
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid IN (
    'public.profile_units'::regclass,
    'public.group_members'::regclass
  );
-- Expected: confdeltype = 'c' (CASCADE) for both tables

-- 3. Confirm get_my_role_weight() is now STABLE:
SELECT proname, provolatile
FROM pg_proc
WHERE proname = 'get_my_role_weight'
  AND pronamespace = 'public'::regnamespace;
-- Expected: provolatile = 's' (STABLE). Previously 'v' (VOLATILE).
