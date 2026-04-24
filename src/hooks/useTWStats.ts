import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { TWPlayerRecord } from '../types';

export type SortKey = 'name' | 'attendance' | 'percentage' | 'declined' | 'awol';

export const useTWStats = () => {
    const { twSeasons, twEvents, twRecords, players } = useAppState();

    const [activeSeasonId, setActiveSeasonId] = useState<string>('');
    const [showAttendance, setShowAttendance] = useState(true);
    const [showDeclined, setShowDeclined] = useState(true);
    const [showAwol, setShowAwol] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [isNitroMode, setIsNitroMode] = useState(false);

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

        const activeEventIdSet = new Set(activeEvents.map(e => e.id));
        const records = twRecords.filter(r => activeEventIdSet.has(r.eventId));

        const recordsByPlayerId = new Map<string, TWPlayerRecord[]>();
        records.forEach(r => {
            if (!recordsByPlayerId.has(r.playerId)) {
                recordsByPlayerId.set(r.playerId, []);
            }
            recordsByPlayerId.get(r.playerId)!.push(r);
        });

        const stats = players.map(p => {
            const applicableEvents = activeEvents.filter(e => {
                const isAfterJoined = !p.joinedDate || e.date >= p.joinedDate;
                const isBeforeInactive = !p.inactiveDate || e.date <= p.inactiveDate;
                return isAfterJoined && isBeforeInactive;
            });
            const possibleCount = applicableEvents.length;

            const playerRecords = recordsByPlayerId.get(p.id) ?? [];
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
            };
        });

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

    return {
        twSeasons,
        players,
        twRecords,
        activeSeasonId,
        setActiveSeasonId,
        showAttendance,
        setShowAttendance,
        showDeclined,
        setShowDeclined,
        showAwol,
        setShowAwol,
        showInactive,
        setShowInactive,
        isNitroMode,
        setIsNitroMode,
        sortKey,
        sortAsc,
        handleSort,
        activeSeason,
        activeEvents,
        sortedStats
    };
};
