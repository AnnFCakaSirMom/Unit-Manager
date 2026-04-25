import React from 'react';
import { Info } from './icons';
import { useAppSelector } from '../state/store';
import { usePermission } from '../hooks/usePermission';
import { cn } from '../utils';

interface HelpIconProps {
    helpKey: string;
    text: { title: string; content: string };
    className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({ text, className }) => {
    const showHelpMode = useAppSelector(state => state.ui.showHelpMode);
    const { canViewHelp } = usePermission();

    if (!showHelpMode || !canViewHelp) return null;

    return (
        <span 
            className={cn(
                "inline-flex items-center justify-center ml-1.5 text-blue-400 cursor-help transition-all transform hover:scale-110",
                "animate-in fade-in zoom-in duration-300",
                className
            )}
            title={`${text.title}: ${text.content}`}
        >
            <Info size={16} className="drop-shadow-[0_0_3px_rgba(96,165,250,0.5)]" />
        </span>
    );
};
