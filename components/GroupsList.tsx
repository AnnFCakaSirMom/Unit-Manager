import React, { useState, useCallback } from 'react';
import type { ConfirmModalInfo } from '../types';
import { Save, Shield, Clipboard, Plus, X, Pencil, Trash2 } from './icons';
import { Button } from './Button';

export interface GroupsListProps {
    selectedGroupId: string | null;
    onSelectGroup: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    onCopy: (text: string) => void;
}

import { useAppState, useAppDispatch } from '../AppContext';

export const GroupsList = React.memo(({
    selectedGroupId, onSelectGroup, setConfirmModal, onCopy
}: GroupsListProps) => {
    const { groups, players } = useAppState();
    const dispatch = useAppDispatch();

    const [editingGroup, setEditingGroup] = useState<{ id: string | null; name: string }>({ id: null, name: '' });

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


    return (
        <div className="flex-grow flex flex-col mt-4">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Shield size={20} /> Groups ({groups.length})</h2>
                <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleCopyAllGroups} title="Copy All Groups" aria-label="Copy All Groups">
                        <Clipboard size={16} /> Copy
                    </Button>
                    <Button variant="success" size="sm" onClick={() => dispatch({ type: 'ADD_GROUP' })} aria-label="Create New Group" title="Create New Group">
                        <Plus size={16} /> Create
                    </Button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {groups.length > 0 ? (
                    <ul className="space-y-2">
                        {groups.map((group) => (
                            <li key={group.id} className={`p-3 rounded-md transition-all duration-200 flex justify-between items-center group ${selectedGroupId === group.id ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
                                {editingGroup.id === group.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input type="text" value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleSaveGroupName()} className="flex-grow bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white" autoFocus aria-label="Group Name Input" />
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
