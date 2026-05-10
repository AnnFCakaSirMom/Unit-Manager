-- ==============================================================================
-- SECURITY PATCH: Fix tw_history_select Leak
-- ==============================================================================
-- Beskrivning: Begränsar läsbehörighet för TW-historik till Officer+ (vikt >= 3).
-- Syfte: Skyddar känslig snapshot-data (gruppstrukturer och närvaro) från 
-- obehöriga medlemmar som annars kunnat läsa detta via historiken.
-- ==============================================================================

-- 1. Ta bort den gamla vidöppna policyn
DROP POLICY IF EXISTS "tw_history_select" ON public.tw_history;

-- 2. Skapa den nya begränsade policyn
CREATE POLICY "tw_history_select" ON public.tw_history
    FOR SELECT
    USING (get_my_role_weight() >= 3);

-- 3. Lägg till en beskrivande kommentar i databasen
COMMENT ON POLICY "tw_history_select" ON public.tw_history 
IS 'Begränsar insyn i TW-snapshots till Officer+ för att skydda strategisk data.';
