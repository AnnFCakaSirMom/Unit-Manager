export const HELP_CONTENT = {
    // General
    app_overview: {
        title: "Welcome to Unit Manager",
        content: "This tool helps you manage players, track unit status, and organize formations for Territory Wars (TW). Use the sidebar to navigate between different views."
    },

    // Sidebar
    help_mode: {
        title: "Help Mode",
        content: "Toggle this on to show detailed info icons (ⓘ) throughout the app. Even when off, simple hover tooltips remain available on most buttons."
    },
    manual: {
        title: "The Manual",
        content: "Access the comprehensive guide for a deep dive into every feature of the application."
    },

    // Player/Member Management
    member_management: {
        title: "Member Management",
        content: "Gatekeepers and higher can add new players by name in the sidebar, set roles, track 'Joined' and 'Inactive' dates, and manage Discord aliases to keep the roster synchronized."
    },
    player_roles: {
        title: "User Roles",
        content: "Roles like 'Officer', 'Gatekeeper', and 'Admin' grant different permissions. 'Pending' users must be approved by a Gatekeeper or higher."
    },

    // Units
    unit_tracking: {
        title: "Unit Status Tracking",
        content: "Track your progress for each unit across four categories: Owned, Maxed Unit (Max Level), Full Mastery (Max nodes), and Favorite (Priority units).",
        owned: "Indicator that the unit is unlocked and currently in your barracks.",
        maxed: "Unit has reached its maximum level and training potential.",
        mastery: "All Mastery nodes for this unit have been fully upgraded.",
        favorite: "Mark units as favorites if they are your preferred units to use in battle."
    },
    unit_import_form: {
        title: "Import Form",
        content: "A quick way to batch-update your barracks. Copy the 'Empty Form' to a text editor (or Discord), mark your units with 'x', then paste it back here to sync."
    },

    // Groups & formations
    group_management: {
        title: "Groups & Formations",
        content: "Create battle formations in the sidebar or via the 'TW Attendance' view. You can rename groups in the sidebar list."
    },
    unit_rank: {
        title: "Unit Ranks",
        content: "Adjusted in the sidebar during planning. Rank numbers indicate priority: Rank 1 is the starting unit, Rank 2 is the secondary, and so on."
    },
    move_player_view: {
        title: "Move Player Mode",
        content: "A dedicated interface in the TW Attendance view for rapidly shifting multiple players between groups using drag and drop."
    },
    discord_export: {
        title: "Discord Export",
        content: "Copy groups or the whole list to your clipboard with formatting optimized for Discord messages (using code blocks)."
    },

    // TW Attendance & Statistics
    attendance_group_mgmt: {
        title: "Group Management",
        content: "Create a group first, then drag and drop players from the list into your groups. You can also move players between groups using the same method."
    },
    tw_statistics: {
        title: "TW Statistics",
        content: "Analyze performance over the course of a season. You can manually override attendance (e.g. changing 'Accepted' to 'Not Attended') for individual players by clicking their status."
    },
    date_selection_warning: {
        title: "Statistics Guide",
        content: "This view tracks performance over time. You can manually edit status or import JSON. IMPORTANT: Always select the correct date before making changes to ensure stats are attributed correctly."
    },
    nitro_mode: {
        title: "Discord Nitro Mode",
        content: "When enabled, the 'Copy Leaderboard' function allows for up to 4000 characters per message."
    },
    raid_helper_import: {
        title: "Raid Helper Import",
        content: "Copy the raw JSON output from the Raid Helper bot and paste it here to automatically mark attendance for an event."
    },
    status_awol: {
        title: "AWOL (Absent Without Leave)",
        content: "Used for players who did not do their attendance at all (did not click Accepted, Declined, or Maybe in Raid Helper)."
    },

    // Administrative Manuals (Restricted to Gatekeeper+)
    audit_log_manual: {
        title: "Audit Log System",
        content: "Every change to players, groups, or roles is tracked for 60 days. 'Major' changes (like deletions or role upgrades) are highlighted in red. Use the 'Suspicious Only' toggle to quickly find unauthorized activity."
    },
    roles_manual: {
        title: "Roles & Permissions",
        content: "Permissions are built on a recursive weight system (0-6). Owners (6) and Admins (5) have full access. Gatekeepers (4) can match profiles and add players. Officers (3) can manage groups. Members (2) can only edit their own units."
    },
    approval_manual: {
        title: "User Approval Process",
        content: "New users appear as 'Pending' after logging in via Discord. They are prompted to enter their In-Game Name (IGN) to help you identify them. Use the 'Link & Upgrade' button to merge their login with an existing manual profile or create a fresh one. If an unauthorized user attempts to gain access, use the 'Deny' button to permanently remove their request from the queue."
    },

    // TW History
    tw_history: {
        title: "TW History & Snapshots",
        content: "Every time you clear your attendance list, a 'snapshot' is automatically created in the history. You can also save your current planning manually using the 'Save' button in the TW Attendance view.",
        restore: "Restoring a full snapshot will replace your current planning with the saved data.",
        copy_paste: "To transfer specific groups or players, use the 'Copy' buttons in the history view. After closing the history modal, 'Paste' buttons will appear in your current planning view.",
        units: "Player unit selections are preserved exactly as they were when the snapshot was taken. If a player has since removed a unit from their profile, it will be marked with a warning icon but can still be copied."
    }
};
