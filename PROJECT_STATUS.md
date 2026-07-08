# Project Status: Unit Manager

## 🚀 Overview

A web application to manage player units, groups, and Territory War (TW) statistics for Conqueror's Blade. Built with React, Redux, and Supabase.

---

## ✅ Completed Milestones

### 1. Core Functionality

- [x] Player unit management (Owned, Prepared, Mastery, Favorite).
- [x] Group management (Create/Edit groups for TW).
- [x] Data import/export via JSON.
- [x] Real-time synchronization with Supabase for Officers.

### 2. Security & RLS (Completed April 2026)

- [x] **Comprehensive Security Audit:** Cleaned up old conflicting policies.
- [x] **JWT-based RLS:** All policies now use `get_my_role_weight()` via JWT claims for maximum performance and security.
- [x] **Table Security:**
  - `profiles`: Members can only see their own data and update limited fields.
  - `profile_units`: Strictly limited to the owner's own units.
  - `audit_logs` & `tw_history`: Only Officers+ have read/write permissions.
- [x] **RLS Leak Fix:** Fixed a leak in `tw_history` where members could previously read snapshots.
- [x] **Restricted Backups:** Locked JSON Backup (Save/Load) functionality exclusively to the **Owner** role to prevent accidental data overwrites and unauthorized local copies.

### 3. UI/UX Modernization (Completed April 2026)

- [x] **Global Header:** New minimalist top menu with modern logout button and branding.
- [x] **Member Dashboard:**
  - **Profile Rail:** New left panel for members with Discord avatar, editable Leadership, and barrack statistics.
  - **Adaptive Layout:** The app detects roles and switches between Sidebar (Officer) and Profile Rail (Member).
- [x] **Performance Polish:** Moved metadata (Leadership/Dates) from the main view to the Rail for members to maximize space for the unit list.
- [x] **Metadata Tracking:** Added `updated_at` to profiles with an automatic trigger to show "Last Updated".
- [x] **UX Polish:** Implemented independent scrolling for Attendance panels and Sidebar for better navigation in large datasets.

### 4. Officer Tools & TW Management (Completed April 2026)

- [x] **TW History:** Snapshot system to save, name, and restore previous group plans.
- [x] **Advanced TW Statistics:**
  - Real-time name-based search to quickly find players.
  - Intelligent Leaderboard ranking (Attendance % -> Count -> AWOL penalty -> Name).
  - **Discord Nitro Mode:** Support for extended character limit (4000) during export.
- [x] **Sidebar Cleanup:** Moved Logout and Sync indicators to the Header for a cleaner workspace.

### 5. Service Architecture & Sync Reliability (Completed April 2026)

- [x] **Centralized Service Logic:** Introduced `supabaseUtils.ts` to standardize all calls, error handling, and AbortSignal mapping.
- [x] **Smart Retry System:**
  - Implemented partial sync (only successful changes are marked as saved).
  - Intelligent retry logic with a limit of 5 attempts to avoid infinite loops on permanent errors.
- [x] **Visual Sync Feedback:** Centralized the sync indicator in the Header with dynamic icons (`Synced`, `Syncing`, `Error`, `PermanentError`) and tooltips.
- [x] **Code Cleanup:** Removed dead props and redundant Redux actions (`setAuthInitialized`) for better maintainability.

### 6. Performance & Rendering Architecture (Completed April 2026)

- [x] **Advanced Render Isolation:**
  - **GroupMemberCard:** Broke out `MovePlayerDropdown` to eliminate heavy Redux subscriptions at the group level for each player card.
  - **List Optimization:** Implemented row-wise memoization (`PlayerListItem`, `AttendancePlayerRow`) and moved down local state (e.g., editing) to isolate renders during searching and interaction.
- [x] **Computation Memoization:** Optimized `useTWStats.ts`, `AttendanceGroupGrid.tsx`, and `TWStatisticsView.tsx` with strategic use of `useMemo` and `useCallback` to handle large array transformations efficiently.
- [x] **Technical Documentation:** Created `TECHNICAL_GUIDE.md` covering architecture, RLS security, synchronization flows, and "Circuit Breaker" logic for future maintenance.
- [x] **Resource Audit:** Verified and secured cleanup functions for all Supabase channels, auth listeners, and timers to prevent memory leaks.

### 7. Realtime Operations & Approval Flow (Completed April 2026)

- [x] **Full Realtime Synchronization:**
  - **Approval Badge:** Sidebar notification count for pending approvals now updates live via Supabase Realtime.
  - **Live Approvals View:** The list of pending users in `ProfileMatcher` updates immediately when new players log in.
  - **Admin Logs & Badges:** Audit logs and suspicious activity notifications are now fully synced in real-time.
