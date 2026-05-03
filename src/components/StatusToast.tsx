import React from 'react';
import { CheckIcon, AlertTriangle, X } from './icons';
import { cn } from '../utils';

interface StatusToastProps {
    message: string;
    onDismiss: () => void;
}

/**
 * StatusToast
 *
 * Global fixed-position toast that displays sync and action feedback
 * for ALL roles. Previously only officers saw these messages (via Sidebar).
 *
 * UX-2 FIX: Ensures Members also see save confirmations and error alerts
 * regardless of which layout panel they are in.
 */
export const StatusToast: React.FC<StatusToastProps> = ({ message, onDismiss }) => {
    if (!message) return null;

    const isError =
        message.toLowerCase().startsWith('error') ||
        message.toLowerCase().includes('failed') ||
        message.toLowerCase().includes('critical');

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 z-50',
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'backdrop-blur-xl border shadow-2xl',
                'transition-all duration-300',
                isError
                    ? 'bg-red-950/85 border-red-500/30 text-red-200'
                    : 'bg-black/80 border-amber-500/20 text-gray-200'
            )}
            role="status"
            aria-live="polite"
        >
            {isError ? (
                <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
            ) : (
                <CheckIcon size={15} className="text-amber-400 flex-shrink-0" />
            )}

            <span className="text-sm font-medium max-w-xs leading-snug">{message}</span>

            <button
                onClick={onDismiss}
                className="ml-1 text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
                aria-label="Dismiss"
            >
                <X size={13} />
            </button>
        </div>
    );
};
