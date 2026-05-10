import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { TWAttendancePlayer, TWSeason, TWEvent, TWPlayerRecord, TWRecordStatus } from '../../types';
import { handleTWAttendanceImport as helperHandleTWAttendanceImport } from '../../utils/reducerHelpers';
import { RootState } from '../store';
import { setGroups } from './groupSlice';

export interface TWState {
  twAttendance: TWAttendancePlayer[];
  twSeasons: TWSeason[];
  twEvents: TWEvent[];
  twRecords: TWPlayerRecord[];
}

const initialState: TWState = {
  twAttendance: [],
  twSeasons: [],
  twEvents: [],
  twRecords: [],
};

// Thunk for importing TW Attendance (needs access to players and modifies groups)
export const importTWAttendance = createAsyncThunk<void, { jsonString: string }, { state: RootState }>(
  'tw/importTWAttendance',
  async (payload, { getState, dispatch }) => {
    const state = getState();
    // We mock the old AppState structure just enough for the helper to work
    const mockAppState: any = {
      players: state.player.players,
      groups: state.group.groups,
      twAttendance: state.tw.twAttendance
    };
    
    const newState = helperHandleTWAttendanceImport(mockAppState, payload);
    
    dispatch(setTWAttendance(newState.twAttendance));
    dispatch(setGroups(newState.groups));
  }
);