- [x] **Intelligent Approval UI:**
  - Fixed "ghost selection" in `ProfileMatcher` where stale suggestions blocked buttons.
  - Implemented automatic validation of matches against the current player list.
- [x] **Automated Onboarding:**
  - "Create New" now automatically sets the correct role (`Member`), fetches names from Discord/Claimed name, sets start date, and resets statistics in a single step.

### 8. Internationalization & UX Polish (Completed April 2026)

- [x] **Full English Localization:** Conducted a comprehensive language audit, translating all UI components (Member Rail, Admin Panels, TW Stats, Audit Logs) and the Help Manual to English.
- [x] **Smart Selection Logic:** Implemented cascading selection rules for units (Mastery → Maxed → Owned) to ensure data consistency and reduce clicks. Applied to both manual toggles and form parsing.
- [x] **Interactive Guidance:**
  - Replaced static "Quick Tips" with a dedicated, toggleable "How to use" help modal for Members.
  - Added member-specific inline instructions in the Barrack view for better onboarding.
- [x] **Code Quality & Standardization:**
  - Unified Redux interaction using Typed Hooks (`useAppSelector`, `useAppDispatch`) across the entire app.
  - Cleaned up redundant imports and orphaned logic.
  - Standardized all time/date formats to `en-GB` for a clean 24h international standard.

### 9. Design Evolution & Modernization (May 2026)

- [x] **Obsidian & Gold Theme:** Comprehensive visual overhaul transitioning from a generic blue/gray palette to a premium "Command Center" aesthetic.
- [x] **Glassmorphism Integration:** Implemented consistent translucent backgrounds (`bg-black/40`) with `backdrop-blur` across Sidebar, Header, GroupView, and Statistics panels.
- [x] **Advanced Micro-interactions:** Added a custom "gliding gold underline" hover effect for unit names across all views (Member Barrack, Group Cards, Unit Lists).
- [x] **Thematic Header Upgrade:** Implemented a gold-gradient branding logo and synchronized all sync/status icons to the amber/gold palette.
- [x] **Admin & Tool Modernization:** Redesigned Admin Panel and Audit Logs with tactical "Admin Command" styling, including glow effects and refined typography.
- [x] **Design Versioning:** Established a branch-based design management workflow (`design-obsidian-gold`) to allow safe experimentation with alternative themes.

### 10. Tactical Search Intelligence (May 2026)

- [x] **Smart Multi-Unit Search:** Implemented an advanced unit search engine supporting up to 3 simultaneous unit queries using a modern Tag-Input interface.
- [x] **Hierarchical Ranking Logic:** Developed a weighted scoring system that prioritizes players based on match quantity (3/3 > 2/3 > 1/3) and unit quality (Maxed > Mastery).
- [x] **Dynamic Search UX:**
  - **Tag-Input System:** Interactive unit tags with autocomplete and easy removal (×).
  - **Match Badges:** Visual indicators (e.g., "2/3") in the results list to quickly identify the best fits for specific strategies.
  - **Granular Status Pills:** Detailed unit status indicators for each searched unit, showing ownership, Maxed status, and Full Mastery at a glance.
- [x] **Tactical Attendance Filter:** Added a "Accepted only" toggle in Unit Search to instantly filter results to only include players confirmed for the upcoming war.
- [x] **Officer Efficiency:** Integrated "Accepted Attendance" checkmarks directly into search results, allowing officers to instantly see which players with specific units are available for the upcoming war.

### 11. TW Attendance Lifecycle & Manual Management (May 2026)

- [x] **Manual Participant Addition:** Added a searchable "+" button to the Accepted list, allowing officers to manually add players who are participating but weren't part of the original Raid Helper import.
- [x] **Dynamic Status Management:** Implemented quick-toggle buttons (↑/↓) on all attendance rows to seamlessly move players between "Accepted" and "Maybe" as their availability changes.
- [x] **Smart Filter Integration:** Manual attendance updates are instantly reflected in the Unit Search "Accepted only" filter, ensuring a single source of truth for planning.

### 12. Comprehensive Security & Integrity Audit (May 2026)
- [x] **Critical RLS Hardening:** 
  - **Self-Role Escalation:** Implemented a `BEFORE UPDATE` trigger on `profiles` to block users from promoting their own roles.
  - **Audit Integrity:** Enforced `actor_id` identity in RLS policies to prevent log forgery.
  - **Debounce Fix:** Added `UPDATE` policies to `audit_logs` to enable functional 5-minute debouncing.
  - **Leak Remediation:** Re-restricted `tw_history` and `tw_import_list` to Officer+ only, correcting regressive policies.
  - **Granular Access Control:** Replaced broad `FOR ALL` policies with per-operation rules (`SELECT`/`INSERT`/`UPDATE`), restricting `DELETE` privileges to Admin+ on strategic tables, while ensuring Members maintain `DELETE` rights for their own `profile_units` to enable barrack pruning.
