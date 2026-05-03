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
                return <RefreshCcw size={16} className="text-amber-400 animate-spin" />;
            case 'Error':
                return <CloudAlert size={18} className="text-amber-500 animate-pulse" />;
            case 'PermanentError':
                return <CloudOff size={18} className="text-red-500" />;
            case 'Synced':
            default:
                return <Cloud size={18} className="text-amber-200/40" />;
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
        <header className="flex items-center justify-between px-6 py-3.5 bg-black/60 backdrop-blur-xl border-b border-amber-500/10 flex-shrink-0 relative z-20 shadow-2xl">
            {/* Brand */}
            <div className="flex items-center select-none group cursor-default">
                <div className="flex flex-col -space-y-1">
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-500 group-hover:text-gray-400 transition-colors">
                        Unit
                    </span>
                    <span className="text-xl font-black tracking-tight uppercase bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        Manager
                    </span>
                </div>
                <div className="ml-3 h-8 w-[1px] bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-5">
                {/* Sync Indicator */}
                <div 
                    className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-500 border",
                        syncStatus === 'Synced' 
                            ? "bg-amber-500/5 border-amber-500/10" 
                            : "bg-black/40 border-white/5 shadow-inner"
                    )}
                    title={getSyncTooltip()}
                >
                    {getSyncIcon()}
                </div>

                {/* UX-1: Retry button — only shown on PermanentError */}
                {syncStatus === 'PermanentError' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-[0.1em] uppercase text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 animate-pulse"
                        title="Reload the page to retry failed saves"
                    >
                        <RefreshCcw size={12} />
                        <span>Retry</span>
                    </button>
                )}

                {/* Logout */}
                <button
                    id="header-logout-btn"
                    onClick={onLogout}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase text-gray-500 bg-black/40 border border-white/5 hover:text-amber-100 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 shadow-lg active:scale-95"
                    title="Log Out"
                >
                    <LogOut size={14} className="group-hover:text-amber-500 transition-colors" />
                    <span>Log Out</span>
                </button>
            </div>
        </header>
    );
};

