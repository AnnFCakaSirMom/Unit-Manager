import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../state/store';
import { upsertPlayer } from '../services/playerService';
import { upsertGroup, deleteGroup as deleteGroupService } from '../services/groupService';
import { upsertTWImport, deleteTWImportEntry } from '../services/twImportService';
import { auditService } from '../services/auditService';
import { clearPlayerDirtyFlag } from '../state/slices/playerSlice';
import { clearGroupDirtyFlag } from '../state/slices/groupSlice';
import { clearTWEntryDirtyFlag } from '../state/slices/twSlice';

export type SyncStatus = 'Syncing' | 'Synced' | 'Error' | 'PermanentError';

export function useCloudSync(
  setStatusMessage: (msg: string) => void
) {
  const [status, setStatus] = useState<SyncStatus>('Synced');
  // BUG-3 FIX: retryTick forces the effect to re-run after a transient failure,
  // since the dependency array won't change on its own if no new edits are made.
  const [retryTick, setRetryTick] = useState(0);
  const dispatch = useAppDispatch();
  const { userId: actorId, discordNickname: actorNickname } = useAppSelector(state => state.auth);
  
  const players = useAppSelector(state => state.player.players);
  const groups = useAppSelector(state => state.group.groups);
  const twAttendance = useAppSelector(state => state.tw.twAttendance);

  // Keep refs to previous state to compute diffs
  const prevPlayersRef = useRef(players);
  const prevGroupsRef = useRef(groups);
  const prevTWAttendanceRef = useRef(twAttendance);
  const isInitialized = useRef(false);

  // Track retry attempts per object ID to prevent infinite loops
  const retryCountsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const currentPlayers = players;
    const currentGroups = groups;
    const currentTWAttendance = twAttendance;
    
    // Wait specifically for players before initializing. Groups may load faster than
    // players, and initializing with an empty player list would cause all subsequent
    // edits to be logged as "Added new player" (audit-log race condition).
    if (!isInitialized.current && currentPlayers.length === 0) {
        return;
    }

    if (
      currentPlayers === prevPlayersRef.current &&
      currentGroups === prevGroupsRef.current &&
      currentTWAttendance === prevTWAttendanceRef.current &&
      // BUG-3 FIX: Also allow through when items are pending retry, even if
      // no new user edits have been made (refs would otherwise be equal).
      retryCountsRef.current.size === 0
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      if (!actorId) return;

      if (!isInitialized.current) {
          prevPlayersRef.current = currentPlayers;
          prevGroupsRef.current = currentGroups;
          prevTWAttendanceRef.current = currentTWAttendance;
          isInitialized.current = true;
          console.log('[useCloudSync] System initialized. Skipping initial sync logs.');
          return;
      }

      setStatus('Syncing');
      setStatusMessage("Saving to cloud...");

      const prevPlayersMap = new Map(prevPlayersRef.current.map(p => [p.id, p]));
      const prevGroupsMap = new Map(prevGroupsRef.current.map(g => [g.id, g]));
      const prevTWMap = new Map(prevTWAttendanceRef.current.map(p => [p.discordName, p]));

      // 1. Diffs for Players - ONLY sync dirty players
      const changedPlayers = currentPlayers.filter(p => p.isDirty);

      // 2. Diffs for Groups - ONLY sync dirty groups
      const changedGroups = currentGroups.filter(g => g.isDirty);

      let hasErrors = false;
      let hasPermanentErrors = false;

      const handleResult = (id: string, success: boolean, serviceName: string) => {
        if (success) {
          retryCountsRef.current.delete(id);
          return true;
        } else {
          const count = (retryCountsRef.current.get(id) || 0) + 1;
          retryCountsRef.current.set(id, count);
          if (count >= 5) {
            console.error(`[useCloudSync] PERMANENT FAILURE for ${serviceName} ID: ${id}. Attempt limit reached.`);
            hasPermanentErrors = true;
            return true; // Return true to update Ref anyway and stop retrying
          }
          hasErrors = true;
          return false;
        }
      };

      // Execute Player Upserts
      for (const player of changedPlayers) {
        const prev = prevPlayersMap.get(player.id);
        const success = await upsertPlayer(player, prev);
        
        if (handleResult(player.id, success, 'playerService.upsert')) {
          prevPlayersMap.set(player.id, player);
          if (success) {
            const isSelf = actorId === player.id;
            let actionType: 'SMALL_CHANGE' | 'MAJOR_CHANGE' = 'SMALL_CHANGE';
            let detail = isSelf ? 'Updated their profile' : `Updated units for ${player.name}`;
            let isSuspicious = false;

            if (!prev) {
                actionType = 'MAJOR_CHANGE';
                detail = `Added new player: ${player.name}`;
            } else {
                if (prev.role !== player.role) {
                    actionType = 'MAJOR_CHANGE';
                    detail = `Changed role for ${player.name}: ${prev.role} -> ${player.role}`;
                    if (['Admin', 'Owner', 'Gatekeeper'].includes(player.role || '')) {
                        isSuspicious = true;
                    }
                } else if (prev.name !== player.name) {
                    actionType = 'MAJOR_CHANGE';
                    detail = `Renamed ${player.name} (formerly ${prev.name})`;
                }
            }

            await auditService.logAction({
                actor_id: actorId,
                actor_nickname: actorNickname || 'Unknown',
                action_type: actionType,
                action_detail: detail,
                target_id: player.id,
                target_name: player.name,
                old_data: prev,
                new_data: player,
                is_suspicious: isSuspicious
            });
            
            // Clear the dirty flag after successful save and audit log
            dispatch(clearPlayerDirtyFlag({ playerId: player.id }));
          }
        }
      }

      // Execute Group Deletions — groups removed from local state should be deleted from DB
      const currentGroupIds = new Set(currentGroups.map(g => g.id));
      const deletedGroupIds = [...prevGroupsMap.keys()].filter(id => !currentGroupIds.has(id));

      for (const groupId of deletedGroupIds) {
        const success = await deleteGroupService(groupId);
        if (handleResult(groupId, success, 'groupService.delete')) {
          prevGroupsMap.delete(groupId);
        }
      }

      // Execute Group Upserts (Handling order changes)
      const currentGroupsWithCorrectOrder = [...currentGroups];
      for (let i = 0; i < currentGroupsWithCorrectOrder.length; i++) {
        const group = currentGroupsWithCorrectOrder[i];
        const prevIndex = prevGroupsRef.current.findIndex(g => g.id === group.id);
        
        if (changedGroups.includes(group) || prevIndex !== i) {
          const success = await upsertGroup(group, i);
          if (handleResult(group.id, success, 'groupService.upsert')) {
            prevGroupsMap.set(group.id, group);
            if (success) {
              dispatch(clearGroupDirtyFlag({ groupId: group.id }));
            }
          }
        }
      }

      // TW Attendance Sync - ONLY sync dirty entries
      const changedTW = currentTWAttendance.filter(p => p.isDirty);
      const currentTWNames = new Set(currentTWAttendance.map(p => p.discordName));
      const deletedTWNames = prevTWAttendanceRef.current.filter(p => !currentTWNames.has(p.discordName)).map(p => p.discordName);

      for (const name of deletedTWNames) {
        const success = await deleteTWImportEntry(name);
        if (handleResult(name, success, 'twService.delete')) {
          prevTWMap.delete(name);
        }
      }
      for (const entry of changedTW) {
        const success = await upsertTWImport(entry);
        if (handleResult(entry.discordName, success, 'twService.upsert')) {
          prevTWMap.set(entry.discordName, entry);
          if (success) {
            dispatch(clearTWEntryDirtyFlag({ discordName: entry.discordName }));
          }
        }
      }

      // Update refs with what was successfully synced (or permanently failed).
      // BUG-AUDITLOG FIX: Use the full currentPlayers list, not filtered by prevPlayersMap.
      // The old filter caused players that existed in Redux but were not touched during
      // this sync cycle to be dropped from the "known players" snapshot. On the next
      // edit those players would be missing from prevPlayersMap, causing the audit log
      // to incorrectly classify them as new ("Added new player").
      prevPlayersRef.current = currentPlayers;
      // For groups, we need to maintain order as much as possible
      prevGroupsRef.current = currentGroups.filter(g => prevGroupsMap.has(g.id));
      prevTWAttendanceRef.current = currentTWAttendance.filter(p => prevTWMap.has(p.discordName));

      if (hasPermanentErrors) {
        setStatus('PermanentError');
        setStatusMessage("Cloud save failed permanently for some items.");
      } else if (hasErrors) {
        setStatus('Error');
        setStatusMessage("Cloud save completed with errors. Retrying in 5s...");
        // BUG-3 FIX: Schedule a retry by bumping retryTick after a delay.
        // This re-triggers the effect even when no new user edits occur.
        setTimeout(() => setRetryTick(t => t + 1), 5000);
      } else {
        setStatus('Synced');
        setStatusMessage("Saved to cloud.");
      }

    }, 500);

    return () => clearTimeout(timer);

  }, [players, groups, twAttendance, setStatusMessage, actorId, actorNickname, retryTick]);

  // Data Loss Prevention: Warn user if they try to close the tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = 
        players.some(p => p.isDirty) || 
        groups.some(g => g.isDirty) || 
        twAttendance.some(e => e.isDirty);

      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [players, groups, twAttendance]);

  return { status, isSyncing: status === 'Syncing' };
}

