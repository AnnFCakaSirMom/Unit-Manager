-- ============================================================
-- CLEANUP: Radera dubbletter skapade av logg-loopen
-- ============================================================
-- Detta skript raderar alla loggar för "Added new player" 
-- som skapades idag (2026-04-21) i bulk.
-- ============================================================

DELETE FROM public.audit_logs
WHERE action_detail LIKE 'Added new player:%'
AND created_at >= '2026-04-21 00:00:00+02'
AND created_at <= '2026-04-21 23:59:59+02';

-- Kontrollera hur många rader som är kvar (borde vara 0 om du nyss rensat, 
-- eller ett fåtal om du faktiskt lagt till någon idag).
SELECT count(*) FROM public.audit_logs;
