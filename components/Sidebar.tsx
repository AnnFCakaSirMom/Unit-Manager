import React, { useState, useCallback } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Save, FolderOpen, Settings, UserPlus, Users, ChevronUp, ChevronDown } from './icons';
import { UnitSearch } from './UnitSearch';
import { PlayerList } from './PlayerList';
import { GroupsList } from './GroupsList';

interface SidebarProps {
    selectedPlayerId: string | null;
    selectedGroupId: string | null;
    onSelectPlayer: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onSave: () => void;
    onLoad: () => void;
    onOpenUnitManager: () => void;
    onOpenAttendance: () => void;
    hasUnsavedChanges: boolean;
    statusMessage: string;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    isPlayerListOpen: boolean;
    onTogglePlayerList: () => void;
}

import { useAppState, useAppDispatch } from '../AppContext';

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { players } = useAppState();
    const dispatch = useAppDispatch();

    const {
        selectedPlayerId, selectedGroupId,
        onSelectPlayer, onSelectGroup, onSave, onLoad, onOpenUnitManager, onOpenAttendance,
        hasUnsavedChanges, statusMessage, setConfirmModal, isPlayerListOpen,
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
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={onSave} className="relative bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        {hasUnsavedChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></span>}
                        <Save size={16} />
                        <span>Save</span>
                    </button>
                    <button onClick={onLoad} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        <FolderOpen size={16} />
                        <span>Load</span>
                    </button>
                    <button onClick={onOpenUnitManager} className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        <Settings size={16} />
                        <span>Units</span>
                    </button>
                    <button onClick={onOpenAttendance} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        <Users size={16} />
                        <span>Attendance</span>
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
                    onClick={onTogglePlayerList}
                    className="w-full flex justify-between items-center py-2"
                >
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Users size={20} /> Players ({players.filter(p => !p.notInHouse).length})</h2>
                    {isPlayerListOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                {isPlayerListOpen && (
                    <PlayerList
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={onSelectPlayer}
                        setConfirmModal={setConfirmModal}
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
                selectedGroupId={selectedGroupId}
                onSelectGroup={onSelectGroup}
                setConfirmModal={setConfirmModal}
                onCopy={handleCopy}
            />
        </aside>
    );
};