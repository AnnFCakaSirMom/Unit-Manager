import React, { useState, useEffect, useCallback } from 'react';
import { auditService, AuditLog } from '../services/auditService';
import { Search, ExportIcon, AlertTriangle, ChevronDown, ChevronRight, ChevronLeft } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../utils';

export const AuditLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    
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
    }, [loadLogs]);

    const handleExport = () => {
        auditService.exportToCSV(logs);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 bg-gray-800/40 p-4 rounded-lg border border-gray-700/50">
                <div className="relative flex-grow min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All events</option>
                    <option value="SMALL_CHANGE">Light updates</option>
                    <option value="MAJOR_CHANGE">Major changes</option>
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

                <Button variant="ghost" onClick={handleExport} className="text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10">
                    <ExportIcon size={18} />
                    <span>Export CSV</span>
                </Button>
            </div>

            {/* Logs Table */}
            <div className="flex-grow overflow-auto border border-gray-700 rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800/80 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-10"></th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Actor</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Target</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <React.Fragment key={log.id}>
                                    <tr 
                                        className={cn(
                                            "hover:bg-gray-700/30 transition-colors cursor-pointer",
                                            log.is_suspicious && "bg-red-500/5 border-l-2 border-l-red-500"
                                        )}
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id!)}
                                    >
                                        <td className="px-4 py-3 text-center text-gray-500">
                                            {expandedLogId === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                                            {log.created_at ? new Date(log.created_at).toLocaleString('sv-SE', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-gray-200">{log.actor_nickname}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm",
                                                    log.action_type === 'MAJOR_CHANGE' ? "text-indigo-300 font-semibold" : "text-gray-300"
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
                                        <tr className="bg-gray-900/50">
                                            <td colSpan={5} className="px-14 py-4">
                                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                                    <div className="space-y-2">
                                                        <div className="text-gray-500 uppercase font-bold">Before:</div>
                                                        <pre className="p-3 bg-red-500/5 border border-red-500/10 rounded-md overflow-x-auto text-red-300/80">
                                                            {log.old_data ? JSON.stringify(log.old_data, null, 2) : '(No data)'}
                                                        </pre>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-gray-500 uppercase font-bold">After:</div>
                                                        <pre className="p-3 bg-green-500/5 border border-green-500/10 rounded-md overflow-x-auto text-green-300/80">
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
                <div className="text-xs text-gray-500 font-medium">
                    {totalCount > 0 ? (
                        <>
                            Showing <span className="text-gray-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-300">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-gray-300 font-bold">{totalCount}</span> results
                        </>
                    ) : (
                        "No results found"
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || isLoading}
                        className="px-2 py-1"
                    >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-2">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Page</span>
                        <span className="bg-gray-800 text-indigo-400 font-bold text-sm px-2.5 py-1 rounded border border-gray-700 min-w-[32px] text-center">
                            {currentPage}
                        </span>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-tighter">of</span>
                        <span className="text-gray-400 font-medium text-sm">
                            {Math.ceil(totalCount / pageSize) || 1}
                        </span>
                    </div>

                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
                        className="px-2 py-1"
                    >
                        <span>Next</span>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
            
            <div className="text-[10px] text-gray-500 text-center uppercase tracking-widest mt-2">
                Logs are automatically deleted after 60 days
            </div>
        </div>
    );
};
