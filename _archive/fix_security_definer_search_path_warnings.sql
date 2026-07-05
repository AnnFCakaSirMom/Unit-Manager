-- ==============================================================================
-- Fix: Supabase Database Linter-varningar (SECURITY DEFINER-exponering + search_path)
-- ==============================================================================
-- Kör detta i Supabase SQL Editor.
--
-- Bakgrund:
--   Tre rena trigger-funktioner (RETURNS trigger) är bara avsedda att köras
--   automatiskt av Postgres vid INSERT/UPDATE, men har fortfarande onödig
--   EXECUTE-rättighet kvar för anon/authenticated. Eftersom Supabase/PostgREST
--   auto-exponerar alla public-funktioner som RPC-endpoints
--   (/rest/v1/rpc/<namn>), är detta onödig attackyta även om Postgres i
--   praktiken vägrar direktanrop av trigger-funktioner oavsett grants.
--
--   update_tw_import_list_updated_at() saknar dessutom SET search_path, vilket
--   är en känd risk (schema-hijacking) för SECURITY DEFINER-funktioner.
--
--   Triggers fortsätter att fungera normalt efter REVOKE nedan — Postgres
--   kräver INTE att den DML-utförande rollen har EXECUTE-rättighet på en
--   trigger-funktion för att triggern ska avfyras. Endast direkta RPC-anrop
--   (/rest/v1/rpc/<namn>) blockeras.
-- ==============================================================================

-- 1. Pinna search_path (matchar mönstret i optimize_rls_jwt.sql / secure_hierarchy.sql)
ALTER FUNCTION public.update_tw_import_list_updated_at() SET search_path = public;

-- 2. Återkalla onödig EXECUTE-rättighet på de rena trigger-funktionerna
REVOKE EXECUTE ON FUNCTION public.enforce_role_on_insert()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_profile_updated_at_from_units() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tw_import_list_updated_at()     FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- MEDVETET OFÖRÄNDRADE varningar (lämnas kvar med avsikt, inte missade):
--
--   get_my_role_weight() — måste förbli körbar av `authenticated`, eftersom
--     RLS-policyer på profiles, profile_units, player_info, audit_logs och
--     tw_history anropar den (se TECHNICAL_GUIDE.md). Ett REVOKE här skulle
--     göra att alla RLS-skyddade queries för inloggade användare failar med
--     "permission denied for function get_my_role_weight". `anon` är redan
--     blockerad sedan tidigare.
--
--   link_and_approve_profile(...) — måste förbli körbar av `authenticated`,
--     eftersom ProfileMatcher.tsx (handleLinkProfile) anropar den via
--     supabase.rpc(...) från inloggade klienter. `anon`/PUBLIC redan
--     blockerad sedan tidigare (se PROJECT_STATUS.md).
-- ==============================================================================

-- VERIFIERING:
-- Kör sedan Dashboard -> Advisors -> Security och bekräfta att varningarna för
-- enforce_role_on_insert, update_profile_updated_at_from_units och
-- update_tw_import_list_updated_at (anon + authenticated + search_path) är borta.
