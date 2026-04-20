/**
 * groupService.ts
 * handles fetching group data from Supabase and transforming it
 * into the Group interface used by the app state.
 */
import { supabase } from './supabase';
import type { Group, GroupMember } from '../types';

type GroupMemberRow = {
  profile_id: string;
  selected_units: any[];
  is_locked: boolean;
};

type GroupRow = {
  id: string;
  name: string;
  leader_id: string | null;
  order_index: number;
  group_members: GroupMemberRow[];
};

/**
 * Transforms a Supabase group row into the Group interface.
 */
function transformGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    leaderId: row.leader_id,
    members: (row.group_members || []).map(m => ({
      playerId: m.profile_id,
      selectedUnits: m.selected_units || [],
      isLocked: m.is_locked
    } as GroupMember))
  };
}

/**
 * Fetches all groups with their members from Supabase.
 * Sorted by order_index for stable ordering.
 */
export async function fetchGroupsFromSupabase(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      leader_id,
      order_index,
      group_members (
        profile_id,
        selected_units,
        is_locked
      )
    `)
    .order('order_index', { ascending: true });

  if (error) {
    console.warn('[groupService] Supabase fetch failed:', error.message);
    return [];
  }

  if (!data) return [];

  return (data as GroupRow[]).map(transformGroupRow);
}
