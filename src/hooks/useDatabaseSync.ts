import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { fetchPlayersFromSupabase } from '../services/playerService';
import { fetchGroupsFromSupabase } from '../services/groupService';
import { fetchTWAttendanceData } from '../services/twAttendanceService';
import { fetchTWImport } from '../services/twImportService';
import { syncManager } from '../services/SyncManager';
import { AppDispatch } from '../state/store';
import { hydratePlayers } from '../state/slices/playerSlice';
import { hydrateGroups } from '../state/slices/groupSlice';
import { hydrateTWAttendance, hydrateTWData } from '../state/slices/twSlice';
import { setSyncing } from '../state/slices/uiSlice';

/**
 * useDatabaseSync
 *
 * Thin orchestration hook. Responsibilities:
 *  1. Define stable callbacks that delegate fetch + dispatch to SyncManager.
 *  2. Subscribe to SyncManager's loading state and expose it to consumers.
 *  3. Perform the initial data hydration on mount.
 *  4. Register Supabase realtime listeners that trigger the callbacks above.
 *
 * All debouncing and "latest-request-wins" logic lives in SyncManager —
 * this hook stays declarative and easy to read.
 *
 * @param dispatch      - Injected Redux dispatch function.
 * @param isOfficerPlus - Whether the current user has officer-level privileges.
 * @returns isSyncing   - True while any sync is in-flight (for UI indicators).
 */
export const useDatabaseSync = (
    dispatch: AppDispatch,
    isOfficerPlus: boolean
): { isSyncing: boolean } => {

    const [isSyncing, setIsSyncing] = useState(false);

    // ── Subscribe to SyncManager's global loading state ──────────────────────
    useEffect(() => {
        syncManager.setLoadingCallback((isLoading) => {
            setIsSyncing(isLoading);
            dispatch(setSyncing(isLoading));
        });
        return () => {
            syncManager.setLoadingCallback(null);
        };
    }, [dispatch]);

    // ── Stable callbacks (one per data type) ─────────────────────────────────
    // Each callback delegates to syncManager.triggerSync, which handles
    // debouncing and abort logic. Only dispatch is in the dependency array
    // because the fetch functions are module-level constants.

    const loadPlayers = useCallback(() => {
        syncManager.triggerSync('players', async (signal) => {
            const players = await fetchPlayersFromSupabase(signal);
            if (players.length > 0) {
                dispatch(hydratePlayers(players));
            }
        });
    }, [dispatch]);

    const loadGroups = useCallback(() => {
        syncManager.triggerSync('groups', async (signal) => {
            const groups = await fetchGroupsFromSupabase(signal);
            dispatch(hydrateGroups(groups));
        });
    }, [dispatch]);

    const loadTWImport = useCallback(() => {
        syncManager.triggerSync('twImport', async (signal) => {
            const data = await fetchTWImport(signal);
            dispatch(hydrateTWAttendance(data));
        });
    }, [dispatch]);

    const loadTWData = useCallback(() => {
        syncManager.triggerSync('twData', async (signal) => {
            const data = await fetchTWAttendanceData(signal);
            dispatch(hydrateTWData(data));
        });
    }, [dispatch]);

    // ── Initial Hydration (players + TW import — available to all roles) ──────
    useEffect(() => {
        loadPlayers();
        loadTWImport();
    }, [loadPlayers, loadTWImport]);

    // ── Officer-only: Groups & TW Data + Realtime Listeners ──────────────────
    useEffect(() => {
        if (!isOfficerPlus) return;

        // Initial load for officer data
        loadGroups();
        loadTWData();

        // ── DEBUG MODE: Listen to everything in 'public' ──────────────────────────
        const debugChannelName = `db-sync-debug-${Math.random().toString(36).substring(7)}`;
        console.log(`[Realtime-DEBUG] Connecting to: ${debugChannelName}`);

        const channel = supabase
            .channel(debugChannelName)
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('[Realtime-DEBUG] Event received!', {
                    table: payload.table,
                    type: payload.eventType,
                    data: payload.new
                });
                
                // Refresh specific data based on table
                if (['groups', 'group_members'].includes(payload.table)) loadGroups();
                if (['profiles', 'profile_units'].includes(payload.table)) loadPlayers();
                if (payload.table.startsWith('tw_')) loadTWData();
                if (payload.table === 'tw_import_list') loadTWImport();
            })
            .subscribe((status) => {
                console.log('[Realtime-DEBUG] Subscription status:', status);
            });

        return () => {
            console.log('[Realtime-DEBUG] Cleaning up channel...');
            supabase.removeChannel(channel);
        };
    }, [isOfficerPlus, loadGroups, loadPlayers, loadTWImport, loadTWData]);

    return { isSyncing };
};
