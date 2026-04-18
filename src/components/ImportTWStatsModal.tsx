import React, { useState } from 'react';
import { X } from './icons';
import { Button } from './Button';
import type { TWEvent } from '../types';

interface ImportTWStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (eventId: string, jsonString: string) => void;
    events: TWEvent[];
}

export const ImportTWStatsModal: React.FC<ImportTWStatsModalProps> = ({ isOpen, onClose, onImport, events }) => {
    const [text, setText] = useState("");
    const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[events.length - 1].id : "");
    const [error, setError] = useState<string | null>(null);

    // Update selected event if events change and current is invalid
    React.useEffect(() => {
        if (events.length > 0 && (!selectedEventId || !events.find(e => e.id === selectedEventId))) {
            const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
            setSelectedEventId(sortedEvents[sortedEvents.length - 1].id);
        }
    }, [events, selectedEventId]);

    if (!isOpen) return null;

    const handleImport = () => {
        if (!selectedEventId) {
            setError("Please select an event.");
            return;
        }

        try {
            const parsed = JSON.parse(text);
            if (!parsed.signUps) {
                throw new Error("Could not find 'signUps'. Ensure this is a valid Raid Helper JSON export.");
            }
            setError(null);
            onImport(selectedEventId, text);
            setText("");
            onClose();
        } catch (err) {
            setError("Invalid JSON format. Please copy the entire code block from Raid Helper again.");
        }
    };

    const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        Import TW Stats from Raid Helper
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-700">
                        <X size={24} />
                    </Button>
                </header>
                <div className="p-4 flex-grow">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Select TW Event</label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="" disabled>Select a date...</option>
                            {sortedEvents.map(e => (
                                <option key={e.id} value={e.id}>{e.date} ({e.type})</option>
                            ))}
                        </select>
                    </div>

                    <p className="text-gray-400 mb-2 text-sm">Paste the JSON code from the Raid Helper export below.</p>
                    <textarea
                        value={text}
                        onChange={(e) => { setText(e.target.value); setError(null); }}
                        placeholder='{"date":"28-2-2026","signUps":[{...}]}'
                        className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                    />
                    {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                </div>
                <footer className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end items-center gap-3">
                    <Button variant="ghost" className="bg-gray-600 hover:bg-gray-500" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleImport} disabled={!text.trim() || !selectedEventId}>
                        Import Stats
                    </Button>
                </footer>
            </div>
        </div>
    );
};
