import { LogOut, Cloud, CloudOff, CloudAlert, RefreshCcw } from './icons';
import { SyncStatus } from '../hooks/useCloudSync';
import { cn } from '../utils';

interface HeaderProps {
    onLogout: () => void;
    syncStatus: SyncStatus;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, syncStatus }) => {
    const getSyncIcon = () => {
        switch (syncStatus) {
            case 'Syncing':
                return <RefreshCcw size={16} className="text-blue-400 animate-spin" />;
            case 'Error':
                return <CloudAlert size={18} className="text-yellow-500 animate-pulse" />;
            case 'PermanentError':
                return <CloudOff size={18} className="text-red-500" />;
            case 'Synced':
            default:
                return <Cloud size={18} className="text-green-500/60" />;
        }
    };

    const getSyncTooltip = () => {
        switch (syncStatus) {
            case 'Syncing': return 'Syncing changes to cloud...';
            case 'Error': return 'Some changes failed to save. Retrying...';
            case 'PermanentError': return 'Critical Error: Some changes could not be saved.';
            case 'Synced': return 'All changes saved to cloud.';
            default: return 'Database connected';
        }
    };

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

            {/* Right side actions */}
            <div className="flex items-center gap-4">
                {/* Sync Indicator */}
                <div 
                    className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                        syncStatus === 'Synced' ? "bg-green-500/5" : "bg-gray-800"
                    )}
                    title={getSyncTooltip()}
                >
                    {getSyncIcon()}
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
            </div>
        </header>
    );
};

