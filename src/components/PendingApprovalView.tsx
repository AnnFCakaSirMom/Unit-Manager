import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { Button } from './Button';
import { Input } from './Input';
import { Check } from './icons';

export const PendingApprovalView: React.FC = () => {
    const { userId, discordNickname } = useSelector((state: RootState) => state.auth);
    const [claimedName, setClaimedName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Load existing claim if any
    useEffect(() => {
        if (!userId) return;
        supabase
            .from('profiles')
            .select('claimed_name')
            .eq('id', userId)
            .single()
            .then(({ data }) => {
                if (data?.claimed_name) {
                    setClaimedName(data.claimed_name);
                    setIsSaved(true);
                }
            });
    }, [userId]);

    const handleSaveClaim = async () => {
        if (!claimedName.trim() || !userId) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({ claimed_name: claimedName.trim() })
            .eq('id', userId);
        
        setIsSaving(false);
        if (error) {
            console.error("Error saving claim:", error);
        } else {
            setIsSaved(true);
        }
    };

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
                <p className="text-gray-400 mb-6">Welcome, <span className="text-blue-400 font-semibold">{discordNickname}</span>! Your account has been created, but a Gatekeeper needs to approve your access.</p>
                
                <div className="bg-gray-900/40 rounded-lg p-5 border border-gray-700/50 mb-8 text-left">
                    <label htmlFor="claimedName" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Identify Yourself</label>
                    <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">Please enter your <strong>In-Game Name (IGN)</strong> below. This helps the admins find your profile and give you access faster.</p>
                    <div className="flex gap-2">
                        <Input
                            id="claimedName"
                            type="text"
                            value={claimedName}
                            onChange={(e) => {
                                setClaimedName(e.target.value);
                                setIsSaved(false);
                            }}
                            placeholder="e.g. SudanWarrior"
                            className="bg-gray-800 border-gray-700 focus:border-blue-500/50"
                        />
                        <Button 
                            onClick={handleSaveClaim} 
                            disabled={isSaving || !claimedName.trim() || isSaved}
                            variant={isSaved ? "ghost" : "primary"}
                            className={isSaved ? "text-green-400 border-green-500/30" : ""}
                        >
                            {isSaving ? "..." : isSaved ? <Check size={18} /> : "Save"}
                        </Button>
                    </div>
                    {isSaved && <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1"><Check size={12} /> Name submitted! Admins will see this.</p>}
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-gray-900/50 rounded text-sm text-gray-500">
                        Status: <span className="text-yellow-500 font-medium font-mono">Pending Approval</span>
                    </div>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};
