import React, { useState } from 'react';
import type { Unit } from '../types';
import { ChevronUp, ChevronDown, Star } from './icons';
import { Button } from './Button';
import { cn } from '../utils';

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400 border-yellow-400/50', Epic: 'text-purple-400 border-purple-400/50', Rare: 'text-blue-400 border-blue-400/50', Uncommon: 'text-green-400 border-green-400/50', Common: 'text-gray-400 border-gray-400/50' };

export interface UnitTierSectionProps {
    tier: string;
    units: Unit[];
    selectedPlayerId: string;
    selectedUnits: Set<string>;
    preparedUnits: Set<string>;
    masteryUnits: Set<string>;
    favoriteUnits: Set<string>;
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => void;
}

export const UnitTierSection = React.memo(({ tier, units, selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, favoriteUnits, onUnitToggle }: UnitTierSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    if (!units || units.length === 0) return null;

    return (
        <section>
            <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} className={cn("w-full flex justify-between items-center p-2 rounded-t-md border-b-2 h-auto hover:bg-gray-800", tierColorClasses[tier])}>
                <h3 className="text-xl font-semibold">{tier}</h3>
                {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </Button>
            {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2 p-4 bg-black/30 border-x border-b border-white/5 rounded-b-xl backdrop-blur-sm">
                    {units.map(unit => (
                        <label key={unit.name} className="group flex items-center space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-amber-500/5 transition-all">
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'favoriteUnits'); }}
                                className={cn("cursor-pointer transition-colors flex-shrink-0", favoriteUnits.has(unit.name) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 group-hover:text-gray-400')}
                                title="Toggle Favorite"
                            >
                                <Star size={18} />
                            </div>

                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'masteryUnits'); }}
                                className={cn("w-4 h-4 rounded-sm border-2 transition-colors flex-shrink-0", masteryUnits.has(unit.name) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-500 group-hover:border-amber-500/50')}
                                title="Toggle Mastery"
                            ></div>
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'preparedUnits'); }}
                                className={cn("w-4 h-4 rounded-full border-2 transition-colors flex-shrink-0", preparedUnits.has(unit.name) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-550 group-hover:border-green-500/50')}
                                title="Toggle Maxed"
                            ></div>
                            <input type="checkbox" checked={selectedUnits.has(unit.name)} onChange={() => onUnitToggle(selectedPlayerId, unit.name, 'units')} className="form-checkbox h-5 w-5 rounded bg-black/40 border-white/10 text-amber-500 focus:ring-amber-500/50" />
                            <span className="relative text-gray-300 group-hover:text-amber-100 transition-colors py-0.5">
                                {unit.name}
                                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </section>
    );
});
