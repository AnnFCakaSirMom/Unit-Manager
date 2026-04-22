// components/UnitSearch.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { Player } from '../types';
import { Search, X, CheckIcon } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { useAppState, useAppDispatch } from '../AppContext';

interface UnitSearchProps {
    players: Player[];
    onSelectPlayer: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, onSelectPlayer, searchTerm, setSearchTerm }) => {
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const { twAttendance, groups } = useAppState();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (selectedUnit && searchTerm !== selectedUnit) {
            setSelectedUnit(null);
        }
    }, [searchTerm, selectedUnit]);

    const suggestedUnits = useMemo(() => {
        if (!searchTerm.trim() || selectedUnit) {
            return [];
        }
        const lowerCaseTerm = searchTerm.toLowerCase();

        // Filtrerar bort "not in house"-spelare innan enhetslistan skapas
        const activePlayers = players.filter(p => !p.notInHouse);
        const allUnits = activePlayers.flatMap(p => p.units || []);
        const uniqueUnits = [...new Set(allUnits)];

        return uniqueUnits
            .filter(unitName => unitName.toLowerCase().includes(lowerCaseTerm))
            .sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const aStarts = aLower.startsWith(lowerCaseTerm);
                const bStarts = bLower.startsWith(lowerCaseTerm);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            });
    }, [searchTerm, players, selectedUnit]);

    const foundPlayers = useMemo(() => {
        if (!selectedUnit) {
            return [];
        }

        // **NY, KORRIGERAD LOGIK HÄR**
        // 1. Filters out "not in house" players
        // 2. Finds those with the selected unit
        const playersWithUnit = players.filter(player =>
            !player.notInHouse && player.units?.includes(selectedUnit)
        );

        // Maps these players to a new object including correct max/mastery status
        return playersWithUnit.map(player => ({
            player,
            // Uses property: 'preparedUnits'
            isMaxed: player.preparedUnits?.includes(selectedUnit) ?? false,
            // Uses property: 'masteryUnits'
            isFullMastery: player.masteryUnits?.includes(selectedUnit) ?? false,
        }));

    }, [selectedUnit, players]);

    const handleUnitSelect = (unitName: string) => {
        setSelectedUnit(unitName);
        setSearchTerm(unitName);
    };

    const handlePlayerSelect = (playerId: string) => {
        onSelectPlayer(playerId);
        setSearchTerm('');
        setSelectedUnit(null);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSelectedUnit(null);
        onSelectPlayer(null);
    };

    return (
        <div className="border-t border-gray-700 mt-2 pt-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by unit name..."
                    className="w-full pl-9 pr-9 py-1.5"
                />
                {searchTerm && (
                    <Button onClick={clearSearch} variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-transparent h-auto w-auto p-1">
                        <X size={20} />
                    </Button>
                )}
            </div>

            <div className={`mt-2 space-y-1 bg-gray-700/50 rounded-md overflow-y-auto ${selectedUnit ? 'max-h-80' : 'max-h-48'} ${searchTerm.trim() ? 'p-2' : ''}`}>
                {/* Step 1: Show unit suggestions */}
                {!selectedUnit && searchTerm.trim() && (
                    suggestedUnits.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-1 px-1">Matching units:</p>
                            {suggestedUnits.map((unitName, index) => (
                                <Button
                                    key={index}
                                    onClick={() => handleUnitSelect(unitName)}
                                    variant="ghost"
                                    className="w-full justify-start p-1 rounded hover:bg-blue-500/20 font-medium h-auto hover:text-white"
                                >
                                    {unitName}
                                </Button>
                            ))}
                        </>
                    ) : <p className="text-sm text-gray-500 text-center py-2">No units found.</p>
                )}

                {/* Step 2: Show players with the selected unit and their status */}
                {selectedUnit && (
                    foundPlayers.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-2 px-1 border-b border-gray-600 pb-1">Players with {selectedUnit}:</p>
                            <div className="space-y-1">
                                {foundPlayers.map(({ player, isMaxed, isFullMastery }) => {
                                    // Identify group
                                    const assignedGroup = groups.find(g => g.members.some(m => m.playerId === player.id));
                                    
                                    // Identify attendance
                                    const isAttending = twAttendance.some(a => a.matchedPlayerId === player.id && a.status === 'Accepted');

                                    return (
                                        <div key={player.id} className="p-1.5 rounded bg-gray-800/80 border border-gray-600 hover:border-gray-500 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <Button onClick={() => handlePlayerSelect(player.id)} variant="ghost" className="justify-start font-medium p-0 h-auto hover:bg-transparent px-1 text-left flex-grow">
                                                    <span className="flex items-center gap-1.5 text-gray-200">
                                                        {player.name}
                                                        {isAttending && <CheckIcon size={14} className="text-green-400 font-bold" title="Accepted Attendance" />}
                                                    </span>
                                                </Button>
                                                <div className="flex items-center space-x-1.5 shrink-0 pr-1">
                                                    {/* Green circle for Maxed Unit (preparedUnits) */}
                                                    {isMaxed && (
                                                        <div className="w-3 h-3 rounded-full bg-green-500 border border-green-300 shadow-sm" title="Maxed Unit"></div>
                                                    )}
                                                    {/* Yellow square for Full Mastery (masteryUnits) */}
                                                    {isFullMastery && (
                                                        <div className="w-3 h-3 rounded-sm bg-yellow-500 border border-yellow-300 shadow-sm" title="Full Mastery"></div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Group Dropdown */}
                                            {groups.length > 0 && (
                                                <div className="px-1 pb-0.5">
                                                    <Select
                                                        value={assignedGroup ? assignedGroup.id : ""}
                                                        onChange={(e) => {
                                                            const targetGroupId = e.target.value;
                                                            if (targetGroupId) {
                                                                if (assignedGroup) {
                                                                    dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId: player.id, sourceGroupId: assignedGroup.id, targetGroupId }});
                                                                } else {
                                                                    dispatch({ type: 'ADD_PLAYER_TO_GROUP', payload: { groupId: targetGroupId, playerId: player.id }});
                                                                }
                                                            } else if (assignedGroup) {
                                                                dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId: assignedGroup.id, playerId: player.id }});
                                                            }
                                                        }}
                                                        className={`w-full text-xs py-1 px-2 h-auto focus:ring-1 ${assignedGroup ? 'bg-indigo-900/40 text-indigo-200 border-indigo-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}
                                                    >
                                                        <option value="">No Group</option>
                                                        {groups.map(g => {
                                                            const isFull = g.members.length >= 5 && (!assignedGroup || assignedGroup.id !== g.id);
                                                            return (
                                                            <option key={g.id} value={g.id} disabled={isFull}>
                                                                {g.name} {isFull ? '(Full)' : ''}
                                                            </option>
                                                            )
                                                        })}
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : <p className="text-sm text-gray-500 text-center py-2">No players found with that unit.</p>
                )}
            </div>
        </div>
    );
};