- [x] **Stability & Sync Resilience:**
  - **Hydration Safety:** Refactored `hydratePlayers` to prevent locally-added "dirty" players from being dropped during background syncs.
  - **Atomic Unit Sync:** Replaced destructive delete-insert logic in `playerService` with an atomic upsert-and-prune approach, eliminating the "zero-unit window" race condition.
  - **Retry Reliability:** Fixed the cloud sync retry mechanism with a `retryTick` system to ensure transient failures are automatically re-attempted.
  - **Loop Prevention:** Implemented a realtime "ignore list" for side-effect tables (`audit_logs`, `player_info`) to prevent infinite sync loops.
- [x] **Performance & Database Optimization:**
  - **Strategic Indexing:** Added composite and foreign key indexes to `audit_logs`, `profile_units`, and `group_members` to accelerate lookups.
  - **CASCADE constraints:** Implemented `ON DELETE CASCADE` across all junction tables to prevent "zombie" orphaned records.
  - **Execution Efficiency:** Optimized `get_my_role_weight()` by marking it `STABLE` for statement-level caching and parallelized TW data fetches.

### 13. Real-time & UX Health Check (May 2026)
- [x] **Real-time Reconnect Logic:** Implemented exponential backoff (1s -> 30s) for Supabase channels to ensure automatic recovery from network interruptions (RT-5).
- [x] **Global Sync Feedback:** Migrated status messages to a central `StatusToast` component, ensuring Members see save confirmations and errors previously restricted to the Officer Sidebar (UX-2).
- [x] **Initial Hydration UX:** Added skeleton loading states to the Player List and a "Loading data..." spinner to the main content area to provide immediate feedback during initial sync (UX-3).
- [x] **Member Real-time Sync:** Enabled targeted Real-time subscriptions for Members, ensuring their `updated_at` and profile data stay in sync live without requiring page refreshes (RT-1, RT-2).
- [x] **Instant Role Propagation:** Implemented a dedicated `own-profile-watch` Real-time channel that monitors the logged-in user's role and immediately updates the Redux state and UI layout (Sidebar ↔ Profile Rail) without a page refresh.
- [x] **Non-blocking JWT Refresh:** Added an automated `refreshSession()` trigger following role updates to ensure Supabase RLS policies transition back to high-performance JWT-based checks while maintaining immediate UI responsiveness.
- [x] **Sync Flow Consolidation:** Refactored internal notes saving to use the standardized `isDirty` / `useCloudSync` pipeline, eliminating inconsistent direct-to-database bypasses (UX-5).
- [x] **Contextual UI Fixes:** Corrected the Sidebar player count to respect the active "Inactive" filter and assigned unique session IDs to all Real-time channels to prevent multi-tab conflicts (RT-3, UX-6).
- [x] **Premium Auth UX:** Harmonized AuthGuard loading and NoProfile screens with the "Obsidian & Gold" design system, using glassmorphism and amber-themed assets (UX-4).

### 14. Member Lifecycle & RLS Reliability (May 2026)
- [x] **Member Unit Deletion:** Fixed a critical RLS policy on `profile_units` that previously blocked Members (weight 2) from deleting their own unit records. The `DELETE` policy now correctly allows owners to prune their barracks while maintaining Officer+ administrative oversight.
- [x] **Sync Feedback Analysis:** Investigated and verified the "3-step" sync behavior (role fetch, auth sync, player hydration) to ensure that automated profile updates don't cause redundant overhead during unit management.

### 15. Delta Sync Architecture (Completed May 2026)
- [x] **Surgical Player Updates:** Replaced the "Hammer" approach (full re-fetches) with surgical player-level updates using Supabase Realtime payloads, reducing network load from O(N*M) to O(1) per update.
- [x] **TW-Import Sync Optimization:** Replaced JSON-stringify diffing with a dedicated `isDirty` flag and implemented surgical delta-sync for TW Import records, eliminating race conditions and improving performance (RT-4).
- [x] **Race Condition Protection:** Implemented `isDirty` and `updatedAt` guards in the `playerSlice` and `twSlice` to ensure local changes are never overwritten by stale server data or out-of-order payloads.
- [x] **Optimized Rendering:** Leveraged Immer's structural sharing in the update reducers to maintain object reference stability, enabling optimal React memoization.
- [x] **Production Hardening:** Implemented a feature-flagged rollout (`DELTA_SYNC_ENABLED`) and environment-aware logging (`import.meta.env.DEV`) to ensure stability and maintainability.
- [x] **Sync Performance Tuning:** Optimized the cloud sync debounce from 800ms to 500ms to provide a more responsive "Saved to cloud" experience without impacting API limits.
- [x] **Data Loss Prevention:** Implemented a browser-level `beforeunload` guard that detects "dirty" unsaved changes across players, groups, and TW attendance, warning users before they accidentally close the tab.

