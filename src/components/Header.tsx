import React from 'react';
import { LogOut } from './icons';

interface HeaderProps {
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
    return (
        <header className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            {/* Brand */}
            <div className="flex items-center select-none">
                <span className="text-sm font-bold tracking-widest uppercase text-gray-100">
                    Unit
                </span>
                <span className="text-sm font-bold tracking-widest uppercase text-blue-400 ml-1">
                    Manager
                </span>
            </div>

            {/* Logout */}
            <button
                id="header-logout-btn"
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase text-gray-400 bg-gray-800 border border-gray-700 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-750 transition-all duration-150 active:scale-[0.97]"
                title="Log Out"
            >
                <LogOut size={13} />
                <span>Log Out</span>
            </button>
        </header>
    );
};
