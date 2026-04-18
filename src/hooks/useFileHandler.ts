import { useState, useCallback } from 'react';
import type { AppState, AppAction } from '../types';
import { AppStateSchema } from '../schema';

interface UseFileHandlerProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    handleSelectPlayer: (id: string | null) => void;
    setStatusMessage: (msg: string) => void;
}

export function useFileHandler({ state, dispatch, handleSelectPlayer, setStatusMessage }: UseFileHandlerProps) {
    const [aktivFilHandle, setAktivFilHandle] = useState<FileSystemFileHandle | null>(null);
    const [, setFileHandle] = useState<FileSystemFileHandle | null>(null);

    const { players, unitConfig, groups, twAttendance, twSeasons, twEvents, twRecords } = state;

    const processFile = useCallback((file: File, handle: FileSystemFileHandle | null) => {
        if (!file || !file.type.match('application/json')) {
            setStatusMessage("Error: Invalid file type. Please select a .json file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const rawData = JSON.parse(content);

                const validationResult = AppStateSchema.safeParse(rawData);

                if (!validationResult.success) {
                    console.error("Data validation failed:", validationResult.error);
                    setStatusMessage("Error: Invalid or corrupted file format. Please ensure this is a correct backup file.");
                    return;
                }

                const validatedPayload = validationResult.data;

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
    }, [handleSelectPlayer, dispatch, setStatusMessage]);

    const handleSaveData = useCallback(async () => {
        const dataToSave = JSON.stringify({ players, unitConfig, groups, twAttendance, twSeasons, twEvents, twRecords }, null, 2);

        if (aktivFilHandle) {
            try {
                const writable = await aktivFilHandle.createWritable();
                await writable.write(dataToSave);
                await writable.close();
                dispatch({ type: 'SAVE_SUCCESS' });
                setStatusMessage('File saved successfully!');
            } catch (err) {
                console.error('Could not save to existing file:', err);
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
    }, [players, unitConfig, groups, twAttendance, twSeasons, twEvents, twRecords, aktivFilHandle, dispatch, setStatusMessage]);

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
            setStatusMessage('Notice: Browser does not support modern file API. Using classic import instead.');
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
            console.error('Could not open file with modern method:', err);
        }
    }, [processFile, handleLoadData, setStatusMessage]);

    return {
        processFile,
        handleSaveData,
        handleLoadData,
        handleModernOpenFile
    };
}
