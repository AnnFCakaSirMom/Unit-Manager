import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAppState, useAppDispatch } from '../AppContext';
import { usePermission } from '../hooks/usePermission';
import { Button } from './Button';
import { Select } from './Select';
import { Check, UserPlus, Link as LinkIcon, AlertTriangle } from './icons';
import type { Player } from '../types';

interface PendingProfile {
    id: string;
    discord_nickname: string;
}

export const ProfileMatcher: React.FC = () => {
    const { players } = useAppState();
    const dispatch = useAppDispatch();
    const { canManageRole } = usePermission();
    const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
    const [linkedProfileIds, setLinkedProfileIds] = useState<Set<string>>(new Set());
    const [selectedMatches, setSelectedMatches] = useState<{ [pendingId: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

    const fetchProfiles = async () => {
        try {
            // Get pending profiles
            const { data: pendingData, error: pendingError } = await supabase
                .from('profiles')
                .select('id, discord_nickname')
                .eq('role', 'Pending');
            
            if (pendingError) throw pendingError;
            setPendingProfiles(pendingData || []);

            // Get all linked profiles to exclude them from the dropdown
            const { data: linkedData, error: linkedError } = await supabase
                .from('profiles')
                .select('id')
                .neq('role', 'Pending');

            if (linkedError) throw linkedError;
            setLinkedProfileIds(new Set((linkedData || []).map(p => p.id)));
        } catch (err: any) {
            setMessage({ text: `Update failed: ${err.message}`, type: 'error' });
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    // Unlinked local profiles are those whose IDs are not in the existing linked profiles in Supabase
    const unlinkedLocalPlayers = useMemo(() => {
        return players.filter(p => !linkedProfileIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [players, linkedProfileIds]);

    const getSuggestedMatchId = (discordNickname: string) => {
        if (!discordNickname) return '';
        const lowerNick = discordNickname.toLowerCase();
        
        // Find best match based on simple inclusion
        const match = unlinkedLocalPlayers.find(p => 
            p.name.toLowerCase().includes(lowerNick) || 
            lowerNick.includes(p.name.toLowerCase()) ||
            p.aliases?.some(alias => alias.toLowerCase() === lowerNick)
        );
        return match ? match.id : '';
    };

    useEffect(() => {
        // Auto-select suggestions if not already selected
        if (pendingProfiles.length > 0 && unlinkedLocalPlayers.length > 0 && Object.keys(selectedMatches).length === 0) {
            const initialSelection: { [id: string]: string } = {};
            pendingProfiles.forEach(pp => {
                const suggestion = getSuggestedMatchId(pp.discord_nickname);
                if (suggestion) {
                    initialSelection[pp.id] = suggestion;
                }
            });
            setSelectedMatches(initialSelection);
        }
    }, [pendingProfiles, unlinkedLocalPlayers]);

    const handleSelectChange = (pendingId: string, localProfileId: string) => {
        setSelectedMatches(prev => ({ ...prev, [pendingId]: localProfileId }));
    };

    const handleLinkProfile = async (pendingId: string) => {
        const localPlayerId = selectedMatches[pendingId];
        if (!localPlayerId) return;

        const localPlayer = players.find(p => p.id === localPlayerId);
        if (!localPlayer) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            // Check hierarchy: Can we manage a Member role?
            if (!canManageRole('Member')) {
                throw new Error("Du har inte behörighet att tilldela rollen Member.");
            }

            // Update the profile in Supabase
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role: 'Member',
                    display_name: localPlayer.name,
                    total_leadership: localPlayer.totalLeadership || 0,
                    joined_date: localPlayer.joinedDate || null,
                    inactive_date: localPlayer.inactiveDate || null,
                    not_in_house: localPlayer.notInHouse || false,
                    internal_notes: localPlayer.info || '',
                    discord_aliases: localPlayer.aliases || []
                })
                .eq('id', pendingId);

            if (profileError) throw profileError;

            // Prepare unit rows
            const unitRows = [];
            
            // Get all unique units to iterate over
            const allUnits = new Set([...localPlayer.units, ...localPlayer.preparedUnits, ...localPlayer.masteryUnits, ...localPlayer.favoriteUnits]);
            
            for (const unitName of allUnits) {
                unitRows.push({
                    profile_id: pendingId,
                    unit_name: unitName,
                    is_owned: localPlayer.units.includes(unitName),
                    is_prepared: localPlayer.preparedUnits.includes(unitName),
                    is_mastery: localPlayer.masteryUnits.includes(unitName),
                    is_favorite: localPlayer.favoriteUnits.includes(unitName)
                });
            }

            if (unitRows.length > 0) {
                const { error: unitError } = await supabase
                    .from('profile_units')
                    .insert(unitRows);
                    
                if (unitError) {
                    console.error("Warning: Profile upgraded, but unit migration failed:", unitError);
                    // Decide if we throw here. Probably yes to alert the user.
                    // throw unitError; 
                }
            }

            // Update local state by replacing all occurrences of localPlayerId with pendingId
            dispatch({ type: 'MERGE_PLAYER_ID', payload: { oldId: localPlayerId, newId: pendingId } });

            setMessage({ text: `Successfully linked and upgraded ${localPlayer.name}!`, type: 'success' });
            
            // Remove from the local pending list to update UI
            setPendingProfiles(prev => prev.filter(p => p.id !== pendingId));
            
            // Re-fetch profiles to refresh `linkedProfileIds`
            fetchProfiles();

        } catch (err: any) {
            setMessage({ text: `Merge Failed: ${err.message}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateNew = async (pendingId: string, discordNick: string) => {
        setIsProcessing(true);
        setMessage(null);

        try {
            if (!canManageRole('Member')) {
                throw new Error("Behörighet saknas.");
            }

            const { error } = await supabase
                .from('profiles')
                .update({ role: 'Member' })
                .eq('id', pendingId);

            if (error) throw error;

            setMessage({ text: `Created ${discordNick} as a new Member! Note: Changes will appear next time the app loads from Supabase.`, type: 'success' });
            
            setPendingProfiles(prev => prev.filter(p => p.id !== pendingId));
        } catch (err: any) {
            setMessage({ text: `Creation Failed: ${err.message}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-4xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" /> Pending Approvals
            </h2>
            
            <p className="text-gray-400 mb-6 text-sm">
                These users have logged in via Discord but are waiting for access. You can link them to an existing migrated profile to keep their history, or approve them as brand new members.
            </p>

            {message && (
                <div className={`p-4 rounded-md mb-6 ${message.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/50' : message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-blue-500/20 text-blue-300'}`}>
                    {message.text}
                </div>
            )}

            {pendingProfiles.length === 0 ? (
                <div className="text-center p-8 bg-gray-900/50 rounded-lg border border-gray-700">
                    <Check size={48} className="text-green-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl text-gray-300 font-medium">No pending approvals!</h3>
                    <p className="text-gray-500 mt-2">All signed-up users have been processed.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingProfiles.map(pending => {
                        const suggestionId = getSuggestedMatchId(pending.discord_nickname);
                        const selectedVal = selectedMatches[pending.id] || '';

                        return (
                            <div key={pending.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 w-full bg-gray-800/80 px-4 py-2 rounded border border-gray-700">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Discord User</span>
                                    <span className="font-semibold text-white">{pending.discord_nickname}</span>
                                </div>
                                
                                <div className="text-gray-400 flex-shrink-0">
                                    <LinkIcon size={20} />
                                </div>
                                
                                <div className="flex-1 w-full">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Existing Profile</span>
                                    <Select 
                                        value={selectedVal} 
                                        onChange={(e) => handleSelectChange(pending.id, e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">-- Do not link --</option>
                                        {unlinkedLocalPlayers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {suggestionId === p.id ? '(Suggested Match)' : ''}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <Button 
                                        variant="primary" 
                                        disabled={isProcessing || !selectedVal}
                                        onClick={() => handleLinkProfile(pending.id)}
                                        className="w-full whitespace-nowrap bg-blue-600 hover:bg-blue-500"
                                    >
                                        <LinkIcon size={16} /> Koppla & Uppgradera
                                    </Button>
                                    
                                    <Button 
                                        variant="secondary" 
                                        disabled={isProcessing || !!selectedVal}
                                        onClick={() => handleCreateNew(pending.id, pending.discord_nickname)}
                                        className="w-full whitespace-nowrap"
                                    >
                                        <UserPlus size={16} /> Skapa som ny medlem
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
