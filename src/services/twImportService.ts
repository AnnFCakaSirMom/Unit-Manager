import { supabase } from './supabase';
import { handleQuery, handleMutation } from './supabaseUtils';
import { TWAttendancePlayer } from '../types';

/**
 * Fetches the temporary TW import list from Supabase.
 */
export async function fetchTWImport(signal?: AbortSignal): Promise<TWAttendancePlayer[]> {
  let fetchQuery = supabase
    .from('tw_import_list')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (signal) fetchQuery = fetchQuery.abortSignal(signal);
  
  const data = await handleQuery<any[]>(
    fetchQuery,
    { service: 'twImportService', op: 'fetchTWImport' },
    []
  );

  return data.map(row => ({
    discordName: row.discord_name,
    status: row.status as 'Accepted' | 'Maybe',
    matchedPlayerId: row.matched_player_id,
    updatedAt: row.updated_at ?? row.created_at
  }));
}

/**
 * Fetches a single entry from the TW import list.
 */
export async function fetchSingleTWEntry(discordName: string, signal?: AbortSignal): Promise<TWAttendancePlayer | null> {
  let queryBuilder = supabase
    .from('tw_import_list')
    .select('*')
    .eq('discord_name', discordName);

  if (signal) queryBuilder = queryBuilder.abortSignal(signal);

  const data = await handleQuery<any | null>(
    queryBuilder.maybeSingle() as any,
    { service: 'twImportService', op: `fetchSingleTWEntry ${discordName}` },
    null
  );

  if (!data) return null;

  return {
    discordName: data.discord_name,
    status: data.status as 'Accepted' | 'Maybe',
    matchedPlayerId: data.matched_player_id,
    updatedAt: data.updated_at ?? data.created_at
  };
}

/**
 * Upserts a single entry into the TW import list.
 */
export async function upsertTWImport(player: TWAttendancePlayer): Promise<boolean> {
  return handleMutation(
    supabase
      .from('tw_import_list')
      .upsert({
        discord_name: player.discordName,
        status: player.status,
        matched_player_id: player.matchedPlayerId
      }),
    { service: 'twImportService', op: `upsertTWImport ${player.discordName}` }
  );
}

/**
 * Deletes an entry from the TW import list.
 */
export async function deleteTWImportEntry(discordName: string): Promise<boolean> {
  return handleMutation(
    supabase
      .from('tw_import_list')
      .delete()
      .eq('discord_name', discordName),
    { service: 'twImportService', op: `deleteTWImportEntry ${discordName}` }
  );
}

/**
 * Clears the entire temporary list.
 */
export async function clearTWImport(): Promise<boolean> {
  return handleMutation(
    supabase
      .from('tw_import_list')
      .delete()
      .neq('discord_name', '---'), // Wipe all
    { service: 'twImportService', op: 'clearTWImport' }
  );
}
