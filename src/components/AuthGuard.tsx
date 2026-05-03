import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import { LoginView } from './LoginView';
import { PendingApprovalView } from './PendingApprovalView';
import { setAuthSession } from '../state/slices/authSlice';
import { Button } from './Button';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { userId, role, isInitialized, discordNickname } = useSelector((state: RootState) => state.auth);
    const [isRequesting, setIsRequesting] = useState(false);
    const [claimedName, setClaimedName] = useState('');

    const handleRequestAccess = async () => {
        if (!userId) return;
        setIsRequesting(true);
        try {
            const { supabase } = await import('../services/supabase');
            
            // Create a new pending profile
            // We MUST provide 'id' (Primary Key) and 'user_id' (Auth link).
            // Usually these should be the same UUID from the Auth session.
            const { data: newProfile, error } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    user_id: userId,
                    discord_nickname: discordNickname || '',
                    claimed_name: claimedName.trim() || null,
                    role: 'Pending'
                })
                .select('id, role, discord_nickname')
                .single();

            if (error) throw error;

            if (newProfile) {
                // Update local state to transition to Pending
                dispatch(setAuthSession({
                    userId: newProfile.id,
                    role: newProfile.role as any,
                    discordNickname: newProfile.discord_nickname || discordNickname || ''
                }));
            }
        } catch (err: any) {
            console.error('Failed to request access:', err.message);
            alert('Failed to send request: ' + err.message);
        } finally {
            setIsRequesting(false);
        }
    };

    // If we are still waiting for Supabase to tell us if we are logged in
    if (!isInitialized) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-black/80 backdrop-blur-xl text-gray-200">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500/80 animate-spin" />
                    <span className="text-sm font-medium tracking-wide text-gray-400">Initializing session…</span>
                </div>
            </div>
        );
    }

    // Not logged in? Show the login screen
    if (!userId) {
        return <LoginView />;
    }

    // Logged in but not approved yet? Show the waiting room
    if (role === 'Pending') {
        return <PendingApprovalView />;
    }

    // Logged in but no profile linked in the database
    if ((role as string) === 'NoProfile') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black/80 backdrop-blur-xl text-gray-200 p-4">
                <div className="p-8 bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-500/20 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-3 text-white text-center">No Profile Linked</h1>
                    <p className="text-gray-400 mb-6 text-center text-sm">
                        Your Discord account is not linked to a profile in Unit Manager.
                    </p>

                    <div className="mb-6">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Enter your In-Game Name
                        </label>
                        <input
                            type="text"
                            value={claimedName}
                            onChange={(e) => setClaimedName(e.target.value)}
                            placeholder="e.g. SirMom"
                            className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-600"
                        />
                        <p className="mt-2 text-[10px] text-gray-600 italic">
                            This helps admins find and link your existing stats.
                        </p>
                    </div>

                    <Button
                        onClick={handleRequestAccess}
                        disabled={isRequesting}
                        className="w-full font-bold py-3 px-4 rounded-xl mb-3 transition-all shadow-lg"
                    >
                        {isRequesting ? 'Sending…' : '🚀 Request Access'}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={async () => { const { supabase } = await import('../services/supabase'); await supabase.auth.signOut(); }}
                        className="w-full text-gray-500 hover:text-gray-200 border border-white/5 hover:border-white/10"
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        );
    }

    // Approved role (Member, Officer, Gatekeeper, Admin, Owner)
    return <>{children}</>;
};
