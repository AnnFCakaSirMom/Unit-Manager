import React, { useState } from 'react';
import { Star, Plus } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { cn } from '../utils';

const tierColorClasses: { [key: string]: string } = {
    Legendary: 'text-yellow-400 border-yellow-400/50',
    Epic: 'text-purple-400 border-purple-400/50',
    Rare: 'text-blue-400 border-blue-400/50',
    Uncommon: 'text-green-400 border-green-400/50',
    Common: 'text-gray-400 border-gray-400/50',
    "Manually Added": 'text-gray-400 border-gray-500/50'
};

export interface UnlockedMemberViewProps {
    sortedTiers: string[];
    unitsToDisplayByTier: { [tier: string]: string[] };
    unitCostMap: Map<string, number>;
    playerFavoriteUnitsSet: Set<string>;
    playerMasteryUnitsSet: Set<string>;
    playerPreparedUnitsSet: Set<string>;
    selectedUnitsMap: Map<string, { unitName: string; rank: number }>;
    toggleUnit: (unitName: string) => void;
    setRank: (unitName: string, rank: string) => void;
    handleAddManualUnit: (unitName: string) => void;
}

export const UnlockedMemberView: React.FC<UnlockedMemberViewProps> = ({
    sortedTiers,
    unitsToDisplayByTier,
    unitCostMap,
    playerFavoriteUnitsSet,
    playerMasteryUnitsSet,
    playerPreparedUnitsSet,
    selectedUnitsMap,
    toggleUnit,
    setRank,
    handleAddManualUnit
}) => {
    const [manualUnitName, setManualUnitName] = useState("");

    const onAddManualUnit = () => {
        const unitToAdd = manualUnitName.trim();
        if (unitToAdd) {
            handleAddManualUnit(unitToAdd);
            setManualUnitName("");
        }
    };

    return (
        <div className="space-y-4">
            {sortedTiers.map(tier => (
                <div key={tier}>
                    <h5 className={cn("font-semibold text-sm mb-2 pb-1 border-b", tierColorClasses[tier])}>{tier}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                        {unitsToDisplayByTier[tier].map(unit => {
                            const cost = unitCostMap.get(unit);
                            return (
                                <div key={unit} className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-amber-500/5 transition-all">
                                    <label className="flex items-center space-x-2 flex-grow cursor-pointer min-w-0">
                                        <div className={cn("flex-shrink-0", playerFavoriteUnitsSet.has(unit) ? 'text-yellow-400 fill-yellow-400' : 'text-transparent')} title="Favorite">
                                            <Star size={14} />
                                        </div>

                                        <div className={cn("w-4 h-4 rounded-sm border-2 flex-shrink-0", playerMasteryUnitsSet.has(unit) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-600 group-hover:border-amber-500/50')} title="Mastery"></div>
                                        <div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0", playerPreparedUnitsSet.has(unit) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-600 group-hover:border-green-500/50')} title="Maxed"></div>
                                        <input type="checkbox" checked={selectedUnitsMap.has(unit)} onChange={() => toggleUnit(unit)} className="form-checkbox h-5 w-5 rounded bg-black/40 border-white/10 text-amber-500 focus:ring-amber-500/50" />
                                        <div className="flex items-baseline min-w-0">
                                            <span className="relative text-gray-300 group-hover:text-amber-100 transition-colors py-0.5 truncate" title={unit}>
                                                {unit}
                                                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                                            </span>
                                            {cost && <span className="text-xs text-gray-500 ml-1 flex-shrink-0">({cost} LS)</span>}
                                        </div>
                                    </label>
                                    {selectedUnitsMap.has(unit) && (
                                        <Select
                                            value={selectedUnitsMap.get(unit)?.rank || 0}
                                            onChange={(e) => setRank(unit, e.target.value)}
                                            className="text-xs py-0.5 px-1 ml-2 min-w-[3.5rem]"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <option value="0">Rank</option>
                                            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}</option>)}
                                        </Select>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="relative flex items-center gap-2">
                    <Input
                        type="text"
                        value={manualUnitName}
                        onChange={e => setManualUnitName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && onAddManualUnit()}
                        placeholder="Add unit manually..."
                        className="flex-grow py-1.5"
                    />
                    <Button onClick={onAddManualUnit} variant="primary" className="py-1.5 px-3" aria-label="Add Unit Manually" title="Add Unit Manually"><Plus size={18} /></Button>
                </div>
            </div>
        </div>
    );
};
