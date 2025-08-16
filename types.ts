// types.ts

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
  name:string;
  leaderId: string | null;
  members: GroupMember[];
}

export interface Player {
  id: string;
  name: string;
  units: string[];
  preparedUnits: string[];
  masteryUnits: string[];
  notInHouse: boolean;
  info?: string; // <-- DENNA RAD ÄR TILLAGD
}

export interface UnitTiers {
  [tier: string]: string[];
}

export interface UnitConfig {
  tiers: UnitTiers;
}

export interface AppState {
  players: Player[];
  unitConfig: UnitConfig;
  groups: Group[];
  hasUnsavedChanges: boolean;
}

export type AppAction =
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'DELETE_PLAYER'; payload: { playerId: string } }
  | { type: 'UPDATE_PLAYER_NAME'; payload: { playerId: string; name: string } }
  | { type: 'TOGGLE_NOT_IN_HOUSE'; payload: { playerId: string } }
  | { type: 'TOGGLE_PLAYER_UNIT'; payload: { playerId: string; unitName: string; unitType: 'units' | 'preparedUnits' | 'masteryUnits' } }
  | { type: 'PARSE_PLAYER_UNITS_FORM'; payload: { playerId: string; formData: string; allUnitNames: string[] } }
  | { type: 'UPDATE_UNIT_CONFIG'; payload: { unitConfig: UnitConfig } }
  | { type: 'RENAME_UNIT_GLOBALLY'; payload: { oldName: string; newName: string } }
  | { type: 'DELETE_UNIT_GLOBALLY'; payload: { unitNameToDelete: string } }
  | { type: 'ADD_GROUP' }
  | { type: 'DELETE_GROUP'; payload: { groupId: string } }
  | { type: 'UPDATE_GROUP_NAME'; payload: { groupId: string; name: string } }
  | { type: 'ADD_PLAYER_TO_GROUP'; payload: { groupId: string; playerId: string } }
  | { type: 'REMOVE_PLAYER_FROM_GROUP'; payload: { groupId: string; playerId: string } }
  | { type: 'MOVE_PLAYER_BETWEEN_GROUPS'; payload: { playerId: string; sourceGroupId: string; targetGroupId: string } }
  | { type: 'TOGGLE_GROUP_MEMBER_UNIT'; payload: { groupId: string; playerId: string; unitName: string } }
  | { type: 'SET_GROUP_MEMBER_UNIT_RANK'; payload: { groupId: string; playerId: string; unitName: string; rank: number } }
  | { type: 'TOGGLE_GROUP_MEMBER_LOCK'; payload: { groupId: string; playerId: string } }
  | { type: 'SET_GROUP_LEADER'; payload: { groupId: string; playerId: string } }
  | { type: 'UPDATE_PLAYER_INFO'; payload: { playerId: string; info: string } } // <-- DENNA RAD ÄR TILLAGD
  | { type: 'LOAD_STATE'; payload: Omit<AppState, 'hasUnsavedChanges'> }
  | { type: 'SAVE_SUCCESS' };

export type ConfirmModalInfo = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};