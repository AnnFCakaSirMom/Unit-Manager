import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAppSelector, useAppDispatch } from '../state/store';
import { mergePlayerId } from '../state/slices/playerSlice';
import { usePermission } from '../hooks/usePermission';
import { Button } from './Button';
import { Select } from './Select';
import { ConfirmationModal } from './ConfirmationModal';
import { Check, UserPlus, Link as LinkIcon, AlertTriangle, Trash2 } from './icons';
import { washName } from '../utils';

interface PendingProfile {
    id: string;
    discord_nickname: string;
    claimed_name?: string;
}

export const ProfileMatcher: React.FC = () => {
    const players = useAppSelector(state => state.player.players);
    const dispatch = useAppDispatch();
    const { canManageRole } = usePermission();
    const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
    const [linkedProfileIds, setLinkedProfileIds] = useState<Set<string>>(new Set());
    const [selectedMatches, setSelectedMatches] = useState<{ [pendingId: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        message: string;
        confirmText: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary' | 'secondary';
    }>({
        title: '',
        message: '',
        confirmText: '',
        onConfirm: () => {}
    });

    const fetchProfiles = async () => {
        try {
            // Get pending profiles
            const { data: pendingData, error: pendingError } = await supabase
                .from('profiles')
                .select('id, discord_nickname, claimed_name')
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

    const getSuggestedMatchId = (pending: PendingProfile) => {
        const washedDiscord = washName(pending.discord_nickname);
        const washedClaimed = pending.claimed_name ? washName(pending.claimed_name) : null;
        
        if (!washedDiscord && !washedClaimed) return '';
        
        // 1. Try to match claimed name first (highest priority)
        if (washedClaimed) {
            const match = unlinkedLocalPlayers.find(p => {
                const washedPlayerName = washName(p.name);
                return washedPlayerName === washedClaimed || 
                       washedPlayerName.includes(washedClaimed) || 
                       washedClaimed.includes(washedPlayerName) ||
                       p.aliases?.some(alias => washName(alias) === washedClaimed);
            });
            if (match) return match.id;
        }

        // 2. Fallback to Discord nickname matching
        const match = unlinkedLocalPlayers.find(p => {
            const washedPlayerName = washName(p.name);
            return washedPlayerName.includes(washedDiscord) || 
                   washedDiscord.includes(washedPlayerName) ||
                   p.aliases?.some(alias => washName(alias) === washedDiscord);
        });
        
        return match ? match.id : '';
    };

    useEffect(() => {
        // Auto-select suggestions if not already selected
        if (pendingProfiles.length > 0 && unlinkedLocalPlayers.length > 0 && Object.keys(selectedMatches).length === 0) {
            const initialSelection: { [id: string]: string } = {};
            pendingProfiles.forEach(pp => {
                const suggestion = getSuggestedMatchId(pp);
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

        setIsConfirmOpen(false);
        setIsProcessing(true);
        setMessage(null);

        try {
            // Check hierarchy: Can we manage a Member role?
            if (!canManageRole('Member')) {
                throw new Error("You do not have permission to assign the Member role.");
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
                }
            }

            // Also migrate player_info (internal notes)
            if (localPlayer.info) {
                const { error: infoError } = await supabase
                    .from('player_info')
                    .upsert({ 
                        player_id: pendingId, 
                        internal_notes: localPlayer.info 
                    });
                
                if (infoError) {
                    console.error("Warning: Profile upgraded, but notes migration failed:", infoError);
                }
            }

            // Update local state by replacing all occurrences of localPlayerId with pendingId
            dispatch(mergePlayerId({ oldId: localPlayerId, newId: pendingId }));

            setMessage({ text: `Successfully linked and upgraded ${localPlayer.name}!`, type: 'success' });
            
            // Remove from the local pending list to update UI
            setPendingProfiles(prev => prev.filter(p => p.id !== pendingId));
            
            // Re-fetch profiles to refresh `linkedProfileIds`
            fetchProfiles();

            // CLEANUP: Delete the old manually created profile row from Supabase
            // Since we've already merged its data into the new 'pendingId' row,
            // the old row at 'localPlayerId' is now a duplicate.
            if (localPlayerId !== pendingId) {
                const { error: cleanupError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', localPlayerId);
                
                if (cleanupError) {
                    console.warn("Merge successful, but failed to delete old duplicate profile:", cleanupError);
                }
            }

        } catch (err: any) {
            setMessage({ text: `Merge Failed: ${err.message}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateNew = async (pendingId: string, discordNick: string) => {
        setIsConfirmOpen(false);
        setIsProcessing(true);
        setMessage(null);

        try {
            if (!canManageRole('Member')) {
                throw new Error("Permission denied.");
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

    const handleDeny = async (pendingId: string, discordNick: string) => {
        setIsConfirmOpen(false);
        setIsProcessing(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', pendingId);

            if (error) throw error;

            setMessage({ text: `Deleted ${discordNick} from the queue.`, type: 'info' });
            setPendingProfiles(prev => prev.filter(p => p.id !== pendingId));
            
            // Re-fetch to ensure everything is in sync
            fetchProfiles();
        } catch (err: any) {
            setMessage({ text: `Delete Failed: ${err.message}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Trigger confirmation modal for Link
    const confirmLink = (pendingId: string, discordNick: string) => {
        const localPlayerId = selectedMatches[pendingId];
        const localPlayer = players.find(p => p.id === localPlayerId);
        if (!localPlayer) return;

        setConfirmConfig({
            title: "Link Profile",
            message: `Are you sure you want to link Discord user "${discordNick}" to existing profile "${localPlayer.name}"? This will merge their data.`,
            confirmText: "Confirm Link",
            variant: "primary",
            onConfirm: () => handleLinkProfile(pendingId)
        });
        setIsConfirmOpen(true);
    };

    // Trigger confirmation modal for Create New
    const confirmCreateNew = (pendingId: string, discordNick: string) => {
        setConfirmConfig({
            title: "Create New Member",
            message: `Are you sure you want to create a brand new profile for "${discordNick}"? They will start with an empty unit list.`,
            confirmText: "Create Member",
            variant: "secondary",
            onConfirm: () => handleCreateNew(pendingId, discordNick)
        });
        setIsConfirmOpen(true);
    };

    // Trigger confirmation modal for Deny
    const confirmDeny = (pendingId: string, discordNick: string) => {
        setConfirmConfig({
            title: "Deny Request",
            message: `Are you sure you want to deny "${discordNick}"? They will be removed from the queue but can try to log in again later.`,
            confirmText: "Deny & Delete",
            variant: "danger",
            onConfirm: () => handleDeny(pendingId, discordNick)
        });
        setIsConfirmOpen(true);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-5xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" /> Pending Approvals
            </h2>
            
            <p className="text-gray-400 mb-6 text-sm">
                These users have logged in via Discord but are waiting for access. You can link them to an existing profile to keep their history, approve them as new members, or use the <strong>Deny</strong> button to remove unauthorized requests.
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
                        const suggestionId = getSuggestedMatchId(pending);
                        const selectedVal = selectedMatches[pending.id] || '';

                        return (
                            <div key={pending.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 flex flex-col lg:flex-row items-center gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow w-full">
                                    <div className="bg-gray-800/80 px-4 py-2 rounded border border-gray-700">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Discord User</span>
                                        <span className="font-semibold text-white">{pending.discord_nickname}</span>
                                    </div>
                                    
                                    <div className={cn(
                                        "px-4 py-2 rounded border transition-all",
                                        pending.claimed_name 
                                            ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20" 
                                            : "bg-gray-800/40 border-gray-700/50 opacity-50"
                                    )}>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 leading-none">In-Game Name Claim</span>
                                        <span className={cn(
                                            "font-bold",
                                            pending.claimed_name ? "text-blue-400" : "text-gray-600 italic text-sm"
                                        )}>
                                            {pending.claimed_name || "No name claimed yet"}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-gray-400 flex-shrink-0 hidden lg:block">
                                    <LinkIcon size={20} />
                                </div>
                                
                                <div className="w-full lg:w-64">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Link to Register</span>
                                    <Select 
                                        value={selectedVal} 
                                        onChange={(e) => handleSelectChange(pending.id, e.target.value)}
                                        className={cn(
                                            "w-full text-sm",
                                            suggestionId && selectedVal === suggestionId && "border-green-500/50 bg-green-500/5"
                                        )}
                                    >
                                        <option value="">-- Do not link --</option>
                                        {unlinkedLocalPlayers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {suggestionId === p.id ? '(Suggested Match)' : ''}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2 w-full lg:w-auto">
                                    <Button 
                                        variant="primary" 
                                        disabled={isProcessing || !selectedVal}
                                        onClick={() => confirmLink(pending.id, pending.discord_nickname)}
                                        className="w-full whitespace-nowrap bg-blue-600 hover:bg-blue-500 py-1.5 h-auto text-xs"
                                    >
                                        <LinkIcon size={14} /> Link & Upgrade
                                    </Button>
                                    
                                    <Button 
                                        variant="secondary" 
                                        disabled={isProcessing || !!selectedVal}
                                        onClick={() => confirmCreateNew(pending.id, pending.discord_nickname)}
                                        className="w-full whitespace-nowrap py-1.5 h-auto text-xs"
                                    >
                                        <UserPlus size={14} /> Create New
                                    </Button>

                                    <Button 
                                        variant="ghost" 
                                        disabled={isProcessing}
                                        onClick={() => confirmDeny(pending.id, pending.discord_nickname)}
                                        className="w-full whitespace-nowrap py-1.5 h-auto text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                                    >
                                        <Trash2 size={14} /> Deny
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmationModal
                isOpen={isConfirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onClose={() => setIsConfirmOpen(false)}
            />
        </div>
    );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
