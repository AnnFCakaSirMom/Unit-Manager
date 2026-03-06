import React, { useState, useCallback } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Save, FolderOpen, Settings, UserPlus, Users, ChevronUp, ChevronDown } from './icons';
import { Button } from './Button';
import { UnitSearch } from './UnitSearch';
import { PlayerList } from './PlayerList';
import { GroupsList } from './GroupsList';
import { cn } from '../utils';

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
                    <Button variant="primary" onClick={onSave} className="relative">
                        {hasUnsavedChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></span>}
                        <Save size={16} />
                        <span>Save</span>
                    </Button>
                    <Button variant="success" onClick={onLoad}>
                        <FolderOpen size={16} />
                        <span>Load</span>
                    </Button>
                    <Button variant="secondary" onClick={onOpenUnitManager}>
                        <Settings size={16} />
                        <span>Units</span>
                    </Button>
                    <Button variant="primary" className="bg-purple-600 hover:bg-purple-700" onClick={onOpenAttendance}>
                        <Users size={16} />
                        <span>Attendance</span>
                    </Button>
                </div>
                <div className="h-5 mt-2 text-center">
                    {statusMessage && <p className={cn("text-sm", statusMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400')}>{statusMessage}</p>}
                </div>
            </header>

            <div className="flex items-center gap-2 mb-4">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()} placeholder="New player name..." className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="New Player Name Input" />
                <Button variant="primary" size="icon" className="p-2" onClick={handleAddPlayer} disabled={!newPlayerName.trim()} title="Add Player" aria-label="Add Player"><UserPlus size={20} /></Button>
            </div>

            <div className="border-t border-gray-700 pt-2">
                <Button
                    variant="ghost"
                    onClick={onTogglePlayerList}
                    className="w-full justify-between py-2 h-auto hover:bg-gray-800"
                    title={isPlayerListOpen ? "Collapse Players List" : "Expand Players List"}
                    aria-label={isPlayerListOpen ? "Collapse Players List" : "Expand Players List"}
                >
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Users size={20} /> Players ({players.filter(p => !p.notInHouse).length})</h2>
                    {isPlayerListOpen ? <ChevronUp /> : <ChevronDown />}
                </Button>
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