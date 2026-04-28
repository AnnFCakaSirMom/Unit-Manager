import React, { useState } from 'react';
import { useAppSelector } from '../state/store';

import { Button } from './Button';
import { Clipboard as Copy, ImportIcon, Settings, Plus, CheckSquare, Square, ChevronUp, ChevronDown, Search } from './icons';
import { SeasonManagementModal } from './SeasonManagementModal';
import { ImportTWStatsModal } from './ImportTWStatsModal';
import { EditTWAttendanceModal } from './EditTWAttendanceModal';
import { cn } from '../utils';
import { saveTWAttendanceRecords } from '../services/twAttendanceService';
import { auditService } from '../services/auditService';
import { findMatchedPlayer } from '../utils/reducerHelpers';
import { HelpIcon } from './HelpIcon';
import { HELP_CONTENT } from '../helpContent';
import type { TWPlayerRecord, TWRecordStatus } from '../types';
import { useTWStats, SortKey } from '../hooks/useTWStats';
import { formatTWStatsToDiscord, formatTWLeaderboardToDiscord } from '../utils/discordExport';

export const TWStatisticsView: React.FC = () => {
    const { userId: actorId, discordNickname: actorNickname } = useAppSelector(state => state.auth);

    const {
        twSeasons, players, twRecords,
        activeSeasonId, setActiveSeasonId,
        showAttendance, setShowAttendance,
        showDeclined, setShowDeclined,
        showAwol, setShowAwol,
        showInactive, setShowInactive,
        isNitroMode, setIsNitroMode,
        sortKey, sortAsc, handleSort,
        activeSeason, activeEvents,
        searchQuery, setSearchQuery,
        sortedStats
    } = useTWStats();

    const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
    const [isCreatingNewSeason, setIsCreatingNewSeason] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleCopy = () => {
        const text = formatTWStatsToDiscord(sortedStats, activeSeason, showAttendance, showDeclined, showAwol);
        navigator.clipboard.writeText(text);
        alert("Statistics copied to clipboard!");
    };

    const handleImportStats = async (eventId: string, jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            if (!data.signUps) throw new Error("Invalid Raid Helper format");

            const newRecords: TWPlayerRecord[] = [];
            const processedPlayerIds = new Set<string>();

            data.signUps.forEach((signup: any) => {
                const matchedPlayer = findMatchedPlayer(players, signup.name);
                if (matchedPlayer) {
                    let status: TWRecordStatus = 'AWOL';
                    if (signup.className === 'Accepted') status = 'Attended';
                    else if (signup.className === 'Declined') status = 'Declined';
                    else if (signup.className === 'Maybe') status = 'Not Attended';

                    newRecords.push({ eventId, playerId: matchedPlayer.id, status });
                    processedPlayerIds.add(matchedPlayer.id);
                }
            });

            players.forEach(p => {
                if (!p.notInHouse && !processedPlayerIds.has(p.id)) {
                    newRecords.push({ eventId, playerId: p.id, status: 'AWOL' });
                }
            });

            if (newRecords.length > 0) {
                await saveTWAttendanceRecords(newRecords);
                
                // Log the action
                const event = activeEvents.find(e => e.id === eventId);
                await auditService.logAction({
                    actor_id: actorId || '',
                    actor_nickname: actorNickname || 'Unknown',
                    action_type: 'MAJOR_CHANGE',
                    action_detail: `Imported Raid Helper stats for ${event?.date || eventId}`,
                    target_id: eventId,
                    target_name: event?.date,
                    new_data: newRecords
                });
            }
        } catch (err) {
            console.error('Failed to parse or auto-save imported records:', err);
            alert("Kunde inte importera. Kontrollera JSON-formatet.");
        }
    };


    const renderSortIcon = (key: SortKey) => {
        if (sortKey !== key) return null;
        return sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
    };

    if (twSeasons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <h2 className="text-xl mb-4">No Seasons created yet.</h2>
                <Button onClick={() => { setIsCreatingNewSeason(true); setIsSeasonModalOpen(true); }} variant="primary">
                    <Plus size={16} /> Create First Season
                </Button>
                <SeasonManagementModal isOpen={isSeasonModalOpen} onClose={() => { setIsSeasonModalOpen(false); setIsCreatingNewSeason(false); }} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 md:p-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-1">
                        TW Statistics
                        <HelpIcon helpKey="tw-stats" text={HELP_CONTENT.date_selection_warning} />
                    </h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={activeSeasonId}
                            onChange={e => setActiveSeasonId(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded p-1 text-white text-sm"
                        >
                            {twSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => { setIsCreatingNewSeason(false); setIsSeasonModalOpen(true); }}>
                            <Settings size={14} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setIsCreatingNewSeason(true); setIsSeasonModalOpen(true); }} className="text-blue-400">
                            <Plus size={14} /> New
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} disabled={activeEvents.length === 0}>
                        <Settings size={16} /> Edit Manual
                    </Button>
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} disabled={activeEvents.length === 0}>
                        <ImportIcon size={16} /> Import Raid Helper
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            const completedEvents = activeEvents.filter(e => e.date <= today);
                            const possibleCount = completedEvents.length;

                            if (possibleCount === 0) {
                                alert("No TW events have been completed yet this season.");
                                return;
                            }

                            // Calculate Leaderboard Stats (Special logic)
                            const leaderboardStats = players
                                .filter(p => !p.notInHouse) // Only active players
                                .map(p => {
                                    const records = twRecords.filter(r => completedEvents.some(e => e.id === r.eventId) && r.playerId === p.id);
                                    const attended = records.filter(r => r.status === 'Attended').length;
                                    const declined = records.filter(r => r.status === 'Declined').length;
                                    const awol = records.filter(r => r.status === 'AWOL').length;
                                    const percentage = Math.round((attended / possibleCount) * 100);

                                    return {
                                        name: p.name,
                                        attended,
                                        possibleCount,
                                        percentage,
                                        declined,
                                        awol
                                    };
                                })
                                .sort((a, b) => {
                                    // 1. Percentage (Highest first)
                                    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
                                    // 2. Attendance count (Highest first)
                                    if (b.attended !== a.attended) return b.attended - a.attended;
                                    // 3. AWOL count (Lowest first)
                                    if (a.awol !== b.awol) return a.awol - b.awol;
                                    // 4. Declined count (Lowest first)
                                    if (a.declined !== b.declined) return a.declined - b.declined;
                                    // 5. Name (Alphabetical)
                                    return a.name.localeCompare(b.name);
                                });

                            const text = formatTWLeaderboardToDiscord(leaderboardStats, activeSeason, isNitroMode);

                            navigator.clipboard.writeText(text);
                            alert("Leaderboard copied to clipboard! (Formatting optimized for Discord)");
                        }}
                        disabled={activeEvents.length === 0}
                        className="border-blue-500/50 hover:border-blue-500 text-blue-300"
                    >
                        🏆 Copy Leaderboard
                    </Button>
                    <Button variant="primary" onClick={handleCopy}>
                        <Copy size={16} /> Copy to Discord
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-3 bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                {/* Search Field */}
                <div className="relative group flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search player..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-md leading-5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-300"
                        >
                            <span className="text-xs">×</span>
                        </button>
                    )}
                </div>

                <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"></div>

                <span className="text-sm font-semibold text-gray-300 mr-1">Filters:</span>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="checkbox" className="hidden" checked={showAttendance} onChange={() => setShowAttendance(!showAttendance)} />
                    {showAttendance ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                    Show Attendance
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="checkbox" className="hidden" checked={showDeclined} onChange={() => setShowDeclined(!showDeclined)} />
                    {showDeclined ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                    Show Declined
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="checkbox" className="hidden" checked={showAwol} onChange={() => setShowAwol(!showAwol)} />
                    {showAwol ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                    Show AWOL
                </label>
                <div className="w-px h-6 bg-gray-600 mx-2 hidden sm:block"></div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="checkbox" className="hidden" checked={showInactive} onChange={() => setShowInactive(!showInactive)} />
                    {showInactive ? <CheckSquare size={16} className="text-yellow-400" /> : <Square size={16} />}
                    Include Inactive
                </label>
                <div className="w-px h-6 bg-gray-600 mx-2 hidden sm:block"></div>
                <label className="flex items-center gap-2 text-sm text-blue-300 cursor-pointer hover:text-blue-200" title="Increases message character limit to 4000 for Discord Nitro users.">
                    <input type="checkbox" className="hidden" checked={isNitroMode} onChange={() => setIsNitroMode(!isNitroMode)} />
                    {isNitroMode ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                    🚀 Discord Nitro Mode
                    <HelpIcon helpKey="nitro" text={HELP_CONTENT.nitro_mode} />
                </label>
            </div>

            {/* Table */}
            <div className="flex-grow overflow-auto border border-gray-700 rounded-lg bg-gray-900 shadow-inner">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-2 text-sm font-semibold text-gray-200 border-b border-gray-700 cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Player {renderSortIcon('name')}</div>
                            </th>
                            {showAttendance && (
                                <>
                                    <th className="p-2 text-sm font-semibold text-gray-200 border-b border-gray-700 cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort('attendance')}>
                                        <div className="flex items-center">Attendance {renderSortIcon('attendance')}</div>
                                    </th>
                                    <th className="p-2 text-sm font-semibold text-gray-200 border-b border-gray-700 cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort('percentage')}>
                                        <div className="flex items-center">% {renderSortIcon('percentage')}</div>
                                    </th>
                                </>
                            )}
                            {showDeclined && (
                                <th className="p-2 text-sm font-semibold text-gray-200 border-b border-gray-700 cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort('declined')}>
                                    <div className="flex items-center">Declined {renderSortIcon('declined')}</div>
                                </th>
                            )}
                            {showAwol && (
                                <th className="p-2 text-sm font-semibold text-gray-200 border-b border-gray-700 cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort('awol')}>
                                    <div className="flex items-center">AWOL {renderSortIcon('awol')}</div>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStats.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    No data found for this season with current filters.
                                </td>
                            </tr>
                        ) : (
                            sortedStats.map((stat, idx) => (
                                <tr key={stat.player.id} className={cn("border-b border-gray-800 hover:bg-gray-800/50 transition-colors", idx % 2 === 0 ? "bg-gray-900/20" : "")}>
                                    <td className="p-2 font-medium text-gray-200">
                                        {stat.player.name}
                                        {stat.player.notInHouse && <span className="ml-2 text-xs bg-red-900/50 text-red-200 px-2 py-0.5 rounded">Inactive</span>}
                                    </td>
                                    {showAttendance && (
                                        <>
                                            <td className="p-2 text-gray-300">
                                                <span className="font-semibold text-white">{stat.attended}</span> / {stat.possibleCount}
                                            </td>
                                            <td className="p-2">
                                                <span className={cn(
                                                    "font-bold py-0.5 px-2 rounded-md text-sm",
                                                    stat.percentage >= 80 ? "bg-green-900/30 text-green-400" :
                                                        stat.percentage >= 50 ? "bg-yellow-900/30 text-yellow-400" :
                                                            "bg-red-900/30 text-red-400"
                                                )}>
                                                    {stat.percentage}%
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    {showDeclined && (
                                        <td className="p-2 text-gray-300 font-mono">
                                            {stat.declined}
                                        </td>
                                    )}
                                    {showAwol && (
                                        <td className="p-2 text-gray-300 font-mono">
                                            {stat.awol}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <SeasonManagementModal
                isOpen={isSeasonModalOpen}
                onClose={() => { setIsSeasonModalOpen(false); setIsCreatingNewSeason(false); }}
                existingSeason={isCreatingNewSeason ? undefined : (activeSeasonId ? activeSeason : undefined)}
            />
            <ImportTWStatsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStats}
                events={activeEvents}
            />
            <EditTWAttendanceModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                events={activeEvents}
            />
        </div>
    )
};
