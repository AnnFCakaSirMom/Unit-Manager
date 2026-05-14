import { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../state/store';
import { setAuthSession, clearAuthSession } from '../state/slices/authSlice';
import { supabase } from '../services/supabase';

export const useAuth = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { role, userId } = useSelector((state: RootState) => state.auth);

    // Synchronous guard that prevents handleSession from running concurrently.
    // useRef is used instead of useState because mutation is synchronous and
    // does not trigger a re-render cycle — making the guard effectively atomic
    // on the single JS thread.
    const isHandlingRef = useRef(false);

    useEffect(() => {
        const handleSession = async (session: any) => {
            // If a session is already being handled, bail out immediately.
            // This prevents the race condition where getSession() and the
            // INITIAL_SESSION event from onAuthStateChange both call handleSession
            // in parallel, leading to duplicate DB queries and potential
            // duplicate INSERT attempts in AuthGuard.
            if (isHandlingRef.current) return;
            isHandlingRef.current = true;

            try {
                if (!session) {
                    dispatch(clearAuthSession());
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('id, role, discord_nickname')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (error) throw error;

                if (!profile) {
                    console.warn('[useAuth] No profile linked to auth id:', session.user.id);
                    dispatch(setAuthSession({
                        userId: session.user.id,
                        role: 'NoProfile' as any,
                        discordNickname: session.user.user_metadata?.full_name || '',
                        avatarUrl: session.user.user_metadata?.avatar_url ?? null,
                    }));
                } else {
                    dispatch(setAuthSession({
                        userId: profile.id,
                        role: profile.role || 'Pending',
                        discordNickname: profile.discord_nickname || '',
                        avatarUrl: session.user.user_metadata?.avatar_url ?? null,
                    }));
                }
            } catch (err: any) {
                console.error('[useAuth] Failed to fetch profile:', err.message);
                dispatch(clearAuthSession());
            } finally {
                // Always release the lock — even on error.
                // Without this, a future SIGNED_OUT or TOKEN_REFRESHED event
                // would be silently dropped, preventing logout from working.
                isHandlingRef.current = false;
            }
        };

        // Rely solely on onAuthStateChange for session handling.
        // Supabase always emits an INITIAL_SESSION event on mount, carrying
        // the same data as getSession() would return. Using both sources in
        // parallel was the root cause of the race condition.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                handleSession(session);
            }
        );

        return () => {
            subscription.unsubscribe();
            // Reset on unmount to avoid a stale lock if the component remounts
            // (e.g. React 18 Strict Mode double-invokes effects in development).
            isHandlingRef.current = false;
        };
    }, [dispatch]);

    const isOfficerPlus = useMemo(
        () => ['Officer', 'Gatekeeper', 'Admin', 'Owner'].includes(role),
        [role]
    );

    return { role, userId, isOfficerPlus };
};
