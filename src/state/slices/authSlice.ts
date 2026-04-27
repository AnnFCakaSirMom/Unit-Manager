import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserRole } from '../../types';

export interface AuthState {
  userId: string | null;
  discordNickname: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isInitialized: boolean;
}

const initialState: AuthState = {
  userId: null,
  discordNickname: null,
  avatarUrl: null,
  role: 'Guest',
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession: (
      state,
      action: PayloadAction<{ userId: string; role: UserRole; discordNickname: string; avatarUrl?: string | null }>
    ) => {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.discordNickname = action.payload.discordNickname;
      state.avatarUrl = action.payload.avatarUrl ?? null;
      state.isInitialized = true;
    },
    clearAuthSession: (state) => {
      state.userId = null;
      state.role = 'Guest';
      state.discordNickname = null;
      state.avatarUrl = null;
      state.isInitialized = true;
    },
    setAuthInitialized: (state) => {
        state.isInitialized = true;
    }
  },
});

export const { setAuthSession, clearAuthSession, setAuthInitialized } = authSlice.actions;

export const authReducer = authSlice.reducer;
