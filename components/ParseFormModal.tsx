import React, { useState } from 'react';
import { X, CheckIcon } from './icons';
import { Button } from './Button';

interface ParseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onParse: (text: string) => void;
}

export const ParseFormModal: React.FC<ParseFormModalProps> = ({ isOpen, onClose, onParse }) => {
    const [text, setText] = useState("");

    if (!isOpen) return null;

    const handleParse = () => {
        onParse(text);
        setText("");
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parse-form-title"
        >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 id="parse-form-title" className="text-xl font-bold text-white">
                        Import From Form
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-700" title="Close" aria-label="Close"><X size={24} /></Button>
                </header>
                <div className="p-4 flex-grow">
                    <p className="text-gray-400 mb-4">Paste the filled-out form text below. New data will be merged with existing unit data.</p>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste form text here..."
                        className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                </div>
                <footer className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end items-center gap-3">
                    <Button variant="ghost" className="bg-gray-600 hover:bg-gray-500" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleParse} disabled={!text.trim()}>
                        <CheckIcon size={20} />
                        Parse & Apply
                    </Button>
                </footer>
            </div>
        </div>
    );
};