### 16. TW Statistics Reliability & Data Integrity (May 2026)
- [x] **Pagination for Large Datasets:** Resolved a critical bug where TW Statistics silently truncated records after 1000 rows (PostgREST default). Implemented a `while`-loop pagination system in `twAttendanceService.ts` to ensure 100% data integrity as the database grows.
- [x] **Instant Import Feedback:** Optimized the TW import flow to perform a local Redux dispatch immediately after the database write, ensuring the UI reflects imported data instantly without waiting for Realtime propagation.
- [x] **Data Synchronization Hardening:** Investigated and resolved "Ghost Event" issues by ensuring clear event-ID mapping and improving the robustness of the record hydration logic.

### 17. Stability, Security & Data Integrity Refinement (May 2026)
- [x] **Comprehensive Functional Audit:** Conducted a 4-phase rigorous audit of Member Management (duplicate prevention), Group Operations (Drag-and-Drop consistency), RBAC Permissions (Gatekeeper vs Admin), and System Stability (Fail-safe JSON).
- [x] **Interactive Drag-and-Drop:** Implemented a robust, native HTML5-based Drag-and-Drop system for the TW Attendance view, allowing seamless player assignment from attendance lists to groups and inter-group transfers.
- [x] **Leadership Calculation Engine:** Developed a real-time leadership tracking system with visual overflow alerts (Red/Amber/Gray) and dynamic unit-cost mapping to ensure strategic compliance during group planning.
- [x] **Two-Step Non-Destructive Upsert:** Refactored `playerService` to use a non-destructive two-step process (Fetch -> Diff -> Update) for profile units, eliminating the high-risk "Delete-then-Insert" pattern that caused temporary data disappearance during sync.
- [x] **TW Attendance Persistence:** Fixed a bug where imported TW data wasn't syncing to Supabase by adding `isDirty: true` to all groups touched by the import in `reducerHelpers.ts`.
- [x] **Real-time Group Safety:** Refactored `hydrateGroups` to preserve locally created groups (e.g., from TW import) that haven't been assigned a server-ID yet, preventing silent data wipes during hydration events.
- [x] **JSON Backup Hardening:** Implemented a hard local role-check (`role === 'Owner'`) within `useFileHandler.ts` to prevent unauthorized save/load triggers via browser console or direct function calls, complementing the existing UI guard.
- [x] **Modernized Member Notes:** Updated `GroupMemberCard.tsx` to read officer notes from the modern `player_info` structure, ensuring compatibility with the new database schema while maintaining legacy fallback for `player.info`.
- [x] **Granular Admin Control:** Restricted "Unit Management" access in `AdminPanel.tsx` to Admin+ roles (`canEditSystemConfig`), removing it from the Gatekeeper view for better hierarchical control.
- [x] **Proactive Sync Error Propagation:** Added a dedicated error callback to `SyncManager.ts` and `useDatabaseSync.ts`, allowing database read/sync failures to be reported instantly via the global `StatusToast` ('Error: Could not sync from server').

### 18. Hardened Realtime TW Sync (Completed May 2026)
- [x] **AsyncThunks for TW State:** Migrated TW metadata management to standardized Redux AsyncThunks (`addTWSeasonToSupabase`, `deleteTWSeasonFromSupabase`, `saveTWAttendanceRecordsToSupabase`), centralizing error boundaries and loading states in extraReducers.
- [x] **Surgical Delta-Sync for Attendance:** Replaced heavyweight catch-all refreshes with a high-performance O(1) Realtime Delta-Sync for `tw_attendance_records` that applies change payloads directly to Redux (`updateTWPlayerRecord`) to avoid massive structural tree queries.
- [x] **Structural Integrity Guards:** Maintained full-tree synchronization only for low-frequency structural modifications (`tw_seasons`, `tw_events`) and designed a safe fallback to full hydration for irregular changes like record deletions.
- [x] **UI/UX Save Guardians:** Embedded `isSaving` button blockades and explicit unwrap try/catch boundaries within `SeasonManagementModal.tsx` and `EditTWAttendanceModal.tsx` to secure state transformation pipelines, while preserving snappy non-blocking click actions for rapid attendance grids.
- [x] **Dead Code Pruning:** Deprecated and pruned legacy synchronous reducers (`createTWSeason`, `updateTWSeason`, `deleteTWSeason`) from `twSlice.ts`, keeping slice APIs streamlined.

