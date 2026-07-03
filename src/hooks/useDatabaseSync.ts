import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { fetchPlayersFromSupabase, fetchSinglePlayer } from '../services/playerService';
import { fetchGroupsFromSupabase } from '../services/groupService';
import { fetchTWAttendanceData } from '../services/twAttendanceService';
import { fetchTWImport, fetchSingleTWEntry } from '../services/twImportService';
import { syncManager } from '../services/SyncManager';
import { AppDispatch } from '../state/store';
import { hydratePlayers, updateSinglePlayer, deletePlayer } from '../state/slices/playerSlice';
import { hydrateGroups } from '../state/slices/groupSlice';
import { hydrateTWAttendance, hydrateTWData, updateSingleTWEntry, updateTWPlayerRecord } from '../state/slices/twSlice';
import { setSyncing } from '../state/slices/uiSlice';
import { setAuthSession } from '../state/slices/authSlice';
import { fetchUnitsFromSupabase } from '../state/slices/unitSlice';
import { useAppSelector } from '../state/store';
import { DELTA_SYNC_ENABLED } from '../config/features';

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
    isOfficerPlus: boolean,
    setStatusMessage: (msg: string) => void
): { isSyncing: boolean } => {

    const [isSyncing, setIsSyncing] = useState(false);
    const [reconnectTick, setReconnectTick] = useState(0);
    const { userId, avatarUrl: currentAvatarUrl } = useAppSelector(state => state.auth);

    // Keep a stable ref to avatarUrl so the own-profile listener can read the
    // latest value without it being a useEffect dependency (which would
    // unnecessarily tear down and recreate the Realtime channel on avatar changes).
    const avatarUrlRef = useRef<string | null>(null);
    avatarUrlRef.current = currentAvatarUrl;

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
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    const loadGroups = useCallback(() => {
        syncManager.triggerSync('groups', async (signal) => {
            const groups = await fetchGroupsFromSupabase(signal);
            dispatch(hydrateGroups(groups));
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    const loadTWImport = useCallback(() => {
        syncManager.triggerSync('twImport', async (signal) => {
            const data = await fetchTWImport(signal);
            dispatch(hydrateTWAttendance(data));
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    const loadTWData = useCallback(() => {
        syncManager.triggerSync('twData', async (signal) => {
            const data = await fetchTWAttendanceData(signal);
            dispatch(hydrateTWData(data));
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    const loadSinglePlayer = useCallback((profileId: string) => {
        syncManager.triggerSync(`player-${profileId}`, async (signal) => {
            const player = await fetchSinglePlayer(profileId, signal);
            if (player) {
                dispatch(updateSinglePlayer(player));
            } else {
                dispatch(deletePlayer({ playerId: profileId }));
            }
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    const loadSingleTWEntry = useCallback((discordName: string) => {
        syncManager.triggerSync(`tw-entry-${discordName}`, async (signal) => {
            const entry = await fetchSingleTWEntry(discordName, signal);
            if (entry) {
                dispatch(updateSingleTWEntry(entry));
            }
        }, () => setStatusMessage('Error: Could not sync from server.'));
    }, [dispatch, setStatusMessage]);

    // ── Initial Hydration (players + TW import — available to all roles) ──────
    useEffect(() => {
        loadPlayers();
        loadTWImport();
    }, [loadPlayers, loadTWImport]);

    // ── Always-active: Own-profile role watcher (Solution A + B) ─────────────
    // Listens for changes to the logged-in user's profile row and immediately
    // updates Redux authState (which drives isOfficerPlus in App.tsx).
    //
    // Key design decisions:
    //  - Runs regardless of isOfficerPlus, so a Member receives an instant
    //    role promotion without needing a page refresh (Solution B).
    //  - Directly dispatches setAuthSession instead of calling refreshSession(),
    //    which was unreliable because onAuthStateChange doesn't always fire for
    //    DB-only role changes (Solution A).
    //  - Uses avatarUrlRef so the channel is never recreated due to avatar changes.
    useEffect(() => {
        if (!userId) return;

        const channelId = `own-profile-watch-${Math.random().toString(36).substring(7)}`;

        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                // Server-side filter: Supabase only sends events for this user's
                // own profile row. No need to check payloadId === userId client-side.
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                async (payload) => {
                    // Server-side filter guarantees this is always our own row —
                    // the client-side ID check is kept as a cheap defensive guard.
                    const payloadId = ((payload as any).new?.id) || ((payload as any).old?.id);
                    if (payloadId !== userId) return;

                    if (import.meta.env.DEV) console.log('[Realtime] Own profile changed — re-fetching role...');
                    try {
                        const { data: profile, error } = await supabase
                            .from('profiles')
                            .select('id, role, discord_nickname')
                            .eq('id', userId)
                            .maybeSingle();

                        if (error) throw error;

                        if (profile) {
                            // 1. Update Redux immediately so the UI reacts without waiting for a network round-trip.
                            dispatch(setAuthSession({
                                userId: profile.id,
                                role: profile.role || 'Pending',
                                discordNickname: profile.discord_nickname || '',
                                avatarUrl: avatarUrlRef.current,
                            }));
                            if (import.meta.env.DEV) console.log(`[Realtime] Auth role updated → ${profile.role}`);

                            // 2. Refresh the JWT in the background so Supabase RLS can switch back
                            //    to the fast path (auth.jwt() app_metadata) instead of falling back
                            //    to a per-row DB query on every subsequent request.
                            //    Fire-and-forget: UI is already unblocked by the dispatch above.
                            supabase.auth.refreshSession().catch(() => {});
                        }
                    } catch (err: any) {
                        console.error('[Realtime] Failed to re-fetch own profile:', err?.message);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    if (import.meta.env.DEV) console.log('[Realtime] Own-profile watcher connected.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, dispatch]);

    // ── Officer-only: Groups & TW Data + Realtime Listeners ──────────────────
    useEffect(() => {
        if (!isOfficerPlus) return;

        // Initial load for officer data
        loadGroups();
        loadTWData();

        // RT-5: On reconnect (tick > 0), also re-fetch all-role data to cover
        // any database events missed while the channel was down.
        if (reconnectTick > 0) {
            if (import.meta.env.DEV) console.log(`[Realtime] Re-fetching all data after reconnect (attempt ${reconnectTick})…`);
            loadPlayers();
            loadTWImport();
        }

        // Use a unique channel ID per session to ensure a fresh connection
        const channelId = `db-sync-${Math.random().toString(36).substring(7)}`;

        // RT-5: Closure variables for reconnect guard and backoff tracking.
        // These are scoped to this effect run so each channel owns its own state.
        let isCleaningUp = false;
        let reconnectAttempts = 0;
        
        const channel = supabase
            .channel(channelId)
            // Use a broad listener for 'public' schema as specific filters were unreliable
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                const table = payload.table;

                // BUG-5 FIX: Ignore tables that change as a side-effect of sync writes.
                // audit_logs and player_info are written by the app itself — reacting to
                // them would cause redundant fetches and risk infinite sync loops.
                if (table === 'audit_logs' || table === 'player_info') {
                    return;
                }

                if (table === 'units') {
                    if (import.meta.env.DEV) console.log('[Realtime] Syncing units...');
                    dispatch(fetchUnitsFromSupabase());
                } else if (table === 'groups' || table === 'group_members') {
                    if (import.meta.env.DEV) console.log('[Realtime] Syncing groups...');
                    loadGroups();
                } else if (table === 'profiles' || table === 'profile_units') {
                    if (DELTA_SYNC_ENABLED) {
                        const changedId = ((payload as any).new?.profile_id)
                                       || ((payload as any).new?.id)
                                       || ((payload as any).old?.id);
                        if (changedId) {
                            if (import.meta.env.DEV) console.log(`[Realtime] Delta sync for player ${changedId}...`);
                            loadSinglePlayer(changedId);
                        } else {
                            if (import.meta.env.DEV) console.log('[Realtime] Delta sync missing ID, fallback to full sync...');
                            loadPlayers();
                        }
                    } else {
                        if (import.meta.env.DEV) console.log('[Realtime] Syncing players...');
                        loadPlayers();
                    }
                } else if (table === 'tw_import_list') {
                    if (DELTA_SYNC_ENABLED) {
                        const changedName = ((payload as any).new?.discord_name)
                                         || ((payload as any).old?.discord_name);
                        if (changedName) {
                            if (import.meta.env.DEV) console.log(`[Realtime] Delta sync TW entry: ${changedName}`);
                            loadSingleTWEntry(changedName);
                        } else {
                            if (import.meta.env.DEV) console.log('[Realtime] Delta sync TW missing name, fallback to full sync...');
                            loadTWImport();
                        }
                    } else {
                        if (import.meta.env.DEV) console.log('[Realtime] Syncing TW import list...');
                        loadTWImport();
                    }
                } else if (table === 'tw_attendance_records') {
                    if (DELTA_SYNC_ENABLED) {
                        const newRecord = (payload as any).new;
                        if (newRecord && newRecord.event_id && newRecord.profile_id && newRecord.status) {
                            if (import.meta.env.DEV) console.log(`[Realtime] Delta sync TW record for ${newRecord.profile_id}`);
                            dispatch(updateTWPlayerRecord({ 
                                eventId: newRecord.event_id, 
                                playerId: newRecord.profile_id, 
                                status: newRecord.status 
                            }));
                        } else {
                            if (import.meta.env.DEV) console.log('[Realtime] Delta sync TW record missing data, fallback to full sync...');
                            loadTWData();
                        }
                    } else {
                        if (import.meta.env.DEV) console.log('[Realtime] Syncing TW attendance...');
                        loadTWData();
                    }
                } else if (table === 'tw_seasons' || table === 'tw_events') {
                    if (import.meta.env.DEV) console.log('[Realtime] Syncing TW seasons/events...');
                    loadTWData();
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // RT-5: Successful connection — reset the backoff counter
                    reconnectAttempts = 0;
                    if (import.meta.env.DEV) console.log('[Realtime] Connected and listening for database changes.');
                } else if ((status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') && !isCleaningUp) {
                    // RT-5: Exponential backoff — 1s → 2s → 4s → … capped at 30s
                    const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    reconnectAttempts++;
                    console.warn(
                        `[Realtime] Channel ${status}. ` +
                        `Reconnecting in ${delayMs / 1000}s (attempt ${reconnectAttempts})…`
                    );
                    setTimeout(() => {
                        if (!isCleaningUp) {
                            // Bumping the tick causes this useEffect to re-run:
                            // cleanup removes the broken channel, then a fresh one is created.
                            setReconnectTick(t => t + 1);
                        }
                    }, delayMs);
                }
            });

        return () => {
            isCleaningUp = true;
            supabase.removeChannel(channel);
        };
    }, [isOfficerPlus, loadGroups, loadPlayers, loadSinglePlayer, loadSingleTWEntry, loadTWImport, loadTWData, reconnectTick]);

    return { isSyncing };
};
