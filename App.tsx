import React, { useState, useReducer, useEffect, useMemo, useCallback } from 'react';
import type { AppState, ConfirmModalInfo } from './types';
import { appReducer, withUnsavedChanges } from './reducer';
import { DEFAULT_UNIT_TIERS } from './units';
import { AppStateContext, AppDispatchContext } from './AppContext';

import { useFileHandler } from './hooks/useFileHandler';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { Sidebar } from './components/Sidebar';
import { PlayerUnitView } from './components/PlayerUnitView';
import { GroupView } from './components/GroupView';
import { TWAttendanceView } from './components/TWAttendanceView';
import { UnitManagementModal } from './components/UnitManagementModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { UploadCloud } from './components/icons';

declare global {
    interface Window {
        showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
        showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
    }
}

const App: React.FC = () => {
    const initialState: AppState = {
        players: [],
        unitConfig: { tiers: DEFAULT_UNIT_TIERS },
        groups: [],
        twAttendance: [],
        hasUnsavedChanges: false,
    };

    const [state, dispatch] = useReducer(withUnsavedChanges(appReducer), initialState);
    const { players, groups, hasUnsavedChanges } = state;

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showAttendanceView, setShowAttendanceView] = useState<boolean>(false);

    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState<boolean>(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalInfo>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isPlayerListOpen, setPlayerListOpen] = useState(true);

    const handleSelectPlayer = useCallback((playerId: string | null) => {
        setSelectedPlayerId(playerId);
        if (playerId) {
            setSelectedGroupId(null);
            setShowAttendanceView(false);
            if (!isPlayerListOpen) setPlayerListOpen(true);
        }
    }, [isPlayerListOpen]);

    const handleSelectGroup = useCallback((groupId: string | null) => {
        setSelectedGroupId(groupId);
        if (groupId) {
            setSelectedPlayerId(null);
            setShowAttendanceView(false);
        }
    }, []);

    const handleOpenAttendance = useCallback(() => {
        setShowAttendanceView(true);
        setSelectedPlayerId(null);
        setSelectedGroupId(null);
    }, []);

    const handleTogglePlayerList = useCallback(() => {
        if (isPlayerListOpen) {
            setSelectedPlayerId(null);
        }
        setPlayerListOpen(prev => !prev);
    }, [isPlayerListOpen]);


    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const selectedPlayer = useMemo(() => players.find(p => p.id === selectedPlayerId), [players, selectedPlayerId]);
    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    const { processFile, handleSaveData, handleModernOpenFile } = useFileHandler({
        state,
        dispatch,
        handleSelectPlayer,
        setStatusMessage
    });

    const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop({
        onDropFile: (file) => processFile(file, null)
    });

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
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
                            hasUnsavedChanges={hasUnsavedChanges}
                            statusMessage={statusMessage}
                            setConfirmModal={setConfirmModal}
                            isPlayerListOpen={isPlayerListOpen}
                            onTogglePlayerList={handleTogglePlayerList}
                        />

                        <main className="w-full md:w-2/3 lg:w-3/4 p-4 md:p-6 flex-grow">
                            {showAttendanceView ? (
                                <div className="flex-1 overflow-hidden p-4 min-w-[300px]">
                                    <TWAttendanceView
                                        onSelectPlayer={handleSelectPlayer}
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
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

export default App;