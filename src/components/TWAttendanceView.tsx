import React, { useState } from 'react';
import { ImportIcon, Trash2, CheckSquare, Users, Shield, LoadingSpinnerIcon, History, Save } from './icons';
import { ImportRaidHelperModal } from './ImportRaidHelperModal';
import { Button } from './Button';
import { useAppSelector, useAppDispatch } from '../state/store';
import { clearTWAttendance, importTWAttendance } from '../state/slices/twSlice';
import { addGroup } from '../state/slices/groupSlice';
import { addPlayer } from '../state/slices/playerSlice';
import { useGroupDragAndDrop } from '../hooks/useGroupDragAndDrop';
import { AttendancePlayerList } from './AttendancePlayerList';
import { AttendanceGroupGrid } from './AttendanceGroupGrid';
import { ConfirmModalInfo } from '../types';
import { supabase } from '../services/supabase';
import { clearTWImport } from '../services/twImportService';
import { HelpIcon } from './HelpIcon';
import { HELP_CONTENT } from '../helpContent';
import { TWHistoryModal } from './TWHistoryModal';
import {
    saveSnapshot,
    loadHistory,
    applyFullHistory,
    pasteGroupFromClipboard,
    pastePlayerFromClipboard,
} from '../state/slices/historySlice';
import type { TWHistorySnapshot } from '../types';

interface TWAttendanceViewProps {
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    setStatusMessage: (message: string) => void;
}

