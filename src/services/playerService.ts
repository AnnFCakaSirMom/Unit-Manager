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
  updated_at?: string;
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
    updatedAt:     row.updated_at ?? undefined,
  };
}

/**
 * Fetches all profiles with their associated units in a single round trip.
 */
export async function fetchPlayersFromSupabase(signal?: AbortSignal): Promise<Player[]> {
  console.log('[playerService] Fetching players from Supabase...');

  // BUG-2 FIX: Use conditional abortSignal — signal is optional and passing
  // undefined directly to .abortSignal() can throw at runtime.
  let profilesQuery = supabase.from('profiles').select(`
    *,
    profile_units (
      unit_name,
      is_owned,
      is_prepared,
      is_mastery,
      is_favorite
    )
  `);
  let infoQuery = supabase.from('player_info').select('*');
  if (signal) {
    profilesQuery = profilesQuery.abortSignal(signal);
    infoQuery = infoQuery.abortSignal(signal);
  }

  const [profilesResult, infoResult] = await Promise.all([
    handleQuery<ProfileRow[]>(profilesQuery, { service: 'playerService', op: 'fetchProfiles' }, []),
    handleQuery<any[]>(infoQuery, { service: 'playerService', op: 'fetchPlayerInfo' }, [])
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
 * Fetches a single player profile with their associated units.
 * Used for delta sync to avoid O(N) fetching.
 */
export async function fetchSinglePlayer(profileId: string, signal?: AbortSignal): Promise<Player | null> {
  console.log(`[playerService] Fetching single player ${profileId} from Supabase...`);

  let profileBuilder = supabase.from('profiles').select(`
    *,
    profile_units (
      unit_name,
      is_owned,
      is_prepared,
      is_mastery,
      is_favorite
    )
  `).eq('id', profileId);

  let infoBuilder = supabase.from('player_info').select('*').eq('player_id', profileId);

  if (signal) {
    profileBuilder = profileBuilder.abortSignal(signal);
    infoBuilder = infoBuilder.abortSignal(signal);
  }

  const [profileResult, infoResult] = await Promise.all([
    handleQuery<ProfileRow | null>(profileBuilder.maybeSingle() as any, { service: 'playerService', op: `fetchSingleProfile ${profileId}` }, null),
    handleQuery<any | null>(infoBuilder.maybeSingle() as any, { service: 'playerService', op: `fetchSinglePlayerInfo ${profileId}` }, null)
  ]);

  if (!profileResult) {
    if (import.meta.env.DEV) console.warn(`[playerService] Profile not found for ${profileId}`);
    return null;
  }

  return transformProfileToPlayer({
    ...profileResult,
    player_info: infoResult ? [{ internal_notes: infoResult.internal_notes }] : (profileResult.player_info || [])
  });
}

/**
 * Upserts a single player into Supabase.
 * Atomically updates `profiles`, `player_info`, and `profile_units`.
 */
export async function upsertPlayer(player: Player): Promise<boolean> {
  console.log(`[playerService] Upserting player ${player.id} to Supabase...`);

  // 1. Update Profile
  // We use .update() instead of .upsert() here because Members (weight 2) 
  // do not have INSERT permissions on the profiles table.
  // Since a Member is always updating an existing profile linked to their auth.uid(),
  // .update() is sufficient and bypasses the requirement for INSERT RLS policies.
  const profileSuccess = await handleMutation(
    supabase.from('profiles').update({
      discord_nickname: player.name,
      display_name: player.name,
      total_leadership: player.totalLeadership ?? 0,
      joined_date: player.joinedDate ?? null,
      inactive_date: player.inactiveDate ?? null,
      not_in_house: player.notInHouse,
      role: player.role, // This will be checked by RLS to ensure no unauthorized role changes
      discord_aliases: player.aliases ?? [],
    }).eq('id', player.id),
    { service: 'playerService', op: `updateProfile ${player.id}` }
  );

  if (!profileSuccess) {
    // Fallback: If update failed (e.g. Row doesn't exist yet for a new player), 
    // we attempt an upsert. This handles both existing and new players.
    console.log(`[playerService] Update failed or affected no rows for ${player.id}, attempting upsert...`);
    const upsertSuccess = await handleMutation(
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
    if (!upsertSuccess) return false;
  }


  // 2. Upsert Player Info (Optional - don't fail the whole process)
  const info = player.player_info?.[0]?.internal_notes || player.info || '';
  if (info !== undefined || player.player_info !== undefined) {
    await handleMutation(
      supabase.from('player_info').upsert({ player_id: player.id, internal_notes: info }),
      { service: 'playerService', op: `upsertPlayerInfo ${player.id}` }
    );
  }

  // 3. Upsert Profile Units
  // BUG-4 FIX: Replace destructive delete-all-then-insert with a safer two-step:
  //   a) Upsert the current unit set (atomic per-row, no zero-unit window).
  //   b) Prune any unit rows that are no longer in the player's set.
  // This eliminates the race condition where a Realtime event fires between
  // the delete and insert, causing the UI to see a player with zero units.
  const allUnits = new Set([
    ...player.units,
    ...player.preparedUnits,
    ...player.masteryUnits,
    ...player.favoriteUnits
  ]);

  const unitsToUpsert = Array.from(allUnits).map(unit_name => ({
    profile_id: player.id,
    unit_name,
    is_owned: player.units.includes(unit_name),
    is_prepared: player.preparedUnits.includes(unit_name),
    is_mastery: player.masteryUnits.includes(unit_name),
    is_favorite: player.favoriteUnits.includes(unit_name),
  }));

  if (unitsToUpsert.length > 0) {
    // Step a: Upsert current units (requires UNIQUE constraint on profile_id + unit_name)
    const upsertSuccess = await handleMutation(
      supabase.from('profile_units').upsert(unitsToUpsert, { onConflict: 'profile_id,unit_name' }),
      { service: 'playerService', op: `upsertUnits ${player.id}` }
    );
    if (!upsertSuccess) return false;

    // Step b: Prune unit rows that no longer exist in the player's set
    const unitNames = Array.from(allUnits);
    await handleMutation(
      supabase.from('profile_units').delete()
        .eq('profile_id', player.id)
        .not('unit_name', 'in', `(${unitNames.map(n => `"${n}"`).join(',')})`),
      { service: 'playerService', op: `pruneUnits ${player.id}` }
    );
  } else {
    // Player has no units — safe to wipe all rows for this profile
    await handleMutation(
      supabase.from('profile_units').delete().eq('profile_id', player.id),
      { service: 'playerService', op: `clearUnits ${player.id}` }
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



