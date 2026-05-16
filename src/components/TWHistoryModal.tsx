import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../state/store';
import {
    copyGroupToClipboard,
    copyPlayerToClipboard,
} from '../state/slices/historySlice';
import { Button } from './Button';
import { History, X, Copy, Shield, ChevronDown, ChevronRight, RefreshCcw, AlertTriangle, Info } from './icons';
import type { TWHistorySnapshot, Group, GroupMember } from '../types';
import { cn } from '../utils';
import { HelpIcon } from './HelpIcon';
import { HELP_CONTENT } from '../helpContent';

interface TWHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmRestore: (snapshot: TWHistorySnapshot) => void;
}

interface GroupDetailProps {
    group: Group;
    players: ReturnType<typeof useAppSelector<any>>;
    currentPlayers: ReturnType<typeof useAppSelector<any>>;
    onCopyGroup: (group: Group) => void;
    onCopyPlayer: (member: GroupMember, playerName: string) => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ group, players, currentPlayers, onCopyGroup, onCopyPlayer }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
            {/* Group header */}
            <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700/40 transition-colors"
                onClick={() => setIsExpanded(prev => !prev)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    <Shield size={14} className="text-blue-400" />
                    <span className="text-sm font-semibold text-gray-200">{group.name}</span>
                    <span className="text-xs text-gray-500">({group.members.length} players)</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 h-6 text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); onCopyGroup(group); }}
                    title="Copy this entire group and its units to clipboard"
                >
                    <Copy size={12} /> Copy group
                </Button>
            </div>

            {/* Member list */}
            {isExpanded && (
                <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                    {group.members.length === 0 && (
                        <p className="text-xs text-gray-500 italic px-4 py-2">Empty group</p>
                    )}
                    {group.members.map(member => {
                        // Look up name in the snapshot's player data first, then current players
                        const historicPlayer = players?.find((p: any) => p.id === member.playerId);
                        const currentPlayer = currentPlayers?.find((p: any) => p.id === member.playerId);
                        const playerName = historicPlayer?.name || currentPlayer?.name || member.playerId;

                        return (
                            <div
                                key={member.playerId}
                                className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-700/20 transition-colors"
                            >
                                <div className="flex flex-col gap-0.5 flex-grow min-w-0">
                                    <span className="text-sm text-gray-200 truncate">{playerName}</span>
                                    {member.selectedUnits.length > 0 && (
                                        <UnitChips member={member} currentPlayer={currentPlayer} />
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-teal-400 hover:text-teal-300 hover:bg-teal-900/20 h-6 text-xs gap-1 shrink-0 ml-2"
                                    onClick={() => onCopyPlayer(member, playerName)}
                                    title="Copy this player and their selected units to clipboard"
                                >
                                    <Copy size={12} /> Copy
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface UnitChipsProps {
    member: GroupMember;
    currentPlayer: any;
}

const UnitChips: React.FC<UnitChipsProps> = ({ member, currentPlayer }) => {
    const currentUnits = new Set<string>([
        ...(currentPlayer?.units || []),
        ...(currentPlayer?.preparedUnits || []),
        ...(currentPlayer?.masteryUnits || []),
        ...(currentPlayer?.favoriteUnits || []),
    ]);

    return (
        <div className="flex flex-wrap gap-1">
            {member.selectedUnits.map(u => {
                const isGone = currentPlayer && !currentUnits.has(u.unitName);
                return (
                    <span
                        key={u.unitName}
                        className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5",
                            isGone
                                ? "bg-red-900/40 text-red-400 border border-red-700/50"
                                : "bg-gray-700 text-gray-300"
                        )}
                        title={isGone ? "This unit is no longer in the player's profile" : undefined}
                    >
                        {isGone && <AlertTriangle size={9} className="text-red-400" />}
                        {u.unitName}
                    </span>
                );
            })}
        </div>
    );
};

export const TWHistoryModal: React.FC<TWHistoryModalProps> = ({ isOpen, onClose, onConfirmRestore }) => {
    const dispatch = useAppDispatch();
    const snapshots = useAppSelector(state => state.history.snapshots);
    const currentPlayers = useAppSelector(state => state.player.players);
    const clipboard = useAppSelector(state => state.history.clipboard);

    const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCopyGroup = (group: Group) => {
        dispatch(copyGroupToClipboard(group));
        onClose();
    };

    const handleCopyPlayer = (member: GroupMember, _playerName: string) => {
        dispatch(copyPlayerToClipboard(member));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <History size={20} className="text-indigo-400" />
                        TW History
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8">
                        <X size={18} />
                    </Button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto min-h-0 flex-grow p-4 flex flex-col gap-3 custom-scrollbar">
                    {/* Info Box */}
                    {snapshots.length > 0 && (
                        <div className="bg-blue-950/20 border border-blue-800/50 rounded-lg p-3 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold text-blue-300">How to Copy & Paste</p>
                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                    Click <span className="text-indigo-400 font-medium">Copy group</span> or <span className="text-teal-400 font-medium">Copy</span> on a player. 
                                    Then close this window and use the <span className="text-indigo-400 font-medium">Paste</span> buttons that appear in your current planning view.
                                </p>
                            </div>
                        </div>
                    )}

                    {snapshots.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <History size={40} className="mb-3 opacity-30" />
                            <p className="text-sm">No history saved yet.</p>
                            <p className="text-xs mt-1 text-gray-600">History is created automatically when you clear the list.</p>
                        </div>
                    )}

                    {snapshots.map((snap, index) => {
                        const isExpanded = expandedSnapshotId === snap.id;
                        const totalPlayers = snap.snapshot.groups.reduce((acc, g) => acc + g.members.length, 0);

                        return (
                            <div
                                key={snap.id}
                                className={cn(
                                    "border rounded-lg overflow-hidden transition-colors shrink-0",
                                    index === 0 ? "border-indigo-600/50 bg-indigo-950/20" : "border-gray-700 bg-gray-800/30"
                                )}
                            >
                                {/* Snapshot header row */}
                                <div className="flex items-center justify-between p-3 bg-gray-900/40">
                                    <div className="flex items-center gap-3">
                                        {index === 0 && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded">
                                                Latest
                                            </span>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-gray-200">{snap.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {snap.snapshot.groups.length} groups · {totalPlayers} players
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-gray-200 text-xs gap-1 h-7"
                                            onClick={() => setExpandedSnapshotId(isExpanded ? null : snap.id)}
                                        >
                                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                            {isExpanded ? 'Hide' : 'View Details'}
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="gap-1.5 h-7 text-xs bg-indigo-700 hover:bg-indigo-600"
                                            onClick={() => onConfirmRestore(snap)}
                                            title="Replace your current planning with this entire snapshot"
                                        >
                                            <RefreshCcw size={12} /> Restore All
                                        </Button>
                                        <HelpIcon 
                                            helpKey="tw-history-restore" 
                                            text={{ 
                                                title: HELP_CONTENT.tw_history.title, 
                                                content: HELP_CONTENT.tw_history.restore 
                                            }} 
                                        />
                                    </div>
                                </div>

                                {/* Expanded detail view */}
                                {isExpanded && (
                                    <div className="border-t border-gray-700/50 p-3 flex flex-col gap-2 bg-gray-900/20">
                                        <p className="text-xs text-gray-500 italic mb-1">
                                            Click on "Copy group" or "Copy" next to a player to then paste into your current planning.
                                        </p>
                                        {snap.snapshot.groups.map(group => (
                                            <GroupDetail
                                                key={group.id}
                                                group={group}
                                                players={snap.snapshot.twAttendance}
                                                currentPlayers={currentPlayers}
                                                onCopyGroup={handleCopyGroup}
                                                onCopyPlayer={handleCopyPlayer}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 shrink-0 text-xs text-gray-500 flex items-center gap-2">
                    {clipboard.type && (
                        <span className="text-teal-400 font-medium flex items-center gap-1">
                            <Copy size={12} />
                            {clipboard.type === 'group' ? 'Group copied!' : 'Player copied!'} — Close and paste into your planning.
                        </span>
                    )}
                    {!clipboard.type && (
                        <span>A maximum of 10 snapshots are saved. The oldest is automatically deleted upon a new save.</span>
                    )}
                </div>
            </div>
        </div>
    );
};