export const TWAttendanceView: React.FC<TWAttendanceViewProps> = ({ onSelectPlayer, setConfirmModal, setStatusMessage }) => {
    const attendance = useAppSelector(state => state.tw.twAttendance);
    const players = useAppSelector(state => state.player.players);
    const groups = useAppSelector(state => state.group.groups);
    const clipboard = useAppSelector(state => state.history.clipboard);
    const isSavingSnapshot = useAppSelector(state => state.history.isSaving);
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const {
        draggedPlayer,
        dragOverPlayer,
        setDragOverPlayer,
        getPlayerGroup,
        handleAssignGroup,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDropOnGroup,
        handleDropOnList,
        handleDropOnMember
    } = useGroupDragAndDrop(groups, dispatch);

    const handleCreatePlayer = (discordName: string) => {
        dispatch(addPlayer({ name: discordName }));
        alert(`Player "${discordName}" added to Unit Manager!\nPlease import the Raid Helper list again to link them automatically.`);
    };

    const handleAddGroup = (isMaybe: boolean = false) => {
        dispatch(addGroup({ isMaybe }));
    };

    const handleClearAttendance = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear TW Attendance & Groups',
            message: 'This will permanently delete all attendance data AND empty all groups in the cloud database. This action cannot be undone. Are you sure?',
            onConfirm: async () => {
                setIsClearing(true);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));

                try {
                    // 1. Auto-save snapshot before clearing (only if there is something to save)
                    const hasMembers = groups.some(g => g.members.length > 0);
                    if (hasMembers) {
                        try {
                            await dispatch(saveSnapshot()).unwrap();
                        } catch (saveErr) {
                            console.error('Auto-save failed before wipe:', saveErr);
                            // We continue anyway, or should we stop? Let's continue but log it.
                        }
                    }

                    // 2. Wipe group_members first
                    const { error: membersError } = await supabase
                        .from('group_members')
                        .delete()
                        .not('profile_id', 'is', null); // Alternative "delete all" filter
                    
                    if (membersError) {
                        console.error('Members wipe error:', membersError);
                        throw new Error(`Members wipe failed: ${membersError.message}`);
                    }

                    // 3. Wipe groups
                    const { error: groupsError } = await supabase
                        .from('groups')
                        .delete()
                        .not('id', 'is', null);

                    if (groupsError) {
                        console.error('Groups wipe error:', groupsError);
                        throw new Error(`Groups wipe failed: ${groupsError.message}`);
                    }

                    // 4. Wipe temporary import list
                    try {
                        await clearTWImport();
                    } catch (importErr: any) {
                        console.error('Import wipe error:', importErr);
                        // Non-critical, but good to know
                    }

                    // 5. Local clear
                    dispatch(clearTWAttendance());
                    setStatusMessage('TW data successfully cleared.');
                } catch (err: any) {
                    console.error('Failed to wipe TW data:', err);
                    const errorMsg = err instanceof Error ? err.message : (err.message || JSON.stringify(err));
                    setStatusMessage(`Error: ${errorMsg}`);
                } finally {
                    setIsClearing(false);
                }
            }
        });
    };

    const handleManualSave = async () => {
        try {
            await dispatch(saveSnapshot()).unwrap();
            setStatusMessage('Planning saved to history!');
        } catch (err: any) {
            setStatusMessage(`Error: ${err.message || 'Could not save snapshot'}`);
        }
    };

    const handleOpenHistory = () => {
        dispatch(loadHistory());
        setIsHistoryOpen(true);
    };

    const handleConfirmRestore = (snapshot: TWHistorySnapshot) => {
        setConfirmModal({
            isOpen: true,
            title: 'Restore from history',
            message: `This will replace your current planning with the history from "${snapshot.name}". Do you want to continue?`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                await dispatch(applyFullHistory({ snapshot }));
                setIsHistoryOpen(false);
                setStatusMessage(`Planning restored from ${snapshot.name}`);
            }
        });
    };

    const handleImportAttendance = (json: string) => {
        dispatch(importTWAttendance({ jsonString: json }));
    };

    const accepted = attendance.filter(p => p.status === 'Accepted');
    const maybe = attendance.filter(p => p.status === 'Maybe');

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-1">
                        TW Attendance
                        <HelpIcon helpKey="att-groups" text={HELP_CONTENT.attendance_group_mgmt} />
                    </h2>
                    <p className="text-gray-400 text-sm">Drag and drop players, or use the dropdown menus</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={handleOpenHistory}
                            variant="secondary"
                            title="View and restore from history"
                        >
                            <History size={16} /> History
                        </Button>
                        <HelpIcon helpKey="tw-history" text={HELP_CONTENT.tw_history} />
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="primary"
                    >
                        <ImportIcon size={16} /> Import Raid Helper
                    </Button>
                    {attendance.length > 0 && (
                        <>
                            <Button
                                onClick={handleManualSave}
                                variant="ghost"
                                disabled={isSavingSnapshot}
                                title="Save current planning to history"
                                className="text-green-400 hover:text-green-300 border border-green-700/40 hover:bg-green-900/20"
                            >
                                {isSavingSnapshot
                                    ? <LoadingSpinnerIcon size={16} className="animate-spin" />
                                    : <Save size={16} />}
                                <span>{isSavingSnapshot ? 'Saving...' : 'Save'}</span>
                            </Button>
                            <Button
                                onClick={handleClearAttendance}
                                variant="danger"
                                disabled={isClearing}
                            >
                                {isClearing ? <LoadingSpinnerIcon size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>{isClearing ? 'Clearing...' : 'Clear List'}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-500">
                    <h2 className="text-xl mb-2">No attendance data found.</h2>
                    <p>Click "Import Raid Helper" to paste your JSON export.</p>
                </div>
            ) : (
                <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-hidden">
                    {/* Left Panel: Players Lists */}
                    <div
                        className="w-full lg:w-1/3 flex flex-col bg-gray-900/40 rounded-lg p-4 overflow-y-auto border border-gray-800"
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnList}
                    >
                        <AttendancePlayerList
                            list={accepted}
                            title="Accepted"
                            colorClass="text-green-400 border-green-400/50"
                            icon={<CheckSquare size={18} />}
                            groups={groups}
                            getPlayerGroup={getPlayerGroup}
                            draggedPlayer={draggedPlayer}
                            handleDragStart={handleDragStart}
                            handleDragEnd={handleDragEnd}
                            handleAssignGroup={handleAssignGroup}
                            onSelectPlayer={onSelectPlayer}
                            handleCreatePlayer={handleCreatePlayer}
                        />

                        <AttendancePlayerList
                            list={maybe}
                            title="Maybe"
                            colorClass="text-blue-400 border-blue-400/50"
                            icon={<Users size={18} />}
                            groups={groups}
                            getPlayerGroup={getPlayerGroup}
                            draggedPlayer={draggedPlayer}
                            handleDragStart={handleDragStart}
                            handleDragEnd={handleDragEnd}
                            handleAssignGroup={handleAssignGroup}
                            onSelectPlayer={onSelectPlayer}
                            handleCreatePlayer={handleCreatePlayer}
                        />
                    </div>

                    {/* Right Panel: Group Editor Grid */}
                    <div className="w-full lg:w-2/3 flex flex-col bg-gray-900/40 rounded-lg p-4 overflow-y-auto border border-gray-800">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-700 pb-2">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-200">
                                <Shield size={20} className="text-indigo-400" /> Group Placements
                            </h3>
                            <span className="text-sm text-gray-400">Total Groups: {groups.length}</span>
                        </div>
                        <AttendanceGroupGrid
                            groups={groups}
                            players={players}
                            draggedPlayer={draggedPlayer}
                            dragOverPlayer={dragOverPlayer}
                            setDragOverPlayer={setDragOverPlayer}
                            handleDragOver={handleDragOver}
                            handleDropOnGroup={handleDropOnGroup}
                            handleDragStart={handleDragStart}
                            handleDragEnd={handleDragEnd}
                            handleDropOnMember={handleDropOnMember}
                            handleAssignGroup={handleAssignGroup}
                            handleAddGroup={handleAddGroup}
                            clipboard={clipboard}
                            onPasteIntoGroup={(targetGroupId) => {
                                if (clipboard.type === 'group') {
                                    dispatch(pasteGroupFromClipboard({ targetGroupId }));
                                } else if (clipboard.type === 'player') {
                                    dispatch(pastePlayerFromClipboard({ targetGroupId }));
                                }
                            }}
                            onPasteAsNewGroup={() => dispatch(pasteGroupFromClipboard({ targetGroupId: null }))}
                        />
                    </div>
                </div>
            )}

            <ImportRaidHelperModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onImport={handleImportAttendance}
            />

            <TWHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onConfirmRestore={handleConfirmRestore}
            />
        </div>
    );
};