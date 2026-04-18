import React from 'react';
import { supabase } from '../services/supabase';

export const PendingApprovalView: React.FC = () => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
            <div className="p-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-bold mb-4 text-white">Waiting for Approval</h1>
                <p className="text-gray-400 mb-8">Your account has been created successfully. A Gatekeeper or Admin needs to approve your access before you can use the Unit Manager.</p>
                
                <div className="space-y-4">
                    <div className="p-3 bg-gray-900/50 rounded text-sm text-gray-500">
                        Status: <span className="text-yellow-500 font-medium font-mono">Pending</span>
                    </div>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};
