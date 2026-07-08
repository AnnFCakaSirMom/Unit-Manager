import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Group } from '../types';
import { Search, Clipboard, UserPlus } from './icons';

import { GroupMemberCard } from './GroupMemberCard';
import { Button } from './Button';
import { Input } from './Input';

interface GroupViewProps {
    group: Group;
    onCopy: (text: string) => void;
}

import { useAppSelector, useAppDispatch } from '../state/store';
import { addPlayerToGroup } from '../state/slices/groupSlice';
import { selectPlayersById } from '../state/selectors';

const GroupViewComponent: React.FC<GroupViewProps> = ({ group, onCopy }) => {
    const players = useAppSelector(state => state.player.players);
    const unitConfig = useAppSelector(state => state.unit.unitConfig);
    const dispatch = useAppDispatch();

    // PERF: O(1) player lookup instead of players.find() per member in the render
    // loop and copy handler (previously O(members * players) per render). Shared,
    // memoized selector so the map is built once per players change.
    const playersById = useAppSelector(selectPlayersById);

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
        dispatch(addPlayerToGroup({ groupId: group.id, playerId }));
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
            const player = playersById.get(member.playerId);
            if (!player) return '';
            let playerLine = player.name + (player.id === group.leaderId ? " (Lead)" : "");

            const usedLeadership = member.selectedUnits.reduce((total, u) => total + (unitCostMap.get(u.unitName) || 0), 0);
            const totalLeadership = player.totalLeadership || 0;
            playerLine += ` -- LS: ${usedLeadership} / ${totalLeadership}`;

            const unitsText = [...member.selectedUnits].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(u => `  ${u.rank > 0 ? `${u.rank}.` : "-"} ${u.unitName} (${unitCostMap.get(u.unitName) || 0} LS)`).join('\n');
            return unitsText ? `${playerLine}\n${unitsText}` : playerLine;
        }).join('\n\n');
        onCopy(`${groupHeaderText}\`\`\`md\n${memberContent}\n\`\`\``);
    }, [group, sortedMembers, playersById, onCopy, unitCostMap]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Group: <span className="text-amber-100">{group.name}</span></h2>
                <Button variant="primary" onClick={handleCopyGroup} title="Copy This Group"><Clipboard size={16} /> Copy Group</Button>
            </div>

            <div className="mb-4 bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg">
                <h3 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Add Player to Group</h3>
                <div className="relative" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input type="text" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} onFocus={() => setShowSuggestions(true)} placeholder="Search for player to add..." className="w-full pl-9 pr-2 py-1.5" disabled={group.members.length >= 5} />
                    {showSuggestions && playerSearch && availablePlayers.length > 0 && (
                        <ul className="absolute z-50 w-full bg-black/90 border border-amber-500/20 rounded-xl mt-1 max-h-48 overflow-y-auto backdrop-blur-xl shadow-2xl p-1">
                            {availablePlayers.map(p => <li key={p.id} onClick={() => handleSelectPlayer(p.id)} className="px-3 py-2 cursor-pointer hover:bg-amber-500/10 text-gray-200 rounded-lg flex items-center gap-2 transition-colors"><UserPlus size={16} className="text-amber-500/60" /> {p.name}</li>)}
                        </ul>
                    )}
                </div>
                {group.members.length >= 5 && <p className="text-amber-500/80 text-[10px] uppercase font-bold mt-2 italic">Group is full (5 members max).</p>}
            </div>

            <div className="flex-grow overflow-y-auto space-y-2">
                {sortedMembers.map(member => {
                    const player = playersById.get(member.playerId);
                    if (!player) return null;
                    return <GroupMemberCard key={member.playerId} member={member} player={player} groupId={group.id} isLeader={group.leaderId === member.playerId} unitCostMap={unitCostMap} />;
                })}
            </div>
        </div>
    );
};

// PERF: Memoize so GroupView only re-renders when its own props (group, onCopy)
// change, not on every unrelated Redux update elsewhere in the app.
export const GroupView = React.memo(GroupViewComponent);