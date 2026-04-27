# Projektstatus: Unit Manager (2026-04-27)

## 🏗️ Nuvarande Arkitektur
- **State Management:** Helt migrerat till **Redux Toolkit**. Global state hanteras i `src/state/slices`.
- **Säkerhet & RLS:** JWT-baserad rollhantering implementerad. Roller synkas via Supabase-trigger till användarens token. Samtliga tabeller är granskade och städade.
- **Logik:** Affärslogik är utbruten i Custom Hooks (`src/hooks/`) för bättre testbarhet och renare komponenter.

## ✅ Nyligen Genomfört

### RLS Security Audit (2026-04-27)
Genomförde en fullständig granskning av alla RLS-policies. Hittade och åtgärdade att tre generationer av gamla SQL-scripts hade lämnat kvar **motstridiga och för breda policies** på flera tabeller. Problemet var att PostgreSQL:s OR-logik gjorde att de gamla `USING(true)`-policies åsidosatte de nya, restriktiva.

**Åtgärdat per tabell:**
- `profiles` — Tog bort 5 gamla policies (inkl. `USING(true)` som lät Members läsa alla profiler)
- `profile_units` — Tog bort 3 gamla policies (inkl. `USING(true)` som lät Members läsa alla spelares units)
- `units` — Städade bort 2 gamla policies, lade till korrekta JWT-optimerade policies
- `tw_history` — Begränsade INSERT/DELETE till Officer+ (var öppet för alla inloggade)
- `audit_logs` — JWT-optimerade SELECT-policyn (ersatte N+1 EXISTS med `get_my_role_weight()`)
- Droppade den gamla `get_my_role()`-funktionen (ersatt av `get_my_role_weight()`)

**Slutläge: 14 korrekta policies fördelade på 5 tabeller. Inga gamla kvar.**

### Tidigare genomfört
- **TW Attendance History:** Fullt stöd för att se och hantera historisk närvarodata.
- **Prestanda-fixar:** O(N²)-loopar i statistikvyn är utbytta mot Map-baserad logik.
- **Medlemsvy:** Sidebaren döljs för `Member`-rollen. Logout-knapp visas i main-vyn.

## 📋 Aktuella Uppgifter & Fokusområden
- **UX Polering:** Design och responsivitet för Membervy, mobiloptimering.
- **UI-enhetlighet:** Se över att alla vyer (Group, Player, Stats) följer samma designmönster.
