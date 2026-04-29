/**
 * playerService.ts
 * Handles fetching player data from Supabase and transforming it
 * into the Player interface used by the existing app state.
 */
import { supabase } from './supabase';
import { handleQuery, handleMutation } from './supabaseUtils';
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
 */
function transformProfileToPlayer(row: ProfileRow): Player {
  const unitRows = row.profile_units ?? [];

  return {
    id: row.id,
    name: row.display_name ?? row.discord_nickname,
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
 */
export async function fetchPlayersFromSupabase(signal?: AbortSignal): Promise<Player[]> {
  console.log('[playerService] Fetching players from Supabase...');

  const [profilesResult, infoResult] = await Promise.all([
    handleQuery<ProfileRow[]>(
      supabase.from('profiles').select(`
        *,
        profile_units (
          unit_name,
          is_owned,
          is_prepared,
          is_mastery,
          is_favorite
        )
      `).abortSignal(signal!),
      { service: 'playerService', op: 'fetchProfiles' },
      []
    ),
    handleQuery<any[]>(
      supabase.from('player_info').select('*').abortSignal(signal!),
      { service: 'playerService', op: 'fetchPlayerInfo' },
      []
    )
  ]);

  if (profilesResult.length === 0) {
    console.warn('[playerService] No profiles found.');
    return [];
  }

  // Create a map for quick lookup of info by player_id
  const infoMap = new Map(infoResult.map(info => [info.player_id, info.internal_notes]));

  return profilesResult.map(row => {
    const manualInfo = infoMap.get(row.id);
    return transformProfileToPlayer({
      ...row,
      player_info: manualInfo ? [{ internal_notes: manualInfo }] : (row.player_info || [])
    });
  });
}

/**
 * Upserts a single player into Supabase.
 * Atomically updates `profiles`, `player_info`, and `profile_units`.
 */
export async function upsertPlayer(player: Player): Promise<boolean> {
  console.log(`[playerService] Upserting player ${player.id} to Supabase...`);

  // 1. Upsert Profile
  const profileSuccess = await handleMutation(
    supabase.from('profiles').upsert({
      id: player.id,
      discord_nickname: player.name,
      display_name: player.name,
      total_leadership: player.totalLeadership ?? 0,
      joined_date: player.joinedDate ?? null,
      inactive_date: player.inactiveDate ?? null,
      not_in_house: player.notInHouse,
      role: player.role ?? 'Member',
      discord_aliases: player.aliases ?? [],
    }),
    { service: 'playerService', op: `upsertProfile ${player.id}` }
  );

  if (!profileSuccess) return false;

  // 2. Upsert Player Info (Optional - don't fail the whole process)
  const info = player.player_info?.[0]?.internal_notes || player.info || '';
  if (info !== undefined || player.player_info !== undefined) {
    await handleMutation(
      supabase.from('player_info').upsert({ player_id: player.id, internal_notes: info }),
      { service: 'playerService', op: `upsertPlayerInfo ${player.id}` }
    );
  }

  // 3. Upsert Profile Units
  const allUnits = new Set([
    ...player.units,
    ...player.preparedUnits,
    ...player.masteryUnits,
    ...player.favoriteUnits
  ]);

  const unitsToInsert = Array.from(allUnits).map(unit_name => ({
    profile_id: player.id,
    unit_name,
    is_owned: player.units.includes(unit_name),
    is_prepared: player.preparedUnits.includes(unit_name),
    is_mastery: player.masteryUnits.includes(unit_name),
    is_favorite: player.favoriteUnits.includes(unit_name),
  }));

  // Delete existing units first
  const deleteUnitsSuccess = await handleMutation(
    supabase.from('profile_units').delete().eq('profile_id', player.id),
    { service: 'playerService', op: `clearUnits ${player.id}` }
  );

  if (!deleteUnitsSuccess) return false;

  if (unitsToInsert.length > 0) {
    return handleMutation(
      supabase.from('profile_units').insert(unitsToInsert),
      { service: 'playerService', op: `insertUnits ${player.id}` }
    );
  }

  return true;
}

/**
 * Deletes a player from Supabase.
 */
export async function deletePlayer(playerId: string): Promise<boolean> {
  return handleMutation(
    supabase.from('profiles').delete().eq('id', playerId),
    { service: 'playerService', op: `deletePlayer ${playerId}` }
  );
}