### 19. Account Linking & Sync Safeguards (Completed May 2026)
- [x] **Account Linking Loop Fix:** Resolved the infinite sync loop during account linking by removing the `isDirty: true` flag from the `mergePlayerId` local state mapper.
- [x] **Robust Dirty Flag Clearing:** Refactored `clearPlayerDirtyFlag` in `playerSlice.ts` to iterate and clear the flag for all matching profile entries in Redux instead of stopping at the first match (`.find()`), safeguarding the system against infinite loops even if duplicate profile records are accidentally introduced.
- [x] **Real-time Deletion Cleanup:** Hardened the Realtime sync layer in `useDatabaseSync.ts` to dispatch `deletePlayer` when a delta-update fetch (`loadSinglePlayer`) returns `null` from the database. This instantly clears zombie/ghost entries from the UI without requiring a reload (F5).

### 20. Database Security Hardening & Performance Tune-up (Completed May 2026)
- [x] **PostgREST RPC Hardening:** Revoked public `EXECUTE` privileges on security-critical functions (`link_and_approve_profile()` and `enforce_role_immutability()`) from `PUBLIC` and `anon` roles to seal PostgREST API exploits, while safely retaining execution rights for authenticated users and database triggers.
- [x] **RLS InitPlan Optimization:** Refactored all active Row Level Security (RLS) policies on `profiles`, `profile_units`, `player_info`, `audit_logs`, and `tw_history` to wrap dynamic auth evaluations like `auth.uid()`, `auth.role()`, and `get_my_role_weight()` in subqueries (e.g. `user_id = (SELECT auth.uid())`). This forces PostgreSQL to evaluate the claims *once* (InitPlan) and cache them, speeding up scans by up to 95%.
- [x] **Legacy Policy Pruning:** Pruned 24+ legacy duplicate permissive policies (including old English-named policies like `"Only leadership can view groups"`, `"player_info_officer_only"`, and `"Units visibility"`), eliminating redundant evaluations during row scans.
- [x] **Duplicate Constraint Pruning:** Dropped duplicate table constraints (`profile_units_profile_unit_unique` and `tw_import_list_discord_name_key`) to halve index-maintenance overhead on unit upserts and TW roster imports.
- [x] **Foreign Key Indexing:** Created secondary indexes covering all 8 foreign keys across the public schema (e.g. `group_members_profile_id_idx`, `tw_events_season_id_idx`), optimizing query JOIN performance, speeding up cascade deletions, and preventing table-level locks.

### 21. TW Attendance Restore Safeguards (Completed May 2026)
- [x] **Snapshot Restore Sync Integrity:** Resolved a critical bug where restoring a TW history snapshot populated Redux locally but failed to save it to Supabase (causing players to drop out of groups on F5). We now force `isDirty: true` on all restored groups and `twAttendance` entries, and dispatch a clean local slate before insertion to bypass merge-checks and trigger a full database write.
- [x] **Clear List Cache Purge:** Refactored the "Clear list" action to immediately wipe groups in Redux (`setGroups([])`) at the same time the database deletion triggers. This prevents stale in-memory cached groups from confusing the sync scheduler or re-uploading before the database updates.

### 22. Production Rollout & Supabase Migration Merge (Completed June 2026)
- [x] **Pre-Merge Security Audit:** Verified Row Level Security (RLS) policies on `tw_import_list`, `audit_logs`, and `player_info` via direct PG-catalog query audits.
- [x] **Fast-Forward Merge:** Cleanly merged `feature/supabase-migration` into `main` with zero git conflicts.
- [x] **Vercel Production Deployment:** Configured production environment variables and redirect URLs in Supabase for Discord OAuth on the main domain `unit-manager-five.vercel.app`.

### 23. Real-time Group Sync & Timeout Hardening (Completed July 2026)
- [x] **Reconnection TIMED_OUT Handling:** Added `'TIMED_OUT'` to the real-time websocket connection error-reconnect path in `useDatabaseSync.ts`, ensuring that subscriptions automatically reconnect after a timeout instead of leaving the client stale until a page reload (F5).
- [x] **Surgical Group Upsert (No Delete-then-Insert):** Refactored `upsertGroup` in `groupService.ts` to perform a diff-based comparison. The app now deletes only members that were actually removed and upserts the rest, eliminating the destructive "Delete-then-Insert" pattern and its zero-data window which caused other clients to see empty groups in real-time.
- [x] **Automated Group Deletion Sync:** Added group deletion tracking to `useCloudSync.ts`. Removing groups locally (such as during a "Restore All" history snapshot apply or manual deletion) now automatically issues corresponding DELETE requests to Supabase, solving duplicate group merges upon restoration.
- [x] **Clear List Race Condition Fix:** Reordered the "Clear all" logic in `TWAttendanceView.tsx` to empty local Redux states first. This ensures that the sync scheduler sees no active groups during the async DB wipe, preventing deleted groups from accidentally getting re-uploaded.

