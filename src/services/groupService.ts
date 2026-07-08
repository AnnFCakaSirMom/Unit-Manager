/**
 * groupService.ts
 * handles fetching group data from Supabase and transforming it
 * into the Group interface used by the app state.
 */
import { supabase } from './supabase';
import { handleQuery, handleMutation } from './supabaseUtils';
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
  // BUG-2 FIX: Use conditional abortSignal — signal is optional.
  let query = supabase
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
    .order('order_index', { foreignTable: 'group_members', ascending: true });
  if (signal) query = query.abortSignal(signal);

  const data = await handleQuery<GroupRow[]>(
    query,
    { service: 'groupService', op: 'fetchGroups' },
    []
  );

  return data.map(transformGroupRow);
}

/**
 * Upserts a group and its members into Supabase.
 * Uses a surgical diff approach to avoid the destructive "Delete-then-Insert"
 * pattern: fetches current members, deletes only removed ones, and upserts
 * the rest. This eliminates zero-data windows that previously caused other
 * clients to temporarily see empty groups via Realtime events.
 */
export async function upsertGroup(group: Group, orderIndex: number): Promise<boolean> {
  if (import.meta.env.DEV) console.log(`[groupService] Upserting group ${group.id} to Supabase...`);

  // 1. Upsert Group row
  const success = await handleMutation(
    supabase.from('groups').upsert({
      id: group.id,
      name: group.name,
      leader_id: group.leaderId || null,
      order_index: orderIndex,
    }),
    { service: 'groupService', op: `upsertGroup ${group.id}` }
  );

  if (!success) return false;

  // 2. Fetch current members from DB to compute a diff.
  //    This lets us delete only members that were actually removed,
  //    rather than wiping and re-inserting the entire list.
  const { data: currentRows, error: fetchError } = await supabase
    .from('group_members')
    .select('profile_id')
    .eq('group_id', group.id);

  if (fetchError) {
    console.error(`[groupService] Failed to fetch current members for group ${group.id}:`, fetchError.message);
    return false;
  }

  const currentIds = new Set((currentRows || []).map(r => r.profile_id as string));
  const newIds = new Set(group.members.map(m => m.playerId));

  // 3. Delete only members that are no longer in the group
  const idsToDelete = [...currentIds].filter(id => !newIds.has(id));
  if (idsToDelete.length > 0) {
    const deleteSuccess = await handleMutation(
      supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .in('profile_id', idsToDelete),
      { service: 'groupService', op: `deleteRemovedMembers ${group.id}` }
    );
    if (!deleteSuccess) return false;
  }

  // 4. Upsert all current members (handles new additions and order/unit changes).
  //    Uses onConflict on (group_id, profile_id) to update existing rows in-place.
  if (group.members.length > 0) {
    const membersToUpsert = group.members.map((m, index) => ({
      group_id: group.id,
      profile_id: m.playerId,
      selected_units: m.selectedUnits,
      is_locked: m.isLocked,
      order_index: index,
    }));

    return handleMutation(
      supabase
        .from('group_members')
        .upsert(membersToUpsert, { onConflict: 'group_id,profile_id' }),
      { service: 'groupService', op: `upsertMembers ${group.id}` }
    );
  }

  return true;
}


/**
 * Deletes a group from Supabase.
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  return handleMutation(
    supabase.from('groups').delete().eq('id', groupId),
    { service: 'groupService', op: `deleteGroup ${groupId}` }
  );
}

