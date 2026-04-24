import { useState, useCallback, useEffect } from 'react';
import { UserRole } from '../types';

export const useNavigationState = (role: UserRole, userId: string | null) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showAttendanceView, setShowAttendanceView] = useState<boolean>(false);
    const [showTWStatisticsView, setShowTWStatisticsView] = useState<boolean>(false);
    const [showProfileMatcher, setShowProfileMatcher] = useState<boolean>(false);
    const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
    
    const [isPlayerListOpen, setPlayerListOpen] = useState(true);

    const handleSelectPlayer = useCallback((playerId: string | null) => {
        setSelectedPlayerId(playerId);
        if (playerId) {
            setSelectedGroupId(null);
            setShowAttendanceView(false);
            setShowTWStatisticsView(false);
            setShowProfileMatcher(false);
            setShowAdminPanel(false);
            if (!isPlayerListOpen) setPlayerListOpen(true);
        }
    }, [isPlayerListOpen]);

    const handleSelectGroup = useCallback((groupId: string | null) => {
        setSelectedGroupId(groupId);
        if (groupId) {
            setSelectedPlayerId(null);
            setShowAttendanceView(false);
            setShowTWStatisticsView(false);
            setShowProfileMatcher(false);
            setShowAdminPanel(false);
        }
    }, []);

    const handleOpenAttendance = useCallback(() => {
        setShowAttendanceView(true);
        setShowTWStatisticsView(false);
        setShowProfileMatcher(false);
        setShowAdminPanel(false);
        setSelectedPlayerId(null);
        setSelectedGroupId(null);
    }, []);

    const handleOpenTWStatistics = useCallback(() => {
        setShowTWStatisticsView(true);
        setShowAttendanceView(false);
        setShowProfileMatcher(false);
        setShowAdminPanel(false);
        setSelectedPlayerId(null);
        setSelectedGroupId(null);
    }, []);

    const handleOpenProfileMatcher = useCallback(() => {
        setShowProfileMatcher(true);
        setShowTWStatisticsView(false);
        setShowAttendanceView(false);
        setShowAdminPanel(false);
        setSelectedPlayerId(null);
        setSelectedGroupId(null);
    }, []);

    const handleOpenAdminPanel = useCallback(() => {
        setShowAdminPanel(true);
        setShowProfileMatcher(false);
        setShowTWStatisticsView(false);
        setShowAttendanceView(false);
        setSelectedPlayerId(null);
        setSelectedGroupId(null);
    }, []);

    const handleTogglePlayerList = useCallback(() => {
        if (isPlayerListOpen) {
            setSelectedPlayerId(null);
        }
        setPlayerListOpen(prev => !prev);
    }, [isPlayerListOpen]);

    // Role-based Security Lock ("The Shield")
    // Ensures restricted data is cleared if the user's role is not authorized.
    useEffect(() => {
        if (role === 'Member' || role === 'Pending') {
            if (selectedPlayerId && selectedPlayerId !== userId) setSelectedPlayerId(null);
            if (selectedGroupId) setSelectedGroupId(null);
            if (showAttendanceView) setShowAttendanceView(false);
            if (showTWStatisticsView) setShowTWStatisticsView(false);
            if (showProfileMatcher) setShowProfileMatcher(false);
            if (showAdminPanel) setShowAdminPanel(false);
        }
    }, [role, userId, selectedPlayerId, selectedGroupId, showAttendanceView, showTWStatisticsView, showProfileMatcher, showAdminPanel]);

    // Auto-select own profile for Members on load
    useEffect(() => {
        if (role === 'Member' && userId && !selectedPlayerId && !selectedGroupId) {
            setSelectedPlayerId(userId);
        }
    }, [role, userId, selectedPlayerId, selectedGroupId]);

    return {
        selectedPlayerId,
        selectedGroupId,
        showAttendanceView,
        showTWStatisticsView,
        showProfileMatcher,
        showAdminPanel,
        isPlayerListOpen,
        handleSelectPlayer,
        handleSelectGroup,
        handleOpenAttendance,
        handleOpenTWStatistics,
        handleOpenProfileMatcher,
        handleOpenAdminPanel,
        handleTogglePlayerList,
        setShowAdminPanel // Sometimes components need to close themselves
    };
};