### 24. Concurrent Edit & Deletion Race Condition Hardening (Completed July 2026)
- [x] **Silent Overwrite Prevention (Dirty Flag Race):** Fixed a race condition in `useCloudSync.ts` where an edit made *while* a previous upsert for the same player/group/TW entry was still in-flight could be silently discarded. `clearPlayerDirtyFlag`, `clearGroupDirtyFlag`, and `clearTWEntryDirtyFlag` now accept an optional `syncedRef` snapshot and only clear `isDirty` if the object's Immer reference still matches that snapshot — a mismatch means a newer edit landed mid-sync, so the flag stays dirty for the next cycle instead of losing the change.
- [x] **Group Deletion Tombstones:** Fixed a race condition where a locally deleted group could be resurrected if a Realtime `hydrateGroups` event arrived before the deletion was persisted to Supabase, causing the deletion to silently never reach the database. Added a self-cleaning `deletedGroupIds` tombstone set in `groupSlice.ts`, populated by `deleteGroup` and `setGroups` (covering manual deletion, "Clear List", and history restores), and consulted by `hydrateGroups` to suppress resurrection until the server confirms the row is gone.

### 25. Unit Pruning, Tier Persistence & Profile-Matching Safety Fixes (Completed July 2026)
- [x] **Safe Unit Pruning:** Replaced a hand-built raw PostgREST `not in (...)` filter string in `playerService.ts` with a fetch-diff-delete approach (mirroring `groupService.upsertGroup`). Admin-editable unit names containing `"`, `,`, or `)` previously could corrupt the filter, silently failing to prune stale `profile_units` rows and causing unchecked units to reappear after a reload.
- [x] **Unit Tier Persistence:** Fixed `updateUnitInSupabase` in `unitSlice.ts` to actually write the `tier` column to Supabase (it was accepted as a parameter but never included in the update payload) and reworked the `fulfilled` reducer to relocate the unit between tier arrays instead of only mapping within its original tier — a latent bug that would have silently broken any future tier-reassignment UI.
- [x] **Profile-Matching False-Positive Guard:** Hardened `findMatchedPlayer` (`reducerHelpers.ts`) and `ProfileMatcher.getSuggestedMatchId` against names that wash down to an empty string (e.g. a Discord nickname consisting only of emoji or bracketed tags). Previously, `''.includes()` semantics meant such a name could auto-suggest and pre-select an arbitrary, unrelated player for an irreversible account-link merge.

### 26. Realtime Filter, Avatar Continuity & Sync Cleanup Polish (Completed July 2026)
- [x] **Multi-Officer Approval Sync:** Removed the server-side `role=eq.Pending` filter on `ProfileMatcher`'s Realtime subscription. Supabase evaluates `postgres_changes` filters against the *new* row on UPDATE, so an approval/deny (role: `Pending` → `Member`) never matched the filter and other officers' clients never received the event — leaving their pending list stale and risking a second officer processing an already-resolved request.
- [x] **Avatar Continuity on Request Access:** Fixed `AuthGuard.handleRequestAccess` to carry the existing `avatarUrl` through its `setAuthSession` dispatch, preventing a brief avatar flicker to blank while a new access request is pending.
- [x] **Debounce Timer Cleanup:** `SyncManager` now deletes a debounce timer's entry once it fires. Static sync types were unaffected, but dynamic per-ID types (`player-${id}`, `tw-entry-${name}`) used by delta-sync previously accumulated one stale key per unique ID for the lifetime of the singleton during long-running sessions.
- [x] **Documented Empty-Hydration Guard:** Added an explanatory comment to `loadPlayers` in `useDatabaseSync.ts` clarifying that skipping hydration on an empty player list is an intentional tradeoff — it protects against a transient RLS/JWT timing gap wiping every client's roster, at the cost of a legitimately-emptied roster not visually clearing until the next reload.
- [x] **Verified Non-Issues:** Confirmed `tw_import_list.discord_name` is a `PRIMARY KEY` (`create_tw_import_table.sql`), which means `upsertTWImport`'s implicit `onConflict` and `fetchSingleTWEntry`'s `.maybeSingle()` were already safe — no code changes needed for either.

