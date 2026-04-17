import type { AppState, AppAction, TWAttendancePlayer, TWSeason, TWEvent, TWPlayerRecord } from '../../../types';
import { handleTWAttendanceImport, handleTWStatisticsImport } from '../../../utils/reducerHelpers';

export interface TWState {
    twAttendance: TWAttendancePlayer[];
    twSeasons: TWSeason[];
    twEvents: TWEvent[];
    twRecords: TWPlayerRecord[];
}

export const twReducer = (state: AppState, action: AppAction): TWState => {
    switch (action.type) {
        case 'IMPORT_TW_ATTENDANCE': {
            const newState = handleTWAttendanceImport(state, action.payload);
            return {
                twAttendance: newState.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: state.twEvents,
                twRecords: state.twRecords
            };
            // Note: handleTWAttendanceImport also modifies groups. This will be handled in rootReducer.
        }
        case 'CLEAR_TW_ATTENDANCE':
            return {
                twAttendance: [],
                twSeasons: state.twSeasons,
                twEvents: state.twEvents,
                twRecords: state.twRecords
            };
            
        case 'CREATE_TW_SEASON':
            return { 
                twAttendance: state.twAttendance,
                twSeasons: [...state.twSeasons, action.payload.season], 
                twEvents: [...state.twEvents, ...action.payload.events],
                twRecords: state.twRecords
            };
            
        case 'UPDATE_TW_SEASON': {
            const currentEventIds = action.payload.events.map(e => e.id);
            const obsoleteEvents = state.twEvents.filter(e => e.seasonId === action.payload.season.id && !currentEventIds.includes(e.id));
            const obsoleteEventIds = obsoleteEvents.map(e => e.id);

            const updatedTwEvents = state.twEvents.filter(e => e.seasonId !== action.payload.season.id).concat(action.payload.events);

            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons.map(s => s.id === action.payload.season.id ? action.payload.season : s),
                twEvents: updatedTwEvents,
                twRecords: state.twRecords.filter(r => !obsoleteEventIds.includes(r.eventId))
            };
        }
        
        case 'DELETE_TW_SEASON':
            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons.filter(s => s.id !== action.payload.seasonId),
                twEvents: state.twEvents.filter(e => e.seasonId !== action.payload.seasonId),
                twRecords: state.twRecords.filter(r => {
                    const event = state.twEvents.find(e => e.id === r.eventId);
                    return event?.seasonId !== action.payload.seasonId;
                })
            };
            
        case 'ADD_TW_EVENT':
            return { 
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: [...state.twEvents, action.payload.event],
                twRecords: state.twRecords
            };
            
        case 'DELETE_TW_EVENT':
            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: state.twEvents.filter(e => e.id !== action.payload.eventId),
                twRecords: state.twRecords.filter(r => r.eventId !== action.payload.eventId)
            };
            
        case 'CLEAR_TW_EVENT_RECORDS':
            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: state.twEvents,
                twRecords: state.twRecords.filter(r => r.eventId !== action.payload.eventId)
            };
            
        case 'IMPORT_TW_STATISTICS_RAID_HELPER': {
            const newState = handleTWStatisticsImport(state, action.payload);
            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: state.twEvents,
                twRecords: newState.twRecords
            };
        }
        
        case 'UPDATE_TW_PLAYER_RECORD': {
            const existingRecordIndex = state.twRecords.findIndex(r => r.eventId === action.payload.eventId && r.playerId === action.payload.playerId);
            if (existingRecordIndex >= 0) {
                const newRecords = [...state.twRecords];
                newRecords[existingRecordIndex] = { ...newRecords[existingRecordIndex], status: action.payload.status };
                return {
                    twAttendance: state.twAttendance,
                    twSeasons: state.twSeasons,
                    twEvents: state.twEvents,
                    twRecords: newRecords 
                };
            } else {
                return {
                    twAttendance: state.twAttendance,
                    twSeasons: state.twSeasons,
                    twEvents: state.twEvents,
                    twRecords: [...state.twRecords, { eventId: action.payload.eventId, playerId: action.payload.playerId, status: action.payload.status }] 
                };
            }
        }
        
        default:
            return {
                twAttendance: state.twAttendance,
                twSeasons: state.twSeasons,
                twEvents: state.twEvents,
                twRecords: state.twRecords
            };
    }
};
