import React from 'react';
import type { Group, Player, TWHistoryClipboard } from '../types';
import { Shield, Trash2, Plus, X, Copy } from './icons';
import { Button } from './Button';
import { cn } from '../utils';

const GripIcon = ({ className = "", size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
);

export interface AttendanceGroupGridProps {
    groups: Group[];
    players: Player[];
    draggedPlayer: string | null;
    dragOverPlayer: string | null;
    setDragOverPlayer: (id: string | null) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDropOnGroup: (e: React.DragEvent, targetGroupId: string) => void;
    handleDragStart: (e: React.DragEvent, playerId: string, sourceGroupId?: string | null) => void;
    handleDragEnd: () => void;
    handleDropOnMember: (e: React.DragEvent, targetGroupId: string, targetPlayerId: string) => void;
    handleAssignGroup: (playerId: string, targetGroupId: string) => void;
    handleAddGroup: (isMaybe: boolean) => void;
    clipboard?: TWHistoryClipboard;
    onPasteIntoGroup?: (targetGroupId: string) => void;
    onPasteAsNewGroup?: () => void;
}

export const AttendanceGroupGrid: React.FC<AttendanceGroupGridProps> = ({
    groups,
    players,
    draggedPlayer,
    dragOverPlayer,
    setDragOverPlayer,
    handleDragOver,
    handleDropOnGroup,
    handleDragStart,
    handleDragEnd,
    handleDropOnMember,
    handleAssignGroup,
    handleAddGroup,
    clipboard,
    onPasteIntoGroup,
    onPasteAsNewGroup,
}) => {
    const [showCreateMenu, setShowCreateMenu] = React.useState(false);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[...groups].sort((a, b) => {
                const aMaybe = a.name.toUpperCase().includes('MAYBE');
                const bMaybe = b.name.toUpperCase().includes('MAYBE');
                if (aMaybe && !bMaybe) return 1;
                if (!aMaybe && bMaybe) return -1;
                return 0;
            }).map(group => {
                const isFull = group.members.length >= 5;

                return (
                    <div
                        key={group.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnGroup(e, group.id)}
                        className={cn(
                            "bg-gray-800/80 border-2 rounded-lg flex flex-col transition-colors",
                            draggedPlayer ? (isFull ? 'border-red-500/30' : 'border-blue-500/50 border-dashed bg-gray-800') : 'border-gray-700'
                        )}
                    >
                        <div className="bg-gray-900/50 p-1.5 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
                            <h4 className="font-bold text-gray-200 flex items-center gap-1.5 text-sm">
                                <Shield size={14} className="text-blue-400" />
                                {group.name}
                            </h4>
                            <div className="flex items-center gap-1">
                                {clipboard?.type && onPasteIntoGroup && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-teal-400 hover:text-teal-300 hover:bg-teal-900/20 h-6 text-[10px] gap-0.5 px-1.5"
                                        onClick={() => onPasteIntoGroup(group.id)}
                                        title={clipboard.type === 'group' ? 'Paste group here' : 'Paste player here'}
                                    >
                                        <Copy size={11} />
                                        {clipboard.type === 'group' ? 'Paste group' : 'Paste player'}
                                    </Button>
                                )}
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                    isFull ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'
                                )}>
                                    {group.members.length} / 5
                                </span>
                            </div>
                        </div>
                        <div className="p-1.5 flex-grow min-h-[80px] flex flex-col gap-1">
                            {group.members.map(member => {
                                const player = players.find(p => p.id === member.playerId);
                                if (!player) return null;

                                return (
                                    <div
                                        key={member.playerId}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, member.playerId, group.id)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => {
                                            handleDragOver(e);
                                            setDragOverPlayer(member.playerId);
                                        }}
                                        onDragLeave={() => setDragOverPlayer(null)}
                                        onDrop={(e) => handleDropOnMember(e, group.id, member.playerId)}
                                        className={cn(
                                            "p-1 rounded flex justify-between items-center cursor-grab active:cursor-grabbing border transition-colors",
                                            dragOverPlayer === member.playerId
                                                ? 'border-blue-500 bg-blue-500/20'
                                                : 'border-transparent bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600'
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <GripIcon size={14} className="text-gray-500" />
                                            <span className="text-sm text-gray-200 truncate">{player.name}</span>
                                        </div>
                                        <Button
                                            onClick={() => handleAssignGroup(player.id, "REMOVE")}
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-400 hover:text-red-400 h-6 w-6 p-0.5 rounded"
                                            title="Remove from group"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                );
                            })}
                            {group.members.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-500 text-xs italic opacity-50">
                                    Drag players here...
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {!showCreateMenu ? (
                <div className="bg-gray-800/30 border-2 border-gray-700 border-dashed rounded-lg flex flex-col items-center justify-center p-4 min-h-[130px] gap-2">
                    {/* Paste as new group button — only shown when a group is in clipboard */}
                    {clipboard?.type === 'group' && onPasteAsNewGroup && (
                        <Button
                            variant="ghost"
                            className="text-teal-400 hover:text-teal-300 hover:bg-teal-900/20 border border-teal-700/40 w-full justify-center gap-2 py-2 text-sm"
                            onClick={onPasteAsNewGroup}
                        >
                            <Copy size={15} /> Paste as new group
                        </Button>
                    )}
                    <div
                        className="hover:bg-gray-800/50 transition-colors cursor-pointer group flex flex-col items-center gap-2 w-full py-2 rounded-md"
                        onClick={() => setShowCreateMenu(true)}
                    >
                        <div className="text-gray-400 flex flex-col items-center gap-2 group-hover:text-blue-400 transition-colors">
                            <div className="bg-gray-700 p-2 rounded-full group-hover:bg-blue-900/30 transition-colors"><Plus size={20} /></div>
                            <span className="font-medium text-xs">Create New Group</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800/80 border-2 border-blue-500/50 rounded-lg flex flex-col p-4 min-h-[130px] gap-3 animate-in fade-in zoom-in duration-150">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Group Type</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-gray-500" onClick={() => setShowCreateMenu(false)}>
                            <X size={14} />
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button 
                            variant="primary" 
                            className="w-full justify-start gap-3 py-2.5 h-auto text-sm"
                            onClick={() => { handleAddGroup(false); setShowCreateMenu(false); }}
                        >
                            <Shield size={16} className="text-blue-400" />
                            Standard Group
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="w-full justify-start gap-3 py-2.5 h-auto text-sm bg-gray-700 hover:bg-gray-600 border-gray-600"
                            onClick={() => { handleAddGroup(true); setShowCreateMenu(false); }}
                        >
                            <Shield size={16} className="text-purple-400" />
                            Maybe Group
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
