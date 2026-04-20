import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { LoginView } from './LoginView';
import { PendingApprovalView } from './PendingApprovalView';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { userId, role, isInitialized } = useSelector((state: RootState) => state.auth);

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
                        Kontakta en <span className="text-indigo-400 font-medium">Admin eller Gatekeeper</span> för att få tillgång.
                    </p>
                    <button
                        onClick={async () => { const { supabase } = await import('../services/supabase'); await supabase.auth.signOut(); }}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                        Logga ut
                    </button>
                </div>
            </div>
        );
    }

    // Godkänd roll (Member, Officer, Gatekeeper, Admin, Owner)
    return <>{children}</>;
};
