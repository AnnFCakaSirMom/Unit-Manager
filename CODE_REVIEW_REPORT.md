# Projektgranskning & Förbättringsförslag (2026-04-23)

Denna rapport sammanställer identifierade förbättringsområden för projektet "Unit Manager" baserat på en genomgång av källkoden och databasstrukturen.

---

## 1. Kritiska fel & Säkerhetsrisker

### Allvarlig Prestandabottleneck i Supabase RLS (N+1 Problematik) [ÅTGÄRDAD]
*   **Var:** `secure_hierarchy.sql` (funktionen `get_my_role_weight()`).
*   **Problem:** Funktionen gör en `SELECT` mot `profiles`-tabellen för varje enskild rad som utvärderas av RLS-policyerna. Vid hämtning av t.ex. 100 rader körs 101 frågor mot databasen.
*   **Lösning:** Använd JWT-claims för att läsa rollen direkt från användarens token via `auth.jwt() ->> 'role'`.
*   **Nytta:** Drastisk prestandaförbättring och ökad stabilitet i backend. (Implementerat via JWT-trigger).

### Duplicerad Kodblock / Race Condition-risk [ÅTGÄRDAD]
*   **Var:** `src/App.tsx` (rader 91–101 och 103–114).
*   **Problem:** Dubbla `useEffect`-hookar för att hämta TW Attendance-data skickar duplicerade dispatches till staten.
*   **Lösning:** Tog bort det överflödiga kodblocket och konsoliderade i `useDatabaseSync`.
*   **Nytta:** Renare logik och eliminerar onödiga nätverksanrop vid start.

---

## 2. Kodoptimering & Prestanda

### Ineffektiv Loop (O(N²) Komplexitet) i Statistik [ÅTGÄRDAD]
*   **Var:** `src/components/TWStatisticsView.tsx` (rad 65).
*   **Problem:** En `filter()` körs inuti en `map()` över alla spelare, vilket leder till kvadratisk tidskomplexitet vid beräkning av statistik.
*   **Lösning:** Implementerat `Map`-baserad uppslagning (O(1)) för spelarrecords i `useTWStats`.
*   **Nytta:** Blixtsnabb rendering av statistikvyn, särskilt med mycket historisk data.

### Konflikterande Tillståndshantering (Redux vs Context)
*   **Var:** `src/App.tsx` och `src/AppContext.tsx`.
*   **Problem:** Appen blandar Redux och React Context på ett sätt som tvingar hela appen att renderas om vid minsta ändring (mergedState i Context Provider).
*   **Lösning:** Konsolidera all global state till Redux och ta bort det tunga Context-lagret.
*   **Nytta:** Kraftigt minskade om-renderingar och bättre flyt i hela gränssnittet.

---

## 3. Arkitektur & Struktur

### "God Components" (Överbelastade Vyer) [ÅTGÄRDAD]
*   **Var:** `App.tsx`, `TWStatisticsView.tsx`, `PlayerUnitView.tsx`.
*   **Problem:** Komponenterna var för stora (400+ rader) och hanterade för många ansvarsområden.
*   **Lösning:** Brutit ut logik till Custom Hooks och flyttat Discord-export till `src/utils/discordExport.ts`.
*   **Nytta:** Bättre läsbarhet, enklare underhåll och förberett för Redux.

### Ostabila Supabase Realtime-kanaler [ÅTGÄRDAD]
*   **Var:** `src/App.tsx`.
*   **Problem:** Prenumerationer startades om vid varje render om referenser byttes ut.
*   **Lösning:** Stabiliserat referenser med `useCallback` och `useEffect` i `useDatabaseSync`.
*   **Nytta:** Pålitlig synkronisering utan onödiga omstarter av kanaler.

---

## Bilaga: Detaljerad förklaring av RLS N+1 (Punkt 1)

När en RLS-policy i PostgreSQL anropar en funktion som ställer en egen SQL-fråga (via `SELECT`), uppstår ett **N+1-problem**. 

1.  **Huvudfråga:** "Hämta 100 medlemmar."
2.  **Kontroll:** För varje medlem måste databasen kontrollera om du har behörighet.
3.  **Exekvering:** Funktionen `get_my_role_weight()` körs 100 gånger. Varje gång den körs gör den en `SELECT role FROM profiles`.
4.  **Resultat:** 101 frågor körs istället för 1.

**Lösningen med JWT Claims:**
Genom att använda `auth.jwt() ->> 'role'` läser databasen rollen direkt från den inloggnings-token som skickas med anropet. Detta kräver **noll** extra frågor till tabellerna och är det rekommenderade sättet att bygga säkra och snabba system i Supabase.
