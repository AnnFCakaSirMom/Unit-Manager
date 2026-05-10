-- ==============================================================================
-- RLS FIX: tw_history & audit_logs
-- ==============================================================================
-- Åtgärdar de sista två säkerhetspunkterna från auditen:
--   1. tw_history INSERT/DELETE — begränsas till Officer+ (weight >= 3)
--   2. audit_logs SELECT        — JWT-optimeras med get_my_role_weight()
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- tw_history: Begränsa INSERT och DELETE till Officer+
-- ------------------------------------------------------------------------------
-- Nuläge: Alla inloggade (inkl. Members) kan spara och radera TW-snapshots.
-- Fix: Enbart Officer+ (weight >= 3) kan skriva och radera.
-- SELECT-policyn ("tw_history_select") är korrekt och lämnas orörd.

DROP POLICY IF EXISTS "tw_history_insert" ON public.tw_history;
DROP POLICY IF EXISTS "tw_history_delete" ON public.tw_history;

-- Enbart Officer+ kan spara snapshots
CREATE POLICY "tw_history_insert" ON public.tw_history
    FOR INSERT
    WITH CHECK (get_my_role_weight() >= 3);

-- Officer+ kan radera vad som helst, eller spararen kan radera sin egen snapshot
CREATE POLICY "tw_history_delete" ON public.tw_history
    FOR DELETE
    USING (
        get_my_role_weight() >= 3
        OR saved_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    );


-- ------------------------------------------------------------------------------
-- audit_logs: JWT-optimera SELECT-policyn
-- ------------------------------------------------------------------------------
-- Nuläge: SELECT-policyn använder EXISTS(...) mot profiles-tabellen — N+1.
-- Fix: Byt till get_my_role_weight() >= 5 (Admin=5, Owner=6).
-- INSERT-policyn (authenticated kan skriva loggar) är korrekt och lämnas orörd.

DROP POLICY IF EXISTS "Admins and Owners can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins and Owners can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (get_my_role_weight() >= 5);


-- ==============================================================================
-- VERIFIERING
-- ==============================================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('tw_history', 'audit_logs')
ORDER BY tablename, cmd, policyname;

-- Förväntat resultat (5 rader totalt):
--
-- audit_logs | Admins and Owners can view audit logs    | SELECT
-- audit_logs | Authenticated users can insert audit logs | INSERT
-- tw_history | tw_history_delete                        | DELETE
-- tw_history | tw_history_insert                        | INSERT
-- tw_history | tw_history_select                        | SELECT
