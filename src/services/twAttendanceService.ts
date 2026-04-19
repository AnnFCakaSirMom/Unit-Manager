/**
 * twAttendanceService.ts
 * Logic for managing TW Seasons, Events, and Attendance Records in Supabase.
 */
import { supabase } from './supabase';
import type { TWSeason, TWEvent, TWPlayerRecord } from '../types';

/**
 * Fetches all TW-related data (seasons, events, and records) in a structured format.
 */
export async function fetchTWAttendanceData() {
  const { data: seasons, error: sErr } = await supabase
    .from('tw_seasons')
    .select('*')
    .order('start_date', { ascending: false });

  const { data: events, error: eErr } = await supabase
    .from('tw_events')
    .select('*')
    .order('date', { ascending: true });

  const { data: records, error: rErr } = await supabase
    .from('tw_attendance_records')
    .select('*');

  if (sErr || eErr || rErr) {
    console.error('[twAttendanceService] Fetch error:', { sErr, eErr, rErr });
    throw new Error('Could not fetch TW attendance data');
  }

  // Transform snake_case from DB to camelCase for the app
  const mappedSeasons: TWSeason[] = (seasons || []).map(s => ({
    id: s.id,
    name: s.name,
    startDate: s.start_date,
    endDate: s.end_date
  }));

  const mappedEvents: TWEvent[] = (events || []).map(e => ({
    id: e.id,
    seasonId: e.season_id,
    date: e.date,
    type: e.type
  }));

  const mappedRecords: TWPlayerRecord[] = (records || []).map(r => ({
    eventId: r.event_id,
    playerId: r.player_id,
    status: r.status
  }));

  return { seasons: mappedSeasons, events: mappedEvents, records: mappedRecords };
}

/**
 * Saves a TW season and its associated events.
 * This handles both creation and updates (upsert).
 */
export async function saveTWSeason(season: TWSeason, events: TWEvent[]) {
  // 1. Upsert the season
  const { error: sErr } = await supabase
    .from('tw_seasons')
    .upsert({
      id: season.id,
      name: season.name,
      start_date: season.startDate,
      end_date: season.endDate
    });

  if (sErr) throw sErr;

  // 2. Upsert events
  if (events.length > 0) {
    const mappedEvents = events.map(e => ({
      id: e.id,
      season_id: e.seasonId,
      date: e.date,
      type: e.type
    }));

    const { error: eErr } = await supabase
      .from('tw_events')
      .upsert(mappedEvents);

    if (eErr) throw eErr;
  }
}

/**
 * Deletes a season. Row Level Security or ON DELETE CASCADE should handle
 * the deletion of associated events and records.
 */
export async function deleteTWSeason(seasonId: string) {
  const { error } = await supabase
    .from('tw_seasons')
    .delete()
    .eq('id', seasonId);
  
  if (error) throw error;
}

/**
 * Bulks inserts/updates attendance records.
 * Uses event_id + player_id as the unique constraint for upsert.
 */
export async function saveTWAttendanceRecords(records: TWPlayerRecord[]) {
  if (records.length === 0) return;

  const mappedRecords = records.map(r => ({
    event_id: r.eventId,
    player_id: r.playerId,
    status: r.status
  }));

  // Supabase upsert uses the primary key/unique constraint.
  // We assume a UNIQUE constraint on (event_id, player_id) is set in SQL.
  const { error } = await supabase
    .from('tw_attendance_records')
    .upsert(mappedRecords, { onConflict: 'event_id,player_id' });

  if (error) throw error;
}

/**
 * Deletes all attendance records for a specific event.
 */
export async function clearEventRecords(eventId: string) {
  const { error } = await supabase
    .from('tw_attendance_records')
    .delete()
    .eq('event_id', eventId);
  
  if (error) throw error;
}
