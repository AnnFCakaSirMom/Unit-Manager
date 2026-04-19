import type { AppState, AppAction } from '../types';
import { handleLoadState } from '../utils/reducerHelpers';

import { playerReducer } from './slices/playerSlice';
import { groupReducer } from './slices/groupSlice';
import { twReducer } from './slices/twSlice';
// NOTE: unitReducer is now an RTK slice in the Redux store.
// unitConfig is merged into AppStateContext via useSelector in App.tsx.

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
    const nextTWState = twReducer(state, action);

    return {
        players: nextPlayers,
        groups: nextGroups,
        unitConfig: state.unitConfig, // Owned by Redux store — passed through unchanged
        twAttendance: nextTWState.twAttendance,
        twSeasons: nextTWState.twSeasons,
        twEvents: nextTWState.twEvents,
        twRecords: nextTWState.twRecords,
        hasUnsavedChanges: state.hasUnsavedChanges
    };
};
