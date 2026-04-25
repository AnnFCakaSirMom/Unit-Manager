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
  claimed_name?: string;
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



export type ConfirmModalInfo = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};