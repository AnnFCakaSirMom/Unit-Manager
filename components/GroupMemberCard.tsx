import React, { useState, useMemo } from 'react';
import type { Player, GroupMember } from '../types';
import { Star, Trash2, ArrowRightLeft, Lock, Unlock, AlertTriangle } from './icons';
import { Button } from './Button';
import { cn } from '../utils';
import { useAppState, useAppDispatch } from '../AppContext';
import { useGroupMemberStats } from '../hooks/useGroupMemberStats';
import { LockedMemberView } from './LockedMemberView';
import { UnlockedMemberView } from './UnlockedMemberView';

export interface GroupMemberCardProps {
    member: GroupMember;
    player: Player;
    groupId: string;
    isLeader: boolean;
    unitCostMap: Map<string, number>;
}

export const GroupMemberCard = React.memo(({ member, player, groupId, isLeader, unitCostMap }: GroupMemberCardProps) => {
    const { groups: otherGroupsInner } = useAppState();
    const dispatch = useAppDispatch();
    const [isMoving, setIsMoving] = useState(false);

    const otherGroups = useMemo(() => otherGroupsInner.filter(g => g.id !== groupId && g.members.length < 5), [otherGroupsInner, groupId]);

    const stats = useGroupMemberStats(member, player, unitCostMap);

    const handleMoveSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetGroupId = e.target.value;
        if (targetGroupId) {
            dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId: player.id, sourceGroupId: groupId, targetGroupId } });
        }
        setIsMoving(false);
    };

    const handleAddManualUnit = (unitName: string) => {
        dispatch({ type: 'TOGGLE_GROUP_MEMBER_UNIT', payload: { groupId, playerId: player.id, unitName } });
    };

    const toggleUnit = (unitName: string) => {
        dispatch({ type: 'TOGGLE_GROUP_MEMBER_UNIT', payload: { groupId, playerId: player.id, unitName } });
    };

    const setRank = (unitName: string, rank: string) => {
        dispatch({ type: 'SET_GROUP_MEMBER_UNIT_RANK', payload: { groupId, playerId: player.id, unitName, rank: parseInt(rank, 10) || 0 } });
    };

    return (
        <div className="bg-gray-800/30 p-4 rounded-lg">
            {/* Header / Stats */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className={cn("text-xl font-bold flex items-center gap-2", isLeader ? 'text-yellow-300' : 'text-blue-300')}>
                        {player.name}
                        {isLeader && <Star size={16} className="fill-current" />}
                        {player.info && (
                            <div className="relative group">
                                <AlertTriangle size={16} className="text-cyan-400 cursor-pointer" aria-label="Player Warning/Info" />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                    {player.info}
                                </div>
                            </div>
                        )}
                    </h4>
                    <p className={cn("text-sm font-semibold mt-1", stats.hasExceededLeadership ? 'text-red-400' : 'text-gray-400')}>
                        Leadership: {stats.usedLeadership} / {stats.totalLeadership} ({stats.remainingLeadership} remaining)
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Button onClick={() => setIsMoving(!isMoving)} variant="ghost" size="icon" className="text-gray-400 hover:text-white" title="Move Player" aria-label="Move Player"><ArrowRightLeft size={18} /></Button>
                        {isMoving && (
                            <select
                                onChange={handleMoveSelect}
                                onBlur={() => setIsMoving(false)}
                                className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-md text-white z-20"
                                defaultValue=""
                                autoFocus
                            >
                                <option value="" disabled>Move to...</option>
                                {otherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        )}
                    </div>
                    {!isLeader && (
                        <Button onClick={() => dispatch({ type: 'SET_GROUP_LEADER', payload: { groupId, playerId: player.id } })} variant="ghost" size="icon" className="text-gray-400 hover:text-yellow-400 hover:bg-transparent" title="Set as Group Lead" aria-label="Set as Group Lead">
                            <Star size={18} />
                        </Button>
                    )}
                    <Button onClick={() => dispatch({ type: 'TOGGLE_GROUP_MEMBER_LOCK', payload: { groupId, playerId: player.id } })} variant="ghost" size="icon" className={cn("rounded-full", member.isLocked ? "text-yellow-400 hover:bg-yellow-400/20" : "text-gray-400 hover:bg-gray-700")} title={member.isLocked ? "Unlock Unit Selection" : "Lock Unit Selection"} aria-label={member.isLocked ? "Unlock Unit Selection" : "Lock Unit Selection"}>
                        {member.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </Button>
                    <Button onClick={() => dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId, playerId: player.id } })} variant="ghost" size="icon" className="text-red-500 hover:bg-gray-700 rounded-full hover:text-red-400" title="Remove Player from Group" aria-label="Remove Player from Group">
                        <Trash2 size={18} />
                    </Button>
                </div>
            </div>

            {/* Views */}
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
        </div>
    );
});
