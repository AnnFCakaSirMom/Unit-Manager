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

    const handleRequestAccess = async () => {
        if (!userId) return;
        setIsRequesting(true);
        try {
            const { supabase } = await import('../services/supabase');
            
            // Create a new pending profile
            const { data: newProfile, error } = await supabase
                .from('profiles')
                .insert({
                    user_id: userId,
                    discord_nickname: discordNickname || '',
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
            alert('Det gick inte att skicka begäran: ' + err.message);
        } finally {
            setIsRequesting(false);
        }
    };

    // Om vi fortfarande väntar på att Supabase ska berätta om vi är inloggade
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

    // Inte inloggad? Visa inloggningsskärmen
    if (!userId) {
        return <LoginView />;
    }

    // Inloggad men inte godkänd än? Visa väntrummet
    if (role === 'Pending') {
        return <PendingApprovalView />;
    }

    // Inloggad men ingen profil kopplad i databasen
    if ((role as string) === 'NoProfile') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
                <div className="p-8 bg-gray-800 rounded-lg shadow-xl border border-red-800/50 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        🚫
                    </div>
                    <h1 className="text-2xl font-bold mb-3 text-white">Ingen profil kopplad</h1>
                    <p className="text-gray-400 mb-2">
                        Ditt Discord-konto är inte kopplat till en profil i Unit Manager.
                    </p>
                    <p className="text-gray-500 text-sm mb-8">
                        Ansök om medlemskap nedan för att bli godkänd av en administratör.
                    </p>
                    <Button
                        onClick={handleRequestAccess}
                        disabled={isRequesting}
                        className="w-full font-bold py-3 px-4 rounded mb-3 transition-all shadow-lg shadow-blue-900/20"
                    >
                        {isRequesting ? 'Skickar...' : '🚀 Begär åtkomst'}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={async () => { const { supabase } = await import('../services/supabase'); await supabase.auth.signOut(); }}
                        className="w-full text-gray-400 hover:text-white"
                    >
                        Logga ut
                    </Button>
                </div>
            </div>
        );
    }

    // Godkänd roll (Member, Officer, Gatekeeper, Admin, Owner)
    return <>{children}</>;
};
