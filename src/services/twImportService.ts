import { supabase } from './supabase';
import { TWAttendancePlayer } from '../types';

/**
 * Fetches the temporary TW import list from Supabase.
 */
export async function fetchTWImport(): Promise<TWAttendancePlayer[]> {
  const { data, error } = await supabase
    .from('tw_import_list')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[twImportService] Fetch failed:', error.message);
    return [];
  }

  return (data || []).map(row => ({
    discordName: row.discord_name,
    status: row.status as 'Accepted' | 'Maybe',
    matchedPlayerId: row.matched_player_id
  }));
}

/**
 * Upserts a single entry into the TW import list.
 */
export async function upsertTWImport(player: TWAttendancePlayer): Promise<boolean> {
  const { error } = await supabase
    .from('tw_import_list')
    .upsert({
      discord_name: player.discordName,
      status: player.status,
      matched_player_id: player.matchedPlayerId
    });

  if (error) {
    console.error(`[twImportService] Upsert failed for ${player.discordName}:`, error.message);
    return false;
  }
  return true;
}

/**
 * Deletes an entry from the TW import list.
 */
export async function deleteTWImportEntry(discordName: string): Promise<boolean> {
  const { error } = await supabase
    .from('tw_import_list')
    .delete()
    .eq('discord_name', discordName);

  if (error) {
    console.error(`[twImportService] Delete failed for ${discordName}:`, error.message);
    return false;
  }
  return true;
}

/**
 * Clears the entire temporary list.
 */
export async function clearTWImport(): Promise<boolean> {
  const { error } = await supabase
    .from('tw_import_list')
    .delete()
    .neq('discord_name', '---'); // Wipe all

  if (error) {
    console.error('[twImportService] Clear failed:', error.message);
    return false;
  }
  return true;
}
