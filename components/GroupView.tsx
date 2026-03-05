import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Group, Player, UnitConfig, AppAction } from '../types';
import { Search, Clipboard, UserPlus } from './icons';

import { GroupMemberCard } from './GroupMemberCard';

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