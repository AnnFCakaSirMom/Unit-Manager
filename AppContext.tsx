import React, { createContext, useContext } from 'react';
import type { AppState, AppAction } from './types';

export const AppStateContext = createContext<AppState | undefined>(undefined);
export const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(undefined);

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateContext.Provider');
    }
    return context;
};

export const useAppDispatch = () => {
    const context = useContext(AppDispatchContext);
    if (context === undefined) {
        throw new Error('useAppDispatch must be used within an AppDispatchContext.Provider');
    }
    return context;
};
