import React from 'react';
import type { Group, TWAttendancePlayer } from '../types';
import { UserPlus, AlertTriangle, ArrowDownIcon, ArrowUpIcon } from './icons';
import { Button } from './Button';
import { Select } from './Select';
import { cn } from '../utils';

const GripIcon = ({ className = "", size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
);

interface AttendancePlayerRowProps {
    person: TWAttendancePlayer;
    existingGroup: Group | null | undefined;
    isDraggable: boolean;
    isDragged: boolean;
    groups: Group[];
    onDragStart: (e: React.DragEvent, playerId: string) => void;
    onDragEnd: () => void;
    onAssignGroup: (playerId: string, targetGroupId: string) => void;
    onSelectPlayer: (id: string) => void;
    onCreatePlayer: (discordName: string) => void;
    onChangeStatus: (discordName: string, newStatus: 'Accepted' | 'Maybe') => void;
}

export const AttendancePlayerRow = React.memo(({
    person, existingGroup, isDraggable, isDragged, groups, onDragStart, onDragEnd, onAssignGroup, onSelectPlayer, onCreatePlayer, onChangeStatus
}: AttendancePlayerRowProps) => {
    const isAccepted = person.status === 'Accepted';

    return (
        <div
            draggable={isDraggable}
            onDragStart={(e) => isDraggable && onDragStart(e, person.matchedPlayerId!)}
            onDragEnd={onDragEnd}
            className={cn(
                "flex items-center justify-between p-1.5 rounded-md border transition-all",
                existingGroup ? 'bg-green-900/20 border-green-700/50' : 'bg-gray-800/50 border-gray-700',
                isDraggable && 'cursor-grab active:cursor-grabbing hover:bg-gray-700/60',
                isDragged && 'opacity-50'
            )}
        >
            <div className="flex items-center gap-2 min-w-0">
                {isDraggable ? (
                    <GripIcon size={16} className="text-gray-500 flex-shrink-0" />
                ) : (
                    <div className="w-4 flex-shrink-0"></div>
                )}

                {person.matchedPlayerId ? (
                    <Button
                        onClick={() => onSelectPlayer(person.matchedPlayerId!)}
                        variant="ghost"
                        className="p-0 h-auto font-medium text-blue-400 hover:bg-transparent hover:text-blue-300 hover:underline text-left truncate"
                        title="View player units"
                    >
                        {person.discordName}
                    </Button>
                ) : (
                    <span className="font-medium text-gray-200 truncate">{person.discordName}</span>
                )}

                {!person.matchedPlayerId && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex-shrink-0" title="Missing in Unit Manager">
                        <AlertTriangle size={12} /> Unknown
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {/* Status toggle button */}
                {isAccepted ? (
                    <Button
                        onClick={() => onChangeStatus(person.discordName, 'Maybe')}
                        variant="ghost"
                        size="icon"
                        title="Move to Maybe"
                        className="h-6 w-6 text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/10 flex-shrink-0"
                    >
                        <ArrowDownIcon size={13} />
                    </Button>
                ) : (
                    <Button
                        onClick={() => onChangeStatus(person.discordName, 'Accepted')}
                        variant="ghost"
                        size="icon"
                        title="Move to Accepted"
                        className="h-6 w-6 text-green-500/60 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0"
                    >
                        <ArrowUpIcon size={13} />
                    </Button>
                )}

                {!person.matchedPlayerId ? (
                    <Button
                        onClick={() => onCreatePlayer(person.discordName)}
                        variant="success"
                        size="sm"
                        className="py-1 px-2 text-xs font-bold"
                    >
                        <UserPlus size={14} /> Create
                    </Button>
                ) : (
                    <Select
                        value={existingGroup ? existingGroup.id : ""}
                        onChange={(e) => onAssignGroup(person.matchedPlayerId!, e.target.value)}
                        className={cn(
                            "text-xs font-semibold py-1 px-2 w-[110px]",
                            existingGroup ? "bg-green-600 hover:bg-green-700 border-green-500" : "bg-gray-600 hover:bg-gray-500 border-gray-500"
                        )}
                    >
                        <option value="" disabled>Group...</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id} disabled={g.members.length >= 5 && (!existingGroup || existingGroup.id !== g.id)}>
                                {existingGroup?.id === g.id ? `✅ ${g.name}` : g.name} {g.members.length >= 5 ? '(Full)' : ''}
                            </option>
                        ))}
                        {existingGroup && (
                            <option value="REMOVE">❌ Remove</option>
                        )}
                    </Select>
                )}
            </div>
        </div>
    );
});
