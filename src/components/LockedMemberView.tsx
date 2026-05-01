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
                        <div key={unitObj.unitName} className="group flex items-center gap-2 p-1 rounded-lg hover:bg-amber-500/5 transition-all">
                            <span className="font-bold text-lg w-6 text-center text-amber-500/60 group-hover:text-amber-500 transition-colors">{unitObj.rank > 0 ? unitObj.rank : '-'}</span>
                            <span className="relative text-gray-300 group-hover:text-amber-100 transition-colors py-0.5">
                                {unitObj.unitName}
                                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                            </span>
                            <span className="text-xs text-gray-500">({unitCostMap.get(unitObj.unitName) || 0} LS)</span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};
