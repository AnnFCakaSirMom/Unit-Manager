import React, { useState, useMemo } from 'react';
import type { TWEvent, TWRecordStatus } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { X, CheckIcon as Check } from './icons';
import { useAppDispatch, useAppState } from '../AppContext';
import { cn } from '../utils';

interface EditTWAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: TWEvent[];
}

export const EditTWAttendanceModal: React.FC<EditTWAttendanceModalProps> = ({ isOpen, onClose, events }) => {
    const dispatch = useAppDispatch();
    const { players, twRecords } = useAppState();

    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Auto-select first event if none selected
    React.useEffect(() => {
        if (isOpen && !selectedEventId && events.length > 0) {
            setSelectedEventId(events[0].id);
        }
    }, [isOpen, selectedEventId, events]);

    const activeEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

    const filteredPlayers = useMemo(() => {
        let result = players;

        // Filter by inactive status
        if (!showInactive) {
            result = result.filter(p => !p.notInHouse);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.aliases && p.aliases.some(a => a.toLowerCase().includes(query)))
            );
        }

        return result;
    }, [players, searchQuery, showInactive]);

    const getPlayerStatus = (playerId: string): TWRecordStatus | 'None' => {
        const record = twRecords.find(r => r.eventId === selectedEventId && r.playerId === playerId);
        return record ? record.status : 'None';
    };

    const handleSetStatus = (playerId: string, status: TWRecordStatus) => {
        if (!selectedEventId) return;
        dispatch({ type: 'UPDATE_TW_PLAYER_RECORD', payload: { eventId: selectedEventId, playerId, status } });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Manual Attendance Edit</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4 border-b border-gray-700 bg-gray-900/50">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Select TW Date to Edit</label>
                        <select
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        >
                            {events.length === 0 && <option value="" disabled>No events in this season</option>}
                            {events.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                                <option key={e.id} value={e.id}>{e.date} ({e.type})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Search Player</label>
                            <Input
                                placeholder="Type name or alias..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white h-[38px] transition-colors">
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showInactive}
                                    onChange={() => setShowInactive(!showInactive)}
                                />
                                <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 h-full">
                                    {showInactive ? (
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <span className="w-4 h-4 rounded-sm border-2 border-blue-400 flex items-center justify-center bg-blue-400/20">
                                                <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
                                            </span>
                                            <span className="font-medium whitespace-nowrap">Show Inactive</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <span className="w-4 h-4 rounded-sm border-2 border-gray-600"></span>
                                            <span className="font-medium whitespace-nowrap">Show Inactive</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!activeEvent ? (
                        <div className="text-center text-gray-500 py-8">Please select an event.</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredPlayers.map(player => {
                                const status = getPlayerStatus(player.id);
                                return (
                                    <div key={player.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600 gap-3 hover:bg-gray-700 transition-colors">
                                        <div className="flex flex-col">
                                            <span className={cn("font-medium", player.notInHouse ? "text-red-400" : "text-white")}>
                                                {player.name} {player.notInHouse && "(Inactive)"}
                                            </span>
                                            {player.aliases && player.aliases.length > 0 && (
                                                <span className="text-xs text-gray-400">Aliases: {player.aliases.join(', ')}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                            <Button
                                                size="sm"
                                                variant={status === 'Attended' ? 'success' : 'ghost'}
                                                onClick={() => handleSetStatus(player.id, 'Attended')}
                                                className={status === 'Attended' ? '' : 'text-gray-300 hover:text-white bg-gray-800'}
                                            >
                                                {status === 'Attended' && <Check size={14} className="mr-1" />} Attended
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={status === 'Not Attended' ? 'danger' : 'ghost'}
                                                onClick={() => handleSetStatus(player.id, 'Not Attended')}
                                                className={cn("bg-gray-800", status === 'Not Attended' ? 'bg-red-900 text-red-100 hover:bg-red-800' : 'text-gray-300 hover:text-white')}
                                            >
                                                {status === 'Not Attended' && <Check size={14} className="mr-1" />} Not Attended
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={status === 'Declined' ? 'secondary' : 'ghost'}
                                                onClick={() => handleSetStatus(player.id, 'Declined')}
                                                className={cn("bg-gray-800", status === 'Declined' ? '!bg-gray-600 text-white' : 'text-gray-300 hover:text-white')}
                                            >
                                                {status === 'Declined' && <Check size={14} className="mr-1" />} Declined
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={status === 'AWOL' ? 'danger' : 'ghost'}
                                                onClick={() => handleSetStatus(player.id, 'AWOL')}
                                                className={cn("bg-gray-800", status === 'AWOL' ? 'bg-purple-900 text-purple-100 hover:bg-purple-800' : 'text-gray-300 hover:text-white')}
                                            >
                                                {status === 'AWOL' && <Check size={14} className="mr-1" />} AWOL
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                            {filteredPlayers.length === 0 && (
                                <div className="text-center text-gray-500 py-4">No players found matching your search.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
