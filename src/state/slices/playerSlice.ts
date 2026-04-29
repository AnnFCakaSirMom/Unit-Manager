import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player, UserRole } from '../../types';

interface PlayerState {
  players: Player[];
}

const initialState: PlayerState = {
  players: [],
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    hydratePlayers(state, action: PayloadAction<Player[]>) {
      state.players = [...action.payload].sort((a, b) => a.name.localeCompare(b.name));
    },
    addPlayer(state, action: PayloadAction<{ name: string }>) {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: action.payload.name.trim(),
        units: [],
        preparedUnits: [],
        masteryUnits: [],
        favoriteUnits: [],
        notInHouse: false,
        totalLeadership: 0,
        joinedDate: new Date().toISOString().split('T')[0],
        player_info: [],
        aliases: []
      };
      state.players.push(newPlayer);
      state.players.sort((a, b) => a.name.localeCompare(b.name));
    },
    deletePlayer(state, action: PayloadAction<{ playerId: string }>) {
      state.players = state.players.filter(p => p.id !== action.payload.playerId);
    },
    updatePlayerName(state, action: PayloadAction<{ playerId: string; name: string }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) player.name = action.payload.name.trim();
    },
    toggleNotInHouse(state, action: PayloadAction<{ playerId: string }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) {
        player.notInHouse = !player.notInHouse;
        player.inactiveDate = player.notInHouse ? new Date().toISOString().split('T')[0] : null;
      }
    },
    updatePlayerInfo(state, action: PayloadAction<{ playerId: string; info: string }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) {
        player.info = action.payload.info;
        player.player_info = [{ internal_notes: action.payload.info }];
      }
    },
    updatePlayerLeadership(state, action: PayloadAction<{ playerId: string; leadership: number }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) player.totalLeadership = action.payload.leadership;
    },
    togglePlayerUnit(state, action: PayloadAction<{ playerId: string; unitName: string; unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits' }>) {
      const { playerId, unitName, unitType } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const currentList = player[unitType] || [];
      const isRemoving = currentList.includes(unitName);

      if (isRemoving) {
        // --- UNCHECKING LOGIC ---
        player[unitType] = currentList.filter(u => u !== unitName);

        if (unitType === 'units') {
          // If Owned is removed, clear EVERYTHING
          player.preparedUnits = (player.preparedUnits || []).filter(u => u !== unitName);
          player.masteryUnits = (player.masteryUnits || []).filter(u => u !== unitName);
          player.favoriteUnits = (player.favoriteUnits || []).filter(u => u !== unitName);
        } else if (unitType === 'preparedUnits') {
          // If Maxed is removed, clear Mastery
          player.masteryUnits = (player.masteryUnits || []).filter(u => u !== unitName);
        }
      } else {
        // --- CHECKING LOGIC ---
        player[unitType] = [...currentList, unitName];

        // Ensure Owned if any status is set
        if (unitType === 'preparedUnits' || unitType === 'masteryUnits' || unitType === 'favoriteUnits') {
          if (!player.units.includes(unitName)) {
            player.units = [...(player.units || []), unitName];
          }
        }

        // Ensure Maxed if Mastery is set
        if (unitType === 'masteryUnits') {
          if (!player.preparedUnits.includes(unitName)) {
            player.preparedUnits = [...(player.preparedUnits || []), unitName];
          }
        }
      }
    },
    parsePlayerUnitsForm(state, action: PayloadAction<{ playerId: string; formData: string; allUnitNames: string[] }>) {
      const { playerId, formData, allUnitNames } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const allUnitNamesSet = new Set(allUnitNames);
      const parsedUnits: string[] = [];
      const parsedPreparedUnits: string[] = [];
      const parsedMasteryUnits: string[] = [];
      const parsedFavoriteUnits: string[] = [];

      const lines = formData.split('\n');
      const regex = /(.*?)\s+-\s+✅ Owned: \[(.*?)\].*🌟 Maxed: \[(.*?)\].*👑 Mastery: \[(.*?)\](?:.*❤️ Favorite: \[(.*?)\])?/;

      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          const [_, unitNameStr, ownedStr, maxedStr, masteryStr, favoriteStr] = match;
          const unitName = unitNameStr.trim();

          if (allUnitNamesSet.has(unitName)) {
            let isOwned = ownedStr.trim().toLowerCase() === 'x';
            let isMaxed = maxedStr.trim().toLowerCase() === 'x';
            let isMastery = masteryStr.trim().toLowerCase() === 'x';
            let isFavorite = favoriteStr && favoriteStr.trim().toLowerCase() === 'x';

            // Apply Smart Selection Logic during parse
            if (isMastery) isMaxed = true;
            if (isMaxed || isMastery || isFavorite) isOwned = true;

            if (isOwned) parsedUnits.push(unitName);
            if (isMaxed) parsedPreparedUnits.push(unitName);
            if (isMastery) parsedMasteryUnits.push(unitName);
            if (isFavorite) parsedFavoriteUnits.push(unitName);
          }
        }
      }

      const merge = (existing: string[] = [], parsed: string[]) => Array.from(new Set([...existing, ...parsed]));
      player.units = merge(player.units, parsedUnits);
      player.preparedUnits = merge(player.preparedUnits, parsedPreparedUnits);
      player.masteryUnits = merge(player.masteryUnits, parsedMasteryUnits);
      player.favoriteUnits = merge(player.favoriteUnits, parsedFavoriteUnits);
    },
    clearPlayerUnits(state, action: PayloadAction<{ playerId: string }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) {
        player.units = [];
        player.preparedUnits = [];
        player.masteryUnits = [];
        player.favoriteUnits = [];
      }
    },
    renameUnitGlobally(state, action: PayloadAction<{ oldName: string; newName: string }>) {
      const { oldName, newName } = action.payload;
      state.players.forEach(player => {
        player.units = player.units.map(u => u === oldName ? newName : u);
        player.preparedUnits = (player.preparedUnits || []).map(u => u === oldName ? newName : u);
        player.masteryUnits = (player.masteryUnits || []).map(u => u === oldName ? newName : u);
        player.favoriteUnits = (player.favoriteUnits || []).map(u => u === oldName ? newName : u);
      });
    },
    deleteUnitGlobally(state, action: PayloadAction<{ unitNameToDelete: string }>) {
      const { unitNameToDelete } = action.payload;
      state.players.forEach(player => {
        player.units = player.units.filter(u => u !== unitNameToDelete);
        player.preparedUnits = (player.preparedUnits || []).filter(u => u !== unitNameToDelete);
        player.masteryUnits = (player.masteryUnits || []).filter(u => u !== unitNameToDelete);
        player.favoriteUnits = (player.favoriteUnits || []).filter(u => u !== unitNameToDelete);
      });
    },
    updatePlayerProfile(state, action: PayloadAction<{ playerId: string; joinedDate?: string; inactiveDate?: string | null; aliases?: string[]; role?: UserRole }>) {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) {
        if (action.payload.joinedDate !== undefined) player.joinedDate = action.payload.joinedDate;
        if (action.payload.inactiveDate !== undefined) player.inactiveDate = action.payload.inactiveDate;
        if (action.payload.aliases !== undefined) player.aliases = action.payload.aliases;
        if (action.payload.role !== undefined) player.role = action.payload.role;
      }
    },
    mergePlayerId(state, action: PayloadAction<{ oldId: string; newId: string }>) {
      const player = state.players.find(p => p.id === action.payload.oldId);
      if (player) player.id = action.payload.newId;
    }
  }
});

export const {
  hydratePlayers,
  addPlayer,
  deletePlayer,
  updatePlayerName,
  toggleNotInHouse,
  updatePlayerInfo,
  updatePlayerLeadership,
  togglePlayerUnit,
  parsePlayerUnitsForm,
  clearPlayerUnits,
  renameUnitGlobally,
  deleteUnitGlobally,
  updatePlayerProfile,
  mergePlayerId
} = playerSlice.actions;

export const playerReducer = playerSlice.reducer;
