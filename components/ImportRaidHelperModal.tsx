import React, { useState } from 'react';
import { X, CheckIcon } from './icons';

interface ImportRaidHelperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (jsonString: string) => void;
}

export const ImportRaidHelperModal: React.FC<ImportRaidHelperModalProps> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImport = () => {
        try {
            const parsed = JSON.parse(text);
            if (!parsed.signUps) {
                throw new Error("Could not find 'signUps'. Ensure this is a valid Raid Helper JSON export.");
            }
            setError(null);
            onImport(text);
            setText("");
            onClose();
        } catch (err) {
            setError("Invalid JSON format. Please copy the entire code block from Raid Helper again.");
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        Import Raid Helper Data
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={24} /></button>
                </header>
                <div className="p-4 flex-grow">
                    <p className="text-gray-400 mb-4">Paste the JSON code from the Raid Helper export below.</p>
                    <textarea
                        value={text}
                        onChange={(e) => { setText(e.target.value); setError(null); }}
                        placeholder='{"date":"28-2-2026","signUps":[{...}]}'
                        className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                    />
                    {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                </div>
                <footer className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleImport} disabled={!text.trim()} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-semibold transition-colors flex items-center gap-2">
                        <CheckIcon size={20} />
                        Import
                    </button>
                </footer>
            </div>
        </div>
    );
};