import React, { useState } from 'react';
import type { Unit, ConfirmModalInfo } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { X, Plus, Save, Trash2, Search, Pencil } from './icons';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface UnitManagementModalProps {
    onClose: () => void;
}

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400', Epic: 'text-purple-400', Rare: 'text-blue-400', Uncommon: 'text-green-400', Common: 'text-gray-400' };
const tiersWithCost = ['Legendary', 'Epic', 'Rare'];

import { useAppState, useAppDispatch } from '../AppContext';

export const UnitManagementModal: React.FC<UnitManagementModalProps> = ({ onClose }) => {
    const { unitConfig } = useAppState();
    const dispatch = useAppDispatch();
    const [editingUnit, setEditingUnit] = useState<{ tier: string; originalUnit: Unit; newName: string; newCost: string } | null>(null);
    const [newUnit, setNewUnit] = useState({ name: '', tier: 'Legendary', cost: '' });
    const [confirmModal, setConfirmModal] = useState<ConfirmModalInfo>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [unitSearchQuery, setUnitSearchQuery] = useState("");

    const handleAddUnit = () => {
        if (!newUnit.name.trim()) return;

        const newUnitObject: Unit = { name: newUnit.name.trim() };
        const cost = parseInt(newUnit.cost, 10);
        if (tiersWithCost.includes(newUnit.tier) && !isNaN(cost) && cost > 0) {
            newUnitObject.leadershipCost = cost;
        }

        const newTiers = { ...unitConfig.tiers };
        const updatedTierUnits = [...(newTiers[newUnit.tier] || []), newUnitObject];
        updatedTierUnits.sort((a, b) => a.name.localeCompare(b.name));
        newTiers[newUnit.tier] = updatedTierUnits;

        dispatch({ type: 'UPDATE_UNIT_CONFIG', payload: { unitConfig: { tiers: newTiers } } });
        setNewUnit({ name: '', tier: 'Legendary', cost: '' });
    };

    const handleSaveEdit = () => {
        if (!editingUnit) {
            setEditingUnit(null);
            return;
        }

        const { originalUnit, newName, newCost, tier } = editingUnit;
        const trimmedNewName = newName.trim();
        const costAsNumber = parseInt(newCost, 10);
        const newLeadershipCost = !isNaN(costAsNumber) ? costAsNumber : undefined;

        const nameChanged = trimmedNewName && trimmedNewName !== originalUnit.name;
        const costChanged = newLeadershipCost !== originalUnit.leadershipCost;

        if (!nameChanged && !costChanged) {
            setEditingUnit(null);
            return;
        }

        // Först, uppdatera kostnaden genom att skapa en ny unitConfig.
        // Detta säkerställer att kostnaden är korrekt innan ett eventuellt namnbyte.
        const newTiers = { ...unitConfig.tiers };
        newTiers[tier] = newTiers[tier].map(u => {
            if (u.name === originalUnit.name) {
                return { ...u, name: trimmedNewName || originalUnit.name, leadershipCost: newLeadershipCost };
            }
            return u;
        });

        // Sortera om ifall namnet ändrats
        newTiers[tier].sort((a, b) => a.name.localeCompare(b.name));

        dispatch({ type: 'UPDATE_UNIT_CONFIG', payload: { unitConfig: { tiers: newTiers } } });

        // Om namnet ändrades, kör den globala namnbytesfunktionen som uppdaterar alla spelare.
        if (nameChanged) {
            dispatch({ type: 'RENAME_UNIT_GLOBALLY', payload: { oldName: originalUnit.name, newName: trimmedNewName } });
        }

        setEditingUnit(null);
    };


    const handleDeleteUnit = (name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Unit',
            message: `Are you sure you want to delete the unit "${name}"? This will remove it from all players' lists. This action is irreversible.`,
            onConfirm: () => {
                dispatch({ type: 'DELETE_UNIT_GLOBALLY', payload: { unitNameToDelete: name } });
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                    <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Units</h2>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-700" title="Close" aria-label="Close"><X size={24} /></Button>
                    </header>
                    <div className="p-4 flex-grow overflow-y-auto">
                        <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold mb-2">Add New Unit</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Input type="text" placeholder="Unit name" value={newUnit.name} onChange={e => setNewUnit({ ...newUnit, name: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddUnit()} className="flex-grow px-3 py-2 min-w-[200px]" />
                                {tiersWithCost.includes(newUnit.tier) && (
                                    <Input type="number" placeholder="Leadership" value={newUnit.cost} onChange={e => setNewUnit({ ...newUnit, cost: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleAddUnit()} className="px-3 py-2 w-28" />
                                )}
                                <Select value={newUnit.tier} onChange={e => setNewUnit({ ...newUnit, tier: e.target.value })} className="px-3 py-2 min-w-[120px]">
                                    {Object.keys(unitConfig.tiers).sort((a, b) => tiersWithCost.indexOf(b) - tiersWithCost.indexOf(a)).map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                <Button variant="primary" onClick={handleAddUnit}><Plus size={18} /> Add</Button>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <Input type="text" value={unitSearchQuery} onChange={(e) => setUnitSearchQuery(e.target.value)} placeholder="Search units..." className="w-full pl-10 pr-3 py-2" />
                        </div>

                        <div className="space-y-4">
                            {Object.entries(unitConfig.tiers).map(([tier, units]) => {
                                const filteredUnits = units.filter(unit => unit.name.toLowerCase().includes(unitSearchQuery.toLowerCase()));
                                if (filteredUnits.length === 0) return null;

                                return (
                                    <div key={tier}>
                                        <h3 className={`text-lg font-semibold mb-2 ${tierColorClasses[tier]}`}>{tier}</h3>
                                        <ul className="space-y-2">
                                            {filteredUnits.map(unit => (
                                                <li key={unit.name} className="bg-gray-700/50 p-2 rounded-md flex items-center justify-between group">
                                                    {editingUnit?.originalUnit.name === unit.name ? (
                                                        <div className="flex-grow flex items-center gap-2">
                                                            <Input type="text" value={editingUnit.newName} onChange={e => setEditingUnit({ ...editingUnit, newName: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleSaveEdit()} className="flex-grow bg-gray-600 border-gray-500 px-2 py-1" autoFocus aria-label="Unit Name Input" />
                                                            {tiersWithCost.includes(tier) && (
                                                                <Input type="number" value={editingUnit.newCost} onChange={e => setEditingUnit({ ...editingUnit, newCost: e.target.value })} onKeyPress={e => e.key === 'Enter' && handleSaveEdit()} className="bg-gray-600 border-gray-500 px-2 py-1 w-24" aria-label="Leadership Cost Input" />
                                                            )}
                                                            <Button variant="success" size="icon" onClick={handleSaveEdit} title="Save Unit" aria-label="Save Unit"><Save size={18} /></Button>
                                                            <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => setEditingUnit(null)} title="Cancel Editing" aria-label="Cancel Editing"><X size={18} /></Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate">{unit.name}</span>
                                                                {unit.leadershipCost && <span className="text-xs text-gray-400">({unit.leadershipCost} LD)</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="text-blue-400" onClick={() => setEditingUnit({ tier, originalUnit: unit, newName: unit.name, newCost: String(unit.leadershipCost || '') })} title="Edit Unit" aria-label="Edit Unit">
                                                                    <Pencil size={18} />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteUnit(unit.name)} title="Delete Unit" aria-label="Delete Unit">
                                                                    <Trash2 size={18} />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            {confirmModal.isOpen && <ConfirmationModal {...confirmModal} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />}
        </>
    );
};