import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { TWSeason, TWEvent } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { X, Trash2, Plus, Database } from './icons';
import { useAppDispatch, useAppState } from '../AppContext';
import { ConfirmationModal } from './ConfirmationModal';

interface SeasonManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingSeason?: TWSeason;
}

export const SeasonManagementModal: React.FC<SeasonManagementModalProps> = ({ isOpen, onClose, existingSeason }) => {
    const dispatch = useAppDispatch();
    const { twEvents, twRecords } = useAppState();

    const [name, setName] = useState(existingSeason?.name || "");
    const [startDate, setStartDate] = useState(existingSeason?.startDate || "");
    const [endDate, setEndDate] = useState(existingSeason?.endDate || "");
    const [localEvents, setLocalEvents] = useState<TWEvent[]>([]);

    // Confirmation Modal state
    const [eventToClear, setEventToClear] = useState<string | null>(null);

    useEffect(() => {
        if (existingSeason) {
            setName(existingSeason.name);
            setStartDate(existingSeason.startDate);
            setEndDate(existingSeason.endDate);
            setLocalEvents(twEvents.filter(e => e.seasonId === existingSeason.id));
        } else {
            setName("");
            setStartDate(new Date().toISOString().split('T')[0]);

            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setEndDate(nextMonth.toISOString().split('T')[0]);
            setLocalEvents([]);
        }
    }, [existingSeason, isOpen, twEvents]);

    const handleGenerateDates = useCallback(() => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const newEvents: TWEvent[] = [];

        let current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            if (day === 2 || day === 6) { // Tuesday (2) or Saturday (6)
                const dateStr = current.toISOString().split('T')[0];
                newEvents.push({
                    id: crypto.randomUUID(),
                    seasonId: existingSeason?.id || "temp", // Will be replaced on save if new
                    date: dateStr,
                    type: 'regular'
                });
            }
            current.setDate(current.getDate() + 1);
        }

        setLocalEvents(newEvents);
    }, [startDate, endDate, existingSeason]);

    const handleAddExtraDate = () => {
        const dateStr = new Date().toISOString().split('T')[0];
        setLocalEvents([...localEvents, {
            id: crypto.randomUUID(),
            seasonId: existingSeason?.id || "temp",
            date: dateStr,
            type: 'extra'
        }]);
    };

    const handleRemoveDate = (eventId: string) => {
        setLocalEvents(localEvents.filter(e => e.id !== eventId));
    };

    const handleUpdateDate = (eventId: string, newDate: string) => {
        setLocalEvents(localEvents.map(e => e.id === eventId ? { ...e, date: newDate } : e));
    };

    const handleClearStats = () => {
        if (eventToClear) {
            dispatch({ type: 'CLEAR_TW_EVENT_RECORDS', payload: { eventId: eventToClear } });
            setEventToClear(null);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !startDate || !endDate) return;

        const seasonId = existingSeason?.id || crypto.randomUUID();
        const season: TWSeason = {
            id: seasonId,
            name: name.trim(),
            startDate,
            endDate
        };

        const finalEvents = localEvents.map(e => ({ ...e, seasonId }));

        if (existingSeason) {
            dispatch({ type: 'UPDATE_TW_SEASON', payload: { season, events: finalEvents } });
        } else {
            dispatch({ type: 'CREATE_TW_SEASON', payload: { season, events: finalEvents } });
        }
        onClose();
    };

    const eventsWithStats = useMemo(() => {
        return new Set(twRecords.map(r => r.eventId));
    }, [twRecords]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700">
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">{existingSeason ? 'Edit Season' : 'Create New Season'}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close modal">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Season Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Season Gold" className="w-full p-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button onClick={handleGenerateDates} variant="secondary" className="w-full justify-center">
                                    Auto-generate TW Dates (Tue/Sat)
                                </Button>
                            </div>

                            {localEvents.length > 0 && (
                                <div className="mt-6 border border-gray-700 rounded-md p-4 bg-gray-900/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-gray-300">Generated TW Dates ({localEvents.length})</h3>
                                        <Button onClick={handleAddExtraDate} variant="ghost" size="sm" className="text-blue-400">
                                            <Plus size={16} className="mr-1" /> Add Extra
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {localEvents.sort((a, b) => a.date.localeCompare(b.date)).map(event => {
                                            const hasStats = eventsWithStats.has(event.id);
                                            return (
                                                <div key={event.id} className="flex items-center gap-2">
                                                    <Input
                                                        type="date"
                                                        value={event.date}
                                                        onChange={e => handleUpdateDate(event.id, e.target.value)}
                                                        className="flex-1 p-1"
                                                    />
                                                    <span className="text-xs text-gray-500 w-16">{event.type}</span>

                                                    {hasStats && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-yellow-400 p-1 flex items-center gap-1 hover:bg-yellow-900/20"
                                                            onClick={() => setEventToClear(event.id)}
                                                            title="Clear statistics for this date"
                                                        >
                                                            <Database size={14} />
                                                            <span className="text-[10px] uppercase font-bold">Clear</span>
                                                        </Button>
                                                    )}

                                                    <Button variant="ghost" className="text-red-400 p-1" onClick={() => handleRemoveDate(event.id)}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-800/80 rounded-b-lg">
                        <Button onClick={onClose} variant="ghost">Cancel</Button>
                        <Button onClick={handleSave} variant="success" disabled={!name || !startDate || !endDate}>
                            Save Season
                        </Button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!eventToClear}
                title="Rensa statistik?"
                message="Är du säker på att du vill rensa all importerad statistik för detta datum? Denna handling går inte att ångra."
                onConfirm={handleClearStats}
                onClose={() => setEventToClear(null)}
            />
        </>
    );
};
