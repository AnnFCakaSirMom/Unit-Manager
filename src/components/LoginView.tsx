import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export const LoginView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Ett fel uppstod vid inloggning.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200">
            <div className="p-8 bg-gray-800 rounded-lg shadow-xl shadow-gray-900/50 flex flex-col items-center gap-6 max-w-sm w-full border border-gray-700">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2 text-white">Unit Manager</h1>
                    <p className="text-gray-400 text-sm">Log in to manage units and attendance.</p>
                </div>
                
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded text-sm w-full text-center">
                        {error}
                    </div>
                )}

                <button 
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {/* Minimalistic SVG Discord logo */}
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                    {isLoading ? 'Loading...' : 'Login with Discord'}
                </button>
            </div>
        </div>
    );
};
