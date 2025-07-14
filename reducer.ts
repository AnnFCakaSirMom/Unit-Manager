// reducer.ts
import type { AppState, AppAction, Player, Group } from './types';

// --- Data Validation and Migration ---
const validatePlayer = (player: any): Player => ({
    id: player.id || crypto.randomUUID(),
    name: player.name || "Unknown Player",
    units: Array.isArray(player.units) ? player.units : [],
    preparedUnits: Array.isArray(player.preparedUnits) ? player.preparedUnits : [],
    masteryUnits: Array.isArray(player.masteryUnits) ? player.masteryUnits : [],
    notInHouse: typeof player.notInHouse === 'boolean' ? player.notInHouse : false,
});

const validateGroup = (group: any): Group => ({
    id: group.id || crypto.randomUUID(),
    name: group.name || "Unknown Group",
    leaderId: group.leaderId || null,
    members: Array.isArray(group.members) ? group.members.map((member: any) => ({
        playerId: member.playerId,
        selectedUnits: Array.isArray(member.selectedUnits) ? member.selectedUnits : [],
        isLocked: typeof member.isLocked === 'boolean' ? member.isLocked : false,
    })) : [],
});

// --- Main Reducer ---
export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        // Player actions
        case 'ADD_PLAYER': {
            const newPlayer: Player = { id: crypto.randomUUID(), name: action.payload.name.trim(), units: [], preparedUnits: [], masteryUnits: [], notInHouse: false };
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
        
        // Unit actions for a specific player
        case 'TOGGLE_PLAYER_UNIT': {
            const { playerId, unitName, unitType } = action.payload; // unitType: 'units', 'preparedUnits', 'masteryUnits'
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
            const { playerId, formData, allUnitNames } = action.payload;
            
            const allUnitNamesSet = new Set(allUnitNames);
            const newUnits: string[] = [];
            const newPreparedUnits: string[] = [];
            const newMasteryUnits: string[] = [];

            const lines = formData.split('\n');
            // Regex is now more flexible, capturing all content within brackets
            const regex = /✅ Owned: \[(.*?)\].*🌟 Maxed: \[(.*?)\].*👑 Mastery: \[(.*?)\].*- (.*)/;

            for (const line of lines) {
                const match = line.match(regex);
                if (match) {
                    // Capture the full string inside the brackets
                    const [_, ownedStr, maxedStr, masteryStr, unitNameStr] = match;
                    const unitName = unitNameStr.trim();
                    
                    if (allUnitNamesSet.has(unitName)) {
                        // Trim the captured string before checking for 'x'
                        if (ownedStr.trim().toLowerCase() === 'x') {
                            newUnits.push(unitName);
                        }
                        if (maxedStr.trim().toLowerCase() === 'x') {
                            newPreparedUnits.push(unitName);
                        }
                        if (masteryStr.trim().toLowerCase() === 'x') {
                            newMasteryUnits.push(unitName);
                        }
                    }
                }
            }

            return {
                ...state,
                players: state.players.map(p => 
                    p.id === playerId 
                    ? { ...p, units: newUnits, preparedUnits: newPreparedUnits, masteryUnits: newMasteryUnits } 
                    : p
                )
            };
        }

        // Global unit config actions
        case 'UPDATE_UNIT_CONFIG':
            return { ...state, unitConfig: action.payload.unitConfig };
        
        case 'RENAME_UNIT_GLOBALLY': {
            const { oldName, newName } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].map(u => u === oldName ? newName : u);
            }
            return {
                ...state,
                unitConfig: { ...state.unitConfig, tiers: newTiers },
                players: state.players.map(player => ({
                    ...player,
                    units: player.units.map(u => u === oldName ? newName : u),
                    preparedUnits: (player.preparedUnits || []).map(u => u === oldName ? newName : u),
                    masteryUnits: (player.masteryUnits || []).map(u => u === oldName ? newName : u)
                }))
            };
        }
        case 'DELETE_UNIT_GLOBALLY': {
            const { unitNameToDelete } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].filter(u => u !== unitNameToDelete);
            }
            return {
                ...state,
                unitConfig: { ...state.unitConfig, tiers: newTiers },
                players: state.players.map(player => ({
                    ...player,
                    units: player.units.filter(u => u !== unitNameToDelete),
                    preparedUnits: (player.preparedUnits || []).filter(u => u !== unitNameToDelete),
                    masteryUnits: (player.masteryUnits || []).filter(u => u !== unitNameToDelete)
                }))
            };
        }

        // Group actions
        case 'ADD_GROUP': {
            const newGroup: Group = { id: crypto.randomUUID(), name: `New Group ${state.groups.length + 1}`, leaderId: null, members: [] };
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

            if (!memberToMove) return state; // Player not found in source group

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
                               return {...m, selectedUnits: newSelectedUnits};
                           }
                           return m;
                       });
                       return {...g, members: newMembers};
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

        case 'LOAD_STATE':
            const loadedData = action.payload;
            return {
                ...state,
                players: loadedData.players.map(validatePlayer),
                unitConfig: loadedData.unitConfig || { tiers: {} },
                groups: (loadedData.groups || []).map(validateGroup)
            };
            
        default:
            return state;
    }
};


// --- Higher-Order Reducer for Unsaved Changes ---
export const withUnsavedChanges = (reducer: typeof appReducer) => {
    return (state: AppState, action: AppAction): AppState => {
        const newState = reducer(state, action);

        if (action.type === 'LOAD_STATE' || action.type === 'SAVE_SUCCESS') {
            return { ...newState, hasUnsavedChanges: false };
        }
        
        // A simple check; for complex states, deep comparison might be needed
        if (JSON.stringify(newState) !== JSON.stringify(state)) {
            return { ...newState, hasUnsavedChanges: true };
        }

        return newState;
    };
};