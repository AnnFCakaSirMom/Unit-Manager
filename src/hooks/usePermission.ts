import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { UserRole } from '../types';

const ROLE_WEIGHTS: Record<UserRole, number> = {
    'Owner': 6,
    'Admin': 5,
    'Gatekeeper': 4,
    'Officer': 3,
    'Member': 2,
    'Pending': 1,
    'Guest': 0
};

export const usePermission = () => {
    const { role } = useSelector((state: RootState) => state.auth);
    
    const weight = ROLE_WEIGHTS[role] || 0;

    return {
        role,
        // UI Visibility permissions
        canViewPlayerList: weight >= 3, // Officer+
        canViewGroups: weight >= 3,     // Officer+
        canViewUnitManager: weight >= 3, // Officer+
        canViewAttendance: weight >= 3, // Officer+
        canViewStats: weight >= 3,      // Officer+
        canViewHelp: weight >= 3,       // Officer+
        
        // Action permissions
        canEditOthersUnits: weight >= 3, // Officer+
        canEditInternalNotes: weight >= 3, // Officer+
        canExportGroups: weight >= 3,    // Officer+
        canManageGroups: weight >= 3,    // Officer+
        
        // Gatekeeper/Admin specific
        canApproveUsers: weight >= 4,    // Gatekeeper+
        canViewAdminPanel: weight >= 4,  // Gatekeeper+
        canToggleNotInHouse: weight >= 4, // Gatekeeper+
        canEditDisplayName: weight >= 4,  // Gatekeeper+
        
        // Admin/Owner specific
        canDeletePlayers: weight >= 5,    // Admin+
        canEditDates: weight >= 5,        // Admin+
        canEditSystemConfig: weight >= 5, // Admin+
        
        // Hierarchy logic
        // Only allow managing a role that is STRICTLY LOWER than your own
        // Exception: Owner can manage everyone except possibly themselves (Owner is top)
        canManageRole: (targetRole: UserRole) => {
            if (role === 'Owner') return targetRole !== 'Owner'; // Owner can't change their own role here
            return weight > (ROLE_WEIGHTS[targetRole] || 0);
        },

        // Helpers
        isOfficerPlus: weight >= 3,
        isGatekeeperPlus: weight >= 4,
        isAdmin: weight >= 5,
        isOwner: role === 'Owner',
        isPending: role === 'Pending',
    };
};
