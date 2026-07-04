import { createSlice, PayloadAction, original } from '@reduxjs/toolkit';
import type { Group, GroupMember } from '../../types';

interface GroupState {
  groups: Group[];
  // H2: Tombstones for locally-removed groups. Prevents a concurrent Realtime
  // hydration from resurrecting a group that was deleted locally but not yet
  // persisted to the DB. Self-cleaning — see hydrateGroups.
  deletedGroupIds: string[];
}

const initialState: GroupState = {
  groups: [],
  deletedGroupIds: [],
};

const groupSlice = createSlice({
  name: 'group',
  initialState,
  reducers: {
    hydrateGroups(state, action: PayloadAction<Group[]>) {
      const rawServerGroups = action.payload;
      // serverGroupIds reflects what the server *actually* has (unfiltered) —
      // used both for the local-only-dirty check and for self-cleaning tombstones.
      const serverGroupIds = new Set(rawServerGroups.map(g => g.id));

      // H2: Suppress resurrection of groups that were deleted locally but whose
      // deletion hasn't propagated to the DB yet. Without this, a Realtime
      // hydration would re-add the just-deleted group and the deletion would be
      // lost (never detected by useCloudSync's diff).
      const tombstoned = new Set(state.deletedGroupIds);
      const serverGroups = rawServerGroups.filter(g => !tombstoned.has(g.id));

      // Map server groups, preserving any local dirty version of a known group.
      const mappedGroups = serverGroups.map(serverGroup => {
        const localGroup = state.groups.find(g => g.id === serverGroup.id);
        if (localGroup?.isDirty) {
          return localGroup;
        }
        return serverGroup;
      });

      // FIX-2: Re-attach local dirty groups that don't exist in the server response
      // yet (e.g. newly created groups from a TW import that haven't been persisted).
      // Without this, a Realtime hydration event would silently wipe them out.
      const localOnlyDirtyGroups = state.groups.filter(
        g => g.isDirty && !serverGroupIds.has(g.id)
      );

      state.groups = [...mappedGroups, ...localOnlyDirtyGroups];

      // H2: Self-clean tombstones the server has confirmed gone. If a tombstoned
      // id is no longer present on the server, the deletion has propagated and the
      // tombstone can be dropped. Ids still present on the server are kept
      // suppressed until their deletion lands.
      state.deletedGroupIds = state.deletedGroupIds.filter(id => serverGroupIds.has(id));
    },
    setGroups(state, action: PayloadAction<Group[]>) {
      const newIds = new Set(action.payload.map(g => g.id));

      // H2: Any currently-known group that is absent from the new payload is a
      // local removal (e.g. Clear List `setGroups([])`, or a restore with fewer
      // groups) — tombstone it so a concurrent hydration can't resurrect it.
      state.groups.forEach(g => {
        if (!newIds.has(g.id) && !state.deletedGroupIds.includes(g.id)) {
          state.deletedGroupIds.push(g.id);
        }
      });

      // A group explicitly present in the new payload is intentionally alive
      // again (e.g. restore of a previously-deleted group) — drop its tombstone.
      state.deletedGroupIds = state.deletedGroupIds.filter(id => !newIds.has(id));

      state.groups = action.payload;
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
          members: [],
          isDirty: true
        };
        state.groups.push(newGroup);
      } else {
        const standardCount = groups.filter(g => !g.name.toUpperCase().includes('MAYBE')).length;
        const newGroup: Group = { 
          id: crypto.randomUUID(), 
          name: `Group ${standardCount + 1}`, 
          leaderId: null, 
          members: [],
          isDirty: true
        };
        state.groups.push(newGroup);
      }
    },
    deleteGroup(state, action: PayloadAction<{ groupId: string }>) {
      const { groupId } = action.payload;
      state.groups = state.groups.filter(g => g.id !== groupId);
      // H2: Record a tombstone so a concurrent Realtime hydration (which still
      // sees the group on the server) can't re-add it before the DB deletion lands.
      if (!state.deletedGroupIds.includes(groupId)) {
        state.deletedGroupIds.push(groupId);
      }
    },
    updateGroupName(state, action: PayloadAction<{ groupId: string; name: string }>) {
      const group = state.groups.find(g => g.id === action.payload.groupId);
      if (group) {
        group.name = action.payload.name.trim();
        group.isDirty = true;
      }
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
        group.isDirty = true;
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
        group.isDirty = true;
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
          sourceGroup.isDirty = true;
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
          targetGroup.isDirty = true;
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
          group.isDirty = true;
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
          group.isDirty = true;
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
          if (unit) {
            unit.rank = rank;
            group.isDirty = true;
          }
        }
      }
    },
    toggleGroupMemberLock(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const member = group.members.find(m => m.playerId === playerId);
        if (member) {
          member.isLocked = !member.isLocked;
          group.isDirty = true;
        }
      }
    },
    setGroupLeader(state, action: PayloadAction<{ groupId: string; playerId: string }>) {
      const { groupId, playerId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        group.leaderId = playerId;
        group.isDirty = true;
      }
    },
    mergePlayerIdInGroups(state, action: PayloadAction<{ oldId: string; newId: string }>) {
      const { oldId, newId } = action.payload;
      state.groups.forEach(g => {
        if (g.leaderId === oldId) {
          g.leaderId = newId;
          g.isDirty = true;
        }
        g.members.forEach(m => {
          if (m.playerId === oldId) {
            m.playerId = newId;
            g.isDirty = true;
          }
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
              group.isDirty = true;
            }
          });
        });
      });
    },
    deleteUnitGloballyInGroups(state, action: PayloadAction<{ unitNameToDelete: string }>) {
      const { unitNameToDelete } = action.payload;
      state.groups.forEach(group => {
        group.members.forEach(member => {
          const originalLength = member.selectedUnits.length;
          member.selectedUnits = member.selectedUnits.filter(u => u.unitName !== unitNameToDelete);
          if (member.selectedUnits.length !== originalLength) {
            group.isDirty = true;
          }
        });
      });
    },
    clearGroupDirtyFlag(state, action: PayloadAction<{ groupId: string; syncedRef?: Group }>) {
      const { groupId, syncedRef } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        // H1: Only clear the dirty flag if the group hasn't been re-edited since
        // the synced snapshot. Immer swaps the object reference on every mutation,
        // so an identity mismatch means a concurrent edit happened during the async
        // upsert — keep it dirty so the newer content is re-synced next cycle.
        if (syncedRef && (original(group) ?? group) !== syncedRef) return;
        group.isDirty = false;
      }
    }
  }
});

export const {
  hydrateGroups,
  setGroups,
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
  deleteUnitGloballyInGroups,
  clearGroupDirtyFlag
} = groupSlice.actions;

export const groupReducer = groupSlice.reducer;
