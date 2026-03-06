import type { AppState, AppAction, Player, Group } from './types';

import { handleParsePlayerUnitsForm, handleTWAttendanceImport, handleLoadState } from './utils/reducerHelpers';


// --- Main Reducer ---
export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'ADD_PLAYER': {
            const newPlayer: Player = { id: crypto.randomUUID(), name: action.payload.name.trim(), units: [], preparedUnits: [], masteryUnits: [], favoriteUnits: [], notInHouse: false, totalLeadership: 0 };
            return { ...state, players: [...state.players, newPlayer].sort((a, b) => a.name.localeCompare(b.name)) };
        }
        case 'DELETE_PLAYER': {
            return { ...state, players: state.players.filter(p => p.id !== action.payload.playerId) };
        }
        case 'UPDATE_PLAYER_NAME': {
            return { ...state, players: state.players.map(p => p.id === action.payload.playerId ? { ...p, name: action.payload.name.trim() } : p) };
        }
        case 'TOGGLE_NOT_IN_HOUSE': {
            return { ...state, players: state.players.map(p => p.id === action.payload.playerId ? { ...p, notInHouse: !p.notInHouse } : p) };
        }
        case 'UPDATE_PLAYER_INFO': {
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === action.payload.playerId
                        ? { ...p, info: action.payload.info }
                        : p
                )
            };
        }
        case 'UPDATE_PLAYER_LEADERSHIP': {
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === action.payload.playerId
                        ? { ...p, totalLeadership: action.payload.leadership }
                        : p
                )
            };
        }
        case 'TOGGLE_PLAYER_UNIT': {
            const { playerId, unitName, unitType } = action.payload;
            return {
                ...state,
                players: state.players.map(p => {
                    if (p.id === playerId) {
                        const currentUnits = p[unitType] || [];
                        const newUnits = currentUnits.includes(unitName) ? currentUnits.filter(u => u !== unitName) : [...currentUnits, unitName];
                        return { ...p, [unitType]: newUnits };
                    }
                    return p;
                })
            };
        }
        case 'PARSE_PLAYER_UNITS_FORM': {
            return handleParsePlayerUnitsForm(state, action.payload);
        }
        case 'UPDATE_UNIT_CONFIG':
            return { ...state, unitConfig: action.payload.unitConfig };

        case 'RENAME_UNIT_GLOBALLY': {
            const { oldName, newName } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].map(u => u.name === oldName ? { ...u, name: newName } : u);
            }
            return {
                ...state,
                unitConfig: { ...state.unitConfig, tiers: newTiers },
                players: state.players.map(player => ({
                    ...player,
                    units: player.units.map(u => u === oldName ? newName : u),
                    preparedUnits: (player.preparedUnits || []).map(u => u === oldName ? newName : u),
                    masteryUnits: (player.masteryUnits || []).map(u => u === oldName ? newName : u),
                    favoriteUnits: (player.favoriteUnits || []).map(u => u === oldName ? newName : u)
                }))
            };
        }
        case 'DELETE_UNIT_GLOBALLY': {
            const { unitNameToDelete } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].filter(u => u.name !== unitNameToDelete);
            }
            return {
                ...state,
                unitConfig: { ...state.unitConfig, tiers: newTiers },
                players: state.players.map(player => ({
                    ...player,
                    units: player.units.filter(u => u !== unitNameToDelete),
                    preparedUnits: (player.preparedUnits || []).filter(u => u !== unitNameToDelete),
                    masteryUnits: (player.masteryUnits || []).filter(u => u !== unitNameToDelete),
                    favoriteUnits: (player.favoriteUnits || []).filter(u => u !== unitNameToDelete)
                }))
            };
        }
        case 'ADD_GROUP': {
            const newGroup: Group = { id: crypto.randomUUID(), name: `Group ${state.groups.length + 1}`, leaderId: null, members: [] };
            return { ...state, groups: [...state.groups, newGroup] };
        }
        case 'DELETE_GROUP':
            return { ...state, groups: state.groups.filter(g => g.id !== action.payload.groupId) };
        case 'UPDATE_GROUP_NAME':
            return { ...state, groups: state.groups.map(g => g.id === action.payload.groupId ? { ...g, name: action.payload.name.trim() } : g) };
        case 'ADD_PLAYER_TO_GROUP': {
            const { groupId, playerId } = action.payload;
            return {
                ...state,
                groups: state.groups.map(group => {
                    if (group.id === groupId) {
                        if (group.members.length >= 5 || group.members.some(m => m.playerId === playerId)) return group;
                        const newMember = { playerId, selectedUnits: [], isLocked: false };
                        const isFirstMember = group.members.length === 0;
                        return { ...group, members: [...group.members, newMember], leaderId: isFirstMember ? playerId : group.leaderId };
                    }
                    return group;
                })
            };
        }
        case 'REMOVE_PLAYER_FROM_GROUP': {
            const { groupId, playerId } = action.payload;
            return {
                ...state,
                groups: state.groups.map(group => {
                    if (group.id === groupId) {
                        const newMembers = group.members.filter(m => m.playerId !== playerId);
                        let newLeaderId = group.leaderId;
                        if (group.leaderId === playerId) {
                            newLeaderId = newMembers.length > 0 ? newMembers[0].playerId : null;
                        }
                        return { ...group, members: newMembers, leaderId: newLeaderId };
                    }
                    return group;
                })
            };
        }
        case 'MOVE_PLAYER_BETWEEN_GROUPS': {
            const { playerId, sourceGroupId, targetGroupId } = action.payload;
            let memberToMove = null;

            const groupsAfterRemoval = state.groups.map(group => {
                if (group.id === sourceGroupId) {
                    memberToMove = group.members.find(m => m.playerId === playerId);
                    const newMembers = group.members.filter(m => m.playerId !== playerId);
                    let newLeaderId = group.leaderId;
                    if (group.leaderId === playerId && newMembers.length > 0) newLeaderId = newMembers[0].playerId;
                    else if (newMembers.length === 0) newLeaderId = null;
                    return { ...group, members: newMembers, leaderId: newLeaderId };
                }
                return group;
            });

            if (!memberToMove) return state;

            return {
                ...state,
                groups: groupsAfterRemoval.map(group => {
                    if (group.id === targetGroupId && group.members.length < 5) {
                        return { ...group, members: [...group.members, memberToMove!] };
                    }
                    return group;
                })
            };
        }
        case 'REORDER_GROUP_MEMBER': {
            const { groupId, playerId, targetPlayerId } = action.payload;
            if (playerId === targetPlayerId) return state;

            return {
                ...state,
                groups: state.groups.map(g => {
                    if (g.id === groupId) {
                        const currentIndex = g.members.findIndex(m => m.playerId === playerId);
                        const targetIndex = g.members.findIndex(m => m.playerId === targetPlayerId);

                        if (currentIndex === -1 || targetIndex === -1) return g;

                        const newMembers = [...g.members];
                        const [movedMember] = newMembers.splice(currentIndex, 1);
                        newMembers.splice(targetIndex, 0, movedMember);

                        return { ...g, members: newMembers };
                    }
                    return g;
                })
            };
        }
        case 'TOGGLE_GROUP_MEMBER_UNIT': {
            const { groupId, playerId, unitName } = action.payload;
            return {
                ...state,
                groups: state.groups.map(g => {
                    if (g.id === groupId) {
                        const newMembers = g.members.map(m => {
                            if (m.playerId === playerId) {
                                const isSelected = m.selectedUnits.some(u => u.unitName === unitName);
                                const newSelectedUnits = isSelected
                                    ? m.selectedUnits.filter(u => u.unitName !== unitName)
                                    : [...m.selectedUnits, { unitName, rank: 0 }];
                                return { ...m, selectedUnits: newSelectedUnits };
                            }
                            return m;
                        });
                        return { ...g, members: newMembers };
                    }
                    return g;
                })
            };
        }
        case 'SET_GROUP_MEMBER_UNIT_RANK': {
            const { groupId, playerId, unitName, rank } = action.payload;
            return {
                ...state,
                groups: state.groups.map(g => {
                    if (g.id === groupId) {
                        const newMembers = g.members.map(m => {
                            if (m.playerId === playerId) {
                                const newSelectedUnits = m.selectedUnits.map(u => u.unitName === unitName ? { ...u, rank: rank } : u);
                                return { ...m, selectedUnits: newSelectedUnits };
                            }
                            return m;
                        });
                        return { ...g, members: newMembers };
                    }
                    return g;
                })
            };
        }
        case 'TOGGLE_GROUP_MEMBER_LOCK': {
            const { groupId, playerId } = action.payload;
            return {
                ...state,
                groups: state.groups.map(g => g.id === groupId ? { ...g, members: g.members.map(m => m.playerId === playerId ? { ...m, isLocked: !m.isLocked } : m) } : g)
            };
        }
        case 'SET_GROUP_LEADER': {
            const { groupId, playerId } = action.payload;
            return { ...state, groups: state.groups.map(g => g.id === groupId ? { ...g, leaderId: playerId } : g) };
        }
        case 'IMPORT_TW_ATTENDANCE': {
            return handleTWAttendanceImport(state, action.payload);
        }
        case 'CLEAR_TW_ATTENDANCE': {
            return { ...state, twAttendance: [] };
        }
        case 'LOAD_STATE': {
            return handleLoadState(state, action.payload);
        }
        default:
            return state;
    }
};

export const withUnsavedChanges = (reducer: typeof appReducer) => {
    return (state: AppState, action: AppAction): AppState => {
        const newState = reducer(state, action);
        if (action.type === 'LOAD_STATE' || action.type === 'SAVE_SUCCESS') {
            return { ...newState, hasUnsavedChanges: false };
        }
        if (newState !== state) {
            return { ...newState, hasUnsavedChanges: true };
        }
        return newState;
    };
};