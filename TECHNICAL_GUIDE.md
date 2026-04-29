# Teknisk Guide: Unit Manager

Denna guide fungerar som en handbok för utvecklare som arbetar med Unit Manager. Målet är att ge en tydlig bild av arkitekturen, säkerhetsmodellen och hur dataflödet hanteras, med fokus på *varför* dessa tekniska beslut har fattats.

## 1. Arkitektur och Dataflöde

Unit Manager använder en frikopplad arkitektur för att säkerställa att användargränssnittet alltid känns snabbt och responsivt ("offline-first"), samtidigt som datan hålls synkroniserad med backend.

**Flödet ser ut som följer:**
`Supabase (DB)` <-> `Services (API)` <-> `Hooks (Orkestrering)` <-> `Redux (State)` <-> `React (UI)`

*   **React-komponenter**: Ansvarar enbart för rendering och lokala UI-interaktioner. De läser data från Redux via memoizade selektorer för att minimera omrenderingar.
*   **Redux (State)**: Den enda sanningen ("single source of truth") för klienten. Alla ändringar, vare sig de kommer från användaren eller databasen, passerar här.
*   **Services**: Rena funktioner (t.ex. `playerService.ts`) som abstraherar bort all direkt kommunikation med Supabase.
*   **Hooks**: Fungerar som "klister" mellan Redux och Services. Till exempel lyssnar `useCloudSync` på ändringar i Redux och anropar Services, medan `useDatabaseSync` lyssnar på Supabase och uppdaterar Redux.

**Varför?** Genom att tvinga all data genom Redux kan vi uppdatera UI:t omedelbart (optimistic UI) utan att vänta på nätverksanrop, samtidigt som vi behåller en central plats för datahantering.

## 2. Säkerhetsmodell och Hierarki (RLS)

Säkerheten i applikationen är byggd direkt i databasen med hjälp av Supabase Row Level Security (RLS). Vi tillämpar en hierarkisk rollmodell: `Owner > Admin > Gatekeeper > Officer > Member > Pending/Guest`.

### `get_my_role_weight()`
Detta är hjärtat i vår RLS-design. Det är en PostgreSQL-funktion som hämtar den inloggade användarens roll från `profiles`-tabellen och konverterar den till ett numeriskt värde (t.ex. Owner = 100, Admin = 80, Officer = 50).

**Varför RLS och vikter?**
*   **Säkerhet på rotnivå**: Oavsett om en bugg introduceras i frontend-koden eller om någon försöker manipulera API-anrop direkt, kommer databasen att vägra utföra otillåtna operationer.
*   **Hierarkisk kontroll**: Genom att använda numeriska vikter kan RLS-policys använda enkel matematik (t.ex. `get_my_role_weight() > target_role_weight`). Detta gör det möjligt att diktera att en Officer kan uppdatera en Member, men aldrig en Admin.

## 3. Synkronisering och Datastabilitet

Att hantera synkronisering i en miljö där flera användare redigerar data samtidigt och där UI:t är frikopplat från databasen kräver robusta mekanismer. Vi använder ett dubbelriktat system.

### Läsningar: `SyncManager` och `useDatabaseSync`
När ändringar sker i databasen skickar Supabase Realtime-events. Om vi skulle hämta ny data vid varje event skulle applikationen snabbt bli överbelastad.
*   **SyncManager**: Agerar stötdämpare. Den använder *debouncing* (fördröjning) och *AbortControllers* för att säkerställa att endast den senaste förfrågan går igenom om flera events tas emot i snabb följd.
*   **Varför?** Förhindrar "race conditions" och onödiga nätverksanrop, vilket sparar bandbredd och håller UI:t stabilt.

### Skrivningar: `useCloudSync` och Circuit Breaker
När användaren ändrar data i Redux, ansvarar `useCloudSync` för att skicka detta till Supabase.
*   **Diffing**: Hooken jämför ständigt aktuellt Redux-state med en intern referens (det som senast sparades) och skickar enbart de objekt som faktiskt ändrats.
*   **Circuit Breaker (Strömbrytare)**: Om en uppdatering misslyckas (t.ex. på grund av RLS-fel eller nätverksproblem) kommer systemet att försöka igen. Men för att förhindra oändliga loopar som spammar databasen med felaktiga requests, spåras antalet misslyckanden per objekt-ID. Efter **5 misslyckade försök** löser strömbrytaren ut för just det objektet, loggar ett permanent fel och slutar försöka.
*   **Varför?** Denna "Smart Retry"-logik är avgörande för systemets hälsa. Den skyddar backend från att överbelastas av klienter som fastnat i felläge, samtidigt som den ger tillfälliga nätverksfel en chans att lösa sig själva.

## 4. Miljövariabler

För att köra projektet lokalt krävs att applikationen kan kommunicera med en Supabase-instans. Följande miljövariabler måste finnas konfigurerade (vanligtvis i en `.env.local` eller `.env`-fil i roten av projektet):

```env
VITE_SUPABASE_URL="https://din-projekt-id.supabase.co"
VITE_SUPABASE_ANON_KEY="din-långa-anon-key-här"
```

*   **`VITE_SUPABASE_URL`**: Den unika URL:en till din Supabase-databas.
*   **`VITE_SUPABASE_ANON_KEY`**: Den publika nyckeln. Det är säkert att exponera denna i klienten, eftersom all faktisk datasäkerhet och auktorisering hanteras av RLS-reglerna i databasen med hjälp av JWT-tokens från inloggningen.
