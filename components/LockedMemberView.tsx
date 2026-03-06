import React from 'react';

export interface LockedMemberViewProps {
    selectedUnitsMap: Map<string, { unitName: string; rank: number }>;
    unitCostMap: Map<string, number>;
}

export const LockedMemberView: React.FC<LockedMemberViewProps> = ({ selectedUnitsMap, unitCostMap }) => {
    return (
        <div>
            <h5 className="font-semibold text-sm mb-2 pb-1 border-b border-cyan-400/50 text-cyan-400">Prioritized Units</h5>
            <div className="space-y-2 pt-2">
                {[...selectedUnitsMap.values()]
                    .sort((a, b) => {
                        const rankA = a.rank > 0 ? a.rank : 99;
                        const rankB = b.rank > 0 ? b.rank : 99;
                        if (rankA !== rankB) return rankA - rankB;
                        return a.unitName.localeCompare(b.unitName);
                    })
                    .map(unitObj => (
                        <div key={unitObj.unitName} className="flex items-center gap-2">
                            <span className="font-bold text-lg w-6 text-center">{unitObj.rank > 0 ? unitObj.rank : '-'}</span>
                            <span>{unitObj.unitName}</span>
                            <span className="text-xs text-gray-400">({unitCostMap.get(unitObj.unitName) || 0} LS)</span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};
