export type UserRole = 'Guest' | 'Pending' | 'Member' | 'Officer' | 'Gatekeeper' | 'Admin' | 'Owner';

// Supabase `profiles` row — extended with player data fields
export interface Profile {
  id: string;                    // UUID — mirrors auth.users.id when linked
  discord_nickname: string;
  role: UserRole;
  display_name?: string;
  total_leadership?: number;
  joined_date?: string;          // ISO date string 'YYYY-MM-DD'
  inactive_date?: string | null;
  not_in_house: boolean;
  internal_notes?: string;       // [DEPRECATED] Use player_info instead
  player_info?: { internal_notes: string }[];
  discord_aliases?: string[];
}

// Row in `profile_units` junction table
export interface ProfileUnit {
  unit_name: string;
  is_owned: boolean;
  is_prepared: boolean;
  is_mastery: boolean;
  is_favorite: boolean;
}

export interface Unit {
  name: string;
  leadershipCost?: number | null;
}

export interface UnitSelection {
  unitName: string;
  rank: number;
}

export interface GroupMember {
  playerId: string;
  selectedUnits: UnitSelection[];
  isLocked: boolean;
}

export interface Group {
  id: string;
  name: string;
  leaderId: string | null;
  members: GroupMember[];
}

export interface Player {
  id: string;
  name: string;
  units: string[];
  preparedUnits: string[];
  masteryUnits: string[];
  favoriteUnits: string[];
  notInHouse: boolean;
  info?: string;                 // [DEPRECATED] Use player_info instead
  player_info?: { internal_notes: string }[];
  totalLeadership?: number;
  joinedDate?: string;
  inactiveDate?: string | null;
  aliases?: string[];
  role?: UserRole;
}

export interface UnitTiers {
  [tier: string]: Unit[];
}

export interface UnitConfig {
  tiers: UnitTiers;
}

export interface TWAttendancePlayer {
  discordName: string;
  status: 'Accepted' | 'Maybe';
  matchedPlayerId: string | null;
}

export interface TWSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface TWEvent {
  id: string;
  seasonId: string;
  date: string;
  type: 'regular' | 'extra';
}

export type TWRecordStatus = 'Attended' | 'Not Attended' | 'Declined' | 'AWOL';

export interface TWPlayerRecord {
  eventId: string;
  playerId: string;
  status: TWRecordStatus;
}

export interface AppState {
  players: Player[];
  unitConfig: UnitConfig;
  groups: Group[];
  twAttendance: TWAttendancePlayer[];
  twSeasons: TWSeason[];
  twEvents: TWEvent[];
  twRecords: TWPlayerRecord[];
  hasUnsavedChanges: boolean;
}

export type AppAction =
  | { type: 'HYDRATE_PLAYERS'; payload: Player[] }
  | { type: 'HYDRATE_GROUPS'; payload: Group[] }
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'DELETE_PLAYER'; payload: { playerId: string } }
  | { type: 'UPDATE_PLAYER_NAME'; payload: { playerId: string; name: string } }
  | { type: 'TOGGLE_NOT_IN_HOUSE'; payload: { playerId: string } }
  | { type: 'TOGGLE_PLAYER_UNIT'; payload: { playerId: string; unitName: string; unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits' } }
  | { type: 'PARSE_PLAYER_UNITS_FORM'; payload: { playerId: string; formData: string; allUnitNames: string[] } }
  | { type: 'CLEAR_PLAYER_UNITS'; payload: { playerId: string } }
  | { type: 'UPDATE_UNIT_CONFIG'; payload: { unitConfig: UnitConfig } }
  | { type: 'RENAME_UNIT_GLOBALLY'; payload: { oldName: string; newName: string } }
  | { type: 'DELETE_UNIT_GLOBALLY'; payload: { unitNameToDelete: string } }
  | { type: 'ADD_GROUP' }
  | { type: 'DELETE_GROUP'; payload: { groupId: string } }
  | { type: 'UPDATE_GROUP_NAME'; payload: { groupId: string; name: string } }
  | { type: 'ADD_PLAYER_TO_GROUP'; payload: { groupId: string; playerId: string } }
  | { type: 'REMOVE_PLAYER_FROM_GROUP'; payload: { groupId: string; playerId: string } }
  | { type: 'MOVE_PLAYER_BETWEEN_GROUPS'; payload: { playerId: string; sourceGroupId: string; targetGroupId: string } }
  | { type: 'REORDER_GROUP_MEMBER'; payload: { groupId: string; playerId: string; targetPlayerId: string } } // <-- NYTT
  | { type: 'MERGE_PLAYER_ID'; payload: { oldId: string; newId: string } }
  | { type: 'TOGGLE_GROUP_MEMBER_UNIT'; payload: { groupId: string; playerId: string; unitName: string } }
  | { type: 'SET_GROUP_MEMBER_UNIT_RANK'; payload: { groupId: string; playerId: string; unitName: string; rank: number } }
  | { type: 'TOGGLE_GROUP_MEMBER_LOCK'; payload: { groupId: string; playerId: string } }
  | { type: 'SET_GROUP_LEADER'; payload: { groupId: string; playerId: string } }
  | { type: 'UPDATE_PLAYER_INFO'; payload: { playerId: string; info: string } }
  | { type: 'UPDATE_PLAYER_LEADERSHIP'; payload: { playerId: string; leadership: number } }
  | { type: 'IMPORT_TW_ATTENDANCE'; payload: { jsonString: string } }
  | { type: 'CLEAR_TW_ATTENDANCE' }
  | { type: 'UPDATE_PLAYER_PROFILE'; payload: { playerId: string; joinedDate?: string; inactiveDate?: string | null; aliases?: string[] } }
  | { type: 'CREATE_TW_SEASON'; payload: { season: TWSeason, events: TWEvent[] } }
  | { type: 'UPDATE_TW_SEASON'; payload: { season: TWSeason, events: TWEvent[] } }
  | { type: 'DELETE_TW_SEASON'; payload: { seasonId: string } }
  | { type: 'ADD_TW_EVENT'; payload: { event: TWEvent } }
  | { type: 'DELETE_TW_EVENT'; payload: { eventId: string } }
  | { type: 'CLEAR_TW_EVENT_RECORDS'; payload: { eventId: string } }
  | { type: 'IMPORT_TW_STATISTICS_RAID_HELPER'; payload: { jsonString: string, eventId: string } }
  | { type: 'UPDATE_TW_PLAYER_RECORD'; payload: { eventId: string, playerId: string, status: TWRecordStatus } }
  | { type: 'HYDRATE_TW_DATA'; payload: { seasons: TWSeason[], events: TWEvent[], records: TWPlayerRecord[] } }
  | { type: 'LOAD_STATE'; payload: Omit<AppState, 'hasUnsavedChanges'> }
  | { type: 'SAVE_SUCCESS' };

export type ConfirmModalInfo = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};