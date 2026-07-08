import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { Player } from '../types';

const selectPlayers = (state: RootState) => state.player.players;

/**
 * Memoized map of players keyed by id for O(1) lookups in render paths,
 * instead of players.find() per item. Recomputed only when the players array
 * reference changes, and shared across every component that reads it.
 */
export const selectPlayersById = createSelector(
    [selectPlayers],
    (players): Map<string, Player> => {
        const map = new Map<string, Player>();
        for (const p of players) map.set(p.id, p);
        return map;
    }
);
