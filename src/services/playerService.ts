/**
 * playerService.ts
 * Handles fetching player data from Supabase and transforming it
 * into the Player interface used by the existing app state.
 */
import { supabase } from './supabase';
import type { Player, UserRole } from '../types';

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
  role: UserRole | null;
  internal_notes: string | null;
  discord_aliases: string[] | null;
  profile_units: ProfileUnitRow[];
  player_info: { internal_notes: string }[];
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
    info:          row.player_info?.[0]?.internal_notes ?? undefined,
    player_info:   row.player_info,
    totalLeadership: row.total_leadership ?? 0,
    joinedDate:    row.joined_date    ?? undefined,
    inactiveDate:  row.inactive_date  ?? null,
    aliases:       row.discord_aliases ?? [],
    role:          row.role ?? 'Member',
  };
}

/**
 * Fetches all profiles with their associated units in a single round trip.
 * Returns an empty array (silent fallback) if the request fails,
 * so the app remains functional even when offline.
 */
export async function fetchPlayersFromSupabase(): Promise<Player[]> {
  console.log('[playerService] Fetching players from Supabase...');

  // Fetch profiles with units and player_info separately in parallel
  const [profilesResult, infoResult] = await Promise.all([
    supabase.from('profiles').select(`
      *,
      profile_units (
        unit_name,
        is_owned,
        is_prepared,
        is_mastery,
        is_favorite
      )
    `),
    supabase.from('player_info').select('*')
  ]);

  if (profilesResult.error) {
    console.error('[playerService] Profiles fetch failed:', profilesResult.error.message);
    return [];
  }

  const joinData = profilesResult.data || [];
  const playerInfos = infoResult.data || [];

  if (joinData.length === 0) {
    console.warn('[playerService] No profiles found.');
    return [];
  }

  console.log(`[playerService] Fetched ${joinData.length} profiles and ${playerInfos.length} info rows.`);

  // Create a map for quick lookup of info by player_id
  const infoMap = new Map(playerInfos.map(info => [info.player_id, info.internal_notes]));

  return (joinData as ProfileRow[]).map(row => {
    // Find info from our separate fetch (more reliable due to naming inconsistencies in Supabase)
    const manualInfo = infoMap.get(row.id);
    
    return transformProfileToPlayer({
      ...row,
      player_info: manualInfo ? [{ internal_notes: manualInfo }] : (row.player_info || [])
    });
  });
}

