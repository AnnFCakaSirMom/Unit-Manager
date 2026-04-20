import { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { upsertPlayer, deletePlayer } from '../services/playerService';
import { upsertGroup, deleteGroup } from '../services/groupService';
import { upsertTWImport, deleteTWImportEntry } from '../services/twImportService';

export function useCloudSync(
  state: AppState, 
  setStatusMessage: (msg: string) => void
) {
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Keep refs to previous state to compute diffs
  const prevPlayersRef = useRef(state.players);
  const prevGroupsRef = useRef(state.groups);
  const prevTWAttendanceRef = useRef(state.twAttendance);

  useEffect(() => {
    // If there's no unsaved changes or nothing changed, exit early.
    // However, it's safer to just check structural changes.
    const currentPlayers = state.players;
    const currentGroups = state.groups;
    const currentTWAttendance = state.twAttendance;
    
    // We only want to trigger the timeout if there is a difference.
    if (
      currentPlayers === prevPlayersRef.current && 
      currentGroups === prevGroupsRef.current &&
      currentTWAttendance === prevTWAttendanceRef.current
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      setStatusMessage("Saving to cloud...");

      const prevPlayers = prevPlayersRef.current;
      const prevGroups = prevGroupsRef.current;
      const prevTWAttendance = prevTWAttendanceRef.current;

      const prevPlayersMap = new Map(prevPlayers.map(p => [p.id, p]));
      const prevGroupsMap = new Map(prevGroups.map(g => [g.id, g]));
      const prevTWAttendanceMap = new Map(prevTWAttendance.map(p => [p.discordName, p]));

      // 1. Find Modified or Added Players
      const changedPlayers = currentPlayers.filter(p => {
        const prev = prevPlayersMap.get(p.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(p);
      });
      
      // 2. Find Deleted Players
      const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
      const deletedPlayerIds = prevPlayers.filter(p => !currentPlayerIds.has(p.id)).map(p => p.id);

      // 3. Find Modified or Added Groups
      const changedGroups = currentGroups.filter(g => {
        const prev = prevGroupsMap.get(g.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(g);
      });

      // 4. Find Deleted Groups
      const currentGroupIds = new Set(currentGroups.map(g => g.id));
      const deletedGroupIds = prevGroups.filter(g => !currentGroupIds.has(g.id)).map(g => g.id);

      // 5. Find Modified or Added TW entries
      const changedTW = currentTWAttendance.filter(p => {
        const prev = prevTWAttendanceMap.get(p.discordName);
        return !prev || JSON.stringify(prev) !== JSON.stringify(p);
      });

      // 6. Find Deleted TW entries
      const currentTWNames = new Set(currentTWAttendance.map(p => p.discordName));
      const deletedTWNames = prevTWAttendance.filter(p => !currentTWNames.has(p.discordName)).map(p => p.discordName);

      let hasErrors = false;

      // Execute Player Deletions
      for (const id of deletedPlayerIds) {
        const success = await deletePlayer(id);
        if (!success) hasErrors = true;
      }

      // Execute Player Upserts
      for (const player of changedPlayers) {
        const success = await upsertPlayer(player);
        if (!success) hasErrors = true;
      }

      // Execute Group Deletions
      for (const id of deletedGroupIds) {
        const success = await deleteGroup(id);
        if (!success) hasErrors = true;
      }

      // Execute Group Upserts
      for (let i = 0; i < currentGroups.length; i++) {
        const group = currentGroups[i];
        // We might need to upsert groups even if only order changed, so checking order index.
        // Wait, if order index changes, the group object in state might not change identity if we mutated it?
        // In useReducer, it should change identity.
        if (changedGroups.includes(group)) {
          const success = await upsertGroup(group, i);
          if (!success) hasErrors = true;
        } else {
          const prevIndex = prevGroups.findIndex(g => g.id === group.id);
          if (prevIndex !== i) {
            const success = await upsertGroup(group, i);
            if (!success) hasErrors = true;
          }
        }
      }

      // Execute TW Import Deletions
      for (const name of deletedTWNames) {
        const success = await deleteTWImportEntry(name);
        if (!success) hasErrors = true;
      }

      // Execute TW Import Upserts
      for (const entry of changedTW) {
        const success = await upsertTWImport(entry);
        if (!success) hasErrors = true;
      }

      // Update refs
      prevPlayersRef.current = currentPlayers;
      prevGroupsRef.current = currentGroups;
      prevTWAttendanceRef.current = currentTWAttendance;

      setIsSyncing(false);
      if (hasErrors) {
        setStatusMessage("Cloud save completed with errors.");
      } else {
        setStatusMessage("Saved to cloud.");
      }

    }, 2000);

    return () => clearTimeout(timer);

  }, [state.players, state.groups, state.twAttendance, setStatusMessage]);

  return { isSyncing };
}
