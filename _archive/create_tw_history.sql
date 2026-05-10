-- ============================================================
-- TW History Table
-- Sparar snapshots av TW-planeringar (max 5 senaste).
-- Snapshots delas av alla inloggade användare (gemensam historik).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tw_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    saved_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    name        text NOT NULL,          -- Ex. "2026-04-26 23:00"
    snapshot    jsonb NOT NULL          -- Hela grupp+attendance-strukturen
);

-- Index för snabb hämtning sorterat på datum
CREATE INDEX IF NOT EXISTS tw_history_created_at_idx ON public.tw_history (created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.tw_history ENABLE ROW LEVEL SECURITY;

-- Alla inloggade användare kan läsa (gemensam historik)
CREATE POLICY "tw_history_select"
    ON public.tw_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Alla inloggade användare kan skapa snapshots
CREATE POLICY "tw_history_insert"
    ON public.tw_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Alla inloggade användare kan radera gamla snapshots (för att hålla max 5)
CREATE POLICY "tw_history_delete"
    ON public.tw_history
    FOR DELETE
    TO authenticated
    USING (true);
