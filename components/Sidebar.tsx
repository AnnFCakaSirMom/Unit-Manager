// components/Sidebar.tsx

import React, { useState, useMemo, useCallback } from 'react'; // useRef är borttaget
import type { Player, Group, AppAction, ConfirmModalInfo, UnitConfig } from '../types';
import { Save, FolderOpen, Settings, UserPlus, Users, Search, ChevronUp, ChevronDown, Trash2, Pencil, X, AlertTriangle, Clipboard, Shield, Plus } from './icons';
import { UnitSearch } from './UnitSearch'; // Ingen UnitSearchHandle behövs

// --- Prop Interfaces och Helper Components (inga ändringar här) ---
// ... (PlayerListProps, GroupsListProps, PlayerList, GroupsList) ...
// (Jag har tagit bort dem här för att spara plats, men de ska vara kvar i din fil)

const PlayerList = React.memo(({
    players, selectedPlayerId, onSelectPlayer, setConfirmModal, dispatch, notInHouse, setNotInHouse
}: PlayerListProps) => {
    // ... din PlayerList-komponent är oförändrad ...
});

const GroupsList = React.memo(({
    groups, players, selectedGroupId, onSelectGroup, dispatch, setConfirmModal, onCopy
}: GroupsListProps) => {
    // ... din GroupsList-komponent är oförändrad ...
});


// --- Main Sidebar Component ---

interface SidebarProps {
    players: Player[];
    groups: Group[];
    unitConfig: UnitConfig;
    dispatch: React.Dispatch<AppAction>;
    selectedPlayerId: string | null;
    selectedGroupId: string | null;
    onSelectPlayer: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onSave: () => void;
    onLoad: () => void;
    onOpenUnitManager: () => void;
    hasUnsavedChanges: boolean;
    statusMessage: string;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalInfo>>;
    isPlayerListOpen: boolean;
    setPlayerListOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        players, groups, unitConfig, dispatch, selectedPlayerId, selectedGroupId,
        onSelectPlayer, onSelectGroup, onSave, onLoad, onOpenUnitManager,
        hasUnsavedChanges, statusMessage, setConfirmModal, isPlayerListOpen, setPlayerListOpen
    } = props;

    const [newPlayerName, setNewPlayerName] = useState("");
    const [notInHouse, setNotInHouse] = useState(false);
    
    // --- NYTT STATE: Sidebar äger nu söktermen för UnitSearch ---
    const [unitSearchTerm, setUnitSearchTerm] = useState('');


    const handleAddPlayer = useCallback(() => {
        if (!newPlayerName.trim()) return;
        dispatch({ type: 'ADD_PLAYER', payload: { name: newPlayerName } });
        setNewPlayerName("");
    }, [newPlayerName, dispatch]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 border-r border-gray-700 p-4 flex flex-col">
            <header> 
                {/* ... din header är oförändrad ... */}
            </header>

            <div className="flex items-center gap-2 mb-4">
                {/* ... fältet för att lägga till spelare är oförändrat ... */}
            </div>
            
            <div className="border-t border-gray-700 pt-2">
                 <button 
                    onClick={() => {
                        // Om listan är öppen och vi ska stänga den...
                        if (isPlayerListOpen) {
                            // ...återställ söktermen för enheter.
                            setUnitSearchTerm('');
                        }
                        // Växla sedan synligheten
                        setPlayerListOpen(!isPlayerListOpen);
                    }}
                    className="w-full flex justify-between items-center py-2"
                >
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><Users size={20}/> Players ({players.filter(p=> !p.notInHouse).length})</h2>
                    {isPlayerListOpen ? <ChevronUp /> : <ChevronDown />}
                </button>
                {isPlayerListOpen && (
                    <PlayerList 
                        players={players}
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={onSelectPlayer}
                        setConfirmModal={setConfirmModal}
                        dispatch={dispatch}
                        notInHouse={notInHouse}
                        setNotInHouse={setNotInHouse}
                    />
                )}
            </div>

            <UnitSearch 
                players={players}
                unitConfig={unitConfig}
                onSelectPlayer={onSelectPlayer}
                // --- NYA PROPS: Skicka ner state och funktionen för att ändra det ---
                searchTerm={unitSearchTerm}
                setSearchTerm={setUnitSearchTerm}
            />

            <GroupsList
                groups={groups}
                players={players}
                selectedGroupId={selectedGroupId}
                onSelectGroup={onSelectGroup}
                dispatch={dispatch}
                setConfirmModal={setConfirmModal}
                onCopy={handleCopy}
            />
        </aside>
    );
};