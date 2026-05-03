-- ==============================================================================
-- SECURITY FIX: CRIT-1 & CRIT-2
-- Audit Date: 2026-05-03
-- ==============================================================================
-- CRIT-1: Prevent self-role escalation via a BEFORE UPDATE trigger.
-- CRIT-2: Lock down audit_logs INSERT to enforce actor identity.
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste and run this entire script.
--   3. Verify results with the queries at the bottom.
-- ==============================================================================


-- ==============================================================================
-- CRIT-1: Self-Role Escalation Prevention
-- ==============================================================================
-- Problem: The RLS WITH CHECK on profiles_update cannot reliably compare NEW.role
-- against OLD.role using a subquery, because PostgreSQL evaluates the subquery
-- against the already-modified row. A Member could submit a role change for
-- themselves and the check would not catch it.
--
-- Fix: A BEFORE UPDATE trigger runs BEFORE the row is written, so it has full
-- access to both OLD.role and NEW.role simultaneously. This is the only reliable
-- way to block self-role escalation at the database level.
-- ==============================================================================

CREATE OR REPLACE FUNCTION prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when the `role` column is actually being changed.
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- If the row being updated belongs to the currently authenticated user,
  -- they are NOT allowed to change their own role. Only a higher-ranking
  -- user (validated by can_manage_role_weight) may do so.
  IF NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION
      'Permission denied: you cannot change your own role (current: %, attempted: %).',
      OLD.role, NEW.role
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach the trigger. DROP first to make this script idempotent.
DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.profiles;

CREATE TRIGGER prevent_self_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_role_change();


-- ==============================================================================
-- CRIT-2: Audit Log INSERT — Enforce Actor Identity
-- ==============================================================================
-- Problem: The current INSERT policy only checks `auth.role() = 'authenticated'`,
-- meaning any logged-in user could insert a log entry with any actor_id,
-- effectively forging another user's actions or spamming false entries.
--
-- Fix: Replace the open policy with one that enforces the actor_id matches
-- the profile row that belongs to the currently authenticated user.
-- ==============================================================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- New policy: authenticated, and actor_id must be YOUR own profile's id.
CREATE POLICY "audit_logs_insert" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND actor_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);


-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- Run these queries separately to confirm the changes were applied.

-- 1. Confirm trigger exists on profiles:
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass
  AND tgname = 'prevent_self_role_escalation';
-- Expected: 1 row, tgenabled = 'O' (origin)

-- 2. Confirm audit_logs INSERT policy is updated:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs' AND cmd = 'INSERT';
-- Expected: policyname = 'audit_logs_insert'
-- with_check should reference 'auth.uid()' and 'profiles'
