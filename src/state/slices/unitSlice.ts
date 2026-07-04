import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';
import { UnitConfig, Unit, UnitTiers } from '../../types';
import { DEFAULT_UNIT_TIERS } from '../../units';

export interface UnitState {
  unitConfig: UnitConfig;
  isLoading: boolean;
  error: string | null;
}

const initialState: UnitState = {
  unitConfig: { tiers: DEFAULT_UNIT_TIERS },
  isLoading: false,
  error: null,
};

// Order of tiers as per user requirement
const TIER_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];

export const fetchUnitsFromSupabase = createAsyncThunk(
  'unit/fetchUnits',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('name, leadership_cost, tier');

      if (error) throw error;

      if (!data || data.length === 0) {
        return { tiers: DEFAULT_UNIT_TIERS };
      }

      // Transform flat data to grouped UnitConfig
      const newTiers: UnitTiers = {};
      
      // Initialize tiers in the specific order
      TIER_ORDER.forEach(tier => {
        newTiers[tier] = [];
      });

      data.forEach((row: any) => {
        const unit: Unit = {
          name: row.name,
          leadershipCost: row.leadership_cost,
        };
        const tier = row.tier;
        if (newTiers[tier]) {
          newTiers[tier].push(unit);
        } else {
          // Fallback for unexpected tiers
          if (!newTiers['Uncommon']) newTiers['Uncommon'] = [];
          newTiers['Uncommon'].push(unit);
        }
      });

      // Sort alphabetically within each tier
      Object.keys(newTiers).forEach(tier => {
        newTiers[tier].sort((a, b) => a.name.localeCompare(b.name));
      });

      return { tiers: newTiers };
    } catch (err: any) {
      console.error('Supabase fetch failed, using fallback:', err.message);
      return rejectWithValue(err.message);
    }
  }
);

// 1. Skapa ny enhet
export const addUnitToSupabase = createAsyncThunk(
  'unit/addUnit',
  async (newUnit: { name: string; tier: string; cost: number | undefined }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.from('units').insert({
        name: newUnit.name.trim(),
        leadership_cost: newUnit.cost !== undefined ? newUnit.cost : null,
        tier: newUnit.tier
      });

      if (error) throw error;
      return newUnit;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// 2. Uppdatera befintlig enhet
export const updateUnitInSupabase = createAsyncThunk(
  'unit/updateUnit',
  async (params: { oldName: string; newName: string; newCost: number | undefined; tier: string }, { rejectWithValue }) => {
    try {
      const trimmedNewName = params.newName.trim();
      const updatePayload: any = {
        leadership_cost: params.newCost !== undefined ? params.newCost : null,
        // M2 FIX: persist the unit's tier. Previously `tier` was accepted as a
        // param but never written to the DB, so a tier change (once the edit UI
        // exposes a tier picker) would be silently dropped. Writing the current
        // tier is idempotent when unchanged.
        tier: params.tier,
      };

      if (trimmedNewName && trimmedNewName !== params.oldName) {
        updatePayload.name = trimmedNewName;
      }

      const { error } = await supabase
        .from('units')
        .update(updatePayload)
        .eq('name', params.oldName);

      if (error) throw error;
      return { ...params, newName: trimmedNewName };
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// 3. Ta bort enhet
export const deleteUnitFromSupabase = createAsyncThunk(
  'unit/deleteUnit',
  async (params: { name: string; tier: string }, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('name', params.name);

      if (error) throw error;
      return params;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

const unitSlice = createSlice({
  name: 'unit',
  initialState,
  reducers: {
    // Används nu endast för att läsa in JSON-backuper via useFileHandler
    updateUnitConfig(state, action: PayloadAction<UnitConfig>) {
      state.unitConfig = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchUnitsFromSupabase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUnitsFromSupabase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.unitConfig = action.payload;
      })
      .addCase(fetchUnitsFromSupabase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Add
      .addCase(addUnitToSupabase.fulfilled, (state, action) => {
        const { name, tier, cost } = action.payload;
        const newUnit: Unit = { name: name.trim(), leadershipCost: cost };
        if (!state.unitConfig.tiers[tier]) state.unitConfig.tiers[tier] = [];
        state.unitConfig.tiers[tier].push(newUnit);
        state.unitConfig.tiers[tier].sort((a, b) => a.name.localeCompare(b.name));
      })

      // Update
      .addCase(updateUnitInSupabase.fulfilled, (state, action) => {
        const { oldName, newName, newCost, tier } = action.payload;
        const updatedUnit: Unit = { name: newName || oldName, leadershipCost: newCost };

        // M2 FIX: Remove the unit from whichever tier currently holds it, then
        // insert it into the target tier. The old code only searched tiers[tier]
        // and mapped in place, so a tier change would leave the unit stranded in
        // its original tier (and duplicated/missing in the UI until reload).
        Object.keys(state.unitConfig.tiers).forEach(t => {
          state.unitConfig.tiers[t] = state.unitConfig.tiers[t].filter(u => u.name !== oldName);
        });

        if (!state.unitConfig.tiers[tier]) state.unitConfig.tiers[tier] = [];
        state.unitConfig.tiers[tier].push(updatedUnit);
        state.unitConfig.tiers[tier].sort((a, b) => a.name.localeCompare(b.name));
      })

      // Delete
      .addCase(deleteUnitFromSupabase.fulfilled, (state, action) => {
        const { name, tier } = action.payload;
        if (state.unitConfig.tiers[tier]) {
          state.unitConfig.tiers[tier] = state.unitConfig.tiers[tier].filter(u => u.name !== name);
        }
      });
  },
});

export const { updateUnitConfig } = unitSlice.actions;
export const unitReducer = unitSlice.reducer;
