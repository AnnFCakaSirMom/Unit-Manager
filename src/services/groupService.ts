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
export async function fetchGroupsFromSupabase(signal?: AbortSignal): Promise<Group[]> {
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
        is_locked,
        order_index
      )
    `)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'group_members', ascending: true })
    .abortSignal(signal!);

  if (error) {
    // Re-throw AbortErrors so SyncManager can handle them correctly.
    if (error.message?.includes('abort')) {
      const e = new Error('AbortError');
      e.name = 'AbortError';
      throw e;
    }
    console.warn('[groupService] Supabase fetch failed:', error.message);
    return [];
  }

  if (!data) return [];

  return (data as GroupRow[]).map(transformGroupRow);
}

/**
 * Upserts a group and its members into Supabase.
 */
export async function upsertGroup(group: Group, orderIndex: number): Promise<boolean> {
  console.log(`[groupService] Upserting group ${group.id} to Supabase...`);

  // 1. Upsert Group
  const groupData = {
    id: group.id,
    name: group.name,
    leader_id: group.leaderId || null,
    order_index: orderIndex,
  };

  const { error: groupError } = await supabase
    .from('groups')
    .upsert(groupData);

  if (groupError) {
    console.error(`[groupService] Group upsert failed for ${group.id}:`, groupError.message);
    return false;
  }

  // 2. Clear old members to handle removals correctly
  const { error: deleteMembersError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', group.id);

  if (deleteMembersError) {
    console.error(`[groupService] Failed to clear members for group ${group.id}:`, deleteMembersError.message);
    return false;
  }

  // 3. Insert new members
  const membersToInsert = group.members.map((m, index) => ({
    group_id: group.id,
    profile_id: m.playerId,
    selected_units: m.selectedUnits,
    is_locked: m.isLocked,
    order_index: index,
  }));

  if (membersToInsert.length > 0) {
    const { error: insertMembersError } = await supabase
      .from('group_members')
      .insert(membersToInsert);

    if (insertMembersError) {
      console.error(`[groupService] Group members insert failed for ${group.id}:`, insertMembersError.message);
      return false;
    }
  }

  return true;
}

/**
 * Deletes a group from Supabase.
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  console.log(`[groupService] Deleting group ${groupId} from Supabase...`);
  
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error(`[groupService] Group delete failed:`, error.message);
    return false;
  }
  return true;
}
