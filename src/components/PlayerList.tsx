import React, { useState, useMemo, useCallback } from 'react';
import type { Player, ConfirmModalInfo } from '../types';
import { Save, Search, X, Pencil, Trash2, AlertTriangle } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../utils';
import { RoleBadge } from './RoleBadge';

export interface PlayerListProps {
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    notInHouse: boolean;
    setNotInHouse: React.Dispatch<React.SetStateAction<boolean>>;
}

import { useAppState, useAppDispatch } from '../AppContext';
import { usePermission } from '../hooks/usePermission';
import { washName } from '../utils';

export const PlayerList = React.memo(({
    selectedPlayerId, onSelectPlayer, setConfirmModal, notInHouse, setNotInHouse
}: PlayerListProps) => {
    const { players } = useAppState();
    const dispatch = useAppDispatch();
    const { canEditDisplayName, canDeletePlayers, canToggleNotInHouse } = usePermission();

    const [searchQuery, setSearchQuery] = useState("");
    const [editingPlayer, setEditingPlayer] = useState<{ id: string | null; name: string }>({ id: null, name: '' });

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

    const handleSavePlayerName = useCallback(() => {
        if (!editingPlayer.id || !editingPlayer.name.trim()) return;
        dispatch({ type: 'UPDATE_PLAYER_NAME', payload: { playerId: editingPlayer.id, name: editingPlayer.name } });
        setEditingPlayer({ id: null, name: '' });
    }, [editingPlayer, dispatch]);

    const handleDeletePlayer = useCallback((playerId: string, playerName: string, playerRole?: string) => {
        if (!canDeletePlayers) return;
        if (playerRole === 'Owner') {
            alert("En Owner kan inte raderas.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Delete Player',
            message: `Are you sure you want to delete ${playerName}? This action cannot be undone.`,
            onConfirm: () => {
                dispatch({ type: 'DELETE_PLAYER', payload: { playerId } });
                if (selectedPlayerId === playerId) onSelectPlayer(null);
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    }, [dispatch, selectedPlayerId, onSelectPlayer, setConfirmModal, canDeletePlayers]);

    const handleNotInHouseToggle = useCallback((playerId: string, playerRole?: string) => {
        if (!canToggleNotInHouse) return;
        if (playerRole === 'Owner') return; // Owners can't be set to inactive 
        dispatch({ type: 'TOGGLE_NOT_IN_HOUSE', payload: { playerId } });
    }, [dispatch, canToggleNotInHouse]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search players..." className="w-full pl-9 pr-2 py-1.5" />
                </div>
                <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer" title="Show 'Not in House' players">
                    <input type="checkbox" checked={notInHouse} onChange={() => setNotInHouse(!notInHouse)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" />
                    <span>Inactive</span>
                </label>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 max-h-64">
                {filteredPlayers.length > 0 ? (
                    <ul className="space-y-1">
                        {filteredPlayers.map((player) => (
                            <li key={player.id} className={`p-1.5 rounded-md transition-all duration-200 flex justify-between items-center group ${selectedPlayerId === player.id ? 'bg-blue-500/20' : 'bg-gray-700/50'} ${player.notInHouse ? 'opacity-60' : ''}`}>
                                {editingPlayer.id === player.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <Input type="text" value={editingPlayer.name} onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSavePlayerName()} className="flex-grow bg-gray-600 border-gray-500 px-2 py-1" autoFocus aria-label="Player Name Input" />
                                        <Button variant="success" size="icon" onClick={handleSavePlayerName} title="Save Player Name" aria-label="Save Player Name"><Save size={18} /></Button>
                                        <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => setEditingPlayer({ id: null, name: '' })} title="Cancel Editing" aria-label="Cancel Editing"><X size={18} /></Button>
                                    </div>
                                ) : (
                                    <>
                                        <div onClick={() => onSelectPlayer(player.id)} className="flex items-center gap-2 flex-grow min-w-0 cursor-pointer">
                                            <span className={`font-medium flex-grow truncate flex items-center gap-1.5 ${player.notInHouse ? 'line-through' : ''}`} title={player.name}>
                                                {player.role && <RoleBadge role={player.role} showLabel={false} />}
                                                {player.name}
                                                {(!player.units || player.units.length === 0) && <AlertTriangle className="inline-block ml-2 text-yellow-400" size={16} title="This player has no units assigned." />}
                                            </span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <label className={cn("flex items-center mr-2 cursor-pointer text-xs text-gray-400", (!canToggleNotInHouse || player.role === 'Owner') && "opacity-30 cursor-not-allowed")} title={player.role === 'Owner' ? "Owner cannot be inactive" : "Toggle Not in House"}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={player.notInHouse || false} 
                                                    onChange={() => handleNotInHouseToggle(player.id, player.role)} 
                                                    disabled={!canToggleNotInHouse || player.role === 'Owner'}
                                                    className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" 
                                                    aria-label="Mark as Not in House" 
                                                />
                                            </label>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-blue-400 disabled:opacity-30" 
                                                onClick={() => setEditingPlayer({ id: player.id, name: player.name })} 
                                                title="Edit Player Name" 
                                                aria-label="Edit Player Name" 
                                                disabled={!canEditDisplayName || player.role === 'Owner'}
                                            >
                                                <Pencil size={18} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-red-500 disabled:opacity-30" 
                                                onClick={() => handleDeletePlayer(player.id, player.name, player.role)} 
                                                title="Delete Player" 
                                                aria-label="Delete Player"
                                                disabled={!canDeletePlayers || player.role === 'Owner'}
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : <div className="text-center text-gray-500 py-8"><p>No players found.</p></div>}
            </div>
        </div>
    );
});