### 27. TW Import Realtime Deletion Fix (Completed July 2026)
- [x] **TW Roster Realtime Deletion Cleanup:** Fixed a bug where re-running a Raid Helper import that dropped previously Accepted/Maybe names left those stale names visible in every *other* officer's client until a manual reload (F5). The write-side delete (`useCloudSync` → `deleteTWImportEntry`) and the Realtime event delivery were already correct; `loadSingleTWEntry` in `useDatabaseSync.ts` simply discarded the resulting `null` fetch instead of removing the entry. Added a `deleteTWEntry` reducer to `twSlice.ts` (mirroring the existing `deletePlayer` pattern from #19) with the same dirty-flag protection used elsewhere in the slice, and wired it into the `null`-fetch branch.
- [x] **TW Import Status-Change Timestamp Guard:** Identified that `tw_import_list` has no `updated_at` column, so the timestamp guard in `updateSingleTWEntry` (`twSlice.ts`) fell back to comparing `created_at` — which an upsert never changes — silently skipping a status change (Accepted ↔ Maybe) on an already-present name for other connected officers. Added `_archive/add_updated_at_tw_import_list.sql` (same trigger pattern as `add_updated_at_profiles.sql`) to add the column and keep it current on every update.

### 28. Database Linter RPC Attack-Surface Cleanup (Completed July 2026)
- [x] **Trigger-Only Function EXECUTE Revocation:** Resolved three Supabase Database Linter `SECURITY DEFINER` warnings by revoking unnecessary `EXECUTE` privileges from `anon`/`authenticated`/`PUBLIC` on `enforce_role_on_insert()`, `update_profile_updated_at_from_units()`, and `update_tw_import_list_updated_at()` — all three are pure trigger functions (`RETURNS trigger`) never meant to be called directly via `/rest/v1/rpc/<name>`, since PostgreSQL fires triggers regardless of the invoking role's `EXECUTE` grant. Added `_archive/fix_security_definer_search_path_warnings.sql`.
- [x] **Search Path Pinning:** Pinned `SET search_path = public` on `update_tw_import_list_updated_at()`, the one remaining `SECURITY DEFINER` function missing it, closing the `function_search_path_mutable` linter warning.
- [x] **Verified Non-Issues:** Confirmed the two remaining `authenticated_security_definer_function_executable` warnings (`get_my_role_weight()`, `link_and_approve_profile()`) are intentional — both are legitimately called by signed-in clients (RLS policy evaluation and the ProfileMatcher "Link & Upgrade" RPC respectively) and must keep `authenticated` `EXECUTE` rights; `anon` was already revoked for both in #20.

### 29. Icon-Aware Name Matching (Completed July 2026)
- [x] **Emoji/Icon Stripping in `washName`:** Extended the shared name-normalization utility (`src/utils.ts`) to strip decorative emoji/pictographic symbols (e.g. 👑, ⚔️, ⭐) via the `\p{Extended_Pictographic}` Unicode property, alongside the existing `[ViP]`-style tag and stylized-font handling. Ensures Raid Helper import matching, player search, and profile matching all ignore cosmetic icons in Discord nicknames instead of treating them as literal characters.

