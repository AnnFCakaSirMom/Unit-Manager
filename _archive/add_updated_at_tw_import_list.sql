-- ==============================================================================
-- Lägg till updated_at på tw_import_list
-- ==============================================================================
-- Kör detta i Supabase SQL Editor.
-- Trigger-funktionen uppdaterar automatiskt updated_at vid varje UPDATE.
--
-- Bakgrund: tw_import_list saknar updated_at, så twImportService.ts läser
-- created_at som fallback. Eftersom created_at inte ändras vid en upsert,
-- ser timestamp-guarden i twSlice.ts (updateSingleTWEntry) inkommande
-- statusändringar (Accepted <-> Maybe) på ett redan befintligt namn som
-- "lika gamla eller äldre" och hoppar över uppdateringen hos andra klienter.
-- ==============================================================================

-- 1. Lägg till kolumnen om den inte redan finns
ALTER TABLE public.tw_import_list
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Sätt befintliga rader till now() (engångsmigration)
UPDATE public.tw_import_list
    SET updated_at = now()
    WHERE updated_at IS NULL;

-- 3. Skapa trigger-funktionen
CREATE OR REPLACE FUNCTION public.update_tw_import_list_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Koppla triggern till tabellen
DROP TRIGGER IF EXISTS tw_import_list_updated_at ON public.tw_import_list;
CREATE TRIGGER tw_import_list_updated_at
    BEFORE UPDATE ON public.tw_import_list
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tw_import_list_updated_at();

-- VERIFIERING:
-- SELECT discord_name, status, created_at, updated_at FROM public.tw_import_list LIMIT 5;
