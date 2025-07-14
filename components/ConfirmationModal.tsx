import React from 'react';
import { AlertTriangle } from './icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
        >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col">
                <header className="p-4">
                    <h2 id="confirmation-title" className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-yellow-400" /> {title}
                    </h2>
                </header>
                <div className="p-4 text-gray-300">
                    <p>{message}</p>
                </div>
                <footer className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
                        Confirm
                    </button>
                </footer>
            </div>
        </div>
    );
};
