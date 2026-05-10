-- ==============================================================================
-- Lägg till updated_at på profiles-tabellen
-- ==============================================================================
-- Kör detta i Supabase SQL Editor.
-- Trigger-funktionen uppdaterar automatiskt updated_at vid varje UPDATE.
-- ==============================================================================

-- 1. Lägg till kolumnen om den inte redan finns
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Sätt befintliga rader till now() (engångsmigration)
UPDATE public.profiles
    SET updated_at = now()
    WHERE updated_at IS NULL;

-- 3. Skapa trigger-funktionen
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Koppla triggern till tabellen
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- VERIFIERING:
-- SELECT id, discord_nickname, updated_at FROM public.profiles LIMIT 5;
