import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Group, GroupMember } from '../../types';

interface GroupState {
  groups: Group[];
}

const initialState: GroupState = {
  groups: [],
};

const groupSlice = createSlice({
  name: 'group',
  initialState,
  reducers: {
    hydrateGroups(state, action: PayloadAction<Group[]>) {
      state.groups = [...action.payload];
    },
    setGroups(state, action: PayloadAction<Group[]>) {
      state.groups = action.payload;
    },
    clearTWAttendanceGroups(state) {
      // This was 'CLEAR_TW_ATTENDANCE' returning [] previously? 
      // Wait, clearing TW attendance means groups become empty? The original logic did `return []` for 'CLEAR_TW_ATTENDANCE'.
      state.groups = [];
    },
    addGroup(state, action: PayloadAction<{ isMaybe?: boolean } | undefined>) {
      const isMaybe = action.payload?.isMaybe ?? false;
      const groups = state.groups;
      
      if (isMaybe) {
        const maybeCount = groups.filter(g => g.name.toUpperCase().includes('MAYBE')).length;
        const newGroup: Group = { 
          id: crypto.randomUUID(), 
          name: `MAYBE - Group ${maybeCount + 1}`, 
          leaderId: null, 
          members: [] 
        };
        state.groups.push(newGroup);
      } else {
        const standardCount = groups.filter(g => !g.name.toUpperCase().includes('MAYBE')).length;
        const newGroup: Group = { 
          id: crypto.randomUUID(), 
          name: `Group ${standardCount + 1}`, 
          leaderId: null, 
          members: [] 
        };
        state.groups.push(newGroup);
      }
    },
    deleteGroup(state, action: PayloadAction<{ groupId: string }>) {
      state.groups = state.groups.filter(g => g.id !== action.payload.groupId);
    },
    updateGroupName(state, action: PayloadAction<{ groupId: string; name: string }>) {
      const group = state.groups.find(g => g.id === action.payload.groupId);
      if (group) group.name = action.payload.name.trim();
    },
    addPlayerToGroup(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        if (group.members.length >= 5 || group.members.some(m => m.playerId === playerId)) return;
        const newMember: GroupMember = { playerId, selectedUnits: [], isLocked: false };
        const isFirstMember = group.members.length === 0;
        group.members.push(newMember);
        if (isFirstMember) group.leaderId = playerId;
      }
    },
    removePlayerFromGroup(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        group.members = group.members.filter(m => m.playerId !== playerId);
        if (group.leaderId === playerId) {
          group.leaderId = group.members.length > 0 ? group.members[0].playerId : null;
        }
      }
    },
    movePlayerBetweenGroups(state, action: PayloadAction<{ playerId: string; sourceGroupId: string; targetGroupId: string }>) {
      const { playerId, sourceGroupId, targetGroupId } = action.payload;
      let memberToMove: GroupMember | undefined;

      const sourceGroup = state.groups.find(g => g.id === sourceGroupId);
      if (sourceGroup) {
        memberToMove = sourceGroup.members.find(m => m.playerId === playerId);
        if (memberToMove) {
          sourceGroup.members = sourceGroup.members.filter(m => m.playerId !== playerId);
          if (sourceGroup.leaderId === playerId) {
            sourceGroup.leaderId = sourceGroup.members.length > 0 ? sourceGroup.members[0].playerId : null;
          }
        }
      }

      if (memberToMove) {
        const targetGroup = state.groups.find(g => g.id === targetGroupId);
        if (targetGroup && targetGroup.members.length < 5) {
          const isTargetEmpty = targetGroup.members.length === 0;
          targetGroup.members.push(memberToMove);
          if (isTargetEmpty) {
            targetGroup.leaderId = playerId;
          }
        }
      }
    },
    reorderGroupMember(state, action: PayloadAction<{ groupId: string; playerId: string; targetPlayerId: string }>) {
      const { groupId, playerId, targetPlayerId } = action.payload;
      if (playerId === targetPlayerId) return;

      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const currentIndex = group.members.findIndex(m => m.playerId === playerId);
        const targetIndex = group.members.findIndex(m => m.playerId === targetPlayerId);

        if (currentIndex !== -1 && targetIndex !== -1) {
          const [movedMember] = group.members.splice(currentIndex, 1);
          group.members.splice(targetIndex, 0, movedMember);
        }
      }
    },
    toggleGroupMemberUnit(state, action: PayloadAction<{ groupId: string; playerId: string; unitName: string }>) {
      const { groupId, playerId, unitName } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const member = group.members.find(m => m.playerId === playerId);
        if (member) {
          const isSelected = member.selectedUnits.some(u => u.unitName === unitName);
          if (isSelected) {
            member.selectedUnits = member.selectedUnits.filter(u => u.unitName !== unitName);
          } else {
            member.selectedUnits.push({ unitName, rank: 0 });
          }
        }
      }
    },
    setGroupMemberUnitRank(state, action: PayloadAction<{ groupId: string; playerId: string; unitName: string; rank: number }>) {
      const { groupId, playerId, unitName, rank } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const member = group.members.find(m => m.playerId === playerId);
        if (member) {
          const unit = member.selectedUnits.find(u => u.unitName === unitName);
          if (unit) unit.rank = rank;
        }
      }
    },
    toggleGroupMemberLock(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const member = group.members.find(m => m.playerId === playerId);
        if (member) member.isLocked = !member.isLocked;
      }
    },
    setGroupLeader(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) group.leaderId = playerId;
    },
    mergePlayerIdInGroups(state, action: PayloadAction<{ oldId: string; newId: string }>) {
      const { oldId, newId } = action.payload;
      state.groups.forEach(g => {
        if (g.leaderId === oldId) g.leaderId = newId;
        g.members.forEach(m => {
          if (m.playerId === oldId) m.playerId = newId;
        });
      });
    },
    renameUnitGloballyInGroups(state, action: PayloadAction<{ oldName: string; newName: string }>) {
      const { oldName, newName } = action.payload;
      state.groups.forEach(group => {
        group.members.forEach(member => {
          member.selectedUnits.forEach(unit => {
            if (unit.unitName === oldName) {
              unit.unitName = newName;
            }
          });
        });
      });
    },
    deleteUnitGloballyInGroups(state, action: PayloadAction<{ unitNameToDelete: string }>) {
      const { unitNameToDelete } = action.payload;
      state.groups.forEach(group => {
        group.members.forEach(member => {
          member.selectedUnits = member.selectedUnits.filter(u => u.unitName !== unitNameToDelete);
        });
      });
    }
  }
});

export const {
  hydrateGroups,
  setGroups,
  clearTWAttendanceGroups,
  addGroup,
  deleteGroup,
  updateGroupName,
  addPlayerToGroup,
  removePlayerFromGroup,
  movePlayerBetweenGroups,
  reorderGroupMember,
  toggleGroupMemberUnit,
  setGroupMemberUnitRank,
  toggleGroupMemberLock,
  setGroupLeader,
  mergePlayerIdInGroups,
  renameUnitGloballyInGroups,
  deleteUnitGloballyInGroups
} = groupSlice.actions;

export const groupReducer = groupSlice.reducer;

