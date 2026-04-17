import type { AppState, AppAction, UnitConfig } from '../../../types';

export const unitReducer = (state: AppState, action: AppAction): UnitConfig => {
    switch (action.type) {
        case 'UPDATE_UNIT_CONFIG':
            return action.payload.unitConfig;
        
        case 'RENAME_UNIT_GLOBALLY': {
            const { oldName, newName } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].map(u => u.name === oldName ? { ...u, name: newName } : u);
            }
            return { tiers: newTiers };
        }
        
        case 'DELETE_UNIT_GLOBALLY': {
            const { unitNameToDelete } = action.payload;
            const newTiers = { ...state.unitConfig.tiers };
            for (const tier in newTiers) {
                newTiers[tier] = newTiers[tier].filter(u => u.name !== unitNameToDelete);
            }
            return { tiers: newTiers };
        }
        
        default:
            return state.unitConfig;
    }
};
