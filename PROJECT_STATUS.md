# Project Status: Unit Manager

## 🚀 Översikt
En webbapplikation för att hantera spelar-units, grupper och Territory War (TW) statistik för Conqueror's Blade. Byggd med React, Redux och Supabase.

---

## ✅ Slutförda Etapper

### 1. Kärnfunktionalitet
- [x] Hantering av spelar-units (Owned, Prepared, Mastery, Favorite).
- [x] Grupphantering (Skapa/Redigera grupper för TW).
- [x] Import/Export av data via JSON.
- [x] Realtidssynkning mot Supabase för Officerare.

### 2. Säkerhet & RLS (Slutfört April 2026)
- [x] **Omfattande Säkerhetsaudit:** Rensat upp gamla motstridiga policies.
- [x] **JWT-baserad RLS:** Alla policies använder nu `get_my_role_weight()` via JWT-claims för maximal prestanda och säkerhet.
- [x] **Tabellsäkerhet:**
  - `profiles`: Medlemmar kan endast se sin egen data och uppdatera begränsade fält.
  - `profile_units`: Strikt begränsat till ägarens egna units.
  - `audit_logs` & `tw_history`: Endast Officerare+ har läs/skriv-rättigheter.

### 3. UI/UX Modernisering (Nuvarande status)
- [x] **Global Header:** Ny minimalistisk toppmeny med modern logout-knapp och varumärkesprofilering.
- [x] **Member Dashboard:**
    - **Profile Rail:** Ny vänsterpanel för medlemmar med Discord-avatar, editable Leadership, och barrack-statistik.
    - **Adaptive Layout:** Appen känner av rollen och växlar mellan Sidebar (Officer) och Profile Rail (Member).
- [x] **Performance Polish:** Flyttat metadata (Leadership/Dates) från huvudvyn till Rail för medlemmar för att maximera utrymmet för enhetslistan.
- [x] **Metadata-spårning:** Lagt till `updated_at` på profiler med automatisk trigger för att visa "Senast uppdaterad".

---

## 🛠 Pågående / Planerat

### Design & Grafik
- [ ] **Medieval Theme:** Planer på att byta ut den nuvarande "Stilrena" designen mot ett mer medeltidstema (Conqueror's Blade-estetik).
- [ ] **Ikon-paket:** Byta ut standardikoner mot anpassade grafiska element som matchar spelet.

### Funktioner
- [ ] **TW-planeringsverktyg:** Förbättringar i gruppvyn för att lättare se synergier mellan enheter.
- [ ] **Discord-integration:** Möjlighet att skicka grupplistor direkt till en Discord-kanal.

---

## 🏗 Teknisk Stack
- **Frontend:** React (Vite), Redux Toolkit, Tailwind CSS.
- **Backend:** Supabase (Auth, PostgreSQL, Realtime).
- **Säkerhet:** Row Level Security (RLS) med hierarkiska vikter.
- **Hosting:** (Information saknas - redo för deployment).

*Senast uppdaterad: 2026-04-27*
