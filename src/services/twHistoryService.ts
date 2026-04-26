/**
 * twHistoryService.ts
 * Handles saving and fetching TW planning history in Supabase.
 * A maximum of 5 snapshots are saved (the oldest is deleted automatically on overflow).
 */
import { supabase } from './supabase';
import type { TWHistorySnapshot } from '../types';

const MAX_HISTORY_SLOTS = 5;

/**
 * Fetches all saved snapshots, sorted by date (newest first).
 */
export async function fetchHistorySnapshots(): Promise<TWHistorySnapshot[]> {
    const { data, error } = await supabase
        .from('tw_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_SLOTS);

    if (error) {
        console.error('[twHistoryService] Fetch error:', error.message);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        createdAt: row.created_at,
        savedBy: row.saved_by,
        name: row.name,
        snapshot: row.snapshot,
    }));
}

/**
 * Saves a new snapshot.
 * If the number of saved snapshots exceeds MAX_HISTORY_SLOTS, the oldest one is deleted.
 */
export async function saveHistorySnapshot(
    snapshot: TWHistorySnapshot['snapshot'],
    userId: string | null,
    name: string
): Promise<void> {
    // 1. Fetch existing snapshots (sorted newest->oldest)
    const { data: existing, error: fetchError } = await supabase
        .from('tw_history')
        .select('id, created_at')
        .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // 2. If we already have MAX slots, delete the oldest
    if (existing && existing.length >= MAX_HISTORY_SLOTS) {
        const toDelete = existing.slice(MAX_HISTORY_SLOTS - 1); // Everything from slot 5 onwards
        const idsToDelete = toDelete.map((r: any) => r.id);
        
        const { error: deleteError } = await supabase
            .from('tw_history')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) throw deleteError;
    }

    // 3. Save new snapshot
    const { error: insertError } = await supabase
        .from('tw_history')
        .insert({
            saved_by: userId,
            name,
            snapshot,
        });

    if (insertError) throw insertError;
}

/**
 * Deletes a specific snapshot.
 */
export async function deleteHistorySnapshot(snapshotId: string): Promise<void> {
    const { error } = await supabase
        .from('tw_history')
        .delete()
        .eq('id', snapshotId);

    if (error) throw error;
}
