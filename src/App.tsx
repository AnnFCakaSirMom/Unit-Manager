import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import type { ConfirmModalInfo } from './types';

import { useFileHandler } from './hooks/useFileHandler';
import { useCloudSync } from './hooks/useCloudSync';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MemberProfileRail } from './components/MemberProfileRail';
import { ConfirmationModal } from './components/ConfirmationModal';

import { useAppSelector, useAppDispatch } from './state/store';
import { supabase } from './services/supabase';
import { AuthGuard } from './components/AuthGuard';
import { fetchUnitsFromSupabase } from './state/slices/unitSlice';
import { useAuth } from './hooks/useAuth';
import { useNavigationState } from './hooks/useNavigationState';
import { useDatabaseSync } from './hooks/useDatabaseSync';
import { StatusToast } from './components/StatusToast';

// PERF: Code-split the mutually-exclusive main views and the on-demand help
// modal so they're not in the initial bundle. Each loads on first use behind a
// Suspense boundary. Named exports are adapted to the default export lazy() expects.
const PlayerUnitView = lazy(() => import('./components/PlayerUnitView').then(m => ({ default: m.PlayerUnitView })));
const GroupView = lazy(() => import('./components/GroupView').then(m => ({ default: m.GroupView })));
const TWAttendanceView = lazy(() => import('./components/TWAttendanceView').then(m => ({ default: m.TWAttendanceView })));
const TWStatisticsView = lazy(() => import('./components/TWStatisticsView').then(m => ({ default: m.TWStatisticsView })));
const ProfileMatcher = lazy(() => import('./components/ProfileMatcher').then(m => ({ default: m.ProfileMatcher })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const HelpManualModal = lazy(() => import('./components/HelpManualModal').then(m => ({ default: m.HelpManualModal })));

const ViewLoadingFallback: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500/80 animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading…</p>
    </div>
);

declare global {
    interface Window {
        showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
        showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
    }
}

const App: React.FC = () => {
    const reduxDispatch = useAppDispatch();

    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalInfo>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

    const { role, userId, isOfficerPlus } = useAuth();
    
    const {
        selectedPlayerId, selectedGroupId, showAttendanceView, showTWStatisticsView,
        showProfileMatcher, showAdminPanel, isPlayerListOpen,
        handleSelectPlayer, handleSelectGroup, handleOpenAttendance,
        handleOpenTWStatistics, handleOpenProfileMatcher, handleOpenAdminPanel,
        handleTogglePlayerList, setShowAdminPanel
    } = useNavigationState(role, userId);

    const handleOpenManual = useCallback(() => setIsManualOpen(true), []);

    // Stable callback so the memoized GroupView isn't re-rendered by a fresh
    // inline onCopy identity on every App render.
    const handleCopyGroup = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setStatusMessage('Group copied to clipboard!');
    }, []);

    useDatabaseSync(reduxDispatch, isOfficerPlus, setStatusMessage);

    useEffect(() => {
        // Fetch units from Supabase at startup
        reduxDispatch(fetchUnitsFromSupabase());
    }, [reduxDispatch]);

    // Fetch and subscribe to pending approvals count for Sidebar badge
    useEffect(() => {
        const isGatekeeperPlus = ['Gatekeeper', 'Admin', 'Owner'].includes(role);
        if (!isGatekeeperPlus) {
            setPendingApprovalsCount(0);
            return;
        }

        const fetchCount = async () => {
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('role', 'Pending');
            setPendingApprovalsCount(count ?? 0);
        };

        fetchCount();

        // RT-3: Use a unique channel ID per session (consistent with the rest of the app)
        const channel = supabase
            .channel(`pending-approvals-${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'profiles' 
            }, () => {
                // Re-fetch count on any change to profiles
                fetchCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role]);

    const handleLogout = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setStatusMessage(`Error logging out: ${error.message}`);
        } else {
            // State will be cleared by the onAuthStateChange listener
            setStatusMessage("Logged out successfully.");
        }
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const { status } = useCloudSync(setStatusMessage);

    const players = useAppSelector(state => state.player.players);
    const groups = useAppSelector(state => state.group.groups);
    const isSyncing = useAppSelector(state => state.ui.isSyncing);

    const selectedPlayer = useMemo(() => players.find(p => p.id === selectedPlayerId), [players, selectedPlayerId]);
    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    const { handleSaveData, handleModernOpenFile } = useFileHandler({
        handleSelectPlayer,
        setStatusMessage
    });

    return (
        <AuthGuard>
            <div className="bg-transparent text-gray-200 h-screen overflow-hidden font-sans flex flex-col">
                        {/* Global Header */}
                        <Header onLogout={handleLogout} syncStatus={status} />

                        <div className="flex flex-row flex-1 overflow-hidden">
                            {isOfficerPlus ? (
                                <Sidebar
                                    selectedPlayerId={selectedPlayerId}
                                    selectedGroupId={selectedGroupId}
                                    onSelectPlayer={handleSelectPlayer}
                                    onSelectGroup={handleSelectGroup}
                                    onOpenAttendance={handleOpenAttendance}
                                    onOpenTWStatistics={handleOpenTWStatistics}
                                    onOpenProfileMatcher={handleOpenProfileMatcher}
                                    onOpenAdminPanel={handleOpenAdminPanel}
                                    onOpenManual={handleOpenManual}
                                    pendingApprovalsCount={pendingApprovalsCount}
                                    statusMessage={statusMessage}
                                    setStatusMessage={setStatusMessage}
                                    setConfirmModal={setConfirmModal}
                                    isPlayerListOpen={isPlayerListOpen}
                                    onTogglePlayerList={handleTogglePlayerList}
                                />

                            ) : (
                                <MemberProfileRail setStatusMessage={setStatusMessage} />
                            )}

                            <main className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col min-w-0">
                                <Suspense fallback={<ViewLoadingFallback />}>
                                {showAdminPanel ? (
                                    <div className="flex-1 overflow-auto p-4 min-w-[300px]">
                                        <AdminPanel
                                            onSave={handleSaveData}
                                            onLoad={handleModernOpenFile}
                                            onClose={() => setShowAdminPanel(false)}
                                        />
                                    </div>
                                ) : showProfileMatcher ? (
                                    <div className="flex-1 overflow-auto p-4 min-w-[300px]">
                                        <ProfileMatcher />
                                    </div>
                                ) : showTWStatisticsView ? (
                                    <TWStatisticsView />
                                ) : showAttendanceView ? (
                                    <div className="flex-1 overflow-hidden p-4 min-w-[300px] flex flex-col">
                                        <TWAttendanceView
                                            onSelectPlayer={handleSelectPlayer}
                                            setConfirmModal={setConfirmModal}
                                            setStatusMessage={setStatusMessage}
                                        />
                                    </div>
                                ) : selectedGroup ? (
                                    <GroupView
                                        key={selectedGroupId}
                                        group={selectedGroup!}
                                        onCopy={handleCopyGroup}
                                    />
                                ) : selectedPlayer ? (
                                    <PlayerUnitView
                                        key={selectedPlayerId}
                                        player={selectedPlayer!}
                                        setStatusMessage={setStatusMessage}
                                        setConfirmModal={setConfirmModal}
                                    />
                                ) : (
                                    isSyncing && players.length === 0 ? (
                                        // UX-3: Initial loading state for main content area
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                                            <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500/80 animate-spin" />
                                            <p className="text-sm font-medium tracking-wide">Loading data…</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-center text-gray-500">
                                            <h2 className="text-xl">Select a player or group to get started.</h2>
                                        </div>
                                    )
                                )}
                                </Suspense>
                            </main>
                        </div>



                        {isManualOpen && (
                            <Suspense fallback={null}>
                                <HelpManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
                            </Suspense>
                        )}
                        {confirmModal.isOpen && (
                            <ConfirmationModal 
                                isOpen={confirmModal.isOpen} 
                                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                                title={confirmModal.title} 
                                message={confirmModal.message} 
                                onConfirm={confirmModal.onConfirm} 
                            />
                        )}

                        {/* UX-2: Global status toast — visible for ALL roles (officers + members) */}
                        <StatusToast
                            message={statusMessage}
                            onDismiss={() => setStatusMessage('')}
                        />
                    </div>
        </AuthGuard>
    );
};

export default App;