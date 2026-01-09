import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Player, Unit, UnitConfig, AppAction } from '../types';
import { ChevronUp, ChevronDown, CheckSquare, List, Search, Clipboard as Copy, ImportIcon, Star } from './icons'; // Added Star
import { ParseFormModal } from './ParseFormModal';

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400 border-yellow-400/50', Epic: 'text-purple-400 border-purple-400/50', Rare: 'text-blue-400 border-blue-400/50', Uncommon: 'text-green-400 border-green-400/50', Common: 'text-gray-400 border-gray-400/50' };

interface UnitTierSectionProps {
    tier: string;
    units: Unit[];
    selectedPlayerId: string;
    selectedUnits: Set<string>;
    preparedUnits: Set<string>;
    masteryUnits: Set<string>;
    favoriteUnits: Set<string>; // Added
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => void; // Updated
}

const UnitTierSection = React.memo(({ tier, units, selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, favoriteUnits, onUnitToggle }: UnitTierSectionProps) => {
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
                    {units.map(unit => (
                        <label key={unit.name} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-700/50 transition-colors">
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'favoriteUnits'); }}
                                className={`cursor-pointer transition-colors flex-shrink-0 ${favoriteUnits.has(unit.name) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
                                title="Toggle Favorite"
                            >
                                <Star size={18} />
                            </div>
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'masteryUnits'); }}
                                className={`w-4 h-4 rounded-sm border-2 ${masteryUnits.has(unit.name) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                title="Toggle Mastery"
                            ></div>
                            <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnitToggle(selectedPlayerId, unit.name, 'preparedUnits'); }}
                                className={`w-4 h-4 rounded-full border-2 ${preparedUnits.has(unit.name) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                title="Toggle Maxed"
                            ></div>
                            <input type="checkbox" checked={selectedUnits.has(unit.name)} onChange={() => onUnitToggle(selectedPlayerId, unit.name, 'units')} className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50" />
                            <span className="text-gray-300">{unit.name}</span>
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
    favoriteUnits: Set<string>; // Added
    unitConfig: UnitConfig;
    searchQuery: string;
    onUnitToggle: (playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => void; // Updated
}
const OwnedUnitsView = React.memo(({ selectedPlayerId, selectedUnits, preparedUnits, masteryUnits, favoriteUnits, unitConfig, searchQuery, onUnitToggle }: OwnedUnitsViewProps) => {
    const ownedUnitsByTier = useMemo(() => {
        const result: { [key: string]: string[] } = {};
        const lowerCaseQuery = searchQuery.toLowerCase();

        const allCurrentUnitNames = new Set(Object.values(unitConfig.tiers).flat().map(u => u.name));
        const existingOwnedUnits = [...selectedUnits].filter(unitName =>
            allCurrentUnitNames.has(unitName) && unitName.toLowerCase().includes(lowerCaseQuery)
        );

        Object.entries(unitConfig.tiers).forEach(([tier, unitsInTier]) => {
            const ownedInTier = unitsInTier
                .map(u => u.name)
                .filter(unitName => existingOwnedUnits.includes(unitName))
                .sort();
            if (ownedInTier.length > 0) result[tier] = ownedInTier;
        });
        return result;
    }, [selectedUnits, unitConfig, searchQuery]);

    if (Object.keys(ownedUnitsByTier).length === 0) return <div className="text-center text-gray-500 py-16">No matching owned units found.</div>;

    return (
        <div className="space-y-6">
            {Object.entries(ownedUnitsByTier).map(([tier, unitNames]) => (
                <section key={tier}>
                    <div className={`w-full flex justify-between items-center p-2 rounded-t-md border-b-2 ${tierColorClasses[tier]}`}>
                        <h3 className="text-xl font-semibold">{tier}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3 p-4 bg-gray-800/30 rounded-b-md">
                        {unitNames.map(unitName => (
                            <div key={unitName} className="flex items-center space-x-3">
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'favoriteUnits')}
                                    className={`cursor-pointer transition-colors flex-shrink-0 ${favoriteUnits.has(unitName) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
                                    title="Toggle Favorite"
                                >
                                    <Star size={18} />
                                </div>
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'masteryUnits')}
                                    className={`w-4 h-4 rounded-sm border-2 cursor-pointer ${masteryUnits.has(unitName) ? 'bg-yellow-500 border-yellow-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Mastery"
                                ></div>
                                <div
                                    onClick={() => onUnitToggle(selectedPlayerId, unitName, 'preparedUnits')}
                                    className={`w-4 h-4 rounded-full border-2 cursor-pointer ${preparedUnits.has(unitName) ? 'bg-green-500 border-green-400' : 'bg-transparent border-gray-400'} transition-colors flex-shrink-0`}
                                    title="Toggle Maxed"
                                ></div>
                                <span className="text-gray-300">{unitName}</span>
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
    if (!player) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
                <h2 className="text-xl">Select a player to view their units.</h2>
            </div>
        );
    }
    const [unitViewMode, setUnitViewMode] = useState<'all' | 'owned'>('all');
    const [mainUnitSearchQuery, setMainUnitSearchQuery] = useState("");
    const [isParseModalOpen, setIsParseModalOpen] = useState(false);
    const [infoText, setInfoText] = useState(player?.info || "");
    const [leadership, setLeadership] = useState(String(player?.totalLeadership || ''));

    const allUnitsByTier = useMemo(() => {
        const sortedTiers: { [key: string]: Unit[] } = {};
        Object.entries(unitConfig.tiers).forEach(([tier, units]) => {
            sortedTiers[tier] = [...units].sort((a, b) => a.name.localeCompare(b.name));
        });
        return sortedTiers;
    }, [unitConfig]);

    useEffect(() => {
        setInfoText(player.info || "");
        setLeadership(String(player.totalLeadership || ''));
    }, [player]);

    const selectedPlayerUnits = useMemo(() => new Set(player?.units || []), [player]);
    const selectedPlayerPreparedUnits = useMemo(() => new Set(player?.preparedUnits || []), [player]);
    const selectedPlayerMasteryUnits = useMemo(() => new Set(player?.masteryUnits || []), [player]);
    const selectedPlayerFavoriteUnits = useMemo(() => new Set(player?.favoriteUnits || []), [player]); // Added

    const handleUnitToggle = useCallback((playerId: string, unitName: string, unitType: 'units' | 'preparedUnits' | 'masteryUnits' | 'favoriteUnits') => { // Updated
        dispatch({ type: 'TOGGLE_PLAYER_UNIT', payload: { playerId, unitName, unitType } });
    }, [dispatch]);

    const handleInfoSave = useCallback(() => {
        if (player && infoText !== (player.info || "")) {
            dispatch({ type: 'UPDATE_PLAYER_INFO', payload: { playerId: player.id, info: infoText } });
            setStatusMessage("Player info saved.");
        }
    }, [infoText, player, dispatch, setStatusMessage]);

    const handleLeadershipSave = useCallback(() => {
        const leadershipValue = parseInt(leadership, 10);
        const newLeadership = isNaN(leadershipValue) ? 0 : leadershipValue;

        if (player && newLeadership !== (player.totalLeadership || 0)) {
            dispatch({ type: 'UPDATE_PLAYER_LEADERSHIP', payload: { playerId: player.id, leadership: newLeadership } });
            setStatusMessage("Player leadership saved.");
        }
    }, [leadership, player, dispatch, setStatusMessage]);

    const padRight = (str: string, length: number) => {
        return str.padEnd(length, ' ');
    };

    const handleCopyForm = () => {
        const NAME_WIDTH = 30;
        let formText = `Hello ${player.name}!\n\nPlease fill out which units you have and their status.\n\n`;
        formText += `Instructions:\nPut an 'x' in the brackets [] for each status that applies.\n\n`;
        formText += `Example:\n${padRight('Silahdars', NAME_WIDTH)} - ✅ Owned: [x]  🌟 Maxed: [x]  👑 Mastery: [ ]\n\n`;

        Object.entries(allUnitsByTier).forEach(([tier, units]) => {
            formText += `--- ${tier} ---\n`;
            units.forEach(unit => {
                formText += `${padRight(unit.name, NAME_WIDTH)} - ✅ Owned: [ ]  🌟 Maxed: [ ]  👑 Mastery: [ ]\n\n`;
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
                        <h2 className="text-2xl font-bold text-white mb-1">Units for <span className="text-blue-400">{player?.name}</span></h2>
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

                <div className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="playerInfo" className="block text-sm font-medium text-gray-300 mb-1">Info</label>
                        <textarea
                            id="playerInfo"
                            value={infoText}
                            onChange={(e) => setInfoText(e.target.value)}
                            onBlur={handleInfoSave}
                            placeholder={`Write information about ${player?.name}...`}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label htmlFor="playerLeadership" className="block text-sm font-medium text-gray-300 mb-1">Total Leadership</label>
                        <input
                             id="playerLeadership"
                             type="number"
                             value={leadership}
                             onChange={(e) => setLeadership(e.target.value)}
                             onBlur={handleLeadershipSave}
                             placeholder="e.g. 700"
                             className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
                        <div className="flex items-center gap-2"><Star size={12} className="text-yellow-400 fill-yellow-400"/><span>= Favorite</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500"></div><span>= Full Mastery</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-400 flex-shrink-0"></div><span>= Maxed Unit</span></div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {unitViewMode === 'all' ? (
                        <div className="space-y-6">
                            {Object.entries(allUnitsByTier).map(([tier, units]) => {
                                const filteredUnits = mainUnitSearchQuery ? units.filter(u => u.name.toLowerCase().includes(mainUnitSearchQuery.toLowerCase())) : units;
                                if (filteredUnits.length === 0) return null;
                                return <UnitTierSection key={tier} tier={tier} units={filteredUnits} selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} favoriteUnits={selectedPlayerFavoriteUnits} onUnitToggle={handleUnitToggle} />
                            })}
                        </div>
                    ) : (
                        <OwnedUnitsView selectedPlayerId={player.id} selectedUnits={selectedPlayerUnits} preparedUnits={selectedPlayerPreparedUnits} masteryUnits={selectedPlayerMasteryUnits} favoriteUnits={selectedPlayerFavoriteUnits} unitConfig={unitConfig} searchQuery={mainUnitSearchQuery} onUnitToggle={handleUnitToggle} />
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