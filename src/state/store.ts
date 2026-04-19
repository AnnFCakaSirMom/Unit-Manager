import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';
import { unitReducer } from './slices/unitSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    unit: unitReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
