import React, { useMemo } from 'react';

import { Star } from './icons';

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400 border-yellow-400/50', Epic: 'text-purple-400 border-purple-400/50', Rare: 'text-blue-400 border-blue-400/50', Uncommon: 'text-green-400 border-green-400/50', Common: 'text-gray-400 border-gray-400/50' };

export interface OwnedUnitsViewProps {
    selectedPlayerId: string;
    selectedUnits: Set<string>;
    preparedUnits: Set<string>;
    masteryUnits: Set<string>;
    favoriteUnits: Set<string>;
    searchQuery: string;
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => void;
}

import { useAppState } from '../AppContext';

export const OwnedUnitsView = React.memo(({ selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, favoriteUnits, searchQuery, onUnitToggle }: OwnedUnitsViewProps) => {
    const { unitConfig } = useAppState();

    const ownedUnitsByTier = useMemo(() => {
        const result: { [key: string]: string[] } = {};
        const lowerCaseQuery = searchQuery.toLowerCase();

        const allCurrentUnitNames = new Set(Object.values(unitConfig.tiers).flat().map(u => u.name));
        const existingOwnedUnits = [...selectedUnits].filter(unitName =>
            allCurrentUnitNames.has(unitName) && unitName.toLowerCase().includes(lowerCaseQuery)
        );

        Object.entries(unitConfig.tiers).forEach(([tier, unitsInTier]) => {
            const ownedInTier = unitsInTier
                .map(u => u.name)
                .filter(unitName => existingOwnedUnits.includes(unitName))
                .sort();
            if (ownedInTier.length > 0) result[tier] = ownedInTier;
        });
        return result;
    }, [selectedUnits, unitConfig, searchQuery]);

    if (Object.keys(ownedUnitsByTier).length === 0) return <div className="text-center text-gray-500 py-16">No matching owned units found.</div>;

    return (
        <div className="space-y-6">
            {Object.entries(ownedUnitsByTier).map(([tier, unitNames]) => (
                <section key={tier}>
                    <div className={`w-full flex justify-between items-center p-2 rounded-t-md border-b-2 ${tierColorClasses[tier]}`}>
                        <h3 className="text-xl font-semibold">{tier}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3 p-4 bg-gray-800/30 rounded-b-md">
                        {unitNames.map(unitName => (
                            <div key={unitName} className="flex items-center space-x-3">
                                {/* FAVORIT-KNAPP (STJÄRNA) */}
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'favoriteUnits')}
                                    className={`cursor-pointer transition-colors flex-shrink-0 ${favoriteUnits.has(unitName) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
                                    title="Toggle Favorite"
                                >
                                    <Star size={18} />
                                </div>
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'masteryUnits')}
                                    className={`w-4 h-4 rounded-sm border-2 cursor-pointer ${masteryUnits.has(unitName) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Mastery"
                                ></div>
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'preparedUnits')}
                                    className={`w-4 h-4 rounded-full border-2 cursor-pointer ${preparedUnits.has(unitName) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Maxed"
                                ></div>
                                <span className="text-gray-300">{unitName}</span>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
});
