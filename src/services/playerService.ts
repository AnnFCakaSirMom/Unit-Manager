/**
 * playerService.ts
 * Handles fetching player data from Supabase and transforming it
 * into the Player interface used by the existing app state.
 */
import { supabase } from './supabase';
import type { Player } from '../types';

type ProfileUnitRow = {
  unit_name: string;
  is_owned: boolean;
  is_prepared: boolean;
  is_mastery: boolean;
  is_favorite: boolean;
};

type ProfileRow = {
  id: string;
  discord_nickname: string;
  display_name: string | null;
  total_leadership: number | null;
  joined_date: string | null;
  inactive_date: string | null;
  not_in_house: boolean;
  internal_notes: string | null;
  discord_aliases: string[] | null;
  profile_units: ProfileUnitRow[];
};

/**
 * Transforms a flat Supabase profile row (with nested profile_units)
 * back into the Player interface the app expects.
 *
 * NOTE: A unit can appear in multiple lists simultaneously.
 * E.g. a unit with is_owned=true AND is_favorite=true appears in
 * both `units[]` and `favoriteUnits[]`. This mirrors the original design.
 */
function transformProfileToPlayer(row: ProfileRow): Player {
  const unitRows = row.profile_units ?? [];

  return {
    id: row.id,
    name: row.display_name ?? row.discord_nickname,
    // Each list is independent — a unit can be in multiple lists at once
    units:        unitRows.filter(u => u.is_owned).map(u => u.unit_name),
    preparedUnits: unitRows.filter(u => u.is_prepared).map(u => u.unit_name),
    masteryUnits:  unitRows.filter(u => u.is_mastery).map(u => u.unit_name),
    favoriteUnits: unitRows.filter(u => u.is_favorite).map(u => u.unit_name),
    notInHouse:    row.not_in_house,
    info:          row.internal_notes ?? undefined,
    totalLeadership: row.total_leadership ?? 0,
    joinedDate:    row.joined_date    ?? undefined,
    inactiveDate:  row.inactive_date  ?? null,
    aliases:       row.discord_aliases ?? [],
  };
}

/**
 * Fetches all profiles with their associated units in a single round trip.
 * Returns an empty array (silent fallback) if the request fails,
 * so the app remains functional even when offline.
 */
export async function fetchPlayersFromSupabase(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      discord_nickname,
      display_name,
      total_leadership,
      joined_date,
      inactive_date,
      not_in_house,
      internal_notes,
      discord_aliases,
      profile_units (
        unit_name,
        is_owned,
        is_prepared,
        is_mastery,
        is_favorite
      )
    `);

  if (error) {
    console.warn('[playerService] Supabase fetch failed, using silent fallback:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as ProfileRow[]).map(transformProfileToPlayer);
}
