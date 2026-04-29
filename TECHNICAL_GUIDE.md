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
This is the heart of our RLS design. It is a PostgreSQL function that retrieves the logged-in user's role from the `profiles` table and converts it to a numerical value (e.g., Owner = 100, Admin = 80, Officer = 50).

**Why RLS and weights?**
*   **Root-level Security**: Regardless of whether a bug is introduced in the frontend code or someone tries to manipulate API calls directly, the database will refuse to perform unauthorized operations.
*   **Hierarchical Control**: By using numerical weights, RLS policies can use simple mathematics (e.g., `get_my_role_weight() > target_role_weight`). This makes it possible to dictate that an Officer can update a Member, but never an Admin.

## 3. Synchronization and Data Stability

Managing synchronization in an environment where multiple users edit data simultaneously and where the UI is decoupled from the database requires robust mechanisms. We use a bidirectional system.

### Reads: `SyncManager` and `useDatabaseSync`
When changes occur in the database, Supabase sends Realtime events. If we were to fetch new data for every event, the application would quickly become overloaded.
*   **SyncManager**: Acts as a buffer. It uses *debouncing* (delay) and *AbortControllers* to ensure only the latest request goes through if multiple events are received in rapid succession.
*   **Why?** Prevents "race conditions" and unnecessary network calls, saving bandwidth and keeping the UI stable.

### Writes: `useCloudSync` and Circuit Breaker
When the user changes data in Redux, `useCloudSync` is responsible for sending this to Supabase.
*   **Diffing**: The hook constantly compares the current Redux state with an internal reference (what was last saved) and only sends objects that have actually changed.
*   **Circuit Breaker**: If an update fails (e.g., due to RLS errors or network issues), the system will retry. To prevent infinite loops that spam the database with faulty requests, the number of failures per object ID is tracked. After **5 failed attempts**, the circuit breaker trips for that specific object, logs a permanent error, and stops retrying.
*   **Why?** This "Smart Retry" logic is critical for system health. It protects the backend from being overloaded by clients stuck in an error state, while giving temporary network errors a chance to resolve themselves.

## 4. Environment Variables

To run the project locally, the application must be able to communicate with a Supabase instance. The following environment variables must be configured (usually in a `.env.local` or `.env` file in the root of the project):

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-long-anon-key-here"
```

*   **`VITE_SUPABASE_URL`**: The unique URL for your Supabase database.
*   **`VITE_SUPABASE_ANON_KEY`**: The public key. It is safe to expose this in the client, as all actual data security and authorization are handled by the RLS rules in the database using JWT tokens from the login.
