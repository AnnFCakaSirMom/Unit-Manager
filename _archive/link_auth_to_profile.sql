-- ============================================================
-- FIX: Koppla auth.users.id till profiles via user_id-kolumn
-- KÖR I ORDNING i Supabase Dashboard → SQL Editor
-- ============================================================

-- STEG 1: Lägg till user_id-kolumn i profiles (om den inte finns)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEG 2: Koppla din profil (SirMom) till ditt Discord auth-ID
-- BYTA UT de två värdena nedan!
--   user_id_value   = ditt Discord login-ID (från auth.users.id)
--   sirmom_profile_id = ditt profil-ID i profiles.id
UPDATE profiles
SET user_id = 'b127d8e3-54a9-404b-92f5-ed6dce75445e'   -- <-- ditt Discord auth ID
WHERE id = 'DITT_PROFILES_ID_HÄR';                       -- <-- SirMoms profiles.id

-- OBS: Kör detta för att hitta SirMoms profiles.id:
--   SELECT id, display_name, role FROM profiles WHERE display_name = 'SirMom';

-- ============================================================
-- STEG 3: Verifiera att kopplingen är korrekt
-- Förväntat resultat: 1 rad med user_id = ditt Discord-ID
-- ============================================================
SELECT id, display_name, role, user_id
FROM profiles
WHERE display_name = 'SirMom';
