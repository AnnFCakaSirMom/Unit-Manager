import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Player, Unit, ConfirmModalInfo } from '../types';
import { CheckSquare, List, Search, Clipboard as Copy, ImportIcon, Star, Trash2 } from './icons';
import { ParseFormModal } from './ParseFormModal';
import { Button } from './Button';
import { Input } from './Input';
import { UnitTierSection } from './UnitTierSection';
import { OwnedUnitsView } from './OwnedUnitsView';
import { cn } from '../utils';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { supabase } from '../services/supabase';



interface PlayerUnitViewProps {
    player: Player;
    setStatusMessage: (message: string) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
}

import { useAppState, useAppDispatch } from '../AppContext';
import { usePermission } from '../hooks/usePermission';

export const PlayerUnitView: React.FC<PlayerUnitViewProps> = ({ player, setStatusMessage, setConfirmModal }) => {
    const { unitConfig } = useAppState();
    const dispatch = useAppDispatch();
    const { 
        canEditOthersUnits, 
        isOfficerPlus,
        canEditDisplayName 
    } = usePermission();
    const { userId } = useSelector((state: RootState) => state.auth);
    
    const allUnits = useMemo(() => Object.values(unitConfig.tiers).flat().map(u => u.name), [unitConfig]);
    if (!player) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
                <h2 className="text-xl">Select a player to view their units.</h2>
            </div>
        );
    }
    const [unitViewMode, setUnitViewMode] = useState<'all' | 'owned'>('all');
    const [mainUnitSearchQuery, setMainUnitSearchQuery] = useState("");
    const [isParseModalOpen, setIsParseModalOpen] = useState(false);
    const [infoText, setInfoText] = useState(player?.player_info?.[0]?.internal_notes || "");
    const [leadership, setLeadership] = useState(String(player?.totalLeadership || ''));
    const [joinedDate, setJoinedDate] = useState(player?.joinedDate || "");
    const [inactiveDate, setInactiveDate] = useState(player?.inactiveDate || "");
    const [aliasesText, setAliasesText] = useState((player?.aliases || []).join(', '));
    const [playerNameText, setPlayerNameText] = useState(player?.name || "");

    const allUnitsByTier = useMemo(() => {
        const sortedTiers: { [key: string]: Unit[] } = {};
        Object.entries(unitConfig.tiers).forEach(([tier, units]) => {
            sortedTiers[tier] = [...units].sort((a, b) => a.name.localeCompare(b.name));
        });
        return sortedTiers;
    }, [unitConfig]);

    useEffect(() => {
        setInfoText(player.player_info?.[0]?.internal_notes || "");
        setLeadership(String(player.totalLeadership || ''));
        setJoinedDate(player.joinedDate || "");
        setInactiveDate(player.inactiveDate || "");
        setAliasesText((player.aliases || []).join(', '));
        setPlayerNameText(player.name || "");
    }, [player]);

    const selectedPlayerUnits = useMemo(() => new Set(player?.units || []), [player]);
    const selectedPlayerPreparedUnits = useMemo(() => new Set(player?.preparedUnits || []), [player]);
    const selectedPlayerMasteryUnits = useMemo(() => new Set(player?.masteryUnits || []), [player]);
    const selectedPlayerFavoriteUnits = useMemo(() => new Set(player?.favoriteUnits || []), [player]); // <-- NYTT

    const handleUnitToggle = useCallback((playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => {
        dispatch({ type: 'TOGGLE_PLAYER_UNIT', payload: { playerId, unitName, unitType } });
    }, [dispatch]);

    const handleInfoSave = useCallback(async () => {
        const currentNote = player.player_info?.[0]?.internal_notes || "";
        if (player && infoText !== currentNote) {
            // Direct Supabase Upsert - using player_id as PK to prevent duplicates
            const { error } = await supabase
                .from('player_info')
                .upsert({ 
                    player_id: player.id, 
                    internal_notes: infoText 
                });

            if (error) {
                console.error("Failed to save player info:", error);
                setStatusMessage("Error saving internal notes.");
                return;
            }

            // Sync with local state (Redux/Context)
            dispatch({ type: 'UPDATE_PLAYER_INFO', payload: { playerId: player.id, info: infoText } });
            setStatusMessage("Internal notes saved.");
        }
    }, [infoText, player, dispatch, setStatusMessage]);

    const handleLeadershipSave = useCallback(() => {
        const leadershipValue = parseInt(leadership, 10);
        const newLeadership = isNaN(leadershipValue) ? 0 : leadershipValue;

        if (player && newLeadership !== (player.totalLeadership || 0)) {
            dispatch({ type: 'UPDATE_PLAYER_LEADERSHIP', payload: { playerId: player.id, leadership: newLeadership } });
            setStatusMessage("Player leadership saved.");
        }
    }, [leadership, player, dispatch, setStatusMessage]);

    const handlePlayerNameSave = useCallback(() => {
        if (player && playerNameText.trim() && playerNameText.trim() !== player.name) {
            dispatch({ type: 'UPDATE_PLAYER_NAME', payload: { playerId: player.id, name: playerNameText.trim() } });
            setStatusMessage("In-game name updated.");
        }
    }, [playerNameText, player, dispatch, setStatusMessage]);

    const handleProfileSave = useCallback(() => {
        const newAliases = aliasesText.split(',').map(s => s.trim()).filter(s => s);
        dispatch({
            type: 'UPDATE_PLAYER_PROFILE',
            payload: {
                playerId: player.id,
                joinedDate: joinedDate || undefined,
                inactiveDate: inactiveDate || null,
                aliases: newAliases
            }
        });
        setStatusMessage("Player profile updated.");
    }, [joinedDate, inactiveDate, aliasesText, player.id, dispatch, setStatusMessage]);

    const padRight = (str: string, length: number) => {
        return str.padEnd(length, ' ');
    };

    const handleCopyForm = () => {
        const NAME_WIDTH = 30;
        let formText = `Hello ${player.name}!\n\nPlease fill out which units you have and their status.\n\n`;
        formText += `Instructions:\nPut an 'x' in the brackets [] for each status that applies.\n\n`;
        formText += `Example:\n${padRight('Silahdars', NAME_WIDTH)} - ✅ Owned: [x]  🌟 Maxed: [x]  👑 Mastery: [ ]\n\n`;

        Object.entries(allUnitsByTier).forEach(([tier, units]) => {
            formText += `--- ${tier} ---\n`;
            units.forEach(unit => {
                formText += `${padRight(unit.name, NAME_WIDTH)} - ✅ Owned: [ ]  🌟 Maxed: [ ]  👑 Mastery: [ ]\n\n`;
            });
            formText += `\n`;
        });
        navigator.clipboard.writeText(formText);
        setStatusMessage("Form copied to clipboard!");
    };

    const handleParseForm = (formData: string) => {
        dispatch({ type: 'PARSE_PLAYER_UNITS_FORM', payload: { playerId: player.id, formData, allUnitNames: allUnits } });
        setIsParseModalOpen(false);
        setStatusMessage(`Parsed unit data for ${player.name}.`);
    };

    const handleClearUnits = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear Unit Data',
            message: `Are you sure you want to clear all unit data for ${player.name}? This action cannot be undone.`,
            onConfirm: () => {
                dispatch({ type: 'CLEAR_PLAYER_UNITS', payload: { playerId: player.id } });
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setStatusMessage(`Cleared unit data for ${player.name}.`);
            }
        });
    };

    return (
        <>
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <div className="flex items-center gap-4 mb-1">
                            {!canEditDisplayName ? (
                                <h2 className="text-2xl font-bold text-white">Units for <span className="text-blue-400">{player?.name}</span></h2>
                            ) : (
                                <div className="flex-grow max-w-md">
                                    <label htmlFor="playerNameEdit" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">In-game Name</label>
                                    <Input
                                        id="playerNameEdit"
                                        type="text"
                                        value={playerNameText}
                                        onChange={(e) => setPlayerNameText(e.target.value)}
                                        onBlur={handlePlayerNameSave}
                                        className="text-xl font-bold text-blue-400 bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 focus:bg-gray-800"
                                    />
                                </div>
                            )}
                        </div>
                        {(!canEditDisplayName && (userId === player.id || isOfficerPlus)) && (
                            <p className="text-xs text-yellow-500/80 mb-2 italic">
                                Your name is locked to your in-game name. Contact a Gatekeeper if you need to change it.
                            </p>
                        )}
                        <p className="text-gray-400 mb-2">{selectedPlayerUnits.size} / {allUnits.length} units selected.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOfficerPlus && (
                            <>
                                <Button onClick={handleClearUnits} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10" size="sm">
                                    <Trash2 size={16} />
                                    <span>Clear Units</span>
                                </Button>
                                <Button onClick={() => setIsParseModalOpen(true)} variant="primary">
                                    <ImportIcon size={16} />
                                    <span>Import Form</span>
                                </Button>
                            </>
                        )}
                        {isOfficerPlus && (
                            <Button onClick={handleCopyForm} variant="secondary">
                                <Copy size={16} />
                                <span>Copy Form</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="my-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-3">
                        <div>
                            <label htmlFor="playerLeadership" className="block text-sm font-medium text-gray-300 mb-1">Total Leadership</label>
                            <Input
                                id="playerLeadership"
                                type="number"
                                value={leadership}
                                onChange={(e) => setLeadership(e.target.value)}
                                onBlur={handleLeadershipSave}
                                readOnly={!canEditOthersUnits && userId !== player.id}
                                placeholder="e.g. 700"
                                className={cn("w-full p-2", (!canEditOthersUnits && userId !== player.id) && "opacity-75 cursor-not-allowed bg-gray-800")}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="joinedDate" className="block text-sm font-medium text-gray-300 mb-1">Joined Date</label>
                                <Input
                                    id="joinedDate"
                                    type="date"
                                    value={joinedDate}
                                    onChange={(e) => setJoinedDate(e.target.value)}
                                    onBlur={handleProfileSave}
                                    readOnly={!isOfficerPlus}
                                    className={cn("w-full p-2", !isOfficerPlus && "opacity-75 cursor-not-allowed bg-gray-800")}
                                />
                            </div>
                            {isOfficerPlus && (
                                <div>
                                    <label htmlFor="inactiveDate" className="block text-sm font-medium text-gray-300 mb-1">Inactive Date</label>
                                    <Input
                                        id="inactiveDate"
                                        type="date"
                                        value={inactiveDate}
                                        onChange={(e) => setInactiveDate(e.target.value)}
                                        onBlur={handleProfileSave}
                                        readOnly={!isOfficerPlus}
                                        className={cn("w-full p-2", !isOfficerPlus && "opacity-75 cursor-not-allowed bg-gray-800")}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {isOfficerPlus && (
                        <div className="md:col-span-2">
                            <label htmlFor="playerInfo" className="block text-sm font-medium text-gray-300 mb-1">Info (Internal)</label>
                            <textarea
                                id="playerInfo"
                                value={infoText}
                                onChange={(e) => setInfoText(e.target.value)}
                                onBlur={handleInfoSave}
                                placeholder={`Write internal notes about ${player?.name}...`}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                            />
                        </div>
                    )}
                </div>

                <div className="mb-3">
                    <label htmlFor="aliases" className="block text-sm font-medium text-gray-300 mb-1">Discord Aliases (comma separated)</label>
                    <Input
                        id="aliases"
                        type="text"
                        value={aliasesText}
                        onChange={(e) => setAliasesText(e.target.value)}
                        onBlur={handleProfileSave}
                        readOnly={!isOfficerPlus}
                        placeholder="e.g. KalleRox, Kalle_99"
                        className={cn("w-full p-2", !isOfficerPlus && "opacity-75 cursor-not-allowed bg-gray-800")}
                    />
                </div>


                <div className="mb-3">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800/60 rounded-md p-1 flex items-center gap-1 self-start">
                            <Button onClick={() => setUnitViewMode('all')} variant={unitViewMode === 'all' ? 'primary' : 'ghost'} size="sm"><CheckSquare size={16} /> Show All</Button>
                            <Button onClick={() => setUnitViewMode('owned')} variant={unitViewMode === 'owned' ? 'primary' : 'ghost'} size="sm"><List size={16} /> Show Owned</Button>
                        </div>
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                                type="text"
                                value={mainUnitSearchQuery}
                                onChange={(e) => setMainUnitSearchQuery(e.target.value)}
                                placeholder="Search units in list..."
                                className="w-full pl-10 pr-3 py-2"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        {/* LEGEND FOR STAR/ICONS */}
                        <div className="flex items-center gap-2"><Star size={12} className="text-yellow-400 fill-yellow-400" /><span>= Favorite</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500"></div><span>= Full Mastery</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-400 flex-shrink-0"></div><span>= Maxed Unit</span></div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {unitViewMode === 'all' ? (
                        <div className="space-y-6">
                            {Object.entries(allUnitsByTier).map(([tier, units]) => {
                                const filteredUnits = mainUnitSearchQuery ? units.filter(u => u.name.toLowerCase().includes(mainUnitSearchQuery.toLowerCase())) : units;
                                if (filteredUnits.length === 0) return null;
                                return <UnitTierSection key={tier} tier={tier} units={filteredUnits} selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} favoriteUnits={selectedPlayerFavoriteUnits} onUnitToggle={handleUnitToggle} />
                            })}
                        </div>
                    ) : (
                        <OwnedUnitsView selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} favoriteUnits={selectedPlayerFavoriteUnits} searchQuery={mainUnitSearchQuery} onUnitToggle={handleUnitToggle} />
                    )}
                </div>
            </div>
            <ParseFormModal
                isOpen={isParseModalOpen}
                onClose={() => setIsParseModalOpen(false)}
                onParse={handleParseForm}
            />
        </>
    );
};