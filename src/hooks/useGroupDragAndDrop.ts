import { useState, useCallback, useMemo, useRef } from 'react';
import type { Group } from '../types';
import {
    addPlayerToGroup,
    removePlayerFromGroup,
    movePlayerBetweenGroups,
    reorderGroupMember
} from '../state/slices/groupSlice';

export const useGroupDragAndDrop = (groups: Group[], dispatch: any) => {
    const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
    const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

    // PERF: Memoize a playerId -> group lookup map so getPlayerGroup is O(1)
    // instead of a linear scan over every group's members on each call
    // (previously O(groups * members) per rendered attendance row).
    const playerGroupMap = useMemo(() => {
        const map = new Map<string, Group>();
        for (const group of groups) {
            for (const member of group.members) {
                map.set(member.playerId, group);
            }
        }
        return map;
    }, [groups]);

    // PERF: "Latest ref" pattern — keep refs to the current groups array and
    // derived map so getPlayerGroup/handleAssignGroup can have EMPTY dep
    // arrays (permanently stable identity) while still always reading
    // up-to-date data at call time. Without this, a real group mutation
    // (e.g. dropping a player, or even just reordering members within one
    // group) changes the `groups` array reference, which previously
    // recreated these callbacks on every such change. Since the callbacks
    // are passed as props to every member row across every group, that
    // recreation broke React.memo for ALL rows in ALL groups on every single
    // drop/reorder — not just the row(s) actually affected. Assigning to a
    // ref during render is safe here: it happens synchronously before the
    // commit, well before any user-triggered drag event can read it, so the
    // ref is always current by the time a handler runs (no stale closures).
    const groupsRef = useRef(groups);
    groupsRef.current = groups;
    const playerGroupMapRef = useRef(playerGroupMap);
    playerGroupMapRef.current = playerGroupMap;

    const getPlayerGroup = useCallback((playerId: string | null): Group | null | undefined => {
        if (!playerId) return null;
        return playerGroupMapRef.current.get(playerId);
    }, []);

    const handleAssignGroup = useCallback((playerId: string, targetGroupId: string) => {
        const currentGroups = groupsRef.current;
        if (targetGroupId === "REMOVE") {
            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup) {
                dispatch(removePlayerFromGroup({ groupId: currentGroup.id, playerId }));
            }
        } else {
            const targetGroup = currentGroups.find(g => g.id === targetGroupId);
            if (targetGroup && targetGroup.members.length >= 5) {
                const currentGroup = getPlayerGroup(playerId);
                if (!currentGroup || currentGroup.id !== targetGroupId) {
                    alert("This group is already full (5/5).");
                    return;
                }
            }

            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup && currentGroup.id !== targetGroupId) {
                dispatch(movePlayerBetweenGroups({ playerId, sourceGroupId: currentGroup.id, targetGroupId }));
            } else if (!currentGroup) {
                dispatch(addPlayerToGroup({ groupId: targetGroupId, playerId }));
            }
        }
    }, [dispatch, getPlayerGroup]);

    const handleDragStart = useCallback((e: React.DragEvent, playerId: string, sourceGroupId: string | null = null) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ playerId, sourceGroupId }));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPlayer(playerId);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedPlayer(null);
        setDragOverPlayer(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDropOnGroup = useCallback((e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, targetGroupId);
        } catch (err) { }
    }, [handleAssignGroup]);

    const handleDropOnList = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, "REMOVE");
        } catch (err) { }
    }, [handleAssignGroup]);

    const handleDropOnMember = useCallback((e: React.DragEvent, targetGroupId: string, targetPlayerId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) {
                if (data.sourceGroupId === targetGroupId && data.playerId !== targetPlayerId) {
                    dispatch(reorderGroupMember({ groupId: targetGroupId, playerId: data.playerId, targetPlayerId }));
                } else {
                    handleAssignGroup(data.playerId, targetGroupId);
                }
            }
        } catch (err) { }
    }, [dispatch, handleAssignGroup]);

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
