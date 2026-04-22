import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Settings, Database, Shield, List } from './icons';
import { Button } from './Button';
import { UnitManagementModal } from './UnitManagementModal';
import { AuditLogPanel } from './AuditLogPanel';
import { auditService } from '../services/auditService';
import { cn } from '../utils';

interface AdminPanelProps {
    onSave: () => void;
    onLoad: () => void;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSave, onLoad, onClose }) => {

    const [activeTab, setActiveTab] = useState<'tools' | 'logs'>('tools');
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
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
