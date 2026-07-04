-- ==============================================================================
-- SECURITY FIX: INSERT Role Escalation Prevention (enforce_role_on_insert)
-- Date: 2026-07-04
-- ==============================================================================
--
-- PROBLEM:
-- The RLS policy "profiles_secure_insert" (or "profiles_insert") historically
-- allowed INSERTs under two conditions:
--   1. The user_id matched auth.uid() (self-registration)
--   2. The caller had a role weight >= 4 (Gatekeeper or higher, e.g. adding a player)
--
-- However, while UPDATE operations were locked down via triggers (enforce_role_immutability,
-- prevent_self_role_change, protect_owner_role), there was NO validation of the
-- `role` column during an INSERT. A user self-registering could bypass the AuthGuard UI
-- (which omits `role` to fall back on DEFAULT 'Pending') and call the Supabase REST API
-- directly, explicitly setting their `role` to 'Owner' or 'Admin'. The DEFAULT would be
-- bypassed, leading to privilege escalation.
--
-- ARCHITECTURAL NOTE:
-- Role security in the system is designed as a multi-layered defense. It relies on
-- two collaborating protection layers at the database level:
--   1. UPDATE-triggers (enforce_role_immutability, prevent_self_role_change,
--      protect_owner_role) which guard modifications to existing profiles.
--   2. This new BEFORE INSERT trigger (enforce_role_on_insert) which acts as a
--      complement, locking down role assignments when profiles are initially created.
-- Together, these layers ensure a profile's role is secure throughout its entire lifecycle.
--
-- SOLUTION:
-- A BEFORE INSERT trigger (`enforce_role_on_insert`) executing a trigger function to:
--   1. Allow service-role and SQL Editor context to bypass validation (auth.uid() IS NULL),
--      since this context already holds full database access anyway.
--   2. Force `role := 'Pending'` when `user_id = auth.uid()` (self-registration), ensuring
--      all new self-registered profiles start in the queue.
--   3. Apply hierarchical role enforcement on all other inserts (e.g. Gatekeeper+ creating
--      an unlinked profile for another player). It uses the existing `can_manage_role_weight`
--      function, making insert rules consistent with updates.
--
-- VERIFICATION:
-- Checked against all known INSERT/upsert paths in the codebase:
--   - AuthGuard self-registration (AuthGuard.tsx): user_id = auth.uid() -> forced to 'Pending'. ✔
--   - Gatekeeper "Add Player" flow (playerService.ts): user_id is NULL -> falls through to
--     hierarchical check -> can_manage_role_weight('Member') evaluates to TRUE for Gatekeepers. ✔
--   - Archive scratch scripts (_archive/scratch/): merge_json_to_supabase.js uses the
--     service-role key. With auth.uid() IS NULL, it passes through safely without throwing. ✔
--   - ProfileMatcher "Create New" (ProfileMatcher.tsx): UPDATE operation -> unaffected. ✔
--   - ProfileMatcher "Link & Upgrade" flow (handleLinkProfile()): calls RPC link_and_approve_profile -> unaffected. ✔
--
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.enforce_role_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. Service role / SQL Editor bypass
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Self-registration — force 'Pending' role
  IF NEW.user_id = auth.uid() THEN
    NEW.role := 'Pending';
    RETURN NEW;
  END IF;

  -- 3. Gatekeeper/Admin creating another profile — enforce hierarchy
  IF NOT can_manage_role_weight(COALESCE(NEW.role, 'Pending')) THEN
    RAISE EXCEPTION
      'permission_denied: you are not allowed to assign role % on insert.',
      NEW.role
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create Trigger (drop first to ensure idempotency)
DROP TRIGGER IF EXISTS enforce_role_on_insert ON public.profiles;

CREATE TRIGGER enforce_role_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_role_on_insert();
