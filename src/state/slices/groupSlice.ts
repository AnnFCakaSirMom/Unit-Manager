import type { AppState, AppAction, Group } from '../../types';
import { handleTWAttendanceImport } from '../../utils/reducerHelpers';

export const groupReducer = (state: AppState, action: AppAction): Group[] => {
    switch (action.type) {
        case 'ADD_GROUP': {
            const newGroup: Group = { id: crypto.randomUUID(), name: `Group ${state.groups.length + 1}`, leaderId: null, members: [] };
            return [...state.groups, newGroup];
        }
        case 'DELETE_GROUP':
            return state.groups.filter(g => g.id !== action.payload.groupId);
        case 'UPDATE_GROUP_NAME':
            return state.groups.map(g => g.id === action.payload.groupId ? { ...g, name: action.payload.name.trim() } : g);
        case 'ADD_PLAYER_TO_GROUP': {
            const { groupId, playerId } = action.payload;
            return state.groups.map(group => {
                if (group.id === groupId) {
                    if (group.members.length >= 5 || group.members.some(m => m.playerId === playerId)) return group;
                    const newMember = { playerId, selectedUnits: [], isLocked: false };
                    const isFirstMember = group.members.length === 0;
                    return { ...group, members: [...group.members, newMember], leaderId: isFirstMember ? playerId : group.leaderId };
                }
                return group;
            });
        }
        case 'REMOVE_PLAYER_FROM_GROUP': {
            const { groupId, playerId } = action.payload;
            return state.groups.map(group => {
                if (group.id === groupId) {
                    const newMembers = group.members.filter(m => m.playerId !== playerId);
                    let newLeaderId = group.leaderId;
                    if (group.leaderId === playerId) {
                        newLeaderId = newMembers.length > 0 ? newMembers[0].playerId : null;
                    }
                    return { ...group, members: newMembers, leaderId: newLeaderId };
                }
                return group;
            });
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

            if (!memberToMove) return state.groups;

            return groupsAfterRemoval.map(group => {
                if (group.id === targetGroupId && group.members.length < 5) {
                    return { ...group, members: [...group.members, memberToMove!] };
                }
                return group;
            });
        }
        case 'REORDER_GROUP_MEMBER': {
            const { groupId, playerId, targetPlayerId } = action.payload;
            if (playerId === targetPlayerId) return state.groups;

            return state.groups.map(g => {
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
            });
        }
        case 'TOGGLE_GROUP_MEMBER_UNIT': {
            const { groupId, playerId, unitName } = action.payload;
            return state.groups.map(g => {
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
            });
        }
        case 'SET_GROUP_MEMBER_UNIT_RANK': {
            const { groupId, playerId, unitName, rank } = action.payload;
            return state.groups.map(g => {
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
            });
        }
        case 'TOGGLE_GROUP_MEMBER_LOCK': {
            const { groupId, playerId } = action.payload;
            return state.groups.map(g => g.id === groupId ? { ...g, members: g.members.map(m => m.playerId === playerId ? { ...m, isLocked: !m.isLocked } : m) } : g);
        }
        case 'SET_GROUP_LEADER': {
            const { groupId, playerId } = action.payload;
            return state.groups.map(g => g.id === groupId ? { ...g, leaderId: playerId } : g);
        }
        case 'IMPORT_TW_ATTENDANCE': {
            return handleTWAttendanceImport(state, action.payload).groups;
        }
        default:
            return state.groups;
    }
};
