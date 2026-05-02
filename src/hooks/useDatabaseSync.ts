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

        // Single channel for all realtime events
        const channel = supabase
            .channel('db-sync')
            // Group changes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, (payload) => {
                console.log('[Realtime] Change in "groups" table:', payload.eventType, payload.new);
                loadGroups();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload) => {
                console.log('[Realtime] Change in "group_members" table:', payload.eventType);
                loadGroups();
            })
            // Player changes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                console.log('[Realtime] Profile change:', payload.eventType);
                loadPlayers();
                // Refresh JWT so any role change takes effect immediately (no logout needed).
                supabase.auth.refreshSession().catch(e =>
                    console.warn('[useDatabaseSync] Session refresh after profile change failed:', e)
                );
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_units' }, loadPlayers)
            // TW import changes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_import_list' }, loadTWImport)
            // TW attendance changes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_seasons' }, loadTWData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_events' }, loadTWData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_attendance_records' }, loadTWData)
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Successfully subscribed to database changes.');
                } else {
                    console.warn('[Realtime] Subscription status:', status);
                }
            });

        return () => {
            console.log('[Realtime] Unsubscribing from database changes...');
            supabase.removeChannel(channel);
        };
    }, [isOfficerPlus, loadGroups, loadPlayers, loadTWImport, loadTWData]);

    return { isSyncing };
};
