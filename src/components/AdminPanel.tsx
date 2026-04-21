import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Settings, Database, Shield, List, AlertTriangle } from './icons';
import { Button } from './Button';
import { UnitManagementModal } from './UnitManagementModal';
import { useAppState, useAppDispatch } from '../AppContext';
import { saveTWSeason, saveTWAttendanceRecords, fetchTWAttendanceData } from '../services/twAttendanceService';
import { upsertPlayer } from '../services/playerService';
import { upsertGroup } from '../services/groupService';
import { AuditLogPanel } from './AuditLogPanel';
import { auditService } from '../services/auditService';
import { cn } from '../utils';

interface AdminPanelProps {
    onSave: () => void;
    onLoad: () => void;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSave, onLoad, onClose }) => {
    const { players, groups, twSeasons, twEvents, twRecords } = useAppState();
    const dispatch = useAppDispatch();

    const [activeTab, setActiveTab] = useState<'tools' | 'logs'>('tools');
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'done' | 'error'>('idle');
    const [suspiciousCount, setSuspiciousCount] = useState(0);

    useEffect(() => {
        const checkSuspicious = async () => {
            const lastChecked = localStorage.getItem('last_checked_audit_logs') || new Date(0).toISOString();
            const count = await auditService.checkNewSuspiciousActivity(lastChecked);
            setSuspiciousCount(count);
        };
        checkSuspicious();
        // Check every minute if the panel is open
        const interval = setInterval(checkSuspicious, 60000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleMigrateToCloud = async () => {
        if (isMigrating) return;
        setIsMigrating(true);
        setMigrationStatus('idle');
        try {
            for (const player of players) {
                await upsertPlayer(player);
            }
            for (let i = 0; i < groups.length; i++) {
                await upsertGroup(groups[i], i);
            }
            for (const season of twSeasons) {
                const seasonEvents = twEvents.filter(e => e.seasonId === season.id);
                await saveTWSeason(season, seasonEvents);
            }
            if (twRecords.length > 0) {
                await saveTWAttendanceRecords(twRecords);
            }
            setMigrationStatus('done');
            const data = await fetchTWAttendanceData();
            dispatch({ type: 'HYDRATE_TW_DATA', payload: data });
        } catch (err) {
            console.error('[AdminPanel] Migration failed:', err);
            setMigrationStatus('error');
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Shield size={28} className="text-indigo-400" />
                        {suspiciousCount > 0 && activeTab !== 'logs' && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                        <p className="text-sm text-gray-400">Centralized management for Gatekeepers, Admins & Owners.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-800/80 p-1 rounded-lg border border-gray-700 mr-4">
                        <button 
                            onClick={() => setActiveTab('tools')}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'tools' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <Settings size={16} />
                            <span>Tools</span>
                        </button>
                        <button 
                            onClick={() => {
                                setActiveTab('logs');
                                setSuspiciousCount(0);
                            }}
                            className={cn(
                                "relative px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'logs' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <List size={16} />
                            <span>Logs</span>
                            {suspiciousCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
                                    {suspiciousCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
                        Close
                    </Button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-auto">
                {activeTab === 'tools' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Card: JSON Backup */}
                        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Database size={20} className="text-blue-400" />
                                    JSON Backup
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Save or load a full local JSON snapshot of all data as a security backup.
                                </p>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <Button variant="primary" onClick={onSave} className="flex-1">
                                    <Save size={16} /> Save JSON
                                </Button>
                                <Button variant="success" onClick={onLoad} className="flex-1">
                                    <FolderOpen size={16} /> Load JSON
                                </Button>
                            </div>
                        </div>

                        {/* Card: Cloud Migration */}
                        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <span className="text-xl">☁️</span>
                                    Cloud Migration
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Push all local TW Seasons, Events and Attendance Records to Supabase. Run this once after setting up a new season locally.
                                </p>
                            </div>
                            <div className="mt-auto">
                                {migrationStatus === 'done' ? (
                                    <div className="flex items-center gap-2 text-green-400 font-medium">
                                        <span>✅</span> Migration complete!
                                    </div>
                                ) : migrationStatus === 'error' ? (
                                    <div className="text-red-400 text-sm">❌ Migration failed. Check the console.</div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        onClick={handleMigrateToCloud}
                                        disabled={isMigrating || twSeasons.length === 0}
                                        className="w-full text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10"
                                    >
                                        {isMigrating ? 'Migrerar...' : '☁️ Migrate to Cloud'}
                                    </Button>
                                )}
                                {twSeasons.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-2">No local seasons found to migrate.</p>
                                )}
                            </div>
                        </div>

                        {/* Card: Unit Management */}
                        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Settings size={20} className="text-purple-400" />
                                    Unit Management
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Add, edit, or remove units from the global unit list. Changes affect all players.
                                </p>
                            </div>
                            <div className="mt-auto">
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsMgmtModalOpen(true)}
                                    className="w-full"
                                >
                                    <Settings size={16} /> Manage Units
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AuditLogPanel />
                )}
            </div>

            {isMgmtModalOpen && (
                <UnitManagementModal onClose={() => setIsMgmtModalOpen(false)} />
            )}
        </div>
    );
};
