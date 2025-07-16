import React, { useState, useMemo, useCallback } from 'react';
import type { Player, Group, AppAction, ConfirmModalInfo, UnitConfig } from '../types';
import { Save, FolderOpen, Settings, UserPlus, Users, Search, ChevronUp, ChevronDown, Trash2, Pencil, X, AlertTriangle, Clipboard, Shield, Plus } from './icons';
import { UnitSearch } from './UnitSearch';

// --- Prop Interfaces for Helper Components ---

interface PlayerListProps {
    players: Player[];
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    dispatch: React.Dispatch<AppAction>;
    notInHouse: boolean;
    setNotInHouse: React.Dispatch<React.SetStateAction<boolean>>;
}

interface GroupsListProps {
    groups: Group[];
    players: Player[];
    selectedGroupId: string | null;
    onSelectGroup: (id: string | null) => void;
    dispatch: React.Dispatch<AppAction>;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    onCopy: (text: string) => void;
}


// --- Helper Components for Sidebar (defined outside main component) ---

const PlayerList = React.memo(({
    players, selectedPlayerId, onSelectPlayer, setConfirmModal, dispatch, notInHouse, setNotInHouse
}: PlayerListProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingPlayer, setEditingPlayer] = useState<{id: string | null; name: string}>({ id: null, name: '' });

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
                                        <input type="text" value={editingPlayer.name} onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSavePlayerName()} className="flex-grow bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white" autoFocus />
                                        <button onClick={handleSavePlayerName} className="p-1 text-green-400 hover:bg-gray-600 rounded"><Save size={18} /></button>
                                        <button onClick={() => setEditingPlayer({ id: null, name: '' })} className="p-1 text-gray-400 hover:bg-gray-600 rounded"><X size={18} /></button>
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
                                                <input type="checkbox" checked={player.notInHouse || false} onChange={() => handleNotInHouseToggle(player.id)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" />
                                            </label>
                                            <button onClick={() => setEditingPlayer({ id: player.id, name: player.name })} className="p-1 text-blue-400 hover:bg-gray-600 rounded"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeletePlayer(player.id, player.name)} className="p-1 text-red-500 hover:bg-gray-600 rounded"><Trash2 size={18} /></button>
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

