import React, { useState, useCallback, useEffect } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Settings, UserPlus, Users, ChevronUp, ChevronDown, Shield, LogOut } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { UnitSearch } from './UnitSearch';
import { PlayerList } from './PlayerList';
import { GroupsList } from './GroupsList';
import { cn } from '../utils';
import { usePermission } from '../hooks/usePermission';
import { auditService } from '../services/auditService';

interface SidebarProps {
    // ... (rest of props)
    selectedPlayerId: string | null;
    selectedGroupId: string | null;
    onSelectPlayer: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onSave: () => void;
    onLoad: () => void;
    onOpenUnitManager: () => void;
    onOpenAttendance: () => void;
    onOpenTWStatistics: () => void;
    onOpenProfileMatcher: () => void;
    onOpenAdminPanel: () => void;
    pendingApprovalsCount: number;
    hasUnsavedChanges: boolean;
    statusMessage: string;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    isPlayerListOpen: boolean;
    onTogglePlayerList: () => void;
    onLogout: () => void;
}

import { useAppSelector, useAppDispatch } from '../state/store';
import { addPlayer } from '../state/slices/playerSlice';
import { toggleHelpMode } from '../state/slices/uiSlice';
import { HelpManualModal } from './HelpManualModal';

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const players = useAppSelector(state => state.player.players);
    const showHelpMode = useAppSelector(state => state.ui.showHelpMode);
    const isSyncing = useAppSelector(state => state.ui.isSyncing);
    const dispatch = useAppDispatch();
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [suspiciousCount, setSuspiciousCount] = useState(0);

    const { 
        canViewPlayerList, 
        canViewGroups, 
        canViewAttendance, 
        canViewStats,
        canViewAdminPanel,
        canViewHelp,
        canAddPlayers,
        isOfficerPlus
    } = usePermission();

    const {
        selectedPlayerId, selectedGroupId,
        onSelectPlayer, onSelectGroup, onOpenAttendance, onOpenTWStatistics, onOpenProfileMatcher, onOpenAdminPanel,
        pendingApprovalsCount, statusMessage, setConfirmModal, isPlayerListOpen,
        onTogglePlayerList, onLogout
    } = props;

    const [newPlayerName, setNewPlayerName] = useState("");
    const [notInHouse, setNotInHouse] = useState(false);
    const [unitSearchTerm, setUnitSearchTerm] = useState('');

    useEffect(() => {
        if (!canViewAdminPanel) return;
        const check = async () => {
            const lastChecked = localStorage.getItem('last_checked_audit_logs') || new Date(0).toISOString();
            const count = await auditService.checkNewSuspiciousActivity(lastChecked);
            setSuspiciousCount(count);
        };
        check();
        const interval = setInterval(check, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [canViewAdminPanel]);

    const handleAddPlayer = useCallback(() => {
        if (!newPlayerName.trim()) return;
        dispatch(addPlayer({ name: newPlayerName }));
        setNewPlayerName("");
    }, [newPlayerName, dispatch]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 border-r border-gray-700 p-4 flex flex-col overflow-y-auto h-full">
            <header className="mb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-blue-400">Unit Manager</h1>
                    {isSyncing ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20" title="Syncing with database...">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Syncing</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/5 border border-green-500/10" title="Database connected and synced">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500/50"></span>
                            <span className="text-[10px] font-bold text-green-500/40 uppercase tracking-tighter">Synced</span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-400">Manage players, units, and groups.</p>
                <div className="flex flex-col gap-1.5 mt-3">

                    {canViewAttendance && (
                        <Button variant="primary" className="bg-purple-600 hover:bg-purple-700" onClick={onOpenAttendance}>
                            <Users size={16} />
                            <span>Attendance</span>
                        </Button>
                    )}

                    {canViewStats && (
                        <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700" onClick={onOpenTWStatistics}>
                            <Users size={16} />
                            <span>TW Statistics</span>
                        </Button>
                    )}

                    {canViewAdminPanel && (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 flex">
                                <Button
                                    variant="ghost"
                                    className="flex-1 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10"
                                    onClick={onOpenAdminPanel}
                                >
                                    <Shield size={16} />
                                    <span>Admin Panel</span>
                                </Button>
                                {suspiciousCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>

                            {/* Pending Approvals badge button */}
                            <button
                                onClick={onOpenProfileMatcher}
                                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                title="Pending Approvals"
                            >
                                <UserPlus size={15} />
                                <span>Approvals</span>
                                {pendingApprovalsCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                        {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {canViewHelp && (
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-700/50">
                        <button
                            onClick={() => dispatch(toggleHelpMode())}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border",
                                showHelpMode
                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                    : "bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-300"
                            )}
                            title="Toggle Detailed Help Mode (ⓘ icons)"
                        >
                            <Shield size={14} className={cn(showHelpMode && "animate-pulse")} />
                            <span>HELP MODE: {showHelpMode ? 'ON' : 'OFF'}</span>
                        </button>

                        <button
                            onClick={() => setIsManualOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-800/80 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
                            title="Open Information Manual"
                        >
                            <Settings size={14} />
                            <span>MANUAL</span>
                        </button>
                    </div>
                )}

                <div className="h-5 mt-2 text-center">
                    {statusMessage && <p className={cn("text-sm", statusMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400')}>{statusMessage}</p>}
                </div>
            </header>

            <HelpManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

            {canAddPlayers && (
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                    <Input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()} placeholder="New player name..." className="flex-grow px-2 py-1.5 text-sm" aria-label="New Player Name Input" />
                    <Button variant="primary" size="icon" className="p-1.5" onClick={handleAddPlayer} disabled={!newPlayerName.trim()} title="Add Player" aria-label="Add Player"><UserPlus size={18} /></Button>
                </div>
            )}

            {canViewPlayerList && (
                <div className="border-t border-gray-700 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onTogglePlayerList}
                        className="w-full justify-between py-2 h-auto hover:bg-gray-800"
                        title={isPlayerListOpen ? "Collapse Players List" : "Expand Players List"}
                        aria-label={isPlayerListOpen ? "Collapse Players List" : "Expand Players List"}
                    >
                        <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2"><Users size={18} /> Players ({players.filter(p => !p.notInHouse).length})</h2>
                        {isPlayerListOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
            )}

            {isOfficerPlus && (
                <UnitSearch
                    players={players}
                    onSelectPlayer={onSelectPlayer}
                    searchTerm={unitSearchTerm}
                    setSearchTerm={setUnitSearchTerm}
                />
            )}

            {canViewGroups && (
                <GroupsList
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={onSelectGroup}
                    setConfirmModal={setConfirmModal}
                    onCopy={handleCopy}
                />
            )}

            <div className="mt-8 pt-4 border-t border-gray-700/50 flex justify-center">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-500 hover:text-gray-300 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 transition-all active:scale-[0.98]"
                    title="Log Out"
                >
                    <LogOut size={14} />
                    <span>LOG OUT</span>
                </button>
            </div>
        </aside>
    );
};