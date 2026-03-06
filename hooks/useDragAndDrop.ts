import { useState, useCallback } from 'react';

interface UseDragAndDropProps {
    onDropFile: (file: File) => void;
}

export function useDragAndDrop({ onDropFile }: UseDragAndDropProps) {
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        // Activate overlay ONLY if dragged item is a file from the OS
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Ensure a file was actually dropped
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            onDropFile(file);
        }
    }, [onDropFile]);

    return {
        isDragging,
        handleDragOver,
        handleDragLeave,
        handleDrop
    };
}
