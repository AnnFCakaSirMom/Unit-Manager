import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../state/store';
import { updatePlayerLeadership, hydratePlayers } from '../state/slices/playerSlice';
import { supabase } from '../services/supabase';
import { fetchPlayersFromSupabase } from '../services/playerService';
import { syncManager } from '../services/SyncManager';
import { Input } from './Input';
import { Star, Shield, CheckSquare, HelpCircle } from './icons';
import { MemberHelpModal } from './MemberHelpModal';

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
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Auth state
    const { userId, avatarUrl } = useAppSelector(state => state.auth);

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

    // RT-1 + RT-2: Subscribe to Realtime changes on our own profile and units.
    // - RT-2: updated_at is read directly from the Realtime payload (no extra round-trip).
    // - RT-1: Any change triggers a player re-fetch via SyncManager so Redux stays in sync
    //         even when an officer edits this member's profile or units.
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    useEffect(() => {
        if (!userId) return;

        // Initial fetch — Realtime only delivers deltas, not the current state on connect.
        supabase
            .from('profiles')
            .select('updated_at')
            .eq('id', userId)
            .maybeSingle()
            .then(({ data }) => setUpdatedAt(data?.updated_at ?? null));

        const channelId = `member-profile-${Math.random().toString(36).substring(7)}`;
        let isCleaningUp = false;

        // Shared helper: re-fetch the member's player data through SyncManager
        // so debouncing and AbortController apply (safe to call multiple times quickly).
        const triggerPlayerRefresh = () => {
            if (isCleaningUp) return;
            syncManager.triggerSync('players', async (signal) => {
                const players = await fetchPlayersFromSupabase(signal);
                if (players.length > 0) dispatch(hydratePlayers(players));
            });
        };

        const channel = supabase
            .channel(channelId)
            // Listen for changes to our profile row
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                const profileId = (payload.new as any)?.id || (payload.old as any)?.id;
                if (profileId !== userId) return;

                // RT-2: Extract updated_at directly from the payload — instant, no round-trip.
                const newUpdatedAt = (payload.new as any)?.updated_at;
                if (newUpdatedAt) setUpdatedAt(newUpdatedAt);

                // RT-1: Sync profile changes (name, role, aliases, etc.) into Redux.
                triggerPlayerRefresh();
            })
            // Listen for changes to our unit rows
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_units' }, (payload) => {
                const profileId = (payload.new as any)?.profile_id || (payload.old as any)?.profile_id;
                if (profileId !== userId) return;

                // RT-1: Sync unit changes into Redux.
                triggerPlayerRefresh();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Member profile channel connected.');
                }
            });

        return () => {
            isCleaningUp = true;
            supabase.removeChannel(channel);
        };
    }, [userId, dispatch]);

    const handleLeadershipSave = useCallback(() => {
        if (!player) return;
        const value = parseInt(leadership, 10);
        const newLeadership = isNaN(value) ? 0 : value;
        if (newLeadership !== (player.totalLeadership || 0)) {
            dispatch(updatePlayerLeadership({ playerId: player.id, leadership: newLeadership }));
            setStatusMessage('Leadership saved!');
            // updated_at will be updated automatically via the Realtime subscription
        }
    }, [leadership, player, dispatch, setStatusMessage]);

    // Stats
    const ownedCount   = player?.units?.length ?? 0;
    const maxedCount   = player?.preparedUnits?.length ?? 0;
    const masteryCount = player?.masteryUnits?.length ?? 0;

    return (
        <>
            <aside
                id="member-profile-rail"
                className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 bg-black/40 backdrop-blur-xl border-r border-white/5 h-full overflow-y-auto"
            >
                {/* ── Profile: Avatar + Name ── */}
                <div className="flex items-center gap-3 pt-1">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Discord Avatar"
                            className="w-10 h-10 rounded-full border border-amber-500/20 flex-shrink-0 object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm font-bold">
                            {player?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-100 truncate" title={player?.name}>
                            {player?.name ?? '—'}
                        </p>
                        <p className="text-xs text-amber-200/60 font-medium">Member</p>
                    </div>
                </div>

                {/* ── Leadership ── */}
                <div>
                    <label htmlFor="rail-leadership" className="block text-[10px] uppercase font-bold text-gray-300 tracking-wider mb-1.5">
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
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Barrack
                    </p>
                    <div className="flex flex-col gap-2">

                        {/* Owned units */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                                <CheckSquare size={13} className="flex-shrink-0 text-blue-400" />
                                <span className="text-xs font-medium">Owned</span>
                            </div>
                            <span className="text-xs font-bold text-gray-100">
                                {ownedCount}
                                <span className="text-gray-500 font-normal"> / {totalUnits}</span>
                            </span>
                        </div>

                        {/* Maxed units */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                                <Star size={13} className="flex-shrink-0 text-green-400 fill-green-400/20" />
                                <span className="text-xs font-medium">Maxed</span>
                            </div>
                            <span className="text-xs font-bold text-gray-100">{maxedCount}</span>
                        </div>

                        {/* Full Mastery units */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                                <Shield size={13} className="flex-shrink-0 text-yellow-400" />
                                <span className="text-xs font-medium">Full Mastery</span>
                            </div>
                            <span className="text-xs font-bold text-gray-100">{masteryCount}</span>
                        </div>

                    </div>
                </div>

                {/* ── Metadata ── */}
                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Joined</span>
                        <span className="text-xs text-gray-400">{formatJoinedDate(player?.joinedDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-600">Updated</span>
                        <span className="text-[11px] text-gray-500">{formatUpdatedAt(updatedAt)}</span>
                    </div>
                </div>

                {/* ── Help Button ── */}
                <button
                    onClick={() => setIsHelpOpen(true)}
                    className="mt-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 bg-black/40 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 hover:text-amber-100 hover:border-amber-500/40 transition-all shadow-lg"
                >
                    <HelpCircle size={14} className="text-amber-500/70" />
                    <span>How to use the Barrack</span>
                </button>
            </aside>

            <MemberHelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </>

    );
};
