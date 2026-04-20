import React, { useState } from 'react';
import { Save, FolderOpen, Settings, Database, Shield } from './icons';
import { Button } from './Button';
import { UnitManagementModal } from './UnitManagementModal';
import { useAppState, useAppDispatch } from '../AppContext';
import { saveTWSeason, saveTWAttendanceRecords, fetchTWAttendanceData } from '../services/twAttendanceService';
import { upsertPlayer } from '../services/playerService';
import { upsertGroup } from '../services/groupService';

interface AdminPanelProps {
    onSave: () => void;
    onLoad: () => void;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSave, onLoad, onClose }) => {
    const { players, groups, twSeasons, twEvents, twRecords } = useAppState();
    const dispatch = useAppDispatch();

    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'done' | 'error'>('idle');

    const handleMigrateToCloud = async () => {
        if (isMigrating) return;
        setIsMigrating(true);
        setMigrationStatus('idle');
        try {
            // 1. Players & Units
            for (const player of players) {
                await upsertPlayer(player);
            }
            // 2. Groups
            for (let i = 0; i < groups.length; i++) {
                await upsertGroup(groups[i], i);
            }
            // 3. Seasons & Events (order matters for FK constraints)
            for (const season of twSeasons) {
                const seasonEvents = twEvents.filter(e => e.seasonId === season.id);
                await saveTWSeason(season, seasonEvents);
            }
            // 4. Attendance Records
            if (twRecords.length > 0) {
                await saveTWAttendanceRecords(twRecords);
            }
            setMigrationStatus('done');
            // Refresh local state from DB
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
            <div className="flex items-center gap-3 mb-6">
                <Shield size={28} className="text-indigo-400" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                    <p className="text-sm text-gray-400">Centralized management for Gatekeepers, Admins & Owners.</p>
                </div>
            </div>

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

            {isMgmtModalOpen && (
                <UnitManagementModal onClose={() => setIsMgmtModalOpen(false)} />
            )}
        </div>
    );
};
