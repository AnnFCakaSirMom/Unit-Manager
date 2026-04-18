import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';

// We will keep the custom rootReducer from useReducer for now, 
// and slowly migrate the slices to standard RTK here.
import { rootReducer as legacyRootReducer } from './rootReducer';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Note: We can migrate the generic AppState reducers gradually
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
