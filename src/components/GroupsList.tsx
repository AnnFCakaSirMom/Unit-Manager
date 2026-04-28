import React, { useState, useCallback } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Save, Shield, Clipboard, Plus, X, Pencil, Trash2 } from './icons';
import { Button } from './Button';
import { Input } from './Input';

export interface GroupsListProps {
    selectedGroupId: string | null;
    onSelectGroup: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    onCopy: (text: string) => void;
}

import { useAppSelector, useAppDispatch } from '../state/store';
import { updateGroupName, deleteGroup, addGroup } from '../state/slices/groupSlice';
import { HelpIcon } from './HelpIcon';
import { HELP_CONTENT } from '../helpContent';

export const GroupsList = React.memo(({
    selectedGroupId, onSelectGroup, setConfirmModal, onCopy
}: GroupsListProps) => {
    const groups = useAppSelector(state => state.group.groups);
    const players = useAppSelector(state => state.player.players);
    const dispatch = useAppDispatch();

    const [editingGroup, setEditingGroup] = useState<{ id: string | null; name: string }>({ id: null, name: '' });

    const handleSaveGroupName = useCallback(() => {
        if (!editingGroup.id || !editingGroup.name.trim()) return;
        dispatch(updateGroupName({ groupId: editingGroup.id, name: editingGroup.name }));
        setEditingGroup({ id: null, name: '' });
    }, [editingGroup, dispatch]);

    const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
        setConfirmModal({
            isOpen: true, title: 'Delete Group', message: `Are you sure you want to delete group "${groupName}"?`,
            onConfirm: () => {
                dispatch(deleteGroup({ groupId }));
                if (selectedGroupId === groupId) onSelectGroup(null);
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    }, [dispatch, selectedGroupId, onSelectGroup, setConfirmModal]);

    const handleCopyAllGroups = useCallback(() => {
        const combatGroups = groups.filter(g => {
            const isMaybe = g.name.toUpperCase().includes('MAYBE');
            const isEmpty = g.members.length === 0;
            return !isMaybe && !isEmpty;
        });

        if (combatGroups.length === 0) {
            onCopy("No active combat groups to copy.");
            return;
        }

        const textToCopy = combatGroups.map(group => {
            let groupHeaderText = `--- ${group.name} ---\n`;

            const leader = group.members.find(m => m.playerId === group.leaderId);
            const others = group.members.filter(m => m.playerId !== group.leaderId);
            const sortedMembers = leader ? [leader, ...others] : others;

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


    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const handleAddGroup = (isMaybe: boolean) => {
        dispatch(addGroup({ isMaybe }));
        setShowCreateMenu(false);
    };

    return (
        <div className="flex flex-col mt-3">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-semibold text-gray-300 flex items-center gap-1">
                    <Shield size={18} /> Groups ({groups.length})
                    <HelpIcon helpKey="groups" text={HELP_CONTENT.group_management} />
                </h2>
                <div className="flex items-center gap-2 relative">
                    <Button variant="primary" size="sm" onClick={handleCopyAllGroups} title="Copy All Groups" aria-label="Copy All Groups">
                        <Clipboard size={16} /> Copy
                    </Button>
                    <div className="relative">
                        <Button 
                            variant="success" 
                            size="sm" 
                            onClick={() => setShowCreateMenu(!showCreateMenu)} 
                            aria-label="Create New Group" 
                            title="Create New Group"
                        >
                            <Plus size={16} /> Create
                        </Button>
                        
                        {showCreateMenu && (
                            <div className="absolute top-full right-0 mt-1 w-44 bg-gray-800 border border-gray-600 rounded-md shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-100">
                                <button 
                                    onClick={() => handleAddGroup(false)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700/50"
                                >
                                    <Shield size={14} className="text-blue-400" />
                                    Standard Group
                                </button>
                                <button 
                                    onClick={() => handleAddGroup(true)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                >
                                    <Shield size={14} className="text-purple-400" />
                                    Maybe Group
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="overflow-y-auto max-h-80 pr-2 -mr-2">
                {groups.length > 0 ? (
                    <ul className="space-y-1">
                        {[...groups].sort((a, b) => {
                            const aMaybe = a.name.toUpperCase().includes('MAYBE');
                            const bMaybe = b.name.toUpperCase().includes('MAYBE');
                            if (aMaybe && !bMaybe) return 1;
                            if (!aMaybe && bMaybe) return -1;
                            return 0;
                        }).map((group) => (
                            <li key={group.id} className={`p-2 rounded-md transition-all duration-200 flex justify-between items-center group ${selectedGroupId === group.id ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
                                {editingGroup.id === group.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <Input type="text" value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSaveGroupName()} className="flex-grow bg-gray-600 border-gray-500 px-2 py-1" autoFocus aria-label="Group Name Input" />
                                        <Button variant="success" size="icon" onClick={handleSaveGroupName} title="Save Group Name" aria-label="Save Group Name"><Save size={18} /></Button>
                                        <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => setEditingGroup({ id: null, name: '' })} title="Cancel Editing" aria-label="Cancel Editing"><X size={18} /></Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium cursor-pointer flex-grow truncate" onClick={() => onSelectGroup(group.id)} title={group.name} aria-label={`Select group ${group.name}`}>
                                            {group.name}
                                        </span>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingGroup({ id: group.id, name: group.name })} className="text-blue-400" title="Edit Group Name" aria-label="Edit Group Name"><Pencil size={18} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id, group.name)} className="text-red-500" title="Delete Group" aria-label="Delete Group"><Trash2 size={18} /></Button>
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
