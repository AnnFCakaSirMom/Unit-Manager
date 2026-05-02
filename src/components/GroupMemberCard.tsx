import { useState, useCallback, memo } from 'react';
import type { Player, GroupMember } from '../types';
import { Star, Trash2, ArrowRightLeft, Lock, Unlock, AlertTriangle } from './icons';
import { Button } from './Button';
import { cn } from '../utils';
import { useAppDispatch } from '../state/store';
import { toggleGroupMemberUnit, setGroupMemberUnitRank, setGroupLeader, toggleGroupMemberLock, removePlayerFromGroup } from '../state/slices/groupSlice';
import { useGroupMemberStats } from '../hooks/useGroupMemberStats';
import { LockedMemberView } from './LockedMemberView';
import { UnlockedMemberView } from './UnlockedMemberView';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { MovePlayerDropdown } from './MovePlayerDropdown';

export interface GroupMemberCardProps {
    member: GroupMember;
    player: Player;
    groupId: string;
    isLeader: boolean;
    unitCostMap: Map<string, number>;
}

export const GroupMemberCard = memo(({ member, player, groupId, isLeader, unitCostMap }: GroupMemberCardProps) => {
    const dispatch = useAppDispatch();
    const [isMoving, setIsMoving] = useState(false);

    const stats = useGroupMemberStats(member, player, unitCostMap);

    const handleAddManualUnit = useCallback((unitName: string) => {
        dispatch(toggleGroupMemberUnit({ groupId, playerId: player.id, unitName }));
    }, [dispatch, groupId, player.id]);

    const toggleUnit = useCallback((unitName: string) => {
        dispatch(toggleGroupMemberUnit({ groupId, playerId: player.id, unitName }));
    }, [dispatch, groupId, player.id]);

    const setRank = useCallback((unitName: string, rank: string) => {
        dispatch(setGroupMemberUnitRank({ groupId, playerId: player.id, unitName, rank: parseInt(rank, 10) || 0 }));
    }, [dispatch, groupId, player.id]);

    const handleToggleMoving = useCallback(() => setIsMoving(prev => !prev), []);
    const handleCloseMoving = useCallback(() => setIsMoving(false), []);

    const handleSetLeader = useCallback(() => {
        dispatch(setGroupLeader({ groupId, playerId: player.id }));
    }, [dispatch, groupId, player.id]);

    const handleToggleLock = useCallback(() => {
        dispatch(toggleGroupMemberLock({ groupId, playerId: player.id }));
    }, [dispatch, groupId, player.id]);

    const handleRemovePlayer = useCallback(() => {
        dispatch(removePlayerFromGroup({ groupId, playerId: player.id }));
    }, [dispatch, groupId, player.id]);

    return (
        <Card className="bg-black/30 backdrop-blur-sm border border-white/5 overflow-visible">
            {/* Header / Stats */}
            <CardHeader className="flex-row justify-between items-start space-y-0 p-3 pb-1 border-none">
                <div className="space-y-0.5">
                    <CardTitle className={cn("text-lg flex items-center gap-1.5 font-bold tracking-tight", isLeader ? 'text-amber-100' : 'text-gray-100')}>
                        {player.name}
                        {isLeader && <Star size={14} className="fill-amber-500 text-amber-500" />}
                        {player.info && (
                            <div className="relative group/info">
                                <AlertTriangle size={16} className="text-cyan-400 cursor-pointer" aria-label="Player Warning/Info" />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-2 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-[100] shadow-lg">
                                    {player.info}
                                </div>
                            </div>
                        )}
                    </CardTitle>
                    <CardDescription className={cn("font-semibold", stats.hasExceededLeadership ? 'text-red-400' : 'text-gray-400')}>
                        Leadership: {stats.usedLeadership} / {stats.totalLeadership} ({stats.remainingLeadership} remaining)
                    </CardDescription>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <Button onClick={handleToggleMoving} variant="ghost" size="icon" className="text-gray-400 hover:text-white" title="Move Player" aria-label="Move Player"><ArrowRightLeft size={18} /></Button>
                        {isMoving && (
                            <MovePlayerDropdown 
                                groupId={groupId} 
                                playerId={player.id} 
                                onClose={handleCloseMoving} 
                            />
                        )}
                    </div>
                    {!isLeader && (
                        <Button onClick={handleSetLeader} variant="ghost" size="icon" className="text-gray-400 hover:text-yellow-400 hover:bg-transparent" title="Set as Group Lead" aria-label="Set as Group Lead">
                            <Star size={18} />
                        </Button>
                    )}
                    <Button onClick={handleToggleLock} variant="ghost" size="icon" className={cn("rounded-full", member.isLocked ? "text-yellow-400 hover:bg-yellow-400/20" : "text-gray-400 hover:bg-gray-700")} title={member.isLocked ? "Unlock Unit Selection" : "Lock Unit Selection"} aria-label={member.isLocked ? "Unlock Unit Selection" : "Lock Unit Selection"}>
                        {member.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </Button>
                    <Button onClick={handleRemovePlayer} variant="ghost" size="icon" className="text-red-500 hover:bg-gray-700 rounded-full hover:text-red-400" title="Remove Player from Group" aria-label="Remove Player from Group">
                        <Trash2 size={18} />
                    </Button>
                </div>
            </CardHeader>

            {/* Views */}
            <CardContent className="p-2 pt-0">
                {member.isLocked ? (
                    <LockedMemberView
                        selectedUnitsMap={stats.selectedUnitsMap}
                        unitCostMap={unitCostMap}
                    />
                ) : (
                    <UnlockedMemberView
                        sortedTiers={stats.sortedTiers}
                        unitsToDisplayByTier={stats.unitsToDisplayByTier}
                        unitCostMap={unitCostMap}
                        playerFavoriteUnitsSet={stats.playerFavoriteUnitsSet}
                        playerMasteryUnitsSet={stats.playerMasteryUnitsSet}
                        playerPreparedUnitsSet={stats.playerPreparedUnitsSet}
                        selectedUnitsMap={stats.selectedUnitsMap}
                        toggleUnit={toggleUnit}
                        setRank={setRank}
                        handleAddManualUnit={handleAddManualUnit}
                    />
                )}
            </CardContent>
        </Card>
    );
});