const twSlice = createSlice({
  name: 'tw',
  initialState,
  reducers: {
    hydrateTWData(state, action: PayloadAction<{ seasons: TWSeason[], events: TWEvent[], records: TWPlayerRecord[] }>) {
      state.twSeasons = action.payload.seasons;
      state.twEvents = action.payload.events;
      state.twRecords = action.payload.records;
    },
    hydrateTWAttendance(state, action: PayloadAction<TWAttendancePlayer[]>) {
      const serverEntries = action.payload;
      const serverMap = new Map(serverEntries.map(e => [e.discordName, e]));

      // Merge server data with local state:
      // - For entries on the server: keep dirty local version, otherwise take server data.
      const merged = serverEntries.map(serverEntry => {
        const localEntry = state.twAttendance.find(e => e.discordName === serverEntry.discordName);
        if (localEntry?.isDirty) {
          return localEntry; // Keep the pending local version
        }
        return serverEntry;
      });

      // Preserve locally-added dirty entries not yet synced to the server.
      const dirtyLocalsNotOnServer = state.twAttendance.filter(
        e => e.isDirty && !serverMap.has(e.discordName)
      );

      state.twAttendance = [...merged, ...dirtyLocalsNotOnServer];
    },
    updateSingleTWEntry(state, action: PayloadAction<TWAttendancePlayer>) {
      const incoming = action.payload;
      const index = state.twAttendance.findIndex(e => e.discordName === incoming.discordName);

      if (index === -1) {
        // New entry — add to list
        state.twAttendance.push(incoming);
        return;
      }

      const existing = state.twAttendance[index];

      // 🔑 Protect dirty entries — don't overwrite unsaved local changes
      if (existing.isDirty) {
        if (import.meta.env.DEV) console.log(`[Delta-TW] Skipping update for dirty entry ${incoming.discordName}`);
        return;
      }

      // Timestamp-guard: Skip if incoming is older than or equal to existing data
      if (existing.updatedAt && incoming.updatedAt) {
        const existingTs = new Date(existing.updatedAt).getTime();
        const incomingTs = new Date(incoming.updatedAt).getTime();
        if (incomingTs <= existingTs) {
          if (import.meta.env.DEV) console.log(`[Delta-TW] Skipping stale payload for ${incoming.discordName}`);
          return;
        }
      }

      // Immer-compatible mutation
      state.twAttendance[index] = incoming;
    },
    clearTWEntryDirtyFlag(state, action: PayloadAction<{ discordName: string }>) {
      const entry = state.twAttendance.find(a => a.discordName === action.payload.discordName);
      if (entry) {
        entry.isDirty = false;
      }
    },
    // WARNING: Destructive bulk-import operation (e.g. Raid Helper JSON).
    // Intentionally overwrites the entire array without respecting isDirty flags.
    setTWAttendance(state, action: PayloadAction<TWAttendancePlayer[]>) {
      state.twAttendance = action.payload;
    },
    setTWRecords(state, action: PayloadAction<TWPlayerRecord[]>) {
      state.twRecords = action.payload;
    },
    clearTWAttendance(state) {
      state.twAttendance = [];
    },
    createTWSeason(state, action: PayloadAction<{ season: TWSeason, events: TWEvent[] }>) {
      state.twSeasons.push(action.payload.season);
      state.twEvents.push(...action.payload.events);
    },
    updateTWSeason(state, action: PayloadAction<{ season: TWSeason, events: TWEvent[] }>) {
      const currentEventIds = action.payload.events.map(e => e.id);
      const obsoleteEvents = state.twEvents.filter(e => e.seasonId === action.payload.season.id && !currentEventIds.includes(e.id));
      const obsoleteEventIds = obsoleteEvents.map(e => e.id);

      state.twEvents = state.twEvents.filter(e => e.seasonId !== action.payload.season.id).concat(action.payload.events);
      
      const seasonIndex = state.twSeasons.findIndex(s => s.id === action.payload.season.id);
      if (seasonIndex !== -1) {
        state.twSeasons[seasonIndex] = action.payload.season;
      }
      
      state.twRecords = state.twRecords.filter(r => !obsoleteEventIds.includes(r.eventId));
    },
    deleteTWSeason(state, action: PayloadAction<{ seasonId: string }>) {
      const seasonId = action.payload.seasonId;
      // BUG-6 FIX: Capture event IDs BEFORE mutating twEvents, otherwise the
      // twRecords filter reads an already-empty list and orphaned records remain.
      const eventIdsToRemove = new Set(
        state.twEvents.filter(e => e.seasonId === seasonId).map(e => e.id)
      );
      state.twSeasons = state.twSeasons.filter(s => s.id !== seasonId);
      state.twEvents = state.twEvents.filter(e => e.seasonId !== seasonId);
      state.twRecords = state.twRecords.filter(r => !eventIdsToRemove.has(r.eventId));
    },
    addTWEvent(state, action: PayloadAction<{ event: TWEvent }>) {
      state.twEvents.push(action.payload.event);
    },
    deleteTWEvent(state, action: PayloadAction<{ eventId: string }>) {
      state.twEvents = state.twEvents.filter(e => e.id !== action.payload.eventId);
      state.twRecords = state.twRecords.filter(r => r.eventId !== action.payload.eventId);
    },
    clearTWEventRecords(state, action: PayloadAction<{ eventId: string }>) {
      state.twRecords = state.twRecords.filter(r => r.eventId !== action.payload.eventId);
    },
    updateTWPlayerRecord(state, action: PayloadAction<{ eventId: string, playerId: string, status: TWRecordStatus }>) {
      const existingRecordIndex = state.twRecords.findIndex(r => r.eventId === action.payload.eventId && r.playerId === action.payload.playerId);
      if (existingRecordIndex >= 0) {
        state.twRecords[existingRecordIndex].status = action.payload.status;
      } else {
        state.twRecords.push({ eventId: action.payload.eventId, playerId: action.payload.playerId, status: action.payload.status });
      }
    },
    mergePlayerIdInTW(state, action: PayloadAction<{ oldId: string; newId: string }>) {
      const { oldId, newId } = action.payload;
      state.twAttendance.forEach(a => {
        if (a.matchedPlayerId === oldId) a.matchedPlayerId = newId;
      });
      state.twRecords.forEach(r => {
        if (r.playerId === oldId) r.playerId = newId;
      });
    },
    // Add a player manually to the Accepted list
    addManualAttendee(state, action: PayloadAction<{ discordName: string; matchedPlayerId: string | null }>) {
      const { discordName, matchedPlayerId } = action.payload;
      // Prevent duplicates by discordName or matchedPlayerId
      const alreadyExists = state.twAttendance.some(a =>
        a.discordName.toLowerCase() === discordName.toLowerCase() ||
        (matchedPlayerId && a.matchedPlayerId === matchedPlayerId)
      );
      if (!alreadyExists) {
        state.twAttendance.push({ 
          discordName, 
          status: 'Accepted', 
          matchedPlayerId,
          isDirty: true 
        });
      }
    },
    // Change a player's attendance status (Accepted <-> Maybe)
    updateAttendanceStatus(state, action: PayloadAction<{ discordName: string; newStatus: 'Accepted' | 'Maybe' }>) {
      const { discordName, newStatus } = action.payload;
      const entry = state.twAttendance.find(a => a.discordName === discordName);
      if (entry) {
        entry.status = newStatus;
        entry.isDirty = true;
      }
    }
  }
});

export const {
  hydrateTWData,
  hydrateTWAttendance,
  updateSingleTWEntry,
  clearTWEntryDirtyFlag,
  setTWAttendance,
  setTWRecords,
  clearTWAttendance,
  createTWSeason,
  updateTWSeason,
  deleteTWSeason,
  addTWEvent,
  deleteTWEvent,
  clearTWEventRecords,
  updateTWPlayerRecord,
  mergePlayerIdInTW,
  addManualAttendee,
  updateAttendanceStatus
} = twSlice.actions;

export const twReducer = twSlice.reducer;

