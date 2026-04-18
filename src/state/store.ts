import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Note: We can migrate the generic AppState reducers gradually
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
