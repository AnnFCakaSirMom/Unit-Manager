// components/UnitSearch.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Player } from '../types';
import { Search, X, CheckIcon } from './icons';
import { Button } from './Button';
import { Select } from './Select';
import { useAppSelector, useAppDispatch } from '../state/store';
import { movePlayerBetweenGroups, addPlayerToGroup, removePlayerFromGroup } from '../state/slices/groupSlice';

interface UnitSearchProps {
    players: Player[];
    onSelectPlayer: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

const MAX_TAGS = 3;

// Per-player result after scoring
interface ScoredPlayer {
    player: Player;
    matchCount: number;       // how many of the searched units this player has
    maxedCount: number;       // how many of those are in preparedUnits
    masteryCount: number;     // how many of those are in masteryUnits
    unitStatuses: {           // per-unit status for each searched unit
        unitName: string;
        owned: boolean;
        isMaxed: boolean;
        isFullMastery: boolean;
    }[];
}

export const UnitSearch: React.FC<UnitSearchProps> = ({ players, onSelectPlayer, searchTerm, setSearchTerm }) => {
    // selectedTags = the confirmed multi-unit search terms
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    // inputValue = what the user is currently typing in the text box
    const [inputValue, setInputValue] = useState('');
    // acceptedOnly = filter results to TW-accepted players only
    const [acceptedOnly, setAcceptedOnly] = useState(false);

    const twAttendance = useAppSelector(state => state.tw.twAttendance);
    const groups = useAppSelector(state => state.group.groups);
    const dispatch = useAppDispatch();
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep legacy searchTerm prop in sync so parent components that rely on it still work
    useEffect(() => {
        setSearchTerm(selectedTags.join('; '));
    }, [selectedTags, setSearchTerm]);

    // Sync inward: if the parent clears searchTerm externally, clear our internal state too
    useEffect(() => {
        if (!searchTerm) {
            setSelectedTags([]);
            setInputValue('');
        }
    }, [searchTerm]);

    // --- Autocomplete suggestions based on current inputValue ---
    const suggestedUnits = useMemo(() => {
        const trimmed = inputValue.trim();
        if (!trimmed) return [];

        const activePlayers = players.filter(p => !p.notInHouse);
        const allUnits = activePlayers.flatMap(p => p.units || []);
        const uniqueUnits = [...new Set(allUnits)];
        const lowerTrimmed = trimmed.toLowerCase();

        return uniqueUnits
            .filter(unitName =>
                unitName.toLowerCase().includes(lowerTrimmed) &&
                !selectedTags.includes(unitName)          // don't re-suggest already-tagged units
            )
            .sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(lowerTrimmed);
                const bStarts = b.toLowerCase().startsWith(lowerTrimmed);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            });
    }, [inputValue, players, selectedTags]);

    // --- Scored & sorted player results based on selectedTags ---
    const scoredPlayers = useMemo((): ScoredPlayer[] => {
        if (selectedTags.length === 0) return [];

        const activePlayers = players.filter(p => !p.notInHouse);

        const results: ScoredPlayer[] = activePlayers
            .map(player => {
                const unitStatuses = selectedTags.map(unitName => ({
                    unitName,
                    owned: player.units?.includes(unitName) ?? false,
                    isMaxed: player.preparedUnits?.includes(unitName) ?? false,
                    isFullMastery: player.masteryUnits?.includes(unitName) ?? false,
                }));

                const matchCount = unitStatuses.filter(u => u.owned).length;
                const maxedCount = unitStatuses.filter(u => u.isMaxed).length;
                const masteryCount = unitStatuses.filter(u => u.isFullMastery).length;

                return { player, matchCount, maxedCount, masteryCount, unitStatuses };
            })
            .filter(r => r.matchCount > 0);   // only show players who have at least 1

        // Sort: primary = matchCount DESC, secondary = maxedCount DESC, tertiary = masteryCount DESC
        results.sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            if (b.maxedCount !== a.maxedCount) return b.maxedCount - a.maxedCount;
            return b.masteryCount - a.masteryCount;
        });

        return results;
    }, [selectedTags, players]);

    // Apply acceptedOnly filter on top of scoring
    const displayedPlayers = useMemo(() => {
        if (!acceptedOnly) return scoredPlayers;
        return scoredPlayers.filter(({ player }) =>
            twAttendance.some(a => a.matchedPlayerId === player.id && a.status === 'Accepted')
        );
    }, [scoredPlayers, acceptedOnly, twAttendance]);

    // --- Handlers ---
    const handleTagAdd = (unitName: string) => {
        if (selectedTags.length >= MAX_TAGS || selectedTags.includes(unitName)) return;
        setSelectedTags(prev => [...prev, unitName]);
        setInputValue('');
        inputRef.current?.focus();
    };

    const handleTagRemove = (unitName: string) => {
        setSelectedTags(prev => prev.filter(t => t !== unitName));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Backspace on empty input removes the last tag
        if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
            setSelectedTags(prev => prev.slice(0, -1));
        }
    };

    const handleClearAll = () => {
        setSelectedTags([]);
        setInputValue('');
        onSelectPlayer(null);
        setSearchTerm('');
    };

    const handlePlayerSelect = (playerId: string) => {
        onSelectPlayer(playerId);
    };

    const isAtMax = selectedTags.length >= MAX_TAGS;
    const showSuggestions = inputValue.trim().length > 0 && !isAtMax;
    const showResults = selectedTags.length > 0;

    return (
        <div className="border-t border-gray-700 mt-2 pt-2">

            {/* ── Tag Input Container ── */}
            <div
                className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 bg-black/40 border border-amber-500/10 rounded-md focus-within:border-amber-500/40 focus-within:bg-black/60 backdrop-blur-sm transition-all cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                <Search className="text-gray-500 shrink-0 self-center" size={16} />

                {/* Rendered Tags */}
                {selectedTags.map(tag => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-200 transition-all"
                    >
                        {tag}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleTagRemove(tag); }}
                            className="text-amber-400/60 hover:text-amber-200 transition-colors ml-0.5"
                            aria-label={`Remove ${tag}`}
                        >
                            <X size={11} />
                        </button>
                    </span>
                ))}

                {/* Text Input (hidden when at max) */}
                {!isAtMax && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedTags.length === 0 ? 'Search by unit name...' : 'Add another unit...'}
                        className="flex-1 min-w-[100px] bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
                        aria-label="Unit search input"
                    />
                )}

                {isAtMax && (
                    <span className="flex-1 text-xs text-amber-500/50 italic self-center pl-1">
                        Max 3 units
                    </span>
                )}

                {/* Clear button */}
                {(selectedTags.length > 0 || inputValue) && (
                    <button
                        onClick={handleClearAll}
                        className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 self-center"
                        aria-label="Clear search"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── Accepted-only checkbox (only shown if TW attendance is loaded) ── */}
            {twAttendance.length > 0 && (
                <label className="flex items-center gap-2 mt-2 px-1 cursor-pointer select-none group w-fit">
                    <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                            acceptedOnly
                                ? 'bg-green-600 border-green-500'
                                : 'bg-black/40 border-gray-600 group-hover:border-green-600/50'
                        }`}
                    >
                        {acceptedOnly && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <input
                        type="checkbox"
                        checked={acceptedOnly}
                        onChange={e => setAcceptedOnly(e.target.checked)}
                        className="sr-only"
                        aria-label="Show accepted players only"
                    />
                    <span className={`text-xs transition-colors ${
                        acceptedOnly ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                        Accepted only
                    </span>
                </label>
            )}

            {/* ── Dropdown area ── */}
            <div className={`mt-1.5 rounded-md overflow-y-auto transition-all ${(showSuggestions || showResults) ? 'max-h-96 bg-gray-700/50' : 'max-h-0'}`}>

                {/* Step 1: Autocomplete Suggestions */}
                {showSuggestions && (
                    <div className="p-2 space-y-0.5">
                        <p className="text-xs text-gray-400 mb-1.5 px-1">Matching units:</p>
                        {suggestedUnits.length > 0 ? (
                            suggestedUnits.map((unitName, index) => (
                                <Button
                                    key={index}
                                    onClick={() => handleTagAdd(unitName)}
                                    variant="ghost"
                                    className="w-full justify-start p-1.5 rounded hover:bg-amber-500/10 hover:text-amber-200 font-medium h-auto text-gray-300 text-sm"
                                >
                                    {unitName}
                                </Button>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-2">No units found.</p>
                        )}
                    </div>
                )}

                {/* Step 2: Scored Player Results */}
                {showResults && !showSuggestions && (
                    <div className="p-2">
                        <p className="text-xs text-gray-400 mb-2 px-1 border-b border-gray-600 pb-1.5">
                            Players matching {selectedTags.length > 1 ? `${selectedTags.length} units` : `"${selectedTags[0]}"`}:
                        </p>
                        {displayedPlayers.length > 0 ? (
                            <div className="space-y-1.5">
                                {displayedPlayers.map(({ player, matchCount, unitStatuses }) => {
                                    const assignedGroup = groups.find(g => g.members.some(m => m.playerId === player.id));
                                    const isAttending = twAttendance.some(a => a.matchedPlayerId === player.id && a.status === 'Accepted');
                                    const totalSearched = selectedTags.length;
                                    const hasAll = matchCount === totalSearched;

                                    return (
                                        <div
                                            key={player.id}
                                            className={`p-2 rounded-md border transition-colors ${
                                                hasAll
                                                    ? 'bg-gray-800/90 border-amber-500/20 hover:border-amber-500/40'
                                                    : 'bg-gray-800/60 border-gray-600/60 hover:border-gray-500'
                                            }`}
                                        >
                                            {/* Player name row */}
                                            <div className="flex justify-between items-center mb-1.5">
                                                <Button
                                                    onClick={() => handlePlayerSelect(player.id)}
                                                    variant="ghost"
                                                    className="justify-start font-medium p-0 h-auto hover:bg-transparent px-1 text-left flex-grow"
                                                >
                                                    <span className="flex items-center gap-1.5 text-gray-200 text-sm">
                                                        {player.name}
                                                        {isAttending && <CheckIcon size={13} className="text-green-400" title="Accepted Attendance" />}
                                                    </span>
                                                </Button>

                                                {/* Match score badge */}
                                                {totalSearched > 1 && (
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mr-1 ${
                                                        hasAll
                                                            ? 'bg-amber-500/20 text-amber-300'
                                                            : 'bg-gray-700 text-gray-400'
                                                    }`}>
                                                        {matchCount}/{totalSearched}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Per-unit status pills */}
                                            {totalSearched > 1 && (
                                                <div className="flex flex-wrap gap-1 px-1 mb-1.5">
                                                    {unitStatuses.map(({ unitName, owned, isMaxed, isFullMastery }) => (
                                                        <span
                                                            key={unitName}
                                                            title={`${unitName}${isMaxed ? ' · Maxed' : ''}${isFullMastery ? ' · Full Mastery' : ''}`}
                                                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                                                                owned
                                                                    ? 'bg-gray-700/80 border-gray-500 text-gray-300'
                                                                    : 'bg-gray-900/50 border-gray-700/50 text-gray-600 line-through'
                                                            }`}
                                                        >
                                                            {unitName}
                                                            {isMaxed && (
                                                                <span
                                                                    className="w-2 h-2 rounded-full bg-green-500 border border-green-300 inline-block"
                                                                    title="Maxed Unit"
                                                                />
                                                            )}
                                                            {isFullMastery && (
                                                                <span
                                                                    className="w-2 h-2 rounded-sm bg-yellow-500 border border-yellow-300 inline-block"
                                                                    title="Full Mastery"
                                                                />
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Single-unit mode: show Maxed/Mastery icons inline */}
                                            {totalSearched === 1 && (
                                                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                                                    {unitStatuses[0].isMaxed && (
                                                        <div className="w-3 h-3 rounded-full bg-green-500 border border-green-300 shadow-sm" title="Maxed Unit" />
                                                    )}
                                                    {unitStatuses[0].isFullMastery && (
                                                        <div className="w-3 h-3 rounded-sm bg-yellow-500 border border-yellow-300 shadow-sm" title="Full Mastery" />
                                                    )}
                                                </div>
                                            )}

                                            {/* Group Dropdown */}
                                            {groups.length > 0 && (
                                                <div className="px-1 pb-0.5">
                                                    <Select
                                                        value={assignedGroup ? assignedGroup.id : ""}
                                                        onChange={(e) => {
                                                            const targetGroupId = e.target.value;
                                                            if (targetGroupId) {
                                                                if (assignedGroup) {
                                                                    dispatch(movePlayerBetweenGroups({ playerId: player.id, sourceGroupId: assignedGroup.id, targetGroupId }));
                                                                } else {
                                                                    dispatch(addPlayerToGroup({ groupId: targetGroupId, playerId: player.id }));
                                                                }
                                                            } else if (assignedGroup) {
                                                                dispatch(removePlayerFromGroup({ groupId: assignedGroup.id, playerId: player.id }));
                                                            }
                                                        }}
                                                        className={`w-full text-xs py-1 px-2 h-auto focus:ring-1 ${assignedGroup ? 'bg-indigo-900/40 text-indigo-200 border-indigo-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}
                                                    >
                                                        <option value="">No Group</option>
                                                        {groups.map(g => {
                                                            const isFull = g.members.length >= 5 && (!assignedGroup || assignedGroup.id !== g.id);
                                                            return (
                                                                <option key={g.id} value={g.id} disabled={isFull}>
                                                                    {g.name} {isFull ? '(Full)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-3">No players found with {selectedTags.length > 1 ? 'these units' : 'that unit'}{acceptedOnly ? ' (accepted only)' : ''}.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};