import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Player, UnitConfig } from '../types';
import { Search } from './icons';

interface UnitSearchProps {
    players: Player[];
    unitConfig: UnitConfig;
    onSelectPlayer: (id: string | null) => void;
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, unitConfig, onSelectPlayer }) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [foundPlayers, setFoundPlayers] = useState<{ id: string; name: string; isMaxed: boolean; hasMastery: boolean }[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    const ALL_UNITS = useMemo(() => Object.values(unitConfig.tiers).flat().sort(), [unitConfig]);

    const findPlayersByUnit = useCallback((unitQuery: string) => {
        if (!unitQuery.trim()) {
            setFoundPlayers([]);
            return;
        }
        const lowerCaseQuery = unitQuery.toLowerCase();
        const matchingPlayers = players
            .map(player => {
                const ownedUnit = (player.units || []).find(unit => unit.toLowerCase() === lowerCaseQuery);
                if (ownedUnit) {
                    return {
                        id: player.id,
                        name: player.name,
                        isMaxed: (player.preparedUnits || []).includes(ownedUnit),
                        hasMastery: (player.masteryUnits || []).includes(ownedUnit),
                    };
                }
                return null;
            })
            .filter((p): p is { id: string; name: string; isMaxed: boolean; hasMastery: boolean } => p !== null);

        setFoundPlayers(matchingPlayers);
    }, [players]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSelectPlayer(null); // Deselect any player when starting a new search

        if (value.trim() === "") {
            setSuggestions([]);
            setFoundPlayers([]);
            return;
        }
        
        const lowerCaseValue = value.toLowerCase();
        const filteredSuggestions = ALL_UNITS.filter(unit => unit.toLowerCase().includes(lowerCaseValue)).slice(0, 10);
        setSuggestions(filteredSuggestions);
        findPlayersByUnit(value);

    }, [ALL_UNITS, findPlayersByUnit, onSelectPlayer]);

    const handleSuggestionClick = useCallback((suggestion: string) => {
        setQuery(suggestion);
        setSuggestions([]);
        findPlayersByUnit(suggestion);
    }, [findPlayersByUnit]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSuggestions([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="border-y border-gray-700 my-4 py-4">
            <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Search size={20}/> Find Players by Unit
            </h2>
            <div className="relative" ref={searchRef}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={handleSearchChange}
                        placeholder="Search by unit name..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {suggestions.length > 0 && query && (
                    <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 max-h-48 overflow-y-auto">
                        {suggestions.map(suggestion => (
                            <li key={suggestion} onClick={() => handleSuggestionClick(suggestion)} className="px-3 py-2 cursor-pointer hover:bg-gray-500">
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="mt-4 flex-grow overflow-y-auto pr-2 -mr-2 max-h-48">
                {query && (
                    foundPlayers.length > 0 ? (
                        <ul className="space-y-2">
                            {foundPlayers.map(playerData => (
                                <li 
                                    key={playerData.id} 
                                    onClick={() => onSelectPlayer(playerData.id)}
                                    className="p-2 bg-gray-700/50 rounded-md text-gray-300 flex items-center space-x-3 cursor-pointer hover:bg-blue-500/10"
                                >
                                    <div className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 ${playerData.hasMastery ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-500'}`} title="Mastery"></div>
                                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${playerData.isMaxed ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-500'}`} title="Maxed"></div>
                                    <span className="truncate">{playerData.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500 text-center text-sm">No players have this unit.</p>
                )}
            </div>
        </div>
    );
};
