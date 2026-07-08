import React, { useState, useEffect, useCallback } from 'react';
import { Save, FolderOpen, Settings, Database, Shield, List } from './icons';
import { Button } from './Button';
import { UnitManagementModal } from './UnitManagementModal';
import { AuditLogPanel } from './AuditLogPanel';
import { auditService } from '../services/auditService';
import { supabase } from '../services/supabase';
import { cn } from '../utils';
import { usePermission } from '../hooks/usePermission';


interface AdminPanelProps {
    onSave: () => void;
    onLoad: () => void;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSave, onLoad, onClose }) => {
    const { isOwner, canEditSystemConfig } = usePermission();
    const [activeTab, setActiveTab] = useState<'tools' | 'logs'>('tools');

    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
    const [suspiciousCount, setSuspiciousCount] = useState(0);

    const checkSuspicious = useCallback(async () => {
        const lastChecked = localStorage.getItem('last_checked_audit_logs') || new Date(0).toISOString();
        const count = await auditService.checkNewSuspiciousActivity(lastChecked);
        setSuspiciousCount(count);
    }, []);

    // Re-check the suspicious count when the panel mounts or the tab changes.
    useEffect(() => {
        checkSuspicious();
    }, [activeTab, checkSuspicious]);

    // Subscribe to new audit logs to update the suspicious badge live.
    // PERF: This is a separate effect keyed only on the (stable) checkSuspicious
    // callback, so it subscribes once for the component's lifetime. Previously
    // the [activeTab] dependency tore down and re-established the realtime
    // channel on every tab switch.
    useEffect(() => {
        const channel = supabase
            .channel('admin-panel-suspicious-sync')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'audit_logs'
            }, () => {
                checkSuspicious();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [checkSuspicious]);


    return (
        <div className="h-full flex flex-col bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Shield size={32} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                        {suspiciousCount > 0 && activeTab !== 'logs' && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-black"></span>
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Admin Command</h2>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">Gatekeeper / Admin / Owner</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 backdrop-blur-md shadow-inner">
                        <button 
                            onClick={() => setActiveTab('tools')}
                            className={cn(
                                "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                activeTab === 'tools' ? "text-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "text-gray-500 hover:text-gray-300"
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
                                "relative px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                activeTab === 'logs' ? "text-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <List size={16} />
                            <span>Audit Logs</span>
                            {suspiciousCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold shadow-lg">
                                    {suspiciousCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                        Exit
                    </Button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-auto pr-2 custom-scrollbar">
                {activeTab === 'tools' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Card: JSON Backup */}
                        {isOwner && (
                            <div className="bg-black/40 border border-amber-500/10 rounded-2xl p-6 flex flex-col gap-6 shadow-xl group hover:border-amber-500/20 transition-all">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                        <Database size={20} className="text-amber-500/60 group-hover:text-amber-500 transition-colors" />
                                        JSON Backup
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        Save or load a full local JSON snapshot of all data as a security backup.
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-auto">
                                    <Button variant="primary" onClick={onSave} className="flex-1 font-bold text-xs uppercase tracking-wider">
                                        <Save size={16} /> Save JSON
                                    </Button>
                                    <Button variant="secondary" onClick={onLoad} className="flex-1 font-bold text-xs uppercase tracking-wider border-white/5">
                                        <FolderOpen size={16} /> Load JSON
                                    </Button>
                                </div>
                            </div>
                        )}

                        {canEditSystemConfig && (
                            <div className="bg-black/40 border border-amber-500/10 rounded-2xl p-6 flex flex-col gap-6 shadow-xl group hover:border-amber-500/20 transition-all">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                        <Settings size={20} className="text-amber-500/60 group-hover:text-amber-500 transition-colors" />
                                        Unit Management
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        Add, edit, or remove units from the global unit list. Changes affect all players immediately.
                                    </p>
                                </div>
                                <div className="mt-auto">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsMgmtModalOpen(true)}
                                        className="w-full font-bold text-xs uppercase tracking-wider border-white/5"
                                    >
                                        <Settings size={16} /> Manage Units
                                    </Button>
                                </div>
                            </div>
                        )}
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
