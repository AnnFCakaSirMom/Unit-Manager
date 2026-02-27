import React, { useState } from 'react';
import type { AppState, AppAction } from '../types';
import { UserPlus, AlertTriangle, CheckSquare, Users, ImportIcon, Trash2, Shield, Plus } from './icons';
import { ImportRaidHelperModal } from './ImportRaidHelperModal';

const GripIcon = ({ className = "", size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
    </svg>
);

interface TWAttendanceViewProps {
    attendance: AppState['twAttendance'];
    players: AppState['players'];
    groups: AppState['groups'];
    dispatch: React.Dispatch<AppAction>;
    onSelectPlayer: (id: string | null) => void;
}

export const TWAttendanceView: React.FC<TWAttendanceViewProps> = ({ attendance, players, groups, dispatch, onSelectPlayer }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
    const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

    const getPlayerGroup = (playerId: string | null) => {
        if (!playerId) return null;
        return groups.find(g => g.members.some(m => m.playerId === playerId));
    };

    const handleCreatePlayer = (discordName: string) => {
        dispatch({ type: 'ADD_PLAYER', payload: { name: discordName } });
        alert(`Player "${discordName}" added to Unit Manager!\nPlease import the Raid Helper list again to link them automatically.`);
    };

    const handleAssignGroup = (playerId: string, targetGroupId: string) => {
        if (targetGroupId === "REMOVE") {
            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup) {
                dispatch({ type: 'REMOVE_PLAYER_FROM_GROUP', payload: { groupId: currentGroup.id, playerId } });
            }
        } else {
            const targetGroup = groups.find(g => g.id === targetGroupId);
            if (targetGroup && targetGroup.members.length >= 5) {
                const currentGroup = getPlayerGroup(playerId);
                if (!currentGroup || currentGroup.id !== targetGroupId) {
                    alert("This group is already full (5/5).");
                    return;
                }
            }

            const currentGroup = getPlayerGroup(playerId);
            if (currentGroup && currentGroup.id !== targetGroupId) {
                dispatch({ type: 'MOVE_PLAYER_BETWEEN_GROUPS', payload: { playerId, sourceGroupId: currentGroup.id, targetGroupId } });
            } else if (!currentGroup) {
                dispatch({ type: 'ADD_PLAYER_TO_GROUP', payload: { groupId: targetGroupId, playerId } });
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, playerId: string, sourceGroupId: string | null = null) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ playerId, sourceGroupId }));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPlayer(playerId);
    };

    const handleDragEnd = () => {
        setDraggedPlayer(null);
        setDragOverPlayer(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnGroup = (e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, targetGroupId);
        } catch (err) {}
    };

    const handleDropOnList = (e: React.DragEvent) => {
        e.preventDefault();
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) handleAssignGroup(data.playerId, "REMOVE");
        } catch (err) {}
    };

    const handleDropOnMember = (e: React.DragEvent, targetGroupId: string, targetPlayerId: string) => {
        e.preventDefault();
        e.stopPropagation(); 
        setDraggedPlayer(null);
        setDragOverPlayer(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.playerId) {
                if (data.sourceGroupId === targetGroupId && data.playerId !== targetPlayerId) {
                    dispatch({ type: 'REORDER_GROUP_MEMBER', payload: { groupId: targetGroupId, playerId: data.playerId, targetPlayerId }});
                } else {
                    handleAssignGroup(data.playerId, targetGroupId);
                }
            }
        } catch (err) {}
    };

    const renderList = (list: AppState['twAttendance'], title: string, colorClass: string, icon: React.ReactNode) => (
        <div className="mb-6">
            <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 border-b-2 pb-2 ${colorClass}`}>
                {icon} {title} ({list.length})
            </h3>
            <div className="space-y-2">
                {list.map((person, index) => {
                    const existingGroup = getPlayerGroup(person.matchedPlayerId);
                    const isDraggable = !!person.matchedPlayerId;
                    
                    return (
                        <div 
                            key={index} 
                            draggable={isDraggable}
                            onDragStart={(e) => isDraggable && handleDragStart(e, person.matchedPlayerId!)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between p-2 rounded-md border transition-all ${
                                existingGroup ? 'bg-green-900/20 border-green-700/50' : 'bg-gray-800/50 border-gray-700'
                            } ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:bg-gray-700/60' : ''} ${
                                draggedPlayer === person.matchedPlayerId ? 'opacity-50' : 'opacity-100'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {isDraggable ? (
                                    <GripIcon size={16} className="text-gray-500 flex-shrink-0" />
                                ) : (
                                    <div className="w-4 flex-shrink-0"></div>
                                )}
                                
                                {person.matchedPlayerId ? (
                                    <button 
                                        onClick={() => onSelectPlayer(person.matchedPlayerId)}
                                        className="font-medium text-blue-400 hover:text-blue-300 hover:underline text-left truncate"
                                        title="View player units"
                                    >
                                        {person.discordName}
                                    </button>
                                ) : (
                                    <span className="font-medium text-gray-200 truncate">{person.discordName}</span>
                                )}
                                
                                {!person.matchedPlayerId && (
                                    <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex-shrink-0" title="Missing in Unit Manager">
                                        <AlertTriangle size={12} /> Unknown
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {!person.matchedPlayerId ? (
                                    <button 
                                        onClick={() => handleCreatePlayer(person.discordName)}
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded flex items-center gap-1"
                                    >
                                        <UserPlus size={14} /> Create
                                    </button>
                                ) : (
                                    <select 
                                        value={existingGroup ? existingGroup.id : ""}
                                        onChange={(e) => handleAssignGroup(person.matchedPlayerId!, e.target.value)}
                                        className={`text-xs font-semibold py-1 px-2 rounded focus:outline-none cursor-pointer ${
                                            existingGroup ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-600 hover:bg-gray-500 text-white"
                                        }`}
                                    >
                                        <option value="" disabled>Group...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id} disabled={g.members.length >= 5 && (!existingGroup || existingGroup.id !== g.id)}>
                                                {existingGroup?.id === g.id ? `✅ ${g.name}` : g.name} {g.members.length >= 5 ? '(Full)' : ''}
                                            </option>
                                        ))}
                                        {existingGroup && (
                                            <option value="REMOVE">❌ Remove</option>
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

    const renderGroups = () => (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {groups.map(group => {
                const isFull = group.members.length >= 5;
                
                return (
                    <div 
                        key={group.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnGroup(e, group.id)}
                        className={`bg-gray-800/80 border-2 rounded-lg flex flex-col transition-colors ${
                            draggedPlayer ? (isFull ? 'border-red-500/30' : 'border-blue-500/50 border-dashed bg-gray-800') : 'border-gray-700'
                        }`}
                    >
                        <div className="bg-gray-900/50 p-2 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
                            <h4 className="font-bold text-gray-200 flex items-center gap-2 text-sm">
                                <Shield size={14} className="text-blue-400" />
                                {group.name}
                            </h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
                                {group.members.length} / 5
                            </span>
                        </div>
                        <div className="p-2 flex-grow min-h-[100px] flex flex-col gap-1.5">
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
                                        className={`p-1.5 rounded flex justify-between items-center cursor-grab active:cursor-grabbing border transition-colors ${
                                            dragOverPlayer === member.playerId 
                                                ? 'border-blue-500 bg-blue-500/20' 
                                                : 'border-transparent bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <GripIcon size={14} className="text-gray-500" />
                                            <span className="text-sm text-gray-200 truncate">{player.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAssignGroup(player.id, "REMOVE")}
                                            className="text-gray-400 hover:text-red-400 p-0.5 rounded"
                                            title="Remove from group"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
            
            <div className="bg-gray-800/30 border-2 border-gray-700 border-dashed rounded-lg flex items-center justify-center p-4 min-h-[130px] hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => dispatch({ type: 'ADD_GROUP' })}>
                 <div className="text-gray-400 flex flex-col items-center gap-2">
                    <div className="bg-gray-700 p-2 rounded-full"><Plus size={20} /></div>
                    <span className="font-medium text-xs">Create New Group</span>
                </div>
            </div>
        </div>
    );

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

            {attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-500">
                    <h2 className="text-xl mb-2">No attendance data found.</h2>
                    <p>Click "Import Raid Helper" to paste your JSON export.</p>
                </div>
            ) : (
                <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-hidden">
                    <div 
                        className="w-full lg:w-1/3 flex flex-col bg-gray-900/40 rounded-lg p-4 overflow-y-auto border border-gray-800"
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnList}
                    >
                        {renderList(accepted, "Accepted", "text-green-400 border-green-400/50", <CheckSquare size={18} />)}
                        {renderList(maybe, "Maybe", "text-blue-400 border-blue-400/50", <Users size={18} />)}
                    </div>

                    <div className="w-full lg:w-2/3 flex flex-col bg-gray-900/40 rounded-lg p-4 overflow-y-auto border border-gray-800">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-700 pb-2">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-200">
                                <Shield size={20} className="text-indigo-400" /> Group Placements
                            </h3>
                            <span className="text-sm text-gray-400">Total Groups: {groups.length}</span>
                        </div>
                        {renderGroups()}
                    </div>
                </div>
            )}

            <ImportRaidHelperModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onImport={(json) => dispatch({ type: 'IMPORT_TW_ATTENDANCE', payload: { jsonString: json }})}
            />
        </div>
    );
};