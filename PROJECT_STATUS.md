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
- [x] **Race Condition Protection:** Implemented `isDirty` and `updatedAt` guards in the `playerSlice` to ensure local changes are never overwritten by stale server data or out-of-order payloads.
- [x] **Optimized Rendering:** Leveraged Immer's structural sharing in the `updateSinglePlayer` reducer to maintain object reference stability, enabling optimal React memoization and eliminating full-list re-renders.
- [x] **Production Hardening:** Implemented a feature-flagged rollout (`DELTA_SYNC_ENABLED`) and environment-aware logging (`import.meta.env.DEV`) to ensure stability and maintainability.

## 🛠 In Progress / Planned

### Features & DX
- [ ] **Full Type Safety:** Implement Supabase CLI type generation to synchronize database schema with TypeScript definitions, reducing runtime errors.
- [ ] **TW-Import Sync Optimization:** Replace JSON-stringify diffing with a dedicated `isDirty` flag for TW Import records to improve performance and reliability (RT-4).
- [ ] **Performance Roadmap:**
  - [ ] **Virtualization:** Implement virtualized lists (e.g., `react-window`) for Player List and Attendance to handle 500+ items.
  - [ ] **Code Splitting:** Defer loading of heavy modules like Audit Logs and TW Statistics using `React.lazy`.
  - [ ] **Synergy Tools:** Group view improvements to visualize unit synergies (Shields + Heals).

---

## 🏗 Technical Stack

- **Frontend:** React (Vite), Redux Toolkit, Vanilla CSS.
- **Backend:** Supabase (Auth, PostgreSQL, Realtime).
- **Security:** Hierarchical RLS (STABLE weight functions) + Trigger-based integrity.

*Last updated: 2026-05-07 (Delta Sync Architecture Implemented)*

