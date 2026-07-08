/**
 * twAttendanceService.ts
 * Logic for managing TW Seasons, Events, and Attendance Records in Supabase.
 */
import { supabase } from './supabase';
import type { TWSeason, TWEvent, TWPlayerRecord } from '../types';

/**
 * Fetches all TW-related data (seasons, events, and records) in a structured format.
 */
export async function fetchTWAttendanceData(signal?: AbortSignal) {
  // PERF FIX: Run seasons + events in parallel, then paginate records separately.
  // PostgREST has a default max-rows limit (typically 1000). With many players
  // across many events the record count easily exceeds this, causing the most
  // recently imported event's records to be silently dropped from Redux.
  // Pagination via .range() bypasses the server-side limit entirely.
  let seasonsQuery = supabase.from('tw_seasons').select('*').order('start_date', { ascending: false });
  let eventsQuery  = supabase.from('tw_events').select('*').order('date', { ascending: true });
  if (signal) {
    seasonsQuery = seasonsQuery.abortSignal(signal);
    eventsQuery  = eventsQuery.abortSignal(signal);
  }

  const [
    { data: seasons, error: sErr },
    { data: events,  error: eErr },
  ] = await Promise.all([seasonsQuery, eventsQuery]);

  // Paginate attendance records to bypass PostgREST's default row limit.
  const PAGE_SIZE = 1000;
  let allRecordRows: any[] = [];
  let from = 0;
  while (true) {
    let pageQuery = supabase
      .from('tw_attendance_records')
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (signal) pageQuery = pageQuery.abortSignal(signal);
    const { data: page, error: rErr } = await pageQuery;
    if (rErr) {
      const msg = rErr.message || '';
      if (msg.includes('abort')) {
        const e = new Error('AbortError'); e.name = 'AbortError'; throw e;
      }
      console.error('[twAttendanceService] Records page fetch error:', rErr);
      throw new Error('Could not fetch TW attendance records');
    }
    if (!page || page.length === 0) break;
    allRecordRows = allRecordRows.concat(page);
    if (page.length < PAGE_SIZE) break; // Last page — no more rows
    from += PAGE_SIZE;
  }
  const records = allRecordRows;

  // Seasons/events errors (records errors are handled inside the pagination loop above).
  if (sErr || eErr) {
    const msg = sErr?.message || eErr?.message || '';
    if (msg.includes('abort')) {
      const e = new Error('AbortError');
      e.name = 'AbortError';
      throw e;
    }
    console.error('[twAttendanceService] Fetch error:', { sErr, eErr });
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
    playerId: r.profile_id,
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
    profile_id: r.playerId,
    status: r.status
  }));

  // Supabase upsert uses the primary key/unique constraint.
  // We assume a UNIQUE constraint on (event_id, player_id) is set in SQL.
  const { error } = await supabase
    .from('tw_attendance_records')
    .upsert(mappedRecords, { onConflict: 'event_id,profile_id' });

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

/**
 * Deletes specific attendance records.
 * Used for undoing an import action.
 */
export async function deleteTWAttendanceRecords(records: TWPlayerRecord[]) {
  if (records.length === 0) return;

  // PERF: Batch deletes by event instead of one round-trip per record (N+1).
  // Records from an import typically share a single event, so this collapses
  // N sequential DELETEs into one DELETE per distinct event. Deleting
  // (event_id = X AND profile_id IN [...]) targets exactly the same
  // (event, profile) pairs as the previous per-record loop, and .in()
  // escapes the id values safely.
  const profileIdsByEvent = new Map<string, string[]>();
  for (const record of records) {
    const ids = profileIdsByEvent.get(record.eventId);
    if (ids) {
      ids.push(record.playerId);
    } else {
      profileIdsByEvent.set(record.eventId, [record.playerId]);
    }
  }

  for (const [eventId, profileIds] of profileIdsByEvent) {
    const { error } = await supabase
      .from('tw_attendance_records')
      .delete()
      .eq('event_id', eventId)
      .in('profile_id', profileIds);

    if (error) throw error;
  }
}
