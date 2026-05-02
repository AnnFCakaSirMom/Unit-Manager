import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { TWAttendancePlayer, TWSeason, TWEvent, TWPlayerRecord, TWRecordStatus } from '../../types';
import { handleTWAttendanceImport as helperHandleTWAttendanceImport, handleTWStatisticsImport as helperHandleTWStatisticsImport } from '../../utils/reducerHelpers';
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

// Thunk for importing TW Statistics (needs access to players)
export const importTWStatisticsRaidHelper = createAsyncThunk<void, { jsonString: string, eventId: string }, { state: RootState }>(
  'tw/importTWStatisticsRaidHelper',
  async (payload, { getState, dispatch }) => {
    const state = getState();
    const mockAppState: any = {
      players: state.player.players,
      twRecords: state.tw.twRecords
    };
    
    const newState = helperHandleTWStatisticsImport(mockAppState, payload);
    dispatch(setTWRecords(newState.twRecords));
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
      state.twAttendance = action.payload;
    },
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
      state.twSeasons = state.twSeasons.filter(s => s.id !== action.payload.seasonId);
      state.twEvents = state.twEvents.filter(e => e.seasonId !== action.payload.seasonId);
      state.twRecords = state.twRecords.filter(r => {
        const event = state.twEvents.find(e => e.id === r.eventId);
        return event?.seasonId !== action.payload.seasonId;
      });
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
        state.twAttendance.push({ discordName, status: 'Accepted', matchedPlayerId });
      }
    },
    // Change a player's attendance status (Accepted <-> Maybe)
    updateAttendanceStatus(state, action: PayloadAction<{ discordName: string; newStatus: 'Accepted' | 'Maybe' }>) {
      const { discordName, newStatus } = action.payload;
      const entry = state.twAttendance.find(a => a.discordName === discordName);
      if (entry) {
        entry.status = newStatus;
      }
    }
  }
});

export const {
  hydrateTWData,
  hydrateTWAttendance,
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

