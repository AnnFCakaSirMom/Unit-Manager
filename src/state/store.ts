import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';
import { unitReducer } from './slices/unitSlice';
import { playerReducer } from './slices/playerSlice';
import { groupReducer } from './slices/groupSlice';
import { twReducer } from './slices/twSlice';
import { uiReducer } from './slices/uiSlice';
import { historyReducer } from './slices/historySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    unit: unitReducer,
    player: playerReducer,
    group: groupReducer,
    tw: twReducer,
    ui: uiReducer,
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['ui/setConfirmModal'],
      ignoredPaths: ['ui.confirmModal.onConfirm'],
    },
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

