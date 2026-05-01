import React, { useState, useCallback, useEffect } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Settings, UserPlus, Users, ChevronUp, ChevronDown, Shield, Book } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { UnitSearch } from './UnitSearch';
import { PlayerList } from './PlayerList';
import { GroupsList } from './GroupsList';
import { cn } from '../utils';
import { usePermission } from '../hooks/usePermission';
import { auditService } from '../services/auditService';

interface SidebarProps {
    selectedPlayerId: string | null;
    selectedGroupId: string | null;
    onSelectPlayer: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onOpenAttendance: () => void;
    onOpenTWStatistics: () => void;
    onOpenProfileMatcher: () => void;
    onOpenAdminPanel: () => void;
    onOpenManual: () => void;
    pendingApprovalsCount: number;
    statusMessage: string;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    isPlayerListOpen: boolean;
    onTogglePlayerList: () => void;
}

import { useAppSelector, useAppDispatch } from '../state/store';
import { addPlayer } from '../state/slices/playerSlice';
import { toggleHelpMode } from '../state/slices/uiSlice';

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const players = useAppSelector(state => state.player.players);
    const showHelpMode = useAppSelector(state => state.ui.showHelpMode);
    const dispatch = useAppDispatch();
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
        onSelectPlayer, onSelectGroup, onOpenAttendance, onOpenTWStatistics, onOpenProfileMatcher, onOpenAdminPanel, onOpenManual,
        pendingApprovalsCount, statusMessage, setConfirmModal, isPlayerListOpen,
        onTogglePlayerList
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
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-900/40 backdrop-blur-xl border-r border-white/5 p-4 flex flex-col overflow-y-auto h-full shadow-2xl relative z-10">
            <header className="mb-2 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400 leading-tight">Manage players, units, and groups.</p>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    {/* Row 1: Attendance & Stats */}
                    <div className="flex items-center gap-2">
                        {canViewAttendance && (
                            <Button
                                variant="ghost"
                                className="flex-1 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 text-[11px]"
                                onClick={onOpenAttendance}
                            >
                                <Users size={14} />
                                <span>Attendance</span>
                            </Button>
                        )}

                        {canViewStats && (
                            <Button
                                variant="ghost"
                                className="flex-1 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 text-[11px]"
                                onClick={onOpenTWStatistics}
                            >
                                <Users size={14} />
                                <span>TW Stats</span>
                            </Button>
                        )}
                    </div>

                    {/* Row 2: Admin & Approvals */}
                    {canViewAdminPanel && (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 flex">
                                <Button
                                    variant="ghost"
                                    className="flex-1 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 text-[11px]"
                                    onClick={onOpenAdminPanel}
                                >
                                    <Shield size={14} />
                                    <span>Admin Panel</span>
                                </Button>
                                {suspiciousCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>

                            <div className="relative flex-1 flex">
                                <Button
                                    variant="ghost"
                                    className="flex-1 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 text-[11px]"
                                    onClick={onOpenProfileMatcher}
                                    title="Pending Approvals"
                                >
                                    <UserPlus size={14} />
                                    <span>Approvals</span>
                                </Button>
                                {pendingApprovalsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                                        {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
                                    </span>
                                )}
                            </div>
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
                            onClick={props.onOpenManual}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-black/40 border border-amber-500/20 text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100 transition-all"
                            title="Open Information Manual"
                        >
                            <Book size={14} className="text-amber-500" />
                            <span>MANUAL</span>
                        </button>
                    </div>
                )}

                <div className="h-5 mt-2 text-center">
                    {statusMessage && <p className={cn("text-sm", statusMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400')}>{statusMessage}</p>}
                </div>
            </header>



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

        </aside>
    );
};