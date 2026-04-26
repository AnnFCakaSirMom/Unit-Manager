/**
 * historySlice.ts
 * Handles TW planning history and clipboard functionality (copy/paste).
 */
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { TWHistorySnapshot, TWHistoryClipboard, Group, GroupMember } from '../../types';
import { RootState } from '../store';
import { setGroups } from './groupSlice';
import { setTWAttendance } from './twSlice';
import {
    fetchHistorySnapshots,
    saveHistorySnapshot as serviceSaveSnapshot,
} from '../../services/twHistoryService';

// ── State ──────────────────────────────────────────────────────────────────
export interface HistoryState {
    snapshots: TWHistorySnapshot[];
    clipboard: TWHistoryClipboard;
    isSaving: boolean;
}

const initialState: HistoryState = {
    snapshots: [],
    clipboard: { type: null, data: null },
    isSaving: false,
};

// ── Thunks ─────────────────────────────────────────────────────────────────

/**
 * Fetches all saved snapshots from Supabase and hydrates the state.
 */
export const loadHistory = createAsyncThunk<TWHistorySnapshot[], void, { state: RootState }>(
    'history/load',
    async () => {
        return await fetchHistorySnapshots();
    }
);

/**
 * Saves the current groups and attendance as a new snapshot.
 * Runs manually or automatically upon Clear List.
 * Does not save if there are no groups with members.
 */
export const saveSnapshot = createAsyncThunk<void, void, { state: RootState }>(
    'history/save',
    async (_, { getState, dispatch }) => {
        const state = getState();
        const groups = state.group.groups;
        const twAttendance = state.tw.twAttendance;
        const userId = state.auth.userId;

        // Don't save if there's nothing to save
        const hasMembers = groups.some(g => g.members.length > 0);
        if (!hasMembers) return;

        const now = new Date();
        const name = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });

        await serviceSaveSnapshot(
            { groups, twAttendance },
            userId || null,
            name
        );

        // Reload history after saving
        dispatch(loadHistory());
    }
);

/**
 * Restores the entire planning from a selected snapshot.
 * Replaces current groups and attendance completely.
 */
export const applyFullHistory = createAsyncThunk<void, { snapshot: TWHistorySnapshot }, { state: RootState }>(
    'history/applyFull',
    async ({ snapshot }, { dispatch }) => {
        dispatch(setGroups(snapshot.snapshot.groups));
        dispatch(setTWAttendance(snapshot.snapshot.twAttendance));
    }
);

/**
 * Pastes the group from the clipboard.
 * - If targetGroupId is provided: replaces the empty group's content.
 * - If targetGroupId is null: creates a new group at the bottom.
 */
export const pasteGroupFromClipboard = createAsyncThunk<void, { targetGroupId: string | null }, { state: RootState }>(
    'history/pasteGroup',
    async ({ targetGroupId }, { getState, dispatch }) => {
        const state = getState();
        const clipboard = state.history.clipboard;

        if (clipboard.type !== 'group' || !clipboard.data) return;

        const copiedGroup: Group = clipboard.data;
        const currentGroups = [...state.group.groups];

        if (targetGroupId) {
            // Paste into existing group — replace its members with those from the clipboard
            const updatedGroups = currentGroups.map(g => {
                if (g.id === targetGroupId) {
                    return { ...g, members: copiedGroup.members, leaderId: copiedGroup.leaderId };
                }
                return g;
            });
            dispatch(setGroups(updatedGroups));
        } else {
            // Create a new group
            const newGroup: Group = {
                ...copiedGroup,
                id: crypto.randomUUID(),
                name: `${copiedGroup.name} (Copy)`,
            };
            dispatch(setGroups([...currentGroups, newGroup]));
        }

        dispatch(clearClipboard());
    }
);

/**
 * Pastes a player from the clipboard into a selected group.
 * If the player already exists in another group, they are removed from there.
 */
export const pastePlayerFromClipboard = createAsyncThunk<void, { targetGroupId: string }, { state: RootState }>(
    'history/pastePlayer',
    async ({ targetGroupId }, { getState, dispatch }) => {
        const state = getState();
        const clipboard = state.history.clipboard;

        if (clipboard.type !== 'player' || !clipboard.data) return;

        const copiedMember: GroupMember = clipboard.data;
        let currentGroups = state.group.groups.map(g => ({ ...g, members: [...g.members] }));

        // Remove player from any existing group
        currentGroups = currentGroups.map(g => ({
            ...g,
            members: g.members.filter(m => m.playerId !== copiedMember.playerId),
            leaderId: g.leaderId === copiedMember.playerId
                ? (g.members.filter(m => m.playerId !== copiedMember.playerId)[0]?.playerId ?? null)
                : g.leaderId,
        }));

        // Add player to the target group
        const targetGroup = currentGroups.find(g => g.id === targetGroupId);
        if (targetGroup && targetGroup.members.length < 5) {
            const isFirstMember = targetGroup.members.length === 0;
            targetGroup.members.push(copiedMember);
            if (isFirstMember) targetGroup.leaderId = copiedMember.playerId;
        }

        dispatch(setGroups(currentGroups));
        dispatch(clearClipboard());
    }
);

// ── Slice ──────────────────────────────────────────────────────────────────
const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        hydrateHistory(state, action: PayloadAction<TWHistorySnapshot[]>) {
            state.snapshots = action.payload;
        },
        copyGroupToClipboard(state, action: PayloadAction<Group>) {
            state.clipboard = { type: 'group', data: action.payload };
        },
        copyPlayerToClipboard(state, action: PayloadAction<GroupMember>) {
            state.clipboard = { type: 'player', data: action.payload };
        },
        clearClipboard(state) {
            state.clipboard = { type: null, data: null };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadHistory.fulfilled, (state, action) => {
                state.snapshots = action.payload;
            })
            .addCase(saveSnapshot.pending, (state) => {
                state.isSaving = true;
            })
            .addCase(saveSnapshot.fulfilled, (state) => {
                state.isSaving = false;
            })
            .addCase(saveSnapshot.rejected, (state) => {
                state.isSaving = false;
            });
    },
});

export const {
    hydrateHistory,
    copyGroupToClipboard,
    copyPlayerToClipboard,
    clearClipboard,
} = historySlice.actions;

export const historyReducer = historySlice.reducer;
