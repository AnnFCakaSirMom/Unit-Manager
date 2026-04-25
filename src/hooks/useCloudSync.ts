import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../state/store';
import { upsertPlayer, deletePlayer } from '../services/playerService';
import { upsertGroup, deleteGroup } from '../services/groupService';
import { upsertTWImport, deleteTWImportEntry } from '../services/twImportService';
import { auditService } from '../services/auditService';

export function useCloudSync(
  setStatusMessage: (msg: string) => void
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { userId: actorId, discordNickname: actorNickname } = useAppSelector(state => state.auth);
  
  const players = useAppSelector(state => state.player.players);
  const groups = useAppSelector(state => state.group.groups);
  const twAttendance = useAppSelector(state => state.tw.twAttendance);

  // Keep refs to previous state to compute diffs
  const prevPlayersRef = useRef(players);
  const prevGroupsRef = useRef(groups);
  const prevTWAttendanceRef = useRef(twAttendance);
  const isInitialized = useRef(false);

  useEffect(() => {
    const currentPlayers = players;
    const currentGroups = groups;
    const currentTWAttendance = twAttendance;
    
    // Skip deep comparison if we are still waiting for initial data
    if (!isInitialized.current && currentPlayers.length === 0 && currentGroups.length === 0) {
        return;
    }

    if (
      currentPlayers === prevPlayersRef.current && 
      currentGroups === prevGroupsRef.current &&
      currentTWAttendance === prevTWAttendanceRef.current
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      if (!actorId) return;

      // 1. Initial hydration guard (Debounced):
      // By initializing here, we ensure that all initial data fetches from Supabase
      // have settled before we start tracking diffs for the Audit Log.
      if (!isInitialized.current) {
          prevPlayersRef.current = currentPlayers;
          prevGroupsRef.current = currentGroups;
          prevTWAttendanceRef.current = currentTWAttendance;
          isInitialized.current = true;
          console.log('[useCloudSync] System initialized (debounced). Skipping initial sync logs.');
          return;
      }

      setIsSyncing(true);
      setStatusMessage("Saving to cloud...");

      const prevPlayers = prevPlayersRef.current;
      const prevGroups = prevGroupsRef.current;
      const prevTWAttendance = prevTWAttendanceRef.current;

      const prevPlayersMap = new Map(prevPlayers.map(p => [p.id, p]));
      const prevGroupsMap = new Map(prevGroups.map(g => [g.id, g]));

      // 1. Diffs for Players
      const changedPlayers = currentPlayers.filter(p => {
        const prev = prevPlayersMap.get(p.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(p);
      });
      const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
      const deletedPlayers = prevPlayers.filter(p => !currentPlayerIds.has(p.id));

      // 2. Diffs for Groups
      const changedGroups = currentGroups.filter(g => {
        const prev = prevGroupsMap.get(g.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(g);
      });
      const currentGroupIds = new Set(currentGroups.map(g => g.id));
      const deletedGroups = prevGroups.filter(g => !currentGroupIds.has(g.id));

      let hasErrors = false;

      // Execute & Log Player Deletions
      for (const p of deletedPlayers) {
        const success = await deletePlayer(p.id);
        if (success) {
            await auditService.logAction({
                actor_id: actorId,
                actor_nickname: actorNickname || 'Unknown',
                action_type: 'MAJOR_CHANGE',
                action_detail: `Deleted player ${p.name}`,
                target_id: p.id,
                target_name: p.name,
                old_data: p,
                is_suspicious: true
            });
        } else hasErrors = true;
      }

      // Execute & Log Player Upserts
      for (const player of changedPlayers) {
        const prev = prevPlayersMap.get(player.id);
        const success = await upsertPlayer(player);
        
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
                    // Flag if upgrading to a high-power role
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
        } else hasErrors = true;
      }

      // Execute & Log Group Deletions
      for (const g of deletedGroups) {
        const success = await deleteGroup(g.id);
        if (!success) hasErrors = true;
      }

      // Execute & Log Group Upserts
      for (let i = 0; i < currentGroups.length; i++) {
        const group = currentGroups[i];
        const prevIndex = prevGroups.findIndex(g => g.id === group.id);
        
        if (changedGroups.includes(group) || prevIndex !== i) {
          const success = await upsertGroup(group, i);
          if (!success) hasErrors = true;
        }
      }

      // ... (TW logic remains same, but without specific audit logs as requested)
      const prevTWAttendanceMap = new Map(prevTWAttendance.map(p => [p.discordName, p]));
      const changedTW = currentTWAttendance.filter(p => {
        const prev = prevTWAttendanceMap.get(p.discordName);
        return !prev || JSON.stringify(prev) !== JSON.stringify(p);
      });
      const currentTWNames = new Set(currentTWAttendance.map(p => p.discordName));
      const deletedTWNames = prevTWAttendance.filter(p => !currentTWNames.has(p.discordName)).map(p => p.discordName);

      for (const name of deletedTWNames) {
        const success = await deleteTWImportEntry(name);
        if (!success) hasErrors = true;
      }
      for (const entry of changedTW) {
        const success = await upsertTWImport(entry);
        if (!success) hasErrors = true;
      }

      // Update refs
      prevPlayersRef.current = currentPlayers;
      prevGroupsRef.current = currentGroups;
      prevTWAttendanceRef.current = currentTWAttendance;

      setIsSyncing(false);
      setStatusMessage(hasErrors ? "Cloud save completed with errors." : "Saved to cloud.");

    }, 2000);

    return () => clearTimeout(timer);

  }, [players, groups, twAttendance, setStatusMessage, actorId, actorNickname]);

  return { isSyncing };
}
