import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'Pending' | 'Member' | 'Officer' | 'Gatekeeper' | 'Admin' | 'Guest';

export interface AuthState {
  userId: string | null;
  discordNickname: string | null;
  role: UserRole;
  isInitialized: boolean;
}

const initialState: AuthState = {
  userId: null,
  discordNickname: null,
  role: 'Guest',
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession: (
      state,
      action: PayloadAction<{ userId: string; role: UserRole; discordNickname: string }>
    ) => {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.discordNickname = action.payload.discordNickname;
      state.isInitialized = true;
    },
    clearAuthSession: (state) => {
      state.userId = null;
      state.role = 'Guest';
      state.discordNickname = null;
      state.isInitialized = true;
    },
    setAuthInitialized: (state) => {
        state.isInitialized = true;
    }
  },
});

export const { setAuthSession, clearAuthSession, setAuthInitialized } = authSlice.actions;

export const authReducer = authSlice.reducer;
