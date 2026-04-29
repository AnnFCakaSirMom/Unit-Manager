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

### 3. UI/UX Modernization (Current status)
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
    *   Real-time name-based search to quickly find players.
    *   Intelligent Leaderboard ranking (Attendance % -> Count -> AWOL penalty -> Name).
    *   **Discord Nitro Mode:** Support for extended character limit (4000) during export.
- [x] **Sidebar Cleanup:** Moved Logout and Sync indicators to the Header for a cleaner workspace.

### 5. Service Architecture & Sync Reliability (Completed April 2026)
- [x] **Centralized Service Logic:** Introduced `supabaseUtils.ts` to standardize all calls, error handling, and AbortSignal mapping.
- [x] **Smart Retry System:**
    *   Implemented partial sync (only successful changes are marked as saved).
    *   Intelligent retry logic with a limit of 5 attempts to avoid infinite loops on permanent errors.
- [x] **Visual Sync Feedback:** Centralized the sync indicator in the Header with dynamic icons (`Synced`, `Syncing`, `Error`, `PermanentError`) and tooltips.
- [x] **Code Cleanup:** Removed dead props and redundant Redux actions (`setAuthInitialized`) for better maintainability.

### 6. Performance & Rendering Architecture (Completed April 2026)
- [x] **Advanced Render Isolation:**
    *   **GroupMemberCard:** Broke out `MovePlayerDropdown` to eliminate heavy Redux subscriptions at the group level for each player card.
    *   **List Optimization:** Implemented row-wise memoization (`PlayerListItem`, `AttendancePlayerRow`) and moved down local state (e.g., editing) to isolate renders during searching and interaction.
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

---

## 🛠 In Progress / Planned

### Design & Graphics
- [ ] **Medieval Theme:** Plans to replace the current "Clean" design with a more medieval theme (Conqueror's Blade aesthetic).
- [ ] **Icon Pack:** Replace standard icons with custom graphic elements that match the game.

### Features
- [ ] **Synergy Tools:** Improvements in the group view to easier see synergies between units (e.g., heal units + shields).

---

## 🏗 Technical Stack
- **Frontend:** React (Vite), Redux Toolkit, Vanilla CSS.
- **Backend:** Supabase (Auth, PostgreSQL, Realtime).
- **Security:** Row Level Security (RLS) with hierarchical weights.

*Last updated: 2026-04-29 (Midnight)*
