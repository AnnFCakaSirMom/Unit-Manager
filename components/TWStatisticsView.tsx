import React, { useState, useMemo, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../AppContext';
import { Button } from './Button';
import { Clipboard as Copy, ImportIcon, Settings, Plus, CheckSquare, Square, ChevronUp, ChevronDown } from './icons';
import { SeasonManagementModal } from './SeasonManagementModal';
import { ImportTWStatsModal } from './ImportTWStatsModal';
import { EditTWAttendanceModal } from './EditTWAttendanceModal';
import { cn } from '../utils';

type SortKey = 'name' | 'attendance' | 'percentage' | 'declined' | 'awol';

export const TWStatisticsView: React.FC = () => {
    const { twSeasons, twEvents, twRecords, players } = useAppState();
    const dispatch = useAppDispatch();

    const [activeSeasonId, setActiveSeasonId] = useState<string>('');
    const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
    const [isCreatingNewSeason, setIsCreatingNewSeason] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [showAttendance, setShowAttendance] = useState(true);
    const [showDeclined, setShowDeclined] = useState(true);
    const [showAwol, setShowAwol] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    const [sortKey, setSortKey] = useState<SortKey>('percentage');
    const [sortAsc, setSortAsc] = useState(false);

    // Auto-select season logic
    useEffect(() => {
        if (!activeSeasonId && twSeasons.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const active = twSeasons.find(s => s.startDate <= today && s.endDate >= today);
            if (active) {
                setActiveSeasonId(active.id);
            } else {
                const sortedSeasons = [...twSeasons].sort((a, b) => b.endDate.localeCompare(a.endDate));
                setActiveSeasonId(sortedSeasons[0].id);
            }
        }
    }, [twSeasons, activeSeasonId]);

    const activeSeason = useMemo(() => twSeasons.find(s => s.id === activeSeasonId), [twSeasons, activeSeasonId]);
    const activeEvents = useMemo(() => twEvents.filter(e => e.seasonId === activeSeasonId), [twEvents, activeSeasonId]);

    const playerStats = useMemo(() => {
        if (!activeSeason) return [];

        const records = twRecords.filter(r => activeEvents.some(e => e.id === r.eventId));

        const stats = players.map(p => {
            const applicableEvents = activeEvents.filter(e => {
                const isAfterJoined = !p.joinedDate || e.date >= p.joinedDate;
                const isBeforeInactive = !p.inactiveDate || e.date <= p.inactiveDate;
                return isAfterJoined && isBeforeInactive;
            });
            const possibleCount = applicableEvents.length;

            const playerRecords = records.filter(r => r.playerId === p.id);
            const attended = playerRecords.filter(r => r.status === 'Attended').length;
            const declined = playerRecords.filter(r => r.status === 'Declined').length;
            const awol = playerRecords.filter(r => r.status === 'AWOL').length;
            const percentage = possibleCount > 0 ? Math.round((attended / possibleCount) * 100) : 0;

            return {
                player: p,
                attended,
                possibleCount,
                percentage,
                declined,
                awol
            }
        });

        // Filter out players who had 0 possible attendance or are flagged inactive if we hide inactive
        return showInactive ? stats : stats.filter(s => s.possibleCount > 0 && !s.player.notInHouse);

    }, [activeSeason, activeEvents, twRecords, players, showInactive]);

    const sortedStats = useMemo(() => {
        return [...playerStats].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            switch (sortKey) {
                case 'name': valA = a.player.name.toLowerCase(); valB = b.player.name.toLowerCase(); break;
                case 'attendance': valA = a.attended; valB = b.attended; break;
                case 'percentage': valA = a.percentage; valB = b.percentage; break;
                case 'declined': valA = a.declined; valB = b.declined; break;
                case 'awol': valA = a.awol; valB = b.awol; break;
                default: valA = a.percentage; valB = b.percentage; break;
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [playerStats, sortKey, sortAsc]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(false); // default descending when switching
        }
    };

    const handleCopy = () => {
        let text = `\`\`\`\n`;
        text += `--- TW Statistics: ${activeSeason?.name || 'Unknown'} ---\n\n`;

        // Format headers
        text += `Player`.padEnd(20, ' ');
        if (showAttendance) text += `Attended`.padEnd(12, ' ') + `%`.padEnd(6, ' ');
        if (showDeclined) text += `Declined`.padEnd(10, ' ');
        if (showAwol) text += `AWOL`.padEnd(6, ' ');
        text += `\n` + `-`.repeat(54) + `\n`;

        sortedStats.forEach(s => {
            text += s.player.name.padEnd(20, ' ');
            if (showAttendance) text += `${s.attended}/${s.possibleCount}`.padEnd(12, ' ') + `${s.percentage}%`.padEnd(6, ' ');
            if (showDeclined) text += `${s.declined}`.padEnd(10, ' ');
            if (showAwol) text += `${s.awol}`.padEnd(6, ' ');
            text += `\n`;
        });
        text += `\`\`\``;

        navigator.clipboard.writeText(text);
        alert("Statistics copied to clipboard!");
    };

    const handleImportStats = (eventId: string, jsonString: string) => {
        dispatch({ type: 'IMPORT_TW_STATISTICS_RAID_HELPER', payload: { eventId, jsonString } });
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
                    <h2 className="text-xl font-bold text-white mb-1">TW Statistics</h2>
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

                            let text = `🏆 --- TW LEADERBOARD: ${activeSeason?.name || 'Unknown'} --- 🏆\n`;
                            text += `*Based on ${possibleCount} completed TW sessions*\n\n`;
                            text += `\`\`\`\n`;

                            leaderboardStats.forEach((s, idx) => {
                                const rank = idx + 1;
                                let emoji = '';

                                // Placeholders/Tiers
                                if (rank === 1) emoji = '🥇 ';
                                else if (rank === 2) emoji = '🥈 ';
                                else if (rank === 3) emoji = '🥉 ';
                                else if (rank <= 10) emoji = '✨ ';
                                else if (s.percentage >= 50) emoji = '🔹 ';
                                else if (s.percentage > 0) emoji = '🔸 ';
                                else emoji = '♦️ ';

                                const rankStr = `${rank}.`.padEnd(4, ' ');
                                const nameStr = s.name.padEnd(20, ' ');
                                const countStr = `[${s.attended}/${s.possibleCount}]`.padEnd(10, ' ');
                                const pctStr = `${s.percentage}%`.padStart(5, ' ');

                                text += `${emoji}${rankStr}${nameStr}${countStr}${pctStr}\n`;

                                // Auto-split into multiple code blocks if Nitro limit or standard limit is approached
                                // Using 1800 to be safe and give room for the legend
                                if (text.length % 1900 > 1700) {
                                    text += `\`\`\`\n\`\`\`\n`;
                                }
                            });

                            text += `\`\`\`\n`;
                            text += `**Legend:** 🔹 50%+ | 🔸 <50% | ♦️ 0%\n`;
                            text += `*⚠️ Attendance prioritizes informed absence (Declined) over no-shows (AWOL).*`;

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
                    Include Inactive & Zero-Event Players
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
