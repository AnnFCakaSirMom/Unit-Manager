import React, { useState, useMemo, useCallback } from 'react';
import type { Player, ConfirmModalInfo } from '../types';
import { Search } from './icons';
import { Input } from './Input';

export interface PlayerListProps {
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    notInHouse: boolean;
    setNotInHouse: React.Dispatch<React.SetStateAction<boolean>>;
}

import { useAppSelector, useAppDispatch } from '../state/store';
import { updatePlayerName, deletePlayer, toggleNotInHouse as toggleNotInHouseAction } from '../state/slices/playerSlice';
import { usePermission } from '../hooks/usePermission';
import { washName } from '../utils';
import { PlayerListItem } from './PlayerListItem';

export const PlayerList = React.memo(({
    selectedPlayerId, onSelectPlayer, setConfirmModal, notInHouse, setNotInHouse
}: PlayerListProps) => {
    const players = useAppSelector(state => state.player.players);
    const dispatch = useAppDispatch();
    const { canEditDisplayName, canDeletePlayers, canToggleNotInHouse } = usePermission();

    const [searchQuery, setSearchQuery] = useState("");

    const filteredPlayers = useMemo(() => {
        const washedQuery = washName(searchQuery);
        const basePlayers = players.filter((p: Player) => notInHouse ? p.notInHouse : !p.notInHouse);
        const results = searchQuery 
            ? basePlayers.filter((p: Player) => washName(p.name).includes(washedQuery))
            : basePlayers;
        return [...results].sort((a, b) => {
            const aWashed = washName(a.name);
            const bWashed = washName(b.name);
            const aStarts = aWashed.startsWith(washedQuery);
            const bStarts = bWashed.startsWith(washedQuery);

            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return aWashed.localeCompare(bWashed);
        });
    }, [players, searchQuery, notInHouse]);

    const handleUpdateName = useCallback((playerId: string, name: string) => {
        dispatch(updatePlayerName({ playerId, name }));
    }, [dispatch]);

    const handleDeletePlayer = useCallback((playerId: string, playerName: string, playerRole?: string) => {
        if (!canDeletePlayers) return;
        if (playerRole === 'Owner') {
            alert("An Owner cannot be deleted.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Delete Player',
            message: `Are you sure you want to delete ${playerName}? This action cannot be undone.`,
            onConfirm: () => {
                dispatch(deletePlayer({ playerId }));
                if (selectedPlayerId === playerId) onSelectPlayer(null);
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    }, [dispatch, selectedPlayerId, onSelectPlayer, setConfirmModal, canDeletePlayers]);

    const handleNotInHouseToggle = useCallback((playerId: string, playerRole?: string) => {
        if (!canToggleNotInHouse) return;
        if (playerRole === 'Owner') return; // Owners can't be set to inactive 
        dispatch(toggleNotInHouseAction({ playerId }));
    }, [dispatch, canToggleNotInHouse]);

    const handleSelect = useCallback((id: string) => {
        onSelectPlayer(id);
    }, [onSelectPlayer]);

    const handleToggleNotInHouse = useCallback(() => {
        setNotInHouse(prev => !prev);
    }, [setNotInHouse]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search players..." className="w-full pl-9 pr-2 py-1.5" />
                </div>
                <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer" title="Show 'Not in House' players">
                    <input type="checkbox" checked={notInHouse} onChange={handleToggleNotInHouse} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" />
                    <span>Inactive</span>
                </label>
            </div>
            <div className="overflow-y-auto max-h-64 pr-2 -mr-2">
                {filteredPlayers.length > 0 ? (
                    <ul className="space-y-1">
                        {filteredPlayers.map((player) => (
                            <PlayerListItem 
                                key={player.id}
                                player={player}
                                isSelected={selectedPlayerId === player.id}
                                onSelect={handleSelect}
                                onDelete={handleDeletePlayer}
                                onToggleNotInHouse={handleNotInHouseToggle}
                                onUpdateName={handleUpdateName}
                                canEdit={canEditDisplayName}
                                canDelete={canDeletePlayers}
                                canToggleInactive={canToggleNotInHouse}
                            />
                        ))}
                    </ul>
                ) : <div className="text-center text-gray-500 py-8"><p>No players found.</p></div>}
            </div>
        </div>
    );
});
