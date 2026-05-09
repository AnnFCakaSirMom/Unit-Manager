# Tekniskt Förslag: "Who's Online" via Supabase Presence

> **Status:** Förslag — sparad för framtida implementering.
> **Målgrupp:** Owner-rollen exklusivt.

---

## 1. Översikt & Mål

Funktionen syftar till att ge `Owner` realtidsinsyn i vilka appanvändare som
är aktiva just nu. Supabase Presence (byggt ovanpå Phoenix-protokollets
`phx_join`/`presence_diff`-meddelanden) är det naturliga valet: det
hanterar join/leave-events, multi-tab-deduplicering och nätverksavbrott via
sin inbyggda CRDT-liknande state-maskin, utan att vi behöver röra databasen
alls.

---

## 2. Säkerhetsmodell

### Varför Presence inte räcker ensamt

Supabase Presence-kanaler **har inga RLS-policies**. Vilken klient som helst
kan prenumerera på en namngiven kanal och se dess presence-state. Vi måste
därför **kombinera** klientlogik med en säkerhetsstrategi på kanalåtkomstnivå.

### Vald strategi: Channel Authorization (Realtime Authorization)

Supabase Realtime stöder **channel-level JWT authorization** via
`realtime.messages`-tabellen och RLS. Konkret innebär det:

1. Vi skapar en dedikerad kanal, t.ex. `presence:owner-room`.
2. Vi aktiverar Realtime Authorization för projektet (Supabase Dashboard →
   Realtime → Authorization).
3. Vi lägger en RLS-policy på `realtime.messages` som tillåter `INSERT` och
   `SELECT` **enbart** för JWT-claims där `role_weight >= 6` (dvs. Owner).
4. Normala Members/Officers som försöker joina kanalen får ett
   `access_denied`-fel från Supabase-servern — de kan inte ens se att kanalen
   existerar.

> [!IMPORTANT]
   > Utan denna kanalauktorisering är sekretessen för Presence-listan enbart
   > "security by obscurity" (kanalnamnet). Det är **inte** tillräckligt.
   > Kanalauktorisering är ett **hårt krav** för denna funktion.

---

## 3. Användaridentifiering

### Rekommendation: `discordNickname` från `authSlice`

`authSlice` innehåller redan `discordNickname: string | null`. Detta är det bästa valet:

| Alternativ | För | Emot |
|---|---|---|
| `discordNickname` ✅ | Direkt visbart, redan i store | Teoretiskt icke-unikt |
| `userId` (UUID) | Unikt, stabilt | Kräver extra lookup |

**Presence-payload:**
```typescript
{
  discordNickname: string,
  role: UserRole,
  joinedAt: number,
}
```

---

## 4. Integration — Var placeras logiken?

### Rekommendation: Ny isolerad hook `usePresence.ts`

**Placera inte logiken i `useDatabaseSync.ts` eller `SyncManager.ts`.**
Motivering:
- `SyncManager` är designad för databas-reads/writes, inte Presence-diffing.
- En isolerad hook ger tydlig `separation of concerns` och gör det enkelt
  att stänga av funktionen med en feature-flagga.

### Arkitektur
1. **`usePresence.ts`**: Äger kanalen och lyssnar på `sync`.
2. **`presenceSlice.ts`**: Lagrar listan i Redux.
3. **`OnlineUsersPanel.tsx`**: UI-komponent (Owner-only).

---

## 5. Risk- och Stabilitetsanalys

### Risk 1: Onödiga omrenderingar 🔴
- **Lösning:** Använd `shallowEqual` i Redux-selectors och jämför data innan dispatch i hooken.

### Risk 2: Multi-tab 🟡
- **Lösning:** Använd `userId` som `presenceKey` för att låta Supabase gruppera flera tabbar under samma användare.

### Risk 3: Cleanup vid utloggning 🔴
- **Lösning:** Anropa omedelbart `channel.untrack()` och `removeChannel()` i useEffect-cleanup och i logout-flödet.

### Risk 4: Tabstängning (Ghost Presence) 🟡
- **Analys:** Accepterat beteende. Supabase rensar automatiskt bort inaktiva klienter via heartbeats inom ~30s.

---

## 6. Sammanfattning — Rekommenderat beslut

Implementera som en isolerad modul med en feature-flagga (`PRESENCE_ENABLED`). Aktivera **inte** i produktion utan att **Realtime Channel Authorization** är konfigurerad i Supabase Dashboard för att garantera att endast `Owner` kan se listan.
