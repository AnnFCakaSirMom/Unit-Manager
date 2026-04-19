import type { AppState, AppAction, Player } from '../../types';
import { handleParsePlayerUnitsForm } from '../../utils/reducerHelpers';

export const playerReducer = (state: AppState, action: AppAction): Player[] => {
    switch (action.type) {
        case 'HYDRATE_PLAYERS':
            // Replace the full player list with sorted data fetched from Supabase.
            // After this, the local useReducer takes ownership — all mutations work normally.
            return [...action.payload].sort((a, b) => a.name.localeCompare(b.name));

        case 'ADD_PLAYER': {
            const newPlayer: Player = { 
                id: crypto.randomUUID(), 
                name: action.payload.name.trim(), 
                units: [], 
                preparedUnits: [], 
                masteryUnits: [], 
                favoriteUnits: [], 
                notInHouse: false, 
                totalLeadership: 0, 
                joinedDate: new Date().toISOString().split('T')[0], 
                player_info: [],
                aliases: [] 
            };
            return [...state.players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
        }
        case 'DELETE_PLAYER':
            return state.players.filter(p => p.id !== action.payload.playerId);
        case 'UPDATE_PLAYER_NAME':
            return state.players.map(p => p.id === action.payload.playerId ? { ...p, name: action.payload.name.trim() } : p);
        case 'TOGGLE_NOT_IN_HOUSE':
            return state.players.map(p => {
                if (p.id === action.payload.playerId) {
                    const newNotInHouse = !p.notInHouse;
                    return {
                        ...p,
                        notInHouse: newNotInHouse,
                        inactiveDate: newNotInHouse ? new Date().toISOString().split('T')[0] : null
                    };
                }
                return p;
            });
        case 'UPDATE_PLAYER_INFO':
            return state.players.map(p =>
                p.id === action.payload.playerId ? { 
                    ...p, 
                    info: action.payload.info,
                    player_info: [{ internal_notes: action.payload.info }]
                } : p
            );
        case 'UPDATE_PLAYER_LEADERSHIP':
            return state.players.map(p =>
                p.id === action.payload.playerId ? { ...p, totalLeadership: action.payload.leadership } : p
            );
        case 'TOGGLE_PLAYER_UNIT': {
            const { playerId, unitName, unitType } = action.payload;
            return state.players.map(p => {
                if (p.id === playerId) {
                    const currentUnits = p[unitType] || [];
                    const newUnits = currentUnits.includes(unitName) ? currentUnits.filter(u => u !== unitName) : [...currentUnits, unitName];
                    return { ...p, [unitType]: newUnits };
                }
                return p;
            });
        }
        case 'PARSE_PLAYER_UNITS_FORM':
            return handleParsePlayerUnitsForm(state, action.payload).players;
        case 'CLEAR_PLAYER_UNITS':
            return state.players.map(p =>
                p.id === action.payload.playerId
                    ? { ...p, units: [], preparedUnits: [], masteryUnits: [], favoriteUnits: [] }
                    : p
            );
        case 'RENAME_UNIT_GLOBALLY': {
            const { oldName, newName } = action.payload;
            return state.players.map(player => ({
                ...player,
                units: player.units.map(u => u === oldName ? newName : u),
                preparedUnits: (player.preparedUnits || []).map(u => u === oldName ? newName : u),
                masteryUnits: (player.masteryUnits || []).map(u => u === oldName ? newName : u),
                favoriteUnits: (player.favoriteUnits || []).map(u => u === oldName ? newName : u)
            }));
        }
        case 'DELETE_UNIT_GLOBALLY': {
            const { unitNameToDelete } = action.payload;
            return state.players.map(player => ({
                ...player,
                units: player.units.filter(u => u !== unitNameToDelete),
                preparedUnits: (player.preparedUnits || []).filter(u => u !== unitNameToDelete),
                masteryUnits: (player.masteryUnits || []).filter(u => u !== unitNameToDelete),
                favoriteUnits: (player.favoriteUnits || []).filter(u => u !== unitNameToDelete)
            }));
        }
        case 'UPDATE_PLAYER_PROFILE':
            return state.players.map(p =>
                p.id === action.payload.playerId
                    ? { ...p, joinedDate: action.payload.joinedDate, inactiveDate: action.payload.inactiveDate, aliases: action.payload.aliases }
                    : p
            );
        case 'MERGE_PLAYER_ID':
            return state.players.map(p =>
                p.id === action.payload.oldId
                    ? { ...p, id: action.payload.newId }
                    : p
            );
        default:
            return state.players;
    }
};
