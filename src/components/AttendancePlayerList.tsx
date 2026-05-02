import React, { memo, useState, useMemo } from 'react';
import type { Group, TWAttendancePlayer, Player } from '../types';
import { AttendancePlayerRow } from './AttendancePlayerRow';
import { cn } from '../utils';
import { Plus, X } from './icons';

export interface AttendancePlayerListProps {
    list: TWAttendancePlayer[];
    title: string;
    colorClass: string;
    icon: React.ReactNode;
    groups: Group[];
    getPlayerGroup: (playerId: string | null) => Group | null | undefined;
    draggedPlayer: string | null;
    handleDragStart: (e: React.DragEvent, playerId: string, sourceGroupId?: string | null) => void;
    handleDragEnd: () => void;
    handleAssignGroup: (playerId: string, targetGroupId: string) => void;
    onSelectPlayer: (id: string) => void;
    handleCreatePlayer: (discordName: string) => void;
    onChangeStatus: (discordName: string, newStatus: 'Accepted' | 'Maybe') => void;
    // Only for the Accepted list — allows manual add
    allPlayers?: Player[];
    onAddManual?: (discordName: string, matchedPlayerId: string | null) => void;
    existingDiscordNames?: string[];
}

export const AttendancePlayerList = memo(({
    list,
    title,
    colorClass,
    icon,
    groups,
    getPlayerGroup,
    draggedPlayer,
    handleDragStart,
    handleDragEnd,
    handleAssignGroup,
    onSelectPlayer,
    handleCreatePlayer,
    onChangeStatus,
    allPlayers,
    onAddManual,
    existingDiscordNames = [],
}: AttendancePlayerListProps) => {
    const [addMode, setAddMode] = useState(false);
    const [search, setSearch] = useState('');

    // Players not already in attendance
    const availablePlayers = useMemo(() => {
        if (!allPlayers) return [];
        return allPlayers.filter(p =>
            !p.notInHouse &&
            !existingDiscordNames.some(dn => dn.toLowerCase() === p.name.toLowerCase())
        );
    }, [allPlayers, existingDiscordNames]);

    const filteredPlayers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return availablePlayers.slice(0, 8);
        return availablePlayers.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    }, [availablePlayers, search]);

    const handlePickPlayer = (player: Player) => {
        if (onAddManual) {
            onAddManual(player.name, player.id);
        }
        setSearch('');
        setAddMode(false);
    };

    return (
        <div className="mb-6">
            {/* Header row */}
            <div className="flex items-center justify-between border-b-2 pb-2 mb-3">
                <h3 className={cn("text-lg font-bold flex items-center gap-2", colorClass)}>
                    {icon} {title} ({list.length})
                </h3>
                {/* Show "+" button only for the Accepted list (when onAddManual is provided) */}
                {onAddManual && (
                    <button
                        onClick={() => setAddMode(prev => !prev)}
                        title={addMode ? 'Cancel' : 'Add player manually to Accepted'}
                        className={cn(
                            "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all",
                            addMode
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                : "bg-green-900/30 border-green-600/40 text-green-400 hover:bg-green-800/40 hover:text-green-300"
                        )}
                    >
                        {addMode ? <X size={12} /> : <Plus size={12} />}
                        {addMode ? 'Cancel' : 'Add'}
                    </button>
                )}
            </div>

            {/* Manual add panel */}
            {addMode && onAddManual && (
                <div className="mb-3 p-2 rounded-lg bg-gray-800/60 border border-green-700/30">
                    <p className="text-xs text-gray-400 mb-1.5">Search for a player to add to Accepted:</p>
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Player name..."
                        className="w-full bg-black/40 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 px-2 py-1.5 focus:outline-none focus:border-amber-500/40"
                    />
                    <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handlePickPlayer(p)}
                                    className="w-full text-left text-sm px-2 py-1 rounded hover:bg-green-800/40 text-gray-200 hover:text-green-300 transition-colors"
                                >
                                    {p.name}
                                </button>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 py-1 px-1">
                                {search ? 'No matching players found.' : 'All players are already in the list.'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {list.map((person: TWAttendancePlayer, index: number) => {
                    const existingGroup = getPlayerGroup(person.matchedPlayerId);
                    const isDraggable = !!person.matchedPlayerId;
                    const stableKey = person.matchedPlayerId || `${person.discordName}-${index}`;

                    return (
                        <AttendancePlayerRow
                            key={stableKey}
                            person={person}
                            existingGroup={existingGroup}
                            isDraggable={isDraggable}
                            isDragged={draggedPlayer === person.matchedPlayerId}
                            groups={groups}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onAssignGroup={handleAssignGroup}
                            onSelectPlayer={onSelectPlayer}
                            onCreatePlayer={handleCreatePlayer}
                            onChangeStatus={onChangeStatus}
                        />
                    );
                })}
            </div>
        </div>
    );
});
