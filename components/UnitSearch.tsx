// components/UnitSearch.tsx

import React, { useMemo } from 'react';
import type { Player, UnitConfig } from '../types';
import { Search } from './icons';

interface UnitSearchProps {
    players: Player[];
    unitConfig: UnitConfig;
    onSelectPlayer: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, unitConfig, onSelectPlayer, searchTerm, setSearchTerm }) => {

    const foundPlayers = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerCaseTerm = searchTerm.toLowerCase();
        const allUnits = Object.values(unitConfig.tiers).flat();
        const playerUnitMap = new Map<string, string[]>();

        for (const player of players) {
            if (player.units) {
                for (const playerUnit of player.units) {
                    const unitDetails = allUnits.find(u => u.id === playerUnit.id);
                    if (unitDetails?.name.toLowerCase().includes(lowerCaseTerm)) {
                        if (!playerUnitMap.has(player.id)) {
                            playerUnitMap.set(player.id, []);
                        }
                        playerUnitMap.get(player.id)?.push(unitDetails.name);
                    }
                }
            }
        }
        return Array.from(playerUnitMap.entries()).map(([playerId, units]) => ({
            player: players.find(p => p.id === playerId)!,
            units
        }));
    }, [searchTerm, players, unitConfig]);

    const handlePlayerSelect = (playerId: string) => {
        onSelectPlayer(playerId);
        setSearchTerm('');
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
                    className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {searchTerm.trim() && (
                <div className="mt-2 space-y-1 bg-gray-700/50 p-2 rounded-md max-h-48 overflow-y-auto">
                    {foundPlayers.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-1 px-1">Players with this unit:</p>
                            {foundPlayers.map(({ player, units }) => (
                                <div key={player.id} className="p-1 rounded hover:bg-blue-500/20">
                                    <button onClick={() => handlePlayerSelect(player.id)} className="w-full text-left font-medium">
                                        {player.name}
                                    </button>
                                    <ul className="pl-4">
                                        {units.map((unitName, index) => (
                                            <li key={index} className="text-sm text-gray-300 list-disc list-inside">{unitName}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-2">No players found with that unit.</p>
                    )}
                </div>
            )}
        </div>
    );
};