const GroupsList = React.memo(({
    groups, players, selectedGroupId, onSelectGroup, dispatch, setConfirmModal, onCopy
}: GroupsListProps) => {
    const [editingGroup, setEditingGroup] = useState<{id: string | null; name: string}>({ id: null, name: '' });

    const handleSaveGroupName = useCallback(() => {
        if (!editingGroup.id || !editingGroup.name.trim()) return;
        dispatch({ type: 'UPDATE_GROUP_NAME', payload: { groupId: editingGroup.id, name: editingGroup.name } });
        setEditingGroup({ id: null, name: '' });
    }, [editingGroup, dispatch]);

    const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
        setConfirmModal({
            isOpen: true, title: 'Delete Group', message: `Are you sure you want to delete group "${groupName}"?`,
            onConfirm: () => {
                dispatch({ type: 'DELETE_GROUP', payload: { groupId } });
                if (selectedGroupId === groupId) onSelectGroup(null);
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    }, [dispatch, selectedGroupId, onSelectGroup, setConfirmModal]);

    const handleCopyAllGroups = useCallback(() => {
        const textToCopy = groups.map(group => {
            let groupHeaderText = `--- ${group.name} ---\n`;
            
            const sortedMembers = [...group.members].sort((a, b) => {
                if (a.playerId === group.leaderId) return -1;
                if (b.playerId === group.leaderId) return 1;
                const playerA = players.find(p => p.id === a.playerId);
                const playerB = players.find(p => p.id === b.playerId);
                return playerA && playerB ? playerA.name.localeCompare(playerB.name) : 0;
            });

            const memberContent = sortedMembers.map(member => {
                const player = players.find(p => p.id === member.playerId);
                if (!player) return '';
                
                let playerLine = player.name + (player.id === group.leaderId ? " (Lead)" : "");
                
                const unitsText = [...member.selectedUnits]
                    .sort((a, b) => {
                        const rankA = a.rank > 0 ? a.rank : 99;
                        const rankB = b.rank > 0 ? b.rank : 99;
                        if (rankA !== rankB) return rankA - rankB;
                        return a.unitName.localeCompare(b.unitName);
                    })
                    .map(u => `  ${u.rank > 0 ? `${u.rank}.` : "-"} ${u.unitName}`)
                    .join('\n');

                return unitsText ? `${playerLine}\n${unitsText}` : playerLine;
            }).join('\n\n');
            
            return `${groupHeaderText}\`\`\`md\n${memberContent}\n\`\`\``;
        }).join('\n\n====================\n\n');
        
        onCopy(textToCopy);
    }, [groups, players, onCopy]);


    return (
        <div className="flex-grow flex flex-col mt-4">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Shield size={20}/> Groups ({groups.length})</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyAllGroups} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded-md transition-colors flex items-center justify-center text-sm gap-1" title="Copy All Groups">
                        <Clipboard size={16} />
                    </button>
                    <button onClick={() => dispatch({ type: 'ADD_GROUP' })} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md transition-colors flex items-center justify-center text-sm gap-1">
                        <Plus size={16} /> Create
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {groups.length > 0 ? (
                    <ul className="space-y-2">
                        {groups.map((group) => (
                            <li key={group.id} className={`p-3 rounded-md transition-all duration-200 flex justify-between items-center group ${selectedGroupId === group.id ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
                                {editingGroup.id === group.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input type="text" value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSaveGroupName()} className="flex-grow bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white" autoFocus />
                                        <button onClick={handleSaveGroupName} className="p-1 text-green-400 hover:bg-gray-600 rounded"><Save size={18} /></button>
                                        <button onClick={() => setEditingGroup({ id: null, name: '' })} className="p-1 text-gray-400 hover:bg-gray-600 rounded"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium cursor-pointer flex-grow truncate" onClick={() => onSelectGroup(group.id)} title={group.name}>
                                            {group.name}
                                        </span>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingGroup({ id: group.id, name: group.name })} className="p-1 text-blue-400 hover:bg-gray-600 rounded"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeleteGroup(group.id, group.name)} className="p-1 text-red-500 hover:bg-gray-600 rounded"><Trash2 size={18} /></button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : <div className="text-center text-gray-500 py-8"><p>No groups created.</p></div>}
            </div>
        </div>
    );
});


// --- Main Sidebar Component ---

interface SidebarProps {
    players: Player[];
    groups: Group[];
    unitConfig: UnitConfig;
    dispatch: React.Dispatch<AppAction>;
    selectedPlayerId: string | null;
    selectedGroupId: string | null;
    onSelectPlayer: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onSave: () => void;
    onLoad: () => void;
    onOpenUnitManager: () => void;
    hasUnsavedChanges: boolean;
    statusMessage: string;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    isPlayerListOpen: boolean;
    // ÄNDRING 3: Byt ut 'setPlayerListOpen' mot den nya, mer specifika funktionen.
    onTogglePlayerList: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        players, groups, unitConfig, dispatch, selectedPlayerId, selectedGroupId,
        onSelectPlayer, onSelectGroup, onSave, onLoad, onOpenUnitManager,
        hasUnsavedChanges, statusMessage, setConfirmModal, isPlayerListOpen, 
        // ÄNDRING 4: Plocka ut den nya prop:en.
        onTogglePlayerList
    } = props;

    const [newPlayerName, setNewPlayerName] = useState("");
    const [notInHouse, setNotInHouse] = useState(false);
    const [unitSearchTerm, setUnitSearchTerm] = useState('');

    const handleAddPlayer = useCallback(() => {
        if (!newPlayerName.trim()) return;
        dispatch({ type: 'ADD_PLAYER', payload: { name: newPlayerName } });
        setNewPlayerName("");
    }, [newPlayerName, dispatch]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 border-r border-gray-700 p-4 flex flex-col">
            <header className="mb-4">
                <h1 className="text-2xl font-bold text-blue-400">Unit Manager</h1>
                <p className="text-sm text-gray-400">Manage players, units, and groups.</p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <button onClick={onSave} className="relative bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        {hasUnsavedChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></span>}
                        <Save size={16} />
                        <span>Save</span>
                    </button>
                    <button onClick={onLoad} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        <FolderOpen size={16} />
                        <span>Load</span>
                    </button>
                    <button onClick={onOpenUnitManager} className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2" title="Manage Units">
                        <Settings size={16} />
                        <span>Units</span>
                    </button>
                </div>
                <div className="h-5 mt-2 text-center">
                    {statusMessage && <p className={`text-sm ${statusMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{statusMessage}</p>}
                </div>
            </header>

            <div className="flex items-center gap-2 mb-4">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()} placeholder="New player name..." className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddPlayer} disabled={!newPlayerName.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center justify-center"><UserPlus size={20} /></button>
            </div>
            
            <div className="border-t border-gray-700 pt-2">
                <button 
                    // ÄNDRING 5: Använd den nya funktionen som skickats ner som en prop.
                    onClick={onTogglePlayerList}
                    className="w-full flex justify-between items-center py-2"
                >
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Users size={20}/> Players ({players.filter(p=> !p.notInHouse).length})</h2>
                    {isPlayerListOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                {isPlayerListOpen && (
                    <PlayerList 
                        players={players}
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={onSelectPlayer}
                        setConfirmModal={setConfirmModal}
                        dispatch={dispatch}
                        notInHouse={notInHouse}
                        setNotInHouse={setNotInHouse}
                    />
                )}
            </div>

            <UnitSearch 
                players={players}
                onSelectPlayer={onSelectPlayer}
                searchTerm={unitSearchTerm}
                setSearchTerm={setUnitSearchTerm}
            />

            <GroupsList
                groups={groups}
                players={players}
                selectedGroupId={selectedGroupId}
                onSelectGroup={onSelectGroup}
                dispatch={dispatch}
                setConfirmModal={setConfirmModal}
                onCopy={handleCopy}
            />
        </aside>
    );
};
