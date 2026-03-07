// components/UnitSearch.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { Player } from '../types';
import { Search, X } from './icons';
import { Button } from './Button';
import { Input } from './Input';

interface UnitSearchProps {
    players: Player[];
    onSelectPlayer: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, onSelectPlayer, searchTerm, setSearchTerm }) => {
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

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

        return uniqueUnits.filter(unitName =>
            unitName.toLowerCase().includes(lowerCaseTerm)
        );
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

            <div className="mt-2 space-y-1 bg-gray-700/50 p-2 rounded-md max-h-48 overflow-y-auto">
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
                            <p className="text-xs text-gray-400 mb-1 px-1">Players with {selectedUnit}:</p>
                            {foundPlayers.map(({ player, isMaxed, isFullMastery }) => (
                                <div key={player.id} className="p-1 rounded hover:bg-blue-500/20">
                                    <Button onClick={() => handlePlayerSelect(player.id)} variant="ghost" className="w-full justify-between font-medium p-1 h-auto hover:bg-transparent">
                                        <span>{player.name}</span>
                                        <div className="flex items-center space-x-2">
                                            {/* Green circle for Maxed Unit (preparedUnits) */}
                                            {isMaxed && (
                                                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-300" title="Maxed Unit"></div>
                                            )}
                                            {/* Yellow square for Full Mastery (masteryUnits) */}
                                            {isFullMastery && (
                                                <div className="w-4 h-4 rounded-sm bg-yellow-500 border-2 border-yellow-300" title="Full Mastery"></div>
                                            )}
                                        </div>
                                    </Button>
                                </div>
                            ))}
                        </>
                    ) : <p className="text-sm text-gray-500 text-center py-2">No players found with that unit.</p>
                )}
            </div>
        </div>
    );
};