import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { UserRole } from '../types';

export const usePermission = () => {
    const { role } = useSelector((state: RootState) => state.auth);

    const check = (roles: UserRole[]) => roles.includes(role);

    return {
        role,
        // UI Visibility permissions
        canViewPlayerList: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canViewGroups: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canViewUnitManager: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canViewAttendance: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canViewStats: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        
        // Action permissions
        canEditOthersUnits: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canEditInternalNotes: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        canExportGroups: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        
        // Gatekeeper/Admin specific
        canApproveUsers: check(['Gatekeeper', 'Admin', 'Owner']),
        
        // Admin specific
        canEditDates: check(['Admin', 'Owner']),
        canEditSystemConfig: check(['Admin', 'Owner']),
        
        // Helpers
        isOfficerPlus: check(['Officer', 'Gatekeeper', 'Admin', 'Owner']),
        isGatekeeperPlus: check(['Gatekeeper', 'Admin', 'Owner']),
        isAdmin: check(['Admin', 'Owner']),
        isOwner: role === 'Owner',
        isPending: role === 'Pending',
    };
};
