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
import { useAppSelector } from '../state/store';

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
    const { userId } = useAppSelector(state => state.auth);

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

        // Use a unique channel ID per session to ensure a fresh connection
        const channelId = `db-sync-${Math.random().toString(36).substring(7)}`;
        
        const channel = supabase
            .channel(channelId)
            // Use a broad listener for 'public' schema as specific filters were unreliable
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                const table = payload.table;

                // BUG-5 FIX: Ignore tables that change as a side-effect of sync writes.
                // audit_logs and player_info are written by the app itself — reacting to
                // them would cause redundant fetches and risk infinite sync loops.
                if (table === 'audit_logs' || table === 'player_info' || table === 'units') {
                    return;
                }

                if (table === 'groups' || table === 'group_members') {
                    console.log('[Realtime] Syncing groups...');
                    loadGroups();
                } else if (table === 'profiles' || table === 'profile_units') {
                    console.log('[Realtime] Syncing players...');
                    loadPlayers();
                    if (table === 'profiles') {
                        // Only refresh session if it's OUR profile that changed
                        const payloadId = (payload.new as any)?.id || (payload.old as any)?.id;
                        if (payloadId === userId) {
                            console.log('[Realtime] Our profile changed, refreshing session...');
                            supabase.auth.refreshSession().catch(() => {});
                        }
                    }
                } else if (table === 'tw_import_list') {
                    console.log('[Realtime] Syncing TW import list...');
                    loadTWImport();
                } else if (table.startsWith('tw_')) {
                    console.log('[Realtime] Syncing TW metadata...');
                    loadTWData();
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected and listening for database changes.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOfficerPlus, loadGroups, loadPlayers, loadTWImport, loadTWData, userId]);

    return { isSyncing };
};
