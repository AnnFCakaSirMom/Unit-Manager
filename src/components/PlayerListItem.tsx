import React, { useState, useCallback } from 'react';
import type { Player } from '../types';
import { Save, X, Pencil, Trash2, AlertTriangle } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../utils';
import { RoleBadge } from './RoleBadge';

interface PlayerListItemProps {
    player: Player;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string, name: string, role?: string) => void;
    onToggleNotInHouse: (id: string, role?: string) => void;
    onUpdateName: (id: string, newName: string) => void;
    canEdit: boolean;
    canDelete: boolean;
    canToggleInactive: boolean;
}

export const PlayerListItem = React.memo(({
    player, isSelected, onSelect, onDelete, onToggleNotInHouse, onUpdateName, canEdit, canDelete, canToggleInactive
}: PlayerListItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(player.name);

    const handleStartEdit = useCallback(() => {
        setEditName(player.name);
        setIsEditing(true);
    }, [player.name]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(() => {
        if (editName.trim()) {
            onUpdateName(player.id, editName.trim());
            setIsEditing(false);
        }
    }, [editName, onUpdateName, player.id]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancelEdit();
    };

    return (
        <li className={cn(
            "p-1.5 rounded-md transition-all duration-200 flex justify-between items-center group",
            isSelected ? 'bg-blue-500/20' : 'bg-gray-700/50',
            player.notInHouse && 'opacity-60'
        )}>
            {isEditing ? (
                <div className="flex-grow flex items-center gap-2">
                    <Input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        onKeyDown={handleKeyDown} 
                        className="flex-grow bg-gray-600 border-gray-500 px-2 py-1" 
                        autoFocus 
                        aria-label="Player Name Input" 
                    />
                    <Button variant="success" size="icon" onClick={handleSave} title="Save Player Name" aria-label="Save Player Name">
                        <Save size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400" onClick={handleCancelEdit} title="Cancel Editing" aria-label="Cancel Editing">
                        <X size={18} />
                    </Button>
                </div>
            ) : (
                <>
                    <div onClick={() => onSelect(player.id)} className="flex items-center gap-2 flex-grow min-w-0 cursor-pointer">
                        <span className={cn(
                            "font-medium flex-grow truncate flex items-center gap-1.5",
                            player.notInHouse && 'line-through'
                        )} title={player.name}>
                            {player.role && <RoleBadge role={player.role} showLabel={false} />}
                            {player.name}
                            {(!player.units || player.units.length === 0) && (
                                <AlertTriangle className="inline-block ml-2 text-yellow-400" size={16} title="This player has no units assigned." />
                            )}
                        </span>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <label 
                            className={cn(
                                "flex items-center mr-2 cursor-pointer text-xs text-gray-400", 
                                (!canToggleInactive || player.role === 'Owner') && "opacity-30 cursor-not-allowed"
                            )} 
                            title={player.role === 'Owner' ? "Owner cannot be inactive" : "Toggle Not in House"}
                        >
                            <input 
                                type="checkbox" 
                                checked={player.notInHouse || false} 
                                onChange={() => onToggleNotInHouse(player.id, player.role)} 
                                disabled={!canToggleInactive || player.role === 'Owner'}
                                className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500" 
                                aria-label="Mark as Not in House" 
                            />
                        </label>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-400 disabled:opacity-30" 
                            onClick={handleStartEdit} 
                            title="Edit Player Name" 
                            aria-label="Edit Player Name" 
                            disabled={!canEdit || player.role === 'Owner'}
                        >
                            <Pencil size={18} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 disabled:opacity-30" 
                            onClick={() => onDelete(player.id, player.name, player.role)} 
                            title="Delete Player" 
                            aria-label="Delete Player"
                            disabled={!canDelete || player.role === 'Owner'}
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </>
            )}
        </li>
    );
});
