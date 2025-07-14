import React, { useState, useMemo, useCallback } from 'react';
import type { Player, UnitConfig, AppAction } from '../types';
import { ChevronUp, ChevronDown, CheckSquare, List, Search, Clipboard as Copy, ImportIcon } from './icons';
import { ParseFormModal } from './ParseFormModal';

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400 border-yellow-400/50', Epic: 'text-purple-400 border-purple-400/50', Rare: 'text-blue-400 border-blue-400/50', Uncommon: 'text-green-400 border-green-400/50', Common: 'text-gray-400 border-gray-400/50' };

interface UnitTierSectionProps {
    tier: string;
    units: string[];
    selectedPlayerId: string;
    selectedUnits: Set<string>;
    preparedUnits: Set<string>;
    masteryUnits: Set<string>;
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits') => void;
}

const UnitTierSection = React.memo(({ tier, units, selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, onUnitToggle }: UnitTierSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    if (!units || units.length === 0) return null;

    return (
        <section>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center p-2 rounded-t-md border-b-2 ${tierColorClasses[tier]}`}>
                <h3 className="text-xl font-semibold">{tier}</h3>
                {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2 p-4 bg-gray-800/30 rounded-b-md">
                    {units.sort().map(unit => (
                        <label key={unit} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-700/50 transition-colors">
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit, 'masteryUnits'); }}
                                className={`w-4 h-4 rounded-sm border-2 ${masteryUnits.has(unit) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                title="Toggle Mastery"
                            ></div>
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit, 'preparedUnits'); }}
                                className={`w-4 h-4 rounded-full border-2 ${preparedUnits.has(unit) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                title="Toggle Maxed"
                            ></div>
                            <input type="checkbox" checked={selectedUnits.has(unit)} onChange={() => onUnitToggle(selectedPlayerId, unit, 'units')} className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50" />
                            <span className="text-gray-300">{unit}</span>
                        </label>
                    ))}
                </div>
            )}
        </section>
    );
});


interface OwnedUnitsViewProps {
    selectedPlayerId: string;
    selectedUnits: Set<string>;
    preparedUnits: Set<string>;
    masteryUnits: Set<string>;
    unitConfig: UnitConfig;
    searchQuery: string;
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits') => void;
}
const OwnedUnitsView = React.memo(({ selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, unitConfig, searchQuery, onUnitToggle }: OwnedUnitsViewProps) => {
    const ownedUnitsByTier = useMemo(() => {
        const result: { [key: string]: string[] } = {};
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        const allCurrentUnits = new Set(Object.values(unitConfig.tiers).flat());
        const existingOwnedUnits = [...selectedUnits].filter(unit => 
            allCurrentUnits.has(unit) && unit.toLowerCase().includes(lowerCaseQuery)
        );

        Object.entries(unitConfig.tiers).forEach(([tier, unitsInTier]) => {
            const ownedInTier = unitsInTier.filter(unit => existingOwnedUnits.includes(unit)).sort();
            if (ownedInTier.length > 0) result[tier] = ownedInTier;
        });
        return result;
    }, [selectedUnits, unitConfig, searchQuery]);

    if (Object.keys(ownedUnitsByTier).length === 0) return <div className="text-center text-gray-500 py-16">No matching owned units found.</div>;

    return (
        <div className="space-y-6">
            {Object.entries(ownedUnitsByTier).map(([tier, units]) => (
                <section key={tier}>
                    <div className={`w-full flex justify-between items-center p-2 rounded-t-md border-b-2 ${tierColorClasses[tier]}`}>
                        <h3 className="text-xl font-semibold">{tier}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3 p-4 bg-gray-800/30 rounded-b-md">
                        {units.map(unit => (
                            <div key={unit} className="flex items-center space-x-3">
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unit, 'masteryUnits')}
                                    className={`w-4 h-4 rounded-sm border-2 cursor-pointer ${masteryUnits.has(unit) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Mastery"
                                ></div>
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unit, 'preparedUnits')}
                                    className={`w-4 h-4 rounded-full border-2 cursor-pointer ${preparedUnits.has(unit) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Maxed"
                                ></div>
                                <span className="text-gray-300">{unit}</span>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
});


interface PlayerUnitViewProps {
    player: Player;
    unitConfig: UnitConfig;
    allUnits: string[];
    dispatch: React.Dispatch<AppAction>;
    setStatusMessage: (message: string) => void;
}

export const PlayerUnitView: React.FC<PlayerUnitViewProps> = ({ player, unitConfig, allUnits, dispatch, setStatusMessage }) => {
    const [unitViewMode, setUnitViewMode] = useState<'all' | 'owned'>('all');
    const [mainUnitSearchQuery, setMainUnitSearchQuery] = useState("");
    const [isParseModalOpen, setIsParseModalOpen] = useState(false);

    const selectedPlayerUnits = useMemo(() => new Set(player?.units || []), [player]);
    const selectedPlayerPreparedUnits = useMemo(() => new Set(player?.preparedUnits || []), [player]);
    const selectedPlayerMasteryUnits = useMemo(() => new Set(player?.masteryUnits || []), [player]);
    
    const handleUnitToggle = useCallback((playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits') => {
        dispatch({ type: 'TOGGLE_PLAYER_UNIT', payload: { playerId, unitName, unitType } });
    }, [dispatch]);

    const handleCopyForm = () => {
        let formText = `Hello ${player.name}!\n\nPlease fill out which units you have and their status.\n\n`;
        formText += `Instructions:\nPut an 'x' in the brackets [] for each status that applies.\n\n`;
        formText += `Example:\n✅ Owned: [x]  🌟 Maxed: [x]  👑 Mastery: [ ] - Silahdars\n\n`;
        formText += `------------------------------------\n\n`;

        Object.entries(unitConfig.tiers).forEach(([tier, units]) => {
            formText += `--- ${tier} ---\n`;
            units.sort().forEach(unit => {
                formText += `✅ Owned: [ ]  🌟 Maxed: [ ]  👑 Mastery: [ ] - ${unit}\n`;
            });
            formText += `\n`;
        });
        navigator.clipboard.writeText(formText);
        setStatusMessage("Form copied to clipboard!");
    };

    const handleParseForm = (formData: string) => {
        dispatch({ type: 'PARSE_PLAYER_UNITS_FORM', payload: { playerId: player.id, formData, allUnitNames: allUnits }});
        setIsParseModalOpen(false);
        setStatusMessage(`Parsed unit data for ${player.name}.`);
    };

    return (
        <>
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Units for <span className="text-blue-400">{player.name}</span></h2>
                        <p className="text-gray-400 mb-2">{selectedPlayerUnits.size} / {allUnits.length} units selected.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsParseModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2">
                            <ImportIcon size={16} />
                            <span>Import Form</span>
                        </button>
                        <button onClick={handleCopyForm} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2">
                            <Copy size={16} />
                            <span>Copy Form</span>
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800/60 rounded-md p-1 flex items-center gap-1 self-start">
                            <button onClick={() => setUnitViewMode('all')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${unitViewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}><CheckSquare size={16}/> Show All</button>
                            <button onClick={() => setUnitViewMode('owned')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${unitViewMode === 'owned' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}><List size={16}/> Show Owned</button>
                        </div>
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={mainUnitSearchQuery}
                                onChange={(e) => setMainUnitSearchQuery(e.target.value)}
                                placeholder="Search units in list..."
                                className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500"></div><span>= Full Mastery</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-400 flex-shrink-0"></div><span>= Maxed Unit</span></div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {unitViewMode === 'all' ? (
                        <div className="space-y-6">
                            {Object.entries(unitConfig.tiers).map(([tier, units]) => {
                                const filteredUnits = mainUnitSearchQuery ? units.filter(u => u.toLowerCase().includes(mainUnitSearchQuery.toLowerCase())) : units;
                                if (filteredUnits.length === 0) return null;
                                return <UnitTierSection key={tier} tier={tier} units={filteredUnits} selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} onUnitToggle={handleUnitToggle} />
                            })}
                        </div>
                    ) : (
                        <OwnedUnitsView selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} unitConfig={unitConfig} searchQuery={mainUnitSearchQuery} onUnitToggle={handleUnitToggle} />
                    )}
                </div>
            </div>
            <ParseFormModal 
                isOpen={isParseModalOpen}
                onClose={() => setIsParseModalOpen(false)}
                onParse={handleParseForm}
            />
        </>
    );
};