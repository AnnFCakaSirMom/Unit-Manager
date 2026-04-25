import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConfirmModalInfo } from '../../types';

interface UIState {
  showHelpMode: boolean;
  statusMessage: string;
  confirmModal: ConfirmModalInfo;
  pendingApprovalsCount: number;
}

const initialState: UIState = {
  showHelpMode: localStorage.getItem('unit_manager_help_mode') === 'true',
  statusMessage: '',
  confirmModal: { isOpen: false, title: '', message: '', onConfirm: () => {} },
  pendingApprovalsCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleHelpMode(state) {
      state.showHelpMode = !state.showHelpMode;
      localStorage.setItem('unit_manager_help_mode', String(state.showHelpMode));
    },
    setStatusMessage(state, action: PayloadAction<string>) {
      state.statusMessage = action.payload;
    },
    clearStatusMessage(state) {
      state.statusMessage = '';
    },
    setConfirmModal(state, action: PayloadAction<ConfirmModalInfo>) {
      state.confirmModal = action.payload;
    },
    closeConfirmModal(state) {
      state.confirmModal.isOpen = false;
    },
    setPendingApprovalsCount(state, action: PayloadAction<number>) {
      state.pendingApprovalsCount = action.payload;
    }
  },
});

export const { 
  toggleHelpMode, 
  setStatusMessage, 
  clearStatusMessage, 
  setConfirmModal, 
  closeConfirmModal,
  setPendingApprovalsCount
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
