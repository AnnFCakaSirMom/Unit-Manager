import React, { useState } from 'react';
import type { AppState, AppAction } from '../types';
import { UserPlus, AlertTriangle, CheckSquare, Users, ImportIcon, Trash2 } from './icons';
import { ImportRaidHelperModal } from './ImportRaidHelperModal';

interface TWAttendanceViewProps {
    attendance: AppState['twAttendance'];
    players: AppState['players'];
    groups: AppState['groups'];
    dispatch: React.Dispatch<AppAction>;
    onSelectPlayer: (id: string | null) => void;
}

export const TWAttendanceView: React.FC<TWAttendanceViewProps> = ({ attendance, groups, dispatch, onSelectPlayer }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getPlayerGroup = (playerId: string | null) => {
        if (!playerId) return null;
        return groups.find(g => g.members.some(m => m.playerId === playerId));
    };

    const handleCreatePlayer = (discordName: string) => {
        dispatch({ type: 'ADD_PLAYER', payload: { name: discordName } });
        alert(`Player "${discordName}" added to Unit Manager!\nPlease import the Raid Helper list again to link them automatically.`);
    };

    const handleAssignGroup = (playerId: string, groupId: string) => {
        if (groupId === "REMOVE") {
            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup) {
                dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId: currentGroup.id, playerId } });
            }
        } else {
            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup && currentGroup.id !== groupId) {
                dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId, sourceGroupId: currentGroup.id, targetGroupId: groupId } });
            } else if (!currentGroup) {
                dispatch({ type: 'ADD_PLAYER_TO_GROUP', payload: { groupId, playerId } });
            }
        }
    };

    const renderList = (list: AppState['twAttendance'], title: string, colorClass: string, icon: React.ReactNode) => (
        <div className="mb-8">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 border-b-2 pb-2 ${colorClass}`}>
                {icon} {title} ({list.length})
            </h3>
            <div className="space-y-2">
                {list.map((person, index) => {
                    const existingGroup = getPlayerGroup(person.matchedPlayerId);
                    
                    return (
                        <div key={index} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-md border border-gray-700">
                            <div className="flex items-center gap-2">
                                {/* OM SPELAREN ÄR LÄNKAD: Klickbart namn som hoppar till spelaren */}
                                {person.matchedPlayerId ? (
                                    <button 
                                        onClick={() => onSelectPlayer(person.matchedPlayerId)}
                                        className="font-medium text-blue-400 hover:text-blue-300 hover:underline text-left cursor-pointer transition-colors"
                                        title="View player units"
                                    >
                                        {person.discordName}
                                    </button>
                                ) : (
                                    /* OM SPELAREN ÄR OKÄND: Vanlig text */
                                    <span className="font-medium text-gray-200">{person.discordName}</span>
                                )}
                                
                                {!person.matchedPlayerId && (
                                    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded" title="Missing in Unit Manager">
                                        <AlertTriangle size={14} /> Unknown
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {!person.matchedPlayerId ? (
                                    <button 
                                        onClick={() => handleCreatePlayer(person.discordName)}
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1"
                                    >
                                        <UserPlus size={14} /> Create Player
                                    </button>
                                ) : (
                                    <select 
                                        value={existingGroup ? existingGroup.id : ""}
                                        onChange={(e) => handleAssignGroup(person.matchedPlayerId!, e.target.value)}
                                        className={`text-sm font-semibold py-1.5 px-3 rounded focus:outline-none cursor-pointer ${
                                            existingGroup ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-600 hover:bg-gray-500 text-white"
                                        }`}
                                    >
                                        <option value="" disabled>Select group...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id} disabled={g.members.length >= 5 && (!existingGroup || existingGroup.id !== g.id)}>
                                                {existingGroup?.id === g.id ? `✅ ${g.name}` : g.name} {g.members.length >= 5 ? '(Full)' : ''}
                                            </option>
                                        ))}
                                        {existingGroup && (
                                            <option value="REMOVE">❌ Remove from group</option>
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const accepted = attendance.filter(p => p.status === 'Accepted');
    const maybe = attendance.filter(p => p.status === 'Maybe');

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">TW Attendance</h2>
                    <p className="text-gray-400">Manage players from Raid Helper</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                        <ImportIcon size={16} /> Import Raid Helper
                    </button>
                    {attendance.length > 0 && (
                        <button 
                            onClick={() => {
                                if(window.confirm('Are you sure you want to clear the attendance list?')) {
                                    dispatch({ type: 'CLEAR_TW_ATTENDANCE' });
                                }
                            }} 
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Clear List
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
                {attendance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-10">
                        <h2 className="text-xl mb-2">No attendance data found.</h2>
                        <p>Click "Import Raid Helper" to paste your JSON export.</p>
                    </div>
                ) : (
                    <>
                        {renderList(accepted, "Accepted", "text-green-400 border-green-400/50", <CheckSquare size={24} />)}
                        {renderList(maybe, "Maybe", "text-blue-400 border-blue-400/50", <Users size={24} />)}
                    </>
                )}
            </div>

            <ImportRaidHelperModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onImport={(json) => dispatch({ type: 'IMPORT_TW_ATTENDANCE', payload: { jsonString: json }})}
            />
        </div>
    );
};