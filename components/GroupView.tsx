import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Group, Player, UnitConfig, AppAction, GroupMember } from '../types';
import { Search, Clipboard, UserPlus, Star, Trash2, ArrowRightLeft, Lock, Unlock, Plus, AlertTriangle } from './icons';

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400 border-yellow-400/50', Epic: 'text-purple-400 border-purple-400/50', Rare: 'text-blue-400 border-blue-400/50', Uncommon: 'text-green-400 border-green-400/50', Common: 'text-gray-400 border-gray-400/50', "Manually Added": 'text-gray-400 border-gray-500/50' };

interface GroupMemberCardProps {
    member: GroupMember;
    player: Player;
    groupId: string;
    isLeader: boolean;
    unitConfig: UnitConfig;
    dispatch: React.Dispatch<AppAction>;
    otherGroups: Group[];
    unitCostMap: Map<string, number>;
}

const GroupMemberCard = React.memo(({ member, player, groupId, isLeader, unitConfig, dispatch, otherGroups, unitCostMap }: GroupMemberCardProps) => {
    const [manualUnitName, setManualUnitName] = useState("");
    const [isMoving, setIsMoving] = useState(false);
    
    const unitToTierMap = useMemo(() => {
        const map = new Map<string, string>();
        Object.entries(unitConfig.tiers).forEach(([tier, units]) => units.forEach(unit => map.set(unit.name, tier)));
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

    const handleAddManualUnit = () => {
        const unitToAdd = manualUnitName.trim();
        if (unitToAdd) {
            dispatch({ type: 'TOGGLE_GROUP_MEMBER_UNIT', payload: { groupId, playerId: player.id, unitName: unitToAdd } });
            setManualUnitName("");
        }
    };
    
    const handleMoveSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetGroupId = e.target.value;
        if (targetGroupId) {
            dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId: player.id, sourceGroupId: groupId, targetGroupId } });
        }
        setIsMoving(false);
    };

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

    const setRank = (unitName: string, rank: string) => {
        dispatch({ type: 'SET_GROUP_MEMBER_UNIT_RANK', payload: { groupId, playerId: player.id, unitName, rank: parseInt(rank, 10) || 0 }});
    };
    const toggleUnit = (unitName: string) => {
        dispatch({ type: 'TOGGLE_GROUP_MEMBER_UNIT', payload: { groupId, playerId: player.id, unitName }});
    };

    return (
        <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
                <div>
                     <h4 className={`text-xl font-bold flex items-center gap-2 ${isLeader ? 'text-yellow-300' : 'text-blue-300'}`}>
                        {player.name}
                        {isLeader && <Star size={16} className="fill-current" />}
                        {player.info && (
                            <div className="relative group">
                                <AlertTriangle size={16} className="text-cyan-400 cursor-pointer" />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                    {player.info}
                                </div>
                            </div>
                        )}
                    </h4>
                    <p className={`text-sm font-semibold mt-1 ${hasExceededLeadership ? 'text-red-400' : 'text-gray-400'}`}>
                        Leadership: {usedLeadership} / {totalLeadership} ({remainingLeadership} remaining)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button onClick={() => setIsMoving(!isMoving)} className="p-1 text-gray-400 hover:text-white" title="Move Player"><ArrowRightLeft size={18} /></button>
                        {isMoving && <select onChange={handleMoveSelect} onBlur={() => setIsMoving(false)} className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-md text-white z-20" defaultValue="" autoFocus><option value="" disabled>Move to...</option>{otherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
                    </div>
                    {!isLeader && <button onClick={() => dispatch({ type: 'SET_GROUP_LEADER', payload: { groupId, playerId: player.id }})} className="p-1 text-gray-400 hover:text-yellow-400" title="Set as Group Lead"><Star size={18} /></button>}
                    <button onClick={() => dispatch({ type: 'TOGGLE_GROUP_MEMBER_LOCK', payload: { groupId, playerId: player.id }})} className={`p-1 rounded-full ${member.isLocked ? "text-yellow-400 hover:bg-yellow-400/20" : "text-gray-400 hover:bg-gray-700"}`} title={member.isLocked ? "Unlock" : "Lock"}>{member.isLocked ? <Lock size={18} /> : <Unlock size={18} />}</button>
                    <button onClick={() => dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId, playerId: player.id }})} className="p-1 text-red-500 hover:bg-gray-700 rounded-full"><Trash2 size={18} /></button>
                </div>
            </div>
            {member.isLocked ? (
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
            ) : (
                <div className="space-y-4">
                    {sortedTiers.map(tier => (
                        <div key={tier}>
                            <h5 className={`font-semibold text-sm mb-2 pb-1 border-b ${tierColorClasses[tier]}`}>{tier}</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                                {unitsToDisplayByTier[tier].map(unit => {
                                    const cost = unitCostMap.get(unit);
                                    return (
                                        <div key={unit} className="flex items-center justify-between p-1 rounded hover:bg-gray-700/50">
                                            <label className="flex items-center space-x-2 flex-grow cursor-pointer min-w-0">
                                                <div className={`flex-shrink-0 ${playerFavoriteUnitsSet.has(unit) ? 'text-yellow-400 fill-yellow-400' : 'text-transparent'}`} title="Favorite">
                                                    <Star size={14} /> 
                                                </div>
                                                
                                                <div className={`w-4 h-4 rounded-sm border-2 flex-shrink-0 ${playerMasteryUnitsSet.has(unit) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-500'}`} title="Mastery"></div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${playerPreparedUnitsSet.has(unit) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-500'}`} title="Maxed"></div>
                                                <input type="checkbox" checked={selectedUnitsMap.has(unit)} onChange={() => toggleUnit(unit)} className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500/50" />
                                                <div className="flex items-baseline min-w-0">
                                                    <span className="truncate" title={unit}>{unit}</span>
                                                    {cost && <span className="text-xs text-gray-400 ml-1 flex-shrink-0">({cost} LS)</span>}
                                                </div>
                                            </label>
                                            {selectedUnitsMap.has(unit) && <select value={selectedUnitsMap.get(unit)?.rank || 0} onChange={(e) => setRank(unit, e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md text-xs py-0.5 px-1 ml-2" onClick={e => e.stopPropagation()}><option value="0">Rank</option>{[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}</option>)}</select>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="relative flex items-center gap-2">
                            <input type="text" value={manualUnitName} onChange={e => setManualUnitName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddManualUnit()} placeholder="Add unit manually..." className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-white placeholder-gray-400" />
                            <button onClick={handleAddManualUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-md flex items-center justify-center"><Plus size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});


interface GroupViewProps {
    group: Group;
    allGroups: Group[];
    players: Player[];
    unitConfig: UnitConfig;
    dispatch: React.Dispatch<AppAction>;
    onCopy: (text: string) => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ group, allGroups, players, unitConfig, dispatch, onCopy }) => {
    const [playerSearch, setPlayerSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const unitCostMap = useMemo(() => {
        const map = new Map<string, number>();
        Object.values(unitConfig.tiers).flat().forEach(unit => {
            if (unit.leadershipCost) {
                map.set(unit.name, unit.leadershipCost);
            }
        });
        return map;
    }, [unitConfig]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const availablePlayers = useMemo(() => {
        if (!showSuggestions) return [];
        const memberIds = new Set(group.members.map(m => m.playerId));
        return players.filter(p => !memberIds.has(p.id) && !p.notInHouse && p.name.toLowerCase().startsWith(playerSearch.toLowerCase()));
    }, [players, group.members, playerSearch, showSuggestions]);

    const handleSelectPlayer = (playerId: string) => {
        dispatch({ type: 'ADD_PLAYER_TO_GROUP', payload: { groupId: group.id, playerId } });
        setPlayerSearch("");
        setShowSuggestions(false);
    };

    const sortedMembers = useMemo(() => {
        const leader = group.members.find(m => m.playerId === group.leaderId);
        const others = group.members.filter(m => m.playerId !== group.leaderId);
        return leader ? [leader, ...others] : others;
    }, [group.members, group.leaderId]);

    const handleCopyGroup = useCallback(() => {
        let groupHeaderText = `--- ${group.name} ---\n`;
        const memberContent = sortedMembers.map(member => {
            const player = players.find(p => p.id === member.playerId);
            if (!player) return '';
            let playerLine = player.name + (player.id === group.leaderId ? " (Lead)" : "");
            
            const usedLeadership = member.selectedUnits.reduce((total, u) => total + (unitCostMap.get(u.unitName) || 0), 0);
            const totalLeadership = player.totalLeadership || 0;
            playerLine += ` -- LS: ${usedLeadership} / ${totalLeadership}`;

            const unitsText = [...member.selectedUnits].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(u => `  ${u.rank > 0 ? `${u.rank}.` : "-"} ${u.unitName} (${unitCostMap.get(u.unitName) || 0} LS)`).join('\n');
            return unitsText ? `${playerLine}\n${unitsText}` : playerLine;
        }).join('\n\n');
        onCopy(`${groupHeaderText}\`\`\`md\n${memberContent}\n\`\`\``);
    }, [group, sortedMembers, players, onCopy, unitCostMap]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Group: <span className="text-green-400">{group.name}</span></h2>
                <button onClick={handleCopyGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center justify-center text-sm gap-2" title="Copy This Group"><Clipboard size={16} /> Copy Group</button>
            </div>
            
            <div className="mb-6 bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Add Player to Group</h3>
                <div className="relative" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1-2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} onFocus={() => setShowSuggestions(true)} placeholder="Search for player to add..." className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={group.members.length >= 5} />
                    {showSuggestions && playerSearch && availablePlayers.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 max-h-48 overflow-y-auto">
                            {availablePlayers.map(p => <li key={p.id} onClick={() => handleSelectPlayer(p.id)} className="px-3 py-2 cursor-pointer hover:bg-gray-500 flex items-center gap-2"><UserPlus size={16} /> {p.name}</li>)}
                        </ul>
                    )}
                </div>
                {group.members.length >= 5 && <p className="text-yellow-400 text-sm mt-2">Group is full (5 members max).</p>}
            </div>

            <div className="flex-grow overflow-y-auto space-y-4">
                {sortedMembers.map(member => {
                    const player = players.find(p => p.id === member.playerId);
                    if (!player) return null;
                    const otherGroups = allGroups.filter(g => g.id !== group.id && g.members.length < 5);
                    return <GroupMemberCard key={member.playerId} member={member} player={player} groupId={group.id} isLeader={group.leaderId === member.playerId} unitConfig={unitConfig} dispatch={dispatch} otherGroups={otherGroups} unitCostMap={unitCostMap} />;
                })}
            </div>
        </div>
    );
};