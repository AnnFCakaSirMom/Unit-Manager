import { useState } from 'react';
import type { Group } from '../types';

export const useGroupDragAndDrop = (groups: Group[], dispatch: any) => {
    const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
    const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

    const getPlayerGroup = (playerId: string | null) => {
        if (!playerId) return null;
        return groups.find(g => g.members.some(m => m.playerId === playerId));
    };

    const handleAssignGroup = (playerId: string, targetGroupId: string) => {
        if (targetGroupId === "REMOVE") {
            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup) {
                dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId: currentGroup.id, playerId } });
            }
        } else {
            const targetGroup = groups.find(g => g.id === targetGroupId);
            if (targetGroup && targetGroup.members.length >= 5) {
                const currentGroup = getPlayerGroup(playerId);
                if (!currentGroup || currentGroup.id !== targetGroupId) {
                    alert("This group is already full (5/5).");
                    return;
                }
            }

            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup && currentGroup.id !== targetGroupId) {
                dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId, sourceGroupId: currentGroup.id, targetGroupId } });
            } else if (!currentGroup) {
                dispatch({ type: 'ADD_PLAYER_TO_GROUP', payload: { groupId: targetGroupId, playerId } });
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, playerId: string, sourceGroupId: string | null = null) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ playerId, sourceGroupId }));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPlayer(playerId);
    };

    const handleDragEnd = () => {
        setDraggedPlayer(null);
        setDragOverPlayer(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnGroup = (e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, targetGroupId);
        } catch (err) { }
    };

    const handleDropOnList = (e: React.DragEvent) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, "REMOVE");
        } catch (err) { }
    };

    const handleDropOnMember = (e: React.DragEvent, targetGroupId: string, targetPlayerId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) {
                if (data.sourceGroupId === targetGroupId && data.playerId !== targetPlayerId) {
                    dispatch({ type: 'REORDER_GROUP_MEMBER', payload: { groupId: targetGroupId, playerId: data.playerId, targetPlayerId } });
                } else {
                    handleAssignGroup(data.playerId, targetGroupId);
                }
            }
        } catch (err) { }
    };

    return {
        draggedPlayer,
        dragOverPlayer,
        setDragOverPlayer,
        getPlayerGroup,
        handleAssignGroup,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDropOnGroup,
        handleDropOnList,
        handleDropOnMember
    };
};
