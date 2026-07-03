# Technical Guide: Unit Manager

This guide serves as a handbook for developers working on Unit Manager. The goal is to provide a clear picture of the architecture, the security model, and how data flow is handled, focusing on *why* these technical decisions were made.

## 1. Architecture and Data Flow

Unit Manager uses a decoupled architecture to ensure the user interface always feels fast and responsive ("offline-first"), while keeping data synchronized with the backend.

**The flow is as follows:**
`Supabase (DB)` <-> `Services (API)` <-> `Hooks (Orchestration)` <-> `Redux (State)` <-> `React (UI)`

*   **React Components**: Responsible only for rendering and local UI interactions. They read data from Redux via memoized selectors to minimize re-renders.
*   **Redux (State)**: The single source of truth for the client. All changes, whether from the user or the database, pass through here.
*   **Services**: Pure functions (e.g., `playerService.ts`) that abstract away all direct communication with Supabase.
*   **Hooks**: Function as the "glue" between Redux and Services. For example, `useCloudSync` listens for changes in Redux and calls Services, while `useDatabaseSync` listens to Supabase and updates Redux.

**Why?** By forcing all data through Redux, we can update the UI immediately (optimistic UI) without waiting for network calls, while maintaining a central location for data management.

## 2. Security Model and Hierarchy (RLS)

Security in the application is built directly into the database using Supabase Row Level Security (RLS). We apply a hierarchical role model: `Owner > Admin > Gatekeeper > Officer > Member > Pending/Guest`.

### `get_my_role_weight()`
This is the heart of our RLS design. It is a PostgreSQL function that retrieves the logged-in user's role from the JWT (via `profiles`) and converts it to a numerical value.

**Why RLS and weights?**
*   **Root-level Security**: Regardless of frontend bugs, the database refuses unauthorized operations.
*   **Hierarchical Control**: RLS policies use numerical weights (e.g., `get_my_role_weight() > target_role_weight`), ensuring Officers can update Members but not Admins.
*   **Defense-in-Depth**: While RLS is the primary guard, high-risk client operations (like JSON backups) include explicit **Role Guards** in hooks (`useFileHandler.ts`) to prevent execution via direct console manipulation.

### RLS InitPlan Optimization
To achieve sub-millisecond row evaluation, all security-critical RLS policies wrap dynamic evaluations—such as `auth.uid()`, `auth.role()`, and `get_my_role_weight()`—in subqueries, for example: `user_id = (SELECT auth.uid())` or `((SELECT get_my_role_weight()) >= 3)`.
*   **InitPlan Caching:** PostgreSQL evaluates these subqueries exactly *once* at the beginning of the query execution and caches the scalar result, rather than re-evaluating the JWT claim function for every single row scanned. This prevents performance degradation as the tables scale.

### Database Performance & Indexing Strategy
*   **Foreign Key Indexing:** Every foreign key constraint in the public schema has a corresponding covering index (e.g. `group_members_profile_id_idx`). This guarantees sub-millisecond JOIN performance and eliminates sequential table scans during cascade deletes and record updates.
*   **Single-Policy Rule:** To prevent execution overhead and unintended overlap, each table strictly maintains exactly one clean, granular permissive policy per command action (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Legacy permissive policies (like `"player_info_officer_only"` or `"Only leadership can view groups"`) have been completely pruned.
*   **Constraint Consolidation:** Redundant unique index constraints (e.g. duplicate indexes on `profile_units(profile_id, unit_name)`) have been dropped to streamline write cycles and minimize database write-lock durations during client synchronization.
*   **Security Definer Exposure Guard:** `SECURITY DEFINER` RPC functions (such as `link_and_approve_profile()` or triggers) run with elevated privileges. Direct `EXECUTE` rights on these functions have been explicitly revoked from `anon`, `PUBLIC`, and unauthorized roles to prevent API manipulation from the client, keeping them executable only by database triggers or logged-in `authenticated` users.

## 3. Synchronization and Data Stability

### Reads: `SyncManager` & Error Propagation
When the database changes, Supabase sends Realtime events.
*   **Debouncing & AbortControllers**: `SyncManager` buffers events and uses `AbortControllers` to ensure only the *latest* request for a specific data type is processed.
*   **Error Callback**: `SyncManager` supports an `onError` callback. If a background sync fails (e.g., transient network error), it propagates to the global `StatusToast` via `useDatabaseSync`, providing immediate visibility of data health.
*   **Hydration Safety**: During real-time hydration, the system checks the `isDirty` flag in Redux. If a local object has unsaved changes, it is **preserved** rather than overwritten by server data, preventing data loss during active editing.
*   **Surgical TW Delta-Sync**: Realtime listeners selectively parse payload data for `tw_attendance_records` to perform localized Redux updates (`updateTWPlayerRecord`) using change data directly. Irregular mutations (e.g., deletions) or structural entities (`tw_seasons`, `tw_events`) safely fallback to full-tree synchronization.
*   **Realtime Deletion Propagation**: When a profile is deleted or merged in the database, the delta sync fetch (`loadSinglePlayer`) returns `null`. Instead of ignoring this, `useDatabaseSync` dispatches a `deletePlayer` action to instantly clear the ghost/zombie profile from Redux without requiring a browser reload.

### Writes: `useCloudSync` & Atomic Patterns
*   **isDirty Flagging**: Edits mark objects as `isDirty: true`. `useCloudSync` debounces these changes and persists them to Supabase.
*   **Non-Destructive Upsert**: To prevent "zero-data" windows during sync, `playerService` uses a non-destructive two-step process: Fetch existing state -> Diff -> Update. This avoids the destructive "Delete-then-Insert" pattern.
*   **Data Loss Prevention**: A browser-level `beforeunload` listener detects `isDirty` objects and warns the user if they try to close the tab while data is still syncing.
*   **Circuit Breaker**: Updates per object are tracked; after **5 failed attempts**, the system logs a `PermanentError` and stops retrying to prevent DB flooding.
*   **AsyncThunks for Crucial Mutations**: High-risk actions like Unit configurations and TW Seasons are built as transactional `createAsyncThunk` chains with explicit `unwrap()` try-catch error checks and UI-level `isSaving` blockades to keep operations atomic and predictable.
*   **Robust Dirty Flag Cleaning**: To prevent race-condition loops, `clearPlayerDirtyFlag` uses a `.forEach()` loop to clear the `isDirty` flag for all instances of a profile ID in Redux. This ensures that even if duplicate elements are temporarily present, they don't trap `useCloudSync` in an infinite API sync loop.
*   **Snapshot Restore Sync Integrity**: Full history restorations (`applyFullHistory`) map over incoming groups and attendance records to force `isDirty: true`. The local state is replaced, prompting `useCloudSync` to automatically detect deleted groups (via diff tracking) and delete them from Supabase, while upserting the restored snapshot as the new single source of truth.
*   **Immediate Local Cache Purges**: The "Clear list" action immediately clears groups (`setGroups([])`) and attendance locally *before* triggering the async DB deletions. This prevents stale in-memory cached groups from being evaluated as active by the sync scheduler and incorrectly re-uploaded during the DB wipe.

## 4. Environment Variables

To run the project locally, configure the following in `.env.local`:

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-long-anon-key-here"
```

*   **`VITE_SUPABASE_URL`**: Your unique Supabase project URL.
*   **`VITE_SUPABASE_ANON_KEY`**: The public key. Security is handled by RLS rules via JWT tokens, making it safe for client exposure.
