// components/UnitSearch.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { Player } from '../types';
import { Search, X } from './icons'; // Importerar en 'X'-ikon för att rensa

interface UnitSearchProps {
    players: Player[];
    onSelectPlayer: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, onSelectPlayer, searchTerm, setSearchTerm }) => {
    // State för att hålla reda på vilken enhet som har valts
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

    // Nollställ valet om användaren börjar skriva igen
    useEffect(() => {
        // Om söktermen inte längre matchar den valda enheten, nollställ allt.
        if (selectedUnit && searchTerm !== selectedUnit) {
            setSelectedUnit(null);
        }
    }, [searchTerm, selectedUnit]);

    // Memoized-funktion för att hitta unika enhetsförslag
    const suggestedUnits = useMemo(() => {
        if (!searchTerm.trim() || selectedUnit) {
            return [];
        }
        const lowerCaseTerm = searchTerm.toLowerCase();
        // Plockar ut alla enheter från alla spelare till en enda lista
        const allUnits = players.flatMap(p => p.units || []);
        // Filtrerar för att bara få unika och matchande enhetsnamn
        const uniqueUnits = [...new Set(allUnits)];

        return uniqueUnits.filter(unitName =>
            unitName.toLowerCase().includes(lowerCaseTerm)
        );
    }, [searchTerm, players, selectedUnit]);

    // Memoized-funktion för att hitta spelare som har den valda enheten
    const foundPlayers = useMemo(() => {
        if (!selectedUnit) {
            return [];
        }
        // Returnerar alla spelare vars 'units'-lista inkluderar den valda enheten
        return players.filter(player =>
            player.units?.includes(selectedUnit)
        );
    }, [selectedUnit, players]);

    // Hanterar klick på ett enhetsförslag
    const handleUnitSelect = (unitName: string) => {
        setSelectedUnit(unitName);
        setSearchTerm(unitName); // Fyller i sökfältet med den valda enheten
    };

    // Hanterar klick på en spelare i listan
    const handlePlayerSelect = (playerId: string) => {
        onSelectPlayer(playerId);
        setSearchTerm(''); // Rensar sökfältet
        setSelectedUnit(null); // Nollställer valet
    };

    // Rensar sökfältet och återgår till startläget
    const clearSearch = () => {
        setSearchTerm('');
        setSelectedUnit(null);
        onSelectPlayer(null); // Avmarkera eventuell vald spelare i huvudvyn
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
                {/* Knapp för att rensa sökningen */}
                {searchTerm && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Villkorlig rendering: visa antingen enhetsförslag ELLER spelarlista */}
            <div className="mt-2 space-y-1 bg-gray-700/50 p-2 rounded-md max-h-48 overflow-y-auto">
                {/* STEG 1: Visa förslag på enheter */}
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

                {/* STEG 2: Visa spelare med den valda enheten */}
                {selectedUnit && (
                    foundPlayers.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-1 px-1">Players with {selectedUnit}:</p>
                            {foundPlayers.map(player => (
                                <div key={player.id} className="p-1 rounded hover:bg-blue-500/20">
                                    <button onClick={() => handlePlayerSelect(player.id)} className="w-full text-left font-medium">
                                        {player.name}
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