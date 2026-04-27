import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../state/store';
import { setAuthSession, clearAuthSession } from '../state/slices/authSlice';
import { supabase } from '../services/supabase';

export const useAuth = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { role, userId } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        const handleSession = async (session: any) => {
            if (session) {
                try {
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
                }
            } else {
                dispatch(clearAuthSession());
            }
        };

        // 1. Initial fetch
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        }).catch(err => {
            console.error('[useAuth] Initial getSession failed:', err);
            dispatch(clearAuthSession());
        });

        // 2. Listen to changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    const isOfficerPlus = useMemo(() => ['Officer', 'Gatekeeper', 'Admin', 'Owner'].includes(role), [role]);

    return { role, userId, isOfficerPlus };
};
