import React, { useState } from 'react';
import { ImportIcon, Trash2, CheckSquare, Users, Shield } from './icons';
import { ImportRaidHelperModal } from './ImportRaidHelperModal';
import { Button } from './Button';
import { useAppState, useAppDispatch } from '../AppContext';
import { useGroupDragAndDrop } from '../hooks/useGroupDragAndDrop';
import { AttendancePlayerList } from './AttendancePlayerList';
import { AttendanceGroupGrid } from './AttendanceGroupGrid';

interface TWAttendanceViewProps {
    onSelectPlayer: (id: string | null) => void;
}

export const TWAttendanceView: React.FC<TWAttendanceViewProps> = ({ onSelectPlayer }) => {
    const { twAttendance: attendance, players, groups } = useAppState();
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        dispatch({ type: 'ADD_PLAYER', payload: { name: discordName } });
        alert(`Player "${discordName}" added to Unit Manager!\nPlease import the Raid Helper list again to link them automatically.`);
    };

    const handleAddGroup = () => {
        dispatch({ type: 'ADD_GROUP' });
    };

    const handleClearAttendance = () => {
        if (window.confirm('Are you sure you want to clear the attendance list?')) {
            dispatch({ type: 'CLEAR_TW_ATTENDANCE' });
        }
    };

    const handleImportAttendance = (json: string) => {
        dispatch({ type: 'IMPORT_TW_ATTENDANCE', payload: { jsonString: json } });
    };

    const accepted = attendance.filter(p => p.status === 'Accepted');
    const maybe = attendance.filter(p => p.status === 'Maybe');

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">TW Attendance</h2>
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
                        >
                            <Trash2 size={16} /> Clear List
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