import React, { memo } from 'react';
import type { Group, TWAttendancePlayer } from '../types';
import { AttendancePlayerRow } from './AttendancePlayerRow';
import { cn } from '../utils';

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
    handleCreatePlayer
}: AttendancePlayerListProps) => {
    return (
        <div className="mb-6">
            <h3 className={cn("text-lg font-bold mb-3 flex items-center gap-2 border-b-2 pb-2", colorClass)}>
                {icon} {title} ({list.length})
            </h3>
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
                        />
                    );
                })}
            </div>
        </div>
    );
});