### 30. Performance Optimization Pass & Sync Safety Hardening (Completed July 2026)
- [x] **Build-Time Tailwind Pipeline:** Replaced the Tailwind CDN JIT `<script>` (which shipped the entire compiler to the browser and generated CSS at runtime on every load) with a proper build-time PostCSS pipeline (`tailwind.config.js`, `postcss.config.js`, `src/index.css`), producing a single purged, static CSS file instead.
- [x] **Route-Level Code Splitting:** Converted the mutually-exclusive main views (`AdminPanel`, `ProfileMatcher`, `TWStatisticsView`, `TWAttendanceView`, `GroupView`, `PlayerUnitView`) and `HelpManualModal` to `React.lazy` + `Suspense`, cutting the initial JS bundle by roughly a third (gzipped) since most users only ever load a subset of these per session.
- [x] **Bounded-Parallel Cloud Sync:** Replaced `useCloudSync`'s fully-sequential (`await`-in-`for`-loop) upserts/deletes for players, groups, and TW attendance with a bounded-concurrency runner (max 8 in flight), removing the N-round-trips-in-series cost on any multi-item edit while still capping load on Supabase's connection pool.
- [x] **TW Import Group-Dirty Precision:** Fixed `handleTWAttendanceImport` (`reducerHelpers.ts`) marking *every* group as `isDirty` on every Raid Helper import regardless of whether membership actually changed, which previously turned a single import into an O(groups) full upsert-diff cycle. Now only groups whose membership or leadership actually changed are flagged.
- [x] **Batched TW Record Deletion:** Replaced a per-record `DELETE` loop in `deleteTWAttendanceRecords` (used by import-undo) with a single batched `.delete().in(...)` call per event.
- [x] **Restored Drag-and-Drop Memoization:** `useGroupDragAndDrop`'s handlers were being recreated on every render (never memoized), silently defeating `React.memo` on the attendance list/grid rows. Rewrote the hook with `useCallback` and a "latest ref" pattern (stable handler identity that always reads current `groups` via a ref instead of as a dependency), so drag interactions and group edits only re-render the rows actually affected instead of every row in every group.
- [x] **Render Isolation Sweep:** Memoized `GroupView` (previously unmemoized and doing an O(members × players) `.find()` per render), `UnitSearch`'s per-result group/attendance lookups, `GroupsList`'s display sort, and extracted `AttendanceGroupGrid`'s member rows into a memoized child component.
- [x] **🔴 Data-Loss Incident & Fix — Empty-Hydration Guards:** Discovered (via live runtime verification, not a report) that `loadTWImport` and `loadGroups` in `useDatabaseSync.ts` had no protection against a transient RLS/JWT-timing-gap or swallowed network error returning an empty-but-successful fetch result — unlike the existing guard on `loadPlayers` (see #26). An empty result was hydrated as-is, and `useCloudSync`'s diff-based deletion then interpreted "everything missing from the new list" as "the user deleted everything," issuing real `DELETE` calls against Supabase. This is the confirmed root cause of a live `tw_import_list` wipe during this session's testing (recovered via Raid Helper re-import). Added the same empty-response guard already used by `loadPlayers` to both `loadGroups` and `loadTWImport`, plus `loadTWData` (seasons/events/records) for consistency.
- [x] **Defense-in-Depth Wipe Guard:** Added a second, independent safety layer directly in `useCloudSync`: if a previously-populated list (≥3 items) appears completely empty in a single sync tick, the diff-based deletion is skipped and a warning is surfaced, rather than propagating it as a mass-delete. Protects against *future*, still-unknown bugs of the same shape, not just the two found here. Small/normal deletions (e.g. removing one group) are unaffected.
- [x] **Player Unit-Wipe Guard:** Hardened `upsertPlayer`'s "player has zero local units → wipe all `profile_units` rows" branch in `playerService.ts` with the same threshold check: if Supabase still has ≥3 real unit rows for that profile despite local state showing none, the delete is blocked and logged instead of executed, guarding against a joined fetch silently returning an empty nested `profile_units` array for one row (a per-row RLS timing gap, not a whole-query failure) later being persisted as a real deletion once that player is edited.

## 🛠 In Progress / Planned

### Features & DX
- [ ] **Prevent Duplicate Player Placements:** Implement strict boundaries to ensure a single player cannot be added to two or more different groups simultaneously.
- [ ] **Stricter Name Matching:** Refine `findMatchedPlayer` logic to eliminate "short-name stealing" (where names like 'Immo' incorrectly match 'immoSoulX') by prioritizing exact matches and aliases.
- [ ] **Full Type Safety:** Implement Supabase CLI type generation to synchronize database schema with TypeScript definitions, reducing runtime errors.
- [ ] **Single-Player Delta-Sync Error Ambiguity:** `loadSinglePlayer`'s delta-sync fetch can't currently distinguish "profile genuinely deleted" from "query failed transiently" (both resolve to `null`), so a network blip can make one player cosmetically vanish from the local roster until the next full sync self-heals it. Not a database-write risk (no diff-delete reads from this path), but worth closing for consistency.
- [ ] **Audit Log Round-Trip Reduction:** `auditService.logAction`'s 5-minute dedup window costs a `SELECT` + conditional `UPDATE`/`INSERT` per logged action. Reducing this to one round-trip requires a Postgres-side function/RPC change (out of scope for a client-only pass).
- [ ] **Performance Roadmap:**
  - [ ] **Virtualization:** Implement virtualized lists (e.g., `react-window`) for Player List and Attendance to handle 500+ items.
  - [ ] **Synergy Tools:** Group view improvements to visualize unit synergies (Shields + Heals).

---

## 🏗 Technical Stack

- **Frontend:** React (Vite), Redux Toolkit, Tailwind CSS (build-time PostCSS pipeline).
- **Backend:** Supabase (Auth, PostgreSQL, Realtime).
- **Security:** Hierarchical RLS (STABLE/InitPlan weight functions) + Trigger-based integrity + RPC Hardening.

*Last updated: 2026-07-08 (Performance Optimization Pass & Sync Safety Hardening)*
