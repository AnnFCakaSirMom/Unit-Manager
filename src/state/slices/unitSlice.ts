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

const unitSlice = createSlice({
  name: 'unit',
  initialState,
  reducers: {
    // We keep this for local updates (Add New Unit) until that's also migrated to Supabase
    updateUnitConfig(state, action: PayloadAction<UnitConfig>) {
      state.unitConfig = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
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
        // Silent fallback: unitConfig remains as initialState (DEFAULT_UNIT_TIERS)
      });
  },
});

export const { updateUnitConfig } = unitSlice.actions;
export const unitReducer = unitSlice.reducer;
