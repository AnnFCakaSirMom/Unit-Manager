import { useMemo } from 'react';
import type { Player, GroupMember } from '../types';
import { useAppState } from '../AppContext';

export const useGroupMemberStats = (member: GroupMember, player: Player, unitCostMap: Map<string, number>) => {
    const { unitConfig } = useAppState();

    const unitToTierMap = useMemo(() => {
        const map = new Map<string, string>();
        Object.entries(unitConfig.tiers).forEach(([tier, units]) => {
            units.forEach((unit) => map.set(unit.name, tier));
        });
        return map;
    }, [unitConfig]);

    const usedLeadership = useMemo(() => {
        return member.selectedUnits.reduce((total, selectedUnit) => {
            return total + (unitCostMap.get(selectedUnit.unitName) || 0);
        }, 0);
    }, [member.selectedUnits, unitCostMap]);

    const totalLeadership = player.totalLeadership || 0;
    const remainingLeadership = totalLeadership - usedLeadership;
    const hasExceededLeadership = remainingLeadership < 0;

    const playerOwnedUnitsSet = useMemo(() => new Set(player.units || []), [player.units]);
    const playerPreparedUnitsSet = useMemo(() => new Set(player.preparedUnits || []), [player.preparedUnits]);
    const playerMasteryUnitsSet = useMemo(() => new Set(player.masteryUnits || []), [player.masteryUnits]);
    const playerFavoriteUnitsSet = useMemo(() => new Set(player.favoriteUnits || []), [player.favoriteUnits]);
    const selectedUnitsMap = useMemo(() => new Map((member.selectedUnits || []).map(u => [u.unitName, u])), [member.selectedUnits]);
    const allAvailableUnits = useMemo(() => new Set([...playerOwnedUnitsSet, ...Array.from(selectedUnitsMap.keys())]), [playerOwnedUnitsSet, selectedUnitsMap]);

    const unitsToDisplayByTier = useMemo(() => {
        const grouped: { [tier: string]: string[] } = {};
        allAvailableUnits.forEach(unitName => {
            const tier = unitToTierMap.get(unitName) || "Manually Added";
            if (!grouped[tier]) grouped[tier] = [];
            grouped[tier].push(unitName);
        });
        const sortedGrouped: { [key: string]: string[] } = {};
        for (const tier in grouped) {
            sortedGrouped[tier] = [...grouped[tier]].sort();
        }
        return sortedGrouped;
    }, [allAvailableUnits, unitToTierMap]);

    const tierOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common", "Manually Added"];
    const sortedTiers = Object.keys(unitsToDisplayByTier).sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));

    return {
        usedLeadership,
        totalLeadership,
        remainingLeadership,
        hasExceededLeadership,
        playerFavoriteUnitsSet,
        playerMasteryUnitsSet,
        playerPreparedUnitsSet,
        selectedUnitsMap,
        unitsToDisplayByTier,
        sortedTiers,
    };
};
