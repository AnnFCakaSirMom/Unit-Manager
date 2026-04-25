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
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-200">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Initializing session...</span>
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
                <div className="p-8 bg-gray-800 rounded-lg shadow-xl border border-red-800/50 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        🚫
                    </div>
                    <h1 className="text-2xl font-bold mb-3 text-white text-center">No Profile Linked</h1>
                    <p className="text-gray-400 mb-6 text-center">
                        Your Discord account is not linked to a profile in Unit Manager.
                    </p>

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Enter your In-Game Name
                        </label>
                        <input
                            type="text"
                            value={claimedName}
                            onChange={(e) => setClaimedName(e.target.value)}
                            placeholder="e.g. SirMom"
                            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <p className="mt-2 text-[10px] text-gray-500 italic">
                            This helps admins find and link your existing stats.
                        </p>
                    </div>

                    <Button
                        onClick={handleRequestAccess}
                        disabled={isRequesting}
                        className="w-full font-bold py-3 px-4 rounded mb-3 transition-all shadow-lg shadow-blue-900/20"
                    >
                        {isRequesting ? 'Sending...' : '🚀 Request Access'}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={async () => { const { supabase } = await import('../services/supabase'); await supabase.auth.signOut(); }}
                        className="w-full text-gray-400 hover:text-white"
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
