import React, { useState, useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import type { AppState, AppAction, Player, Group, ConfirmModalInfo, UnitConfig } from './types';
import { appReducer, withUnsavedChanges } from './reducer';
import { DEFAULT_UNIT_TIERS } from './units';

import { Sidebar } from './components/Sidebar';
import { PlayerUnitView } from './components/PlayerUnitView';
import { GroupView } from './components/GroupView';
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
        hasUnsavedChanges: false,
    };

    const [aktivFilHandle, setAktivFilHandle] = useState<FileSystemFileHandle | null>(null);
    const [state, dispatch] = useReducer(withUnsavedChanges(appReducer), initialState);
    const { players, unitConfig, groups, hasUnsavedChanges } = state;

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState<boolean>(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalInfo>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isPlayerListOpen, setPlayerListOpen] = useState(true);

    const handleSelectPlayer = useCallback((playerId: string | null) => {
        setSelectedPlayerId(playerId);
        if (playerId) {
            setSelectedGroupId(null);
            if (!isPlayerListOpen) setPlayerListOpen(true);
        }
    }, [isPlayerListOpen]);

    const handleSelectGroup = useCallback((groupId: string | null) => {
        setSelectedGroupId(groupId);
        if (groupId) {
            setSelectedPlayerId(null);
        }
    }, []);

    // ÄNDRING 1: Ny funktion för att hantera växling av spelarlistan.
    // Denna funktion stänger inte bara listan, utan avmarkerar också den valda spelaren.
    const handleTogglePlayerList = useCallback(() => {
        if (isPlayerListOpen) {
            // Om listan är öppen (och vi håller på att stänga den),
            // nollställ den valda spelaren.
            setSelectedPlayerId(null);
        }
        // Växla sedan synligheten för listan.
        setPlayerListOpen(prev => !prev);
    }, [isPlayerListOpen]);


    // Effect for status message timeout
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    // Effect for unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = ''; // Required by some browsers
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Memoized derived data
    const ALL_UNITS = useMemo(() => Object.values(unitConfig.tiers).flat(), [unitConfig]);
    const selectedPlayer = useMemo(() => players.find(p => p.id === selectedPlayerId), [players, selectedPlayerId]);
    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    // File handling logic
    const processFile = useCallback((file: File, handle: FileSystemFileHandle | null) => {
        if (!file || !file.type.match('application/json')) {
            setStatusMessage("Error: Invalid file type. Please select a .json file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);
                
                if (!data || !Array.isArray(data.players) || !data.unitConfig) {
                     setStatusMessage("Error: Invalid or corrupted file format.");
                     return;
                }
                
                const validatedPayload = {
                    players: data.players,
                    unitConfig: data.unitConfig,
                    groups: data.groups || []
                };

                dispatch({ type: 'LOAD_STATE', payload: validatedPayload });
                setFileHandle(handle);
                handleSelectPlayer(validatedPayload.players[0]?.id || null);
                setStatusMessage(`File "${file.name}" loaded successfully!`);
            } catch (err) {
                console.error("Load failed:", err);
                setStatusMessage("Error: Could not load or parse the file.");
            }
        };
        reader.readAsText(file);
    }, [handleSelectPlayer]);
    
    const handleSaveData = useCallback(async () => {
        const dataToSave = JSON.stringify({ players, unitConfig, groups }, null, 2);

        if (aktivFilHandle) {
            try {
                const writable = await aktivFilHandle.createWritable();
                await writable.write(dataToSave);
                await writable.close();
                dispatch({ type: 'SAVE_SUCCESS' });
                setStatusMessage('File saved successfully!');
            } catch (err) {
                console.error('Kunde inte spara till befintlig fil:', err);
                setStatusMessage('Error: Could not save the file.');
            }
        } else {
            try {
                const blob = new Blob([dataToSave], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'conquerors-blade-data.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                dispatch({ type: 'SAVE_SUCCESS' });
                setStatusMessage('File saved successfully!');
            } catch (err) {
                console.error('Save failed:', err);
                setStatusMessage('Error: Could not save the file.');
            }
        }
    }, [players, unitConfig, groups, aktivFilHandle, dispatch]);

    const handleLoadData = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                processFile(file, null);
            }
        };
        input.click();
    }, [processFile]);

    const handleModernOpenFile = useCallback(async () => {
        if (!('showOpenFilePicker' in window)) {
            alert('Din webbläsare stöder inte denna funktion. Använder klassisk import istället.');
            handleLoadData();
            return;
        }

        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            });

            setAktivFilHandle(fileHandle);
            const file = await fileHandle.getFile();
            await processFile(file, fileHandle);

        } catch (err) {
            console.error('Kunde inte öppna fil med modern metod:', err);
        }
    }, [processFile, handleLoadData]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file, null);
        }
    }, [processFile]);

    return (
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
                    players={players}
                    groups={groups}
                    unitConfig={unitConfig}
                    dispatch={dispatch}
                    selectedPlayerId={selectedPlayerId}
                    selectedGroupId={selectedGroupId}
                    onSelectPlayer={handleSelectPlayer}
                    onSelectGroup={handleSelectGroup}
                    onSave={handleSaveData}
                    onLoad={handleModernOpenFile}
                    onOpenUnitManager={() => setIsMgmtModalOpen(true)}
                    hasUnsavedChanges={hasUnsavedChanges}
                    statusMessage={statusMessage}
                    setConfirmModal={setConfirmModal}
                    isPlayerListOpen={isPlayerListOpen}
                    // ÄNDRING 2: Skicka ner den nya funktionen istället för den gamla.
                    onTogglePlayerList={handleTogglePlayerList}
                />

                <main className="w-full md:w-2/3 lg:w-3/4 p-4 md:p-6 flex-grow">
                    {selectedGroup ? (
                        <GroupView 
                            key={selectedGroupId}
                            group={selectedGroup}
                            allGroups={groups}
                            players={players}
                            unitConfig={unitConfig}
                            dispatch={dispatch}
                            onCopy={(text) => {
                                navigator.clipboard.writeText(text);
                                setStatusMessage('Group copied to clipboard!');
                            }}
                        />
                    ) : selectedPlayer ? (
                        <PlayerUnitView
                            key={selectedPlayerId}
                            player={selectedPlayer}
                            unitConfig={unitConfig}
                            allUnits={ALL_UNITS}
                            dispatch={dispatch}
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
                    unitConfig={unitConfig} 
                    dispatch={dispatch} 
                />
            )}
            
            {confirmModal.isOpen && (
                <ConfirmationModal 
                    {...confirmModal}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                />
            )}
        </div>
    );
};

export default App;
