import React, { useState, useMemo, useCallback } from 'react';
import type { Player, ConfirmModalInfo } from '../types';
import { Save, Search, X, Pencil, Trash2, AlertTriangle } from './icons';

export interface PlayerListProps {
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    notInHouse: boolean;
    setNotInHouse: React.Dispatch<React.SetStateAction<boolean>>;
}

import { useAppState, useAppDispatch } from '../AppContext';

export const PlayerList = React.memo(({
    selectedPlayerId, onSelectPlayer, setConfirmModal, notInHouse, setNotInHouse
}: PlayerListProps) => {
    const { players } = useAppState();
    const dispatch = useAppDispatch();

    const [searchQuery, setSearchQuery] = useState("");
    const [editingPlayer, setEditingPlayer] = useState<{ id: string | null; name: string }>({ id: null, name: '' });

    const filteredPlayers = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const basePlayers = players.filter((p: Player) => notInHouse ? p.notInHouse : !p.notInHouse);
        if (!lowerCaseQuery) return basePlayers;
        return basePlayers.filter((p: Player) => p.name.toLowerCase().startsWith(lowerCaseQuery));
    }, [players, searchQuery, notInHouse]);

    const handleSavePlayerName = useCallback(() => {
        if (!editingPlayer.id || !editingPlayer.name.trim()) return;
        dispatch({ type: 'UPDATE_PLAYER_NAME', payload: { playerId: editingPlayer.id, name: editingPlayer.name } });
        setEditingPlayer({ id: null, name: '' });
    }, [editingPlayer, dispatch]);

    const handleDeletePlayer = useCallback((playerId: string, playerName: string) => {
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
    }, [dispatch, selectedPlayerId, onSelectPlayer, setConfirmModal]);

    const handleNotInHouseToggle = useCallback((playerId: string) => {
        dispatch({ type: 'TOGGLE_NOT_IN_HOUSE', payload: { playerId } });
    }, [dispatch]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search players..." className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer" title="Show 'Not in House' players">
                    <input type="checkbox" checked={notInHouse} onChange={() => setNotInHouse(!notInHouse)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" />
                    <span>Inactive</span>
                </label>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 max-h-64">
                {filteredPlayers.length > 0 ? (
                    <ul className="space-y-2">
                        {filteredPlayers.map((player) => (
                            <li key={player.id} className={`p-2 rounded-md transition-all duration-200 flex justify-between items-center group ${selectedPlayerId === player.id ? 'bg-blue-500/20' : 'bg-gray-700/50'} ${player.notInHouse ? 'opacity-60' : ''}`}>
                                {editingPlayer.id === player.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input type="text" value={editingPlayer.name} onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSavePlayerName()} className="flex-grow bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white" autoFocus aria-label="Player Name Input" />
                                        <button onClick={handleSavePlayerName} className="p-1 text-green-400 hover:bg-gray-600 rounded" title="Save Player Name" aria-label="Save Player Name"><Save size={18} /></button>
                                        <button onClick={() => setEditingPlayer({ id: null, name: '' })} className="p-1 text-gray-400 hover:bg-gray-600 rounded" title="Cancel Editing" aria-label="Cancel Editing"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div onClick={() => onSelectPlayer(player.id)} className="flex items-center gap-2 flex-grow min-w-0 cursor-pointer">
                                            <span className={`font-medium flex-grow truncate ${player.notInHouse ? 'line-through' : ''}`} title={player.name}>
                                                {player.name}
                                                {(!player.units || player.units.length === 0) && <AlertTriangle className="inline-block ml-2 text-yellow-400" size={16} title="This player has no units assigned." />}
                                            </span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <label className="flex items-center mr-2 cursor-pointer text-xs text-gray-400" title="Not in House">
                                                <input type="checkbox" checked={player.notInHouse || false} onChange={() => handleNotInHouseToggle(player.id)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" aria-label="Mark as Not in House" />
                                            </label>
                                            <button onClick={() => setEditingPlayer({ id: player.id, name: player.name })} className="p-1 text-blue-400 hover:bg-gray-600 rounded" title="Edit Player Name" aria-label="Edit Player Name"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeletePlayer(player.id, player.name)} className="p-1 text-red-500 hover:bg-gray-600 rounded" title="Delete Player" aria-label="Delete Player"><Trash2 size={18} /></button>
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
