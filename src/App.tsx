import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ConfirmModalInfo } from './types';

import { useFileHandler } from './hooks/useFileHandler';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useCloudSync } from './hooks/useCloudSync';
import { Sidebar } from './components/Sidebar';
import { PlayerUnitView } from './components/PlayerUnitView';
import { GroupView } from './components/GroupView';
import { TWAttendanceView } from './components/TWAttendanceView';
import { TWStatisticsView } from './components/TWStatisticsView';
import { ProfileMatcher } from './components/ProfileMatcher';
import { AdminPanel } from './components/AdminPanel';
import { UnitManagementModal } from './components/UnitManagementModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { UploadCloud } from './components/icons';

import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './services/supabase';
import { AuthGuard } from './components/AuthGuard';
import { fetchUnitsFromSupabase } from './state/slices/unitSlice';
import { RootState, AppDispatch } from './state/store';
import { useAuth } from './hooks/useAuth';
import { useNavigationState } from './hooks/useNavigationState';
import { useDatabaseSync } from './hooks/useDatabaseSync';

declare global {
    interface Window {
        showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
        showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
    }
}

const App: React.FC = () => {
    const reduxDispatch = useDispatch<AppDispatch>();

    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState<boolean>(false);
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

    useDatabaseSync(reduxDispatch, isOfficerPlus);

    useEffect(() => {
        // Fetch units from Supabase at startup
        reduxDispatch(fetchUnitsFromSupabase());
    }, [reduxDispatch]);



    // Fetch pending approvals count for Sidebar badge
    useEffect(() => {
        const isGatekeeperPlus = ['Gatekeeper', 'Admin', 'Owner'].includes(role);
        if (!isGatekeeperPlus) return;
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'Pending')
            .then(({ count }) => setPendingApprovalsCount(count ?? 0));
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

    useCloudSync(setStatusMessage);

    const players = useSelector((state: RootState) => state.player.players);
    const groups = useSelector((state: RootState) => state.group.groups);

    const selectedPlayer = useMemo(() => players.find((p: any) => p.id === selectedPlayerId), [players, selectedPlayerId]);
    const selectedGroup = useMemo(() => groups.find((g: any) => g.id === selectedGroupId), [groups, selectedGroupId]);

    const { processFile, handleSaveData, handleModernOpenFile } = useFileHandler({
        handleSelectPlayer,
        setStatusMessage
    });

    const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop({
        onDropFile: (file) => processFile(file, null)
    });

    return (
        <AuthGuard>
            <div className="bg-gray-900 text-gray-200 min-h-screen font-sans" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        {isDragging && (
                            <div className="drag-over-overlay">
                                <div className="text-center text-white">
                                    <UploadCloud size={64} className="mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold">Drop your .json file here</h2>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row h-full min-h-screen">
                            <Sidebar
                                selectedPlayerId={selectedPlayerId}
                                selectedGroupId={selectedGroupId}
                                onSelectPlayer={handleSelectPlayer}
                                onSelectGroup={handleSelectGroup}
                                onSave={handleSaveData}
                                onLoad={handleModernOpenFile}
                                onOpenUnitManager={() => setIsMgmtModalOpen(true)}
                                onOpenAttendance={handleOpenAttendance}
                                onOpenTWStatistics={handleOpenTWStatistics}
                                onOpenProfileMatcher={handleOpenProfileMatcher}
                                onOpenAdminPanel={handleOpenAdminPanel}
                                pendingApprovalsCount={pendingApprovalsCount}
                                hasUnsavedChanges={false}
                                statusMessage={statusMessage}
                                setConfirmModal={setConfirmModal}
                                isPlayerListOpen={isPlayerListOpen}
                                onTogglePlayerList={handleTogglePlayerList}
                                onLogout={handleLogout}
                            />

                            <main className="w-full md:w-2/3 lg:w-3/4 p-4 md:p-6 flex-grow">
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
                                    <div className="flex-1 overflow-hidden p-4 min-w-[300px]">
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
                                        onCopy={(text) => {
                                            navigator.clipboard.writeText(text);
                                            setStatusMessage('Group copied to clipboard!');
                                        }}
                                    />
                                ) : selectedPlayer ? (
                                    <PlayerUnitView
                                        key={selectedPlayerId}
                                        player={selectedPlayer!}
                                        setStatusMessage={setStatusMessage}
                                        setConfirmModal={setConfirmModal}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                                        <h2 className="text-xl">Select a player or group to get started.</h2>
                                    </div>
                                )}
                            </main>
                        </div>

                        {isMgmtModalOpen && (
                            <UnitManagementModal
                                onClose={() => setIsMgmtModalOpen(false)}
                            />
                        )}

                        {confirmModal.isOpen && (
                            <ConfirmationModal
                                {...confirmModal}
                                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                            />
                        )}
                    </div>
        </AuthGuard>
    );
};

export default App;