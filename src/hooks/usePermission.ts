import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { UserRole } from '../state/slices/authSlice';

export const usePermission = () => {
    const { role } = useSelector((state: RootState) => state.auth);

    const check = (roles: UserRole[]) => roles.includes(role);

    return {
        role,
        // UI Visibility permissions
        canViewPlayerList: check(['Officer', 'Gatekeeper', 'Admin']),
        canViewGroups: check(['Officer', 'Gatekeeper', 'Admin']),
        canViewUnitManager: check(['Officer', 'Gatekeeper', 'Admin']),
        canViewAttendance: check(['Officer', 'Gatekeeper', 'Admin']),
        canViewStats: check(['Officer', 'Gatekeeper', 'Admin']),
        
        // Action permissions
        canEditOthersUnits: check(['Officer', 'Gatekeeper', 'Admin']),
        canEditInternalNotes: check(['Officer', 'Gatekeeper', 'Admin']),
        canExportGroups: check(['Officer', 'Gatekeeper', 'Admin']),
        
        // Gatekeeper/Admin specific
        canApproveUsers: check(['Gatekeeper', 'Admin']),
        
        // Admin specific
        canEditDates: check(['Admin']),
        canEditSystemConfig: check(['Admin']),
        
        // Helpers
        isOfficerPlus: check(['Officer', 'Gatekeeper', 'Admin']),
        isGatekeeperPlus: check(['Gatekeeper', 'Admin']),
        isAdmin: check(['Admin']),
        isPending: role === 'Pending',
    };
};
