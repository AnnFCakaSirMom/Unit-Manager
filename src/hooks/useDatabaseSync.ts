import { useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { fetchPlayersFromSupabase } from '../services/playerService';
import { fetchGroupsFromSupabase } from '../services/groupService';
import { fetchTWAttendanceData } from '../services/twAttendanceService';
import { fetchTWImport } from '../services/twImportService';
import { AppAction } from '../types';

/**
 * useDatabaseSync
 * 
 * Handles initial hydration and sets up Supabase realtime listeners.
 * 
 * @param dispatch - Injected dispatch function. Currently from local useReducer,
 *                   but designed to be easily swapped for Redux useDispatch in the future.
 * @param isOfficerPlus - Boolean indicating if the user has sufficient privileges.
 */
export const useDatabaseSync = (dispatch: React.Dispatch<AppAction>, isOfficerPlus: boolean) => {

    // Helper to load players
    const loadPlayers = useCallback(() => {
        fetchPlayersFromSupabase()
            .then(players => {
                if (players.length > 0) {
                    dispatch({ type: 'HYDRATE_PLAYERS', payload: players });
                }
            })
            .catch(err => {
                console.warn('[useDatabaseSync] Could not hydrate players from Supabase:', err);
            });
    }, [dispatch]);

    // Initial Hydration (Players and TW Import)
    useEffect(() => {
        // Hydrate players (once at mount). Supabase is the source of truth.
        loadPlayers();

        // Hydrate TW Attendance import list
        fetchTWImport()
            .then(data => {
                if (data.length > 0) {
                    dispatch({ type: 'HYDRATE_TW_ATTENDANCE', payload: data });
                }
            })
            .catch(err => {
                console.warn('[useDatabaseSync] Could not hydrate TW import list:', err);
            });
    }, [dispatch, loadPlayers]);

    // Hydrate Groups from Supabase & Real-time Listeners
    useEffect(() => {
        if (!isOfficerPlus) return;

        const loadGroups = () => {
            fetchGroupsFromSupabase()
                .then(groups => {
                    dispatch({ type: 'HYDRATE_GROUPS', payload: groups });
                })
                .catch(err => console.warn('[useDatabaseSync] Group hydration failed:', err));
        };

        const loadTWImport = () => {
            fetchTWImport()
                .then(data => {
                    dispatch({ type: 'HYDRATE_TW_ATTENDANCE', payload: data });
                })
                .catch(e => console.warn('[useDatabaseSync] Realtime TW import refresh failed:', e));
        }

        // Initial load
        loadGroups();

        // Real-time listener for groups, group_members, profiles, profile_units
        const channel = supabase
            .channel('db-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, loadGroups)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, loadGroups)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                loadPlayers();
                // Refresh JWT so any role change takes effect immediately (no logout needed)
                supabase.auth.refreshSession().catch(e => console.warn('[useDatabaseSync] Session refresh after profile change failed:', e));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_units' }, loadPlayers)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_import_list' }, loadTWImport)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOfficerPlus, dispatch, loadPlayers]);

    // Hydrate TW Attendance Data from Supabase
    useEffect(() => {
        if (!isOfficerPlus) return;

        const loadTWData = () => {
            fetchTWAttendanceData()
                .then(data => {
                    dispatch({ type: 'HYDRATE_TW_DATA', payload: data });
                })
                .catch(err => {
                    console.warn('[useDatabaseSync] Could not hydrate TW attendance data:', err);
                });
        };

        loadTWData();

        const channel = supabase
            .channel('tw-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_seasons' }, loadTWData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_events' }, loadTWData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tw_attendance' }, loadTWData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [isOfficerPlus, dispatch]);
};
