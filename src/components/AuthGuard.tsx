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

    // Godkänd roll (Member, Officer, Gatekeeper, Admin) eller Guest (om vi tillåter det längre fram)
    // För tillfället släpper vi igenom alla som inte är Pending.
    return <>{children}</>;
};
