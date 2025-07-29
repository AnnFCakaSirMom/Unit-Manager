// components/UnitSearch.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { Player } from '../types';
import { Search, X } from './icons';

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
        // 1. Filtrerar bort "not in house"-spelare
        // 2. Hittar de som har den valda enheten
        const playersWithUnit = players.filter(player =>
            !player.notInHouse && player.units?.includes(selectedUnit)
        );

        // Mappar sedan dessa spelare till ett nytt objekt som inkluderar korrekt status
        return playersWithUnit.map(player => ({
            player,
            // Använder korrekt egenskapsnamn: 'preparedUnits'
            isMaxed: player.preparedUnits?.includes(selectedUnit) ?? false,
            // Använder korrekt egenskapsnamn: 'masteryUnits'
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
        <div className="border-t border-gray-700 mt-4 pt-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by unit name..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="mt-2 space-y-1 bg-gray-700/50 p-2 rounded-md max-h-48 overflow-y-auto">
                {/* Steg 1: Visa förslag på enheter */}
                {!selectedUnit && searchTerm.trim() && (
                    suggestedUnits.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-1 px-1">Matching units:</p>
                            {suggestedUnits.map((unitName, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleUnitSelect(unitName)}
                                    className="w-full text-left p-1 rounded hover:bg-blue-500/20 font-medium"
                                >
                                    {unitName}
                                </button>
                            ))}
                        </>
                    ) : <p className="text-sm text-gray-500 text-center py-2">No units found.</p>
                )}

                {/* Steg 2: Visa spelare med den valda enheten och dess status */}
                {selectedUnit && (
                    foundPlayers.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-1 px-1">Players with {selectedUnit}:</p>
                            {foundPlayers.map(({ player, isMaxed, isFullMastery }) => (
                                <div key={player.id} className="p-1 rounded hover:bg-blue-500/20">
                                    <button onClick={() => handlePlayerSelect(player.id)} className="w-full text-left font-medium flex items-center justify-between">
                                        <span>{player.name}</span>
                                        <div className="flex items-center space-x-2">
                                            {/* Grön ring för Maxed Unit (preparedUnits) */}
                                            {isMaxed && (
                                                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-300" title="Maxed Unit"></div>
                                            )}
                                            {/* Gul fyrkant för Full Mastery (masteryUnits) */}
                                            {isFullMastery && (
                                                <div className="w-4 h-4 rounded-sm bg-yellow-500 border-2 border-yellow-300" title="Full Mastery"></div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </>
                    ) : <p className="text-sm text-gray-500 text-center py-2">No players found with that unit.</p>
                )}
            </div>
        </div>
    );
};