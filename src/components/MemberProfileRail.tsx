import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { useAppSelector, useAppDispatch } from '../state/store';
import { updatePlayerLeadership } from '../state/slices/playerSlice';
import { supabase } from '../services/supabase';
import { Input } from './Input';
import { Star, Shield, CheckSquare } from './icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberProfileRailProps {
    setStatusMessage: (msg: string) => void;
}

// ── Helper: Format updated_at timestamp ──────────────────────────────────────

function formatUpdatedAt(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return `Today ${timeStr}`;
    if (diffDays === 1) return `Yesterday ${timeStr}`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${timeStr}`;
}

// ── Helper: Format joined date ───────────────────────────────────────────────

function formatJoinedDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MemberProfileRail: React.FC<MemberProfileRailProps> = ({ setStatusMessage }) => {
    const dispatch = useAppDispatch();

    // Auth state
    const { userId, avatarUrl } = useSelector((state: RootState) => state.auth);

    // Player data — the logged-in member's own profile
    const players = useAppSelector(state => state.player.players);
    const player = useMemo(
        () => players.find(p => p.id === userId),
        [players, userId]
    );

    // Unit totals
    const unitConfig = useAppSelector(state => state.unit.unitConfig);
    const totalUnits = useMemo(
        () => Object.values(unitConfig.tiers).flat().length,
        [unitConfig]
    );

    // Local leadership state
    const [leadership, setLeadership] = useState('');
    useEffect(() => {
        setLeadership(String(player?.totalLeadership || ''));
    }, [player?.totalLeadership]);

    // updated_at from Supabase
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    useEffect(() => {
        if (!userId) return;
        supabase
            .from('profiles')
            .select('updated_at')
            .eq('id', userId)
            .maybeSingle()
            .then(({ data }) => setUpdatedAt(data?.updated_at ?? null));
    }, [userId]);

    const handleLeadershipSave = useCallback(() => {
        if (!player) return;
        const value = parseInt(leadership, 10);
        const newLeadership = isNaN(value) ? 0 : value;
        if (newLeadership !== (player.totalLeadership || 0)) {
            dispatch(updatePlayerLeadership({ playerId: player.id, leadership: newLeadership }));
            setStatusMessage('Leadership saved!');
            // Refresh updated_at locally after save
            setUpdatedAt(new Date().toISOString());
        }
    }, [leadership, player, dispatch, setStatusMessage]);

    // Stats
    const ownedCount   = player?.units?.length ?? 0;
    const maxedCount   = player?.preparedUnits?.length ?? 0;
    const masteryCount = player?.masteryUnits?.length ?? 0;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <aside
            id="member-profile-rail"
            className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 bg-gray-900 border-r border-gray-800 h-full overflow-y-auto"
        >
            {/* ── Profile: Avatar + Name ── */}
            <div className="flex items-center gap-3 pt-1">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Discord Avatar"
                        className="w-10 h-10 rounded-full border border-gray-700 flex-shrink-0 object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm font-bold">
                        {player?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate" title={player?.name}>
                        {player?.name ?? '—'}
                    </p>
                    <p className="text-xs text-blue-400/80 font-medium">Member</p>
                </div>
            </div>

            {/* ── Leadership ── */}
            <div>
                <label htmlFor="rail-leadership" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                    Total Leadership
                </label>
                <Input
                    id="rail-leadership"
                    type="number"
                    value={leadership}
                    onChange={e => setLeadership(e.target.value)}
                    onBlur={handleLeadershipSave}
                    placeholder="e.g. 700"
                    className="w-full"
                />
            </div>

            {/* ── Stats Badges ── */}
            <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Barrack
                </p>
                <div className="flex flex-col gap-2">

                    {/* Owned units */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-800/60 border border-gray-700/70">
                        <div className="flex items-center gap-2 text-gray-300">
                            <CheckSquare size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs">Owned</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-200">
                            {ownedCount}
                            <span className="text-gray-500 font-normal"> / {totalUnits}</span>
                        </span>
                    </div>

                    {/* Maxed units */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-800/60 border border-gray-700/70">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Star size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs">Maxed</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-200">{maxedCount}</span>
                    </div>

                    {/* Full Mastery units */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-800/60 border border-gray-700/70">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Shield size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs">Full Mastery</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-200">{masteryCount}</span>
                    </div>

                </div>
            </div>

            {/* ── Metadata ── */}
            <div className="flex flex-col gap-1.5 border-t border-gray-800 pt-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Joined</span>
                    <span className="text-xs text-gray-300">{formatJoinedDate(player?.joinedDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Updated</span>
                    <span className="text-[11px] text-gray-500">{formatUpdatedAt(updatedAt)}</span>
                </div>
            </div>

            {/* ── Quick Tips ── */}
            <div className="border border-gray-800 rounded-md p-3 mt-auto">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Quick Tips
                </p>
                <ul className="space-y-1 text-[11px] text-gray-600 leading-relaxed">
                    <li>⭐ Click the star to favorite a unit</li>
                    <li>🟡 Yellow background = Full Mastery</li>
                    <li>🟢 Green ring = Maxed unit</li>
                </ul>
            </div>
        </aside>
    );
};
