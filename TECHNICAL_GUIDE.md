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

## 3. Synchronization and Data Stability

### Reads: `SyncManager` & Error Propagation
When the database changes, Supabase sends Realtime events.
*   **Debouncing & AbortControllers**: `SyncManager` buffers events and uses `AbortControllers` to ensure only the *latest* request for a specific data type is processed.
*   **Error Callback**: `SyncManager` supports an `onError` callback. If a background sync fails (e.g., transient network error), it propagates to the global `StatusToast` via `useDatabaseSync`, providing immediate visibility of data health.
*   **Hydration Safety**: During real-time hydration, the system checks the `isDirty` flag in Redux. If a local object has unsaved changes, it is **preserved** rather than overwritten by server data, preventing data loss during active editing.

### Writes: `useCloudSync` & Atomic Patterns
*   **isDirty Flagging**: Edits mark objects as `isDirty: true`. `useCloudSync` debounces these changes and persists them to Supabase.
*   **Non-Destructive Upsert**: To prevent "zero-data" windows during sync, `playerService` uses a non-destructive two-step process: Fetch existing state -> Diff -> Update. This avoids the destructive "Delete-then-Insert" pattern.
*   **Data Loss Prevention**: A browser-level `beforeunload` listener detects `isDirty` objects and warns the user if they try to close the tab while data is still syncing.
*   **Circuit Breaker**: Updates per object are tracked; after **5 failed attempts**, the system logs a `PermanentError` and stops retrying to prevent DB flooding.

## 4. Environment Variables

To run the project locally, configure the following in `.env.local`:

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-long-anon-key-here"
```

*   **`VITE_SUPABASE_URL`**: Your unique Supabase project URL.
*   **`VITE_SUPABASE_ANON_KEY`**: The public key. Security is handled by RLS rules via JWT tokens, making it safe for client exposure.
