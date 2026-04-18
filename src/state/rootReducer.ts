import type { AppState, AppAction } from '../types';
import { handleLoadState } from '../utils/reducerHelpers';

import { playerReducer } from './slices/playerSlice';
import { groupReducer } from './slices/groupSlice';
import { unitReducer } from './slices/unitSlice';
import { twReducer } from './slices/twSlice';

export const rootReducer = (state: AppState, action: AppAction): AppState => {
    if (action.type === 'LOAD_STATE') {
        return handleLoadState(state, action.payload);
    }
    
    // We don't care about setting hasUnsavedChanges anymore, handled by Autosave.
    if (action.type === 'SAVE_SUCCESS') {
        return { ...state, hasUnsavedChanges: false };
    }

    const nextPlayers = playerReducer(state, action);
    const nextGroups = groupReducer(state, action);
    const nextUnitConfig = unitReducer(state, action);
    const nextTWState = twReducer(state, action);

    // Minor optimization: only create a new object if something actually changed.
    // Given the simplicity of our current setup vs performance needs, a flat new object is fine.
    return {
        players: nextPlayers,
        groups: nextGroups,
        unitConfig: nextUnitConfig,
        twAttendance: nextTWState.twAttendance,
        twSeasons: nextTWState.twSeasons,
        twEvents: nextTWState.twEvents,
        twRecords: nextTWState.twRecords,
        hasUnsavedChanges: state.hasUnsavedChanges // We keep its visual state untouched by regular actions
    };
};
