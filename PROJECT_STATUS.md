# Projektstatus: Unit Manager (2026-04-27)

## 🏗️ Nuvarande Arkitektur
- **State Management:** Helt migrerat till **Redux Toolkit**. Global state hanteras i `src/state/slices`.
- **Säkerhet & RLS:** JWT-baserad rollhantering implementerad. Roller synkas via Supabase-trigger till användarens token.
- **Logik:** Affärslogik är utbruten i Custom Hooks (`src/hooks/`) för bättre testbarhet och renare komponenter.

## ✅ Nyligen Genomfört
- **TW Attendance History:** Fullt stöd för att se och hantera historisk närvarodata.
- **Prestanda-fixar:** O(N²)-loopar i statistikvyn är utbytta mot Map-baserad logik.
- **Medlemsvy:** Grundläggande döljande av admin-funktioner och sidebar för `Member`-rollen.

## 📋 Aktuella Uppgifter & Fokusområden
- **UX Polering (Sidebar):** Säkerställa att sidebaren och logout-knappen fungerar optimalt på alla enheter för vanliga medlemmar.
- **RLS Verifiering:** Fortsatt kontroll av att alla tabeller (speciellt `tw_history` och `profiles`) har vattentäta men flexibla policies.
- **UI-enhetlighet:** Se över att alla vyer (Group, Player, Stats) följer samma designmönster nu när logiken är separerad.
