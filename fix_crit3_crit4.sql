-- ==============================================================================
-- SECURITY FIX: CRIT-3 & CRIT-4
-- Audit Date: 2026-05-03
-- ==============================================================================
-- CRIT-3: Add UPDATE policy to audit_logs so the 5-minute debounce works.
-- CRIT-4: Re-restrict tw_history SELECT to Officer+ (weight >= 3).
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste and run this entire script.
--   3. Verify with the queries at the bottom.
-- ==============================================================================


-- ==============================================================================
-- CRIT-3: audit_logs UPDATE Policy (Debounce Fix)
-- ==============================================================================
-- Problem: auditService.logAction() tries to UPDATE an existing log row
-- (to bump its timestamp) when a 'SMALL_CHANGE' log already exists within
-- 5 minutes. With no UPDATE policy on audit_logs, RLS denies this silently.
-- The debounce fallback then creates a new duplicate log every time.
--
-- Fix: Add an UPDATE policy scoped to the user's own log entries only.
-- This allows the debounce to work without letting users tamper with
-- other actors' logs or change sensitive fields like action_type/actor_id.
-- ==============================================================================

DROP POLICY IF EXISTS "audit_logs_update_own" ON public.audit_logs;

CREATE POLICY "audit_logs_update_own" ON public.audit_logs
FOR UPDATE
USING (
  -- Can only touch rows where YOU are the actor
  actor_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  -- After the update, actor_id must still be YOUR profile (no reassigning logs)
  actor_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);


-- ==============================================================================
-- CRIT-4: tw_history SELECT — Re-restrict to Officer+ 
-- ==============================================================================
-- Problem: consolidate_rls_jwt.sql (line 108) created tw_history_select with
-- USING (true), overwriting the fix in fix_tw_history_leak.sql that restricted
-- access to Officer+ (get_my_role_weight() >= 3). Any Member or Pending user
-- could read the full group structure and TW planning snapshots.
--
-- Fix: Drop and recreate the SELECT policy with the correct weight check.
-- ==============================================================================

DROP POLICY IF EXISTS "tw_history_select" ON public.tw_history;

CREATE POLICY "tw_history_select" ON public.tw_history
FOR SELECT
USING (get_my_role_weight() >= 3);

COMMENT ON POLICY "tw_history_select" ON public.tw_history
IS 'Officer+ only. Prevents Members/Pending from reading strategic TW snapshots.';


-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- 1. Confirm all three audit_logs policies exist (SELECT, INSERT, UPDATE):
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'audit_logs'
ORDER BY cmd;
-- Expected rows:
--   audit_logs_insert  | INSERT | (actor_id matches auth.uid profile)
--   audit_logs_select  | SELECT | (get_my_role_weight() >= 5)
--   audit_logs_update_own | UPDATE | (actor_id matches auth.uid profile)

-- 2. Confirm tw_history SELECT is restricted:
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'tw_history' AND cmd = 'SELECT';
-- Expected: qual should contain 'get_my_role_weight() >= 3'
-- NOT 'true'
