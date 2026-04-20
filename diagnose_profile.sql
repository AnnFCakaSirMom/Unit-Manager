-- ============================================================
-- DIAGNOSTIK: Felsök profil-koppling
-- Kör dessa queries EN I TAGET i Supabase SQL Editor
-- ============================================================

-- STEG 1: Se alla kolumner i din profiles-tabell
-- OBS: Kolla vilket kolumnnamn som faktiskt finns (id? user_id? auth_id?)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================

-- STEG 2: Se alla rader i profiles (begränsat till 20)
-- Leta efter raden som tillhör SirMom
SELECT *
FROM profiles
LIMIT 20;

-- ============================================================

-- STEG 3: Kolla ditt specifika auth-ID mot ALLA kolumner
-- Ditt Discord auth-ID: b127d8e3-54a9-404b-92f5-ed6dce75445e
SELECT *
FROM profiles
WHERE id = 'b127d8e3-54a9-404b-92f5-ed6dce75445e'
   OR user_id = 'b127d8e3-54a9-404b-92f5-ed6dce75445e';

-- ============================================================

-- STEG 4: Kolla auth.users för att bekräfta att ditt user ID stämmer
SELECT id, email, raw_user_meta_data->>'full_name' as discord_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
