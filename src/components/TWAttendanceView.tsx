import React, { useState } from 'react';
import { ImportIcon, Trash2, CheckSquare, Users, Shield, LoadingSpinnerIcon } from './icons';
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

interface TWAttendanceViewProps {
    onSelectPlayer: (id: string | null) => void;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    setStatusMessage: (message: string) => void;
}

export const TWAttendanceView: React.FC<TWAttendanceViewProps> = ({ onSelectPlayer, setConfirmModal, setStatusMessage }) => {
    const attendance = useAppSelector(state => state.tw.twAttendance);
    const players = useAppSelector(state => state.player.players);
    const groups = useAppSelector(state => state.group.groups);
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                    // Wipe group_members first (safest filter for some DB configs)
                    const { error: membersError } = await supabase
                        .from('group_members')
                        .delete()
                        .neq('profile_id', '00000000-0000-0000-0000-000000000000');
                    
                    if (membersError) throw membersError;

                    // Wipe groups
                    const { error: groupsError } = await supabase
                        .from('groups')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000');

                    if (groupsError) throw groupsError;

                    // Wipe temporary import list
                    await clearTWImport();

                    // Local clear
                    dispatch(clearTWAttendance());
                    setStatusMessage('TW data successfully cleared.');
                } catch (err: any) {
                    console.error('Failed to wipe TW data:', err);
                    setStatusMessage(`Error: ${err.message || 'Failed to wipe database'}`);
                } finally {
                    setIsClearing(false);
                }
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
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="primary"
                    >
                        <ImportIcon size={16} /> Import Raid Helper
                    </Button>
                    {attendance.length > 0 && (
                        <Button
                            onClick={handleClearAttendance}
                            variant="danger"
                            disabled={isClearing}
                        >
                            {isClearing ? <LoadingSpinnerIcon size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            <span>{isClearing ? 'Clearing...' : 'Clear List'}</span>
                        </Button>
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
                        />
                    </div>
                </div>
            )}

            <ImportRaidHelperModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onImport={handleImportAttendance}
            />
        </div>
    );
};