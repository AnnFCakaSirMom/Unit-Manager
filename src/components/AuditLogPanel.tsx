import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { auditService, AuditLog } from '../services/auditService';
import { restoreService } from '../services/restoreService';
import { useAppSelector } from '../state/store';
import { Search, ExportIcon, AlertTriangle, ChevronDown, ChevronRight, ChevronLeft, RefreshCcw } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../utils';
import { ConfirmationModal } from './ConfirmationModal';

export const AuditLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    
    const { userId: actorId, discordNickname: actorNickname } = useAppSelector(state => state.auth);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreLog, setRestoreLog] = useState<AuditLog | null>(null);
    
    // Filters
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { logs: data, totalCount: count } = await auditService.fetchLogs({
                name: nameFilter,
                actionType: typeFilter,
                startDate,
                endDate,
                page: currentPage,
                pageSize
            });
            setLogs(data);
            setTotalCount(count);
            
            // Mark logs as viewed locally
            localStorage.setItem('last_checked_audit_logs', new Date().toISOString());
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [nameFilter, typeFilter, startDate, endDate, currentPage, pageSize]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [nameFilter, typeFilter, startDate, endDate]);

    useEffect(() => {
        loadLogs();

        // Subscribe to new audit logs in realtime
        const channel = supabase
            .channel('audit-logs-live')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'audit_logs' 
            }, () => {
                // Re-fetch the first page to show the new log
                loadLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadLogs]);

    const handleExport = () => {
        auditService.exportToCSV(logs);
    };

    const isEligibleForRestore = (log: AuditLog) => {
        if (log.action_detail.startsWith('RESTORED:')) return false;
        return (
            log.action_detail.startsWith('Deleted player') ||
            log.action_detail.startsWith('Updated profile') ||
            log.action_detail.startsWith('Changed role') ||
            log.action_detail.startsWith('Renamed') ||
            log.action_detail.startsWith('Cleared statistics') ||
            log.action_detail.startsWith('Imported Raid Helper stats')
        );
    };

    const handleRestore = async () => {
        if (!restoreLog) return;
        setIsRestoring(true);
        try {
            const { success, message } = await restoreService.restoreFromLog(restoreLog, actorId || '', actorNickname || 'Unknown');
            if (success) {
                setRestoreLog(null);
                loadLogs();
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Restoration failed:', error);
            alert('Restoration failed. See console for details.');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                <div className="relative flex-grow min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <Input 
                        placeholder="Search by name (actor or target)..." 
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-black/60 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30 backdrop-blur-md"
                >
                    <option value="" className="bg-gray-900">All events</option>
                    <option value="SMALL_CHANGE" className="bg-gray-900">Light updates</option>
                    <option value="MAJOR_CHANGE" className="bg-gray-900">Major changes</option>
                </select>

                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40 text-sm"
                        title="Start Date"
                    />
                    <span className="text-gray-500">-</span>
                    <Input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40 text-sm"
                        title="End Date"
                    />
                </div>

                <Button variant="ghost" onClick={handleExport} className="text-amber-500/80 border border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 transition-all">
                    <ExportIcon size={18} />
                    <span>Export CSV</span>
                </Button>
            </div>

            {/* Logs Table */}
            <div className="flex-grow overflow-auto border border-white/5 rounded-xl bg-black/20 shadow-inner custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/60 backdrop-blur-md sticky top-0 z-10 shadow-lg">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-10"></th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actor</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <React.Fragment key={log.id}>
                                    <tr 
                                        className={cn(
                                            "hover:bg-amber-500/5 transition-colors cursor-pointer group",
                                            log.is_suspicious && "bg-red-500/5 border-l-2 border-l-red-500"
                                        )}
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id!)}
                                    >
                                        <td className="px-4 py-3 text-center text-gray-500 group-hover:text-amber-500 transition-colors">
                                            {expandedLogId === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                            {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-gray-200">{log.actor_nickname}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm transition-colors",
                                                    log.action_type === 'MAJOR_CHANGE' ? "text-amber-100 font-semibold" : "text-gray-300",
                                                    "group-hover:text-amber-100"
                                                )}>
                                                    {log.action_detail}
                                                </span>
                                                {log.is_suspicious && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase font-bold">
                                                        <AlertTriangle size={10} /> Suspicious
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-400">{log.target_name || '-'}</span>
                                        </td>
                                    </tr>
                                    {expandedLogId === log.id && (
                                        <tr className="bg-black/40">
                                            <td colSpan={5} className="px-14 py-6 border-y border-white/5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="text-gray-500 uppercase font-bold text-[10px] tracking-widest opacity-80">Data Analysis Snapshot</div>
                                                    {isEligibleForRestore(log) && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                                            onClick={() => setRestoreLog(log)}
                                                        >
                                                            <RefreshCcw size={14} className="mr-1.5" />
                                                            Rollback Change
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-6 text-xs font-mono">
                                                    <div className="space-y-3">
                                                        <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider opacity-60">Legacy State:</div>
                                                        <pre className="p-4 bg-black/60 border border-red-500/10 rounded-xl overflow-x-auto text-red-300/60 max-h-80 custom-scrollbar shadow-inner">
                                                            {log.old_data ? JSON.stringify(log.old_data, null, 2) : '(No data)'}
                                                        </pre>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="text-[10px] text-green-400 uppercase font-bold tracking-wider opacity-60">New State:</div>
                                                        <pre className="p-4 bg-black/60 border border-green-500/10 rounded-xl overflow-x-auto text-green-300/60 max-h-80 custom-scrollbar shadow-inner">
                                                            {log.new_data ? JSON.stringify(log.new_data, null, 2) : '(No data)'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2">
                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                    {totalCount > 0 ? (
                        <>
                            Showing <span className="text-amber-500/80">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-amber-500/80">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-gray-300 font-bold">{totalCount}</span> events
                        </>
                    ) : (
                        "No events found"
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || isLoading}
                        className="px-3 py-1 border-white/5 bg-black/40 hover:bg-white/5 transition-all"
                    >
                        <ChevronLeft size={16} />
                        <span className="text-[10px] uppercase font-bold tracking-widest ml-1">Prev</span>
                    </Button>
                    
                    <div className="flex items-center gap-1.5 mx-3">
                        <span className="text-xs bg-black/60 text-amber-500 font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 min-w-[36px] text-center shadow-inner">
                            {currentPage}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mx-1">of</span>
                        <span className="text-gray-400 font-bold text-xs">
                            {Math.ceil(totalCount / pageSize) || 1}
                        </span>
                    </div>

                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
                        className="px-3 py-1 border-white/5 bg-black/40 hover:bg-white/5 transition-all"
                    >
                        <span className="text-[10px] uppercase font-bold tracking-widest mr-1">Next</span>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
            
            <div className="text-[10px] text-gray-600 text-center uppercase tracking-widest mt-2 font-medium opacity-50">
                Log records are purged after 60 days
            </div>

            <ConfirmationModal
                isOpen={!!restoreLog}
                title="Rollback Change?"
                message={`Are you sure you want to revert this action? This will restore the previous data state. \n\nAction: ${restoreLog?.action_detail}`}
                confirmText={isRestoring ? "Restoring..." : "Confirm Rollback"}
                onConfirm={handleRestore}
                onClose={() => setRestoreLog(null)}
            />
        </div>
    );
};
