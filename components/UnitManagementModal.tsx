import React, { useState } from 'react';
import type { UnitConfig, AppAction, ConfirmModalInfo } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { X, Plus, Save, Trash2, Search, Pencil } from './icons';

interface UnitManagementModalProps {
    onClose: () => void;
    unitConfig: UnitConfig;
    dispatch: React.Dispatch<AppAction>;
}

const tierColorClasses: { [key: string]: string } = { Legendary: 'text-yellow-400', Epic: 'text-purple-400', Rare: 'text-blue-400', Uncommon: 'text-green-400', Common: 'text-gray-400' };

export const UnitManagementModal: React.FC<UnitManagementModalProps> = ({ onClose, unitConfig, dispatch }) => {
    const [editingUnit, setEditingUnit] = useState<{ tier: string; name: string; newName: string } | null>(null);
    const [newUnit, setNewUnit] = useState({ name: '', tier: 'Legendary' });
    const [confirmModal, setConfirmModal] = useState<ConfirmModalInfo>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [unitSearchQuery, setUnitSearchQuery] = useState("");

    const handleAddUnit = () => {
        if (!newUnit.name.trim()) return;
        const newTiers = { ...unitConfig.tiers };
        newTiers[newUnit.tier] = [...(newTiers[newUnit.tier] || []), newUnit.name.trim()].sort();
        dispatch({ type: 'UPDATE_UNIT_CONFIG', payload: { unitConfig: { tiers: newTiers } } });
        setNewUnit({ name: '', tier: 'Legendary' });
    };

    const handleSaveEdit = () => {
        if (!editingUnit || !editingUnit.newName.trim() || editingUnit.newName.trim() === editingUnit.name) {
            setEditingUnit(null);
            return;
        }
        dispatch({ type: 'RENAME_UNIT_GLOBALLY', payload: { oldName: editingUnit.name, newName: editingUnit.newName.trim() } });
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
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={24} /></button>
                    </header>
                    <div className="p-4 flex-grow overflow-y-auto">
                        <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold mb-2">Add New Unit</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <input type="text" placeholder="Unit name" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} onKeyPress={e => e.key === 'Enter' && handleAddUnit()} className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white min-w-[200px]" />
                                <select value={newUnit.tier} onChange={e => setNewUnit({...newUnit, tier: e.target.value})} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                                    {Object.keys(unitConfig.tiers).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button onClick={handleAddUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md flex items-center gap-2"><Plus size={18} /> Add</button>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" value={unitSearchQuery} onChange={(e) => setUnitSearchQuery(e.target.value)} placeholder="Search units..." className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div className="space-y-4">
                            {Object.entries(unitConfig.tiers).map(([tier, units]) => {
                                const filteredUnits = units.filter(unit => unit.toLowerCase().includes(unitSearchQuery.toLowerCase()));
                                if (filteredUnits.length === 0) return null;

                                return (
                                    <div key={tier}>
                                        <h3 className={`text-lg font-semibold mb-2 ${tierColorClasses[tier]}`}>{tier}</h3>
                                        <ul className="space-y-2">
                                            {filteredUnits.sort().map(unit => (
                                                <li key={unit} className="bg-gray-700/50 p-2 rounded-md flex items-center justify-between group">
                                                    {editingUnit?.name === unit ? (
                                                        <div className="flex-grow flex items-center gap-2">
                                                            <input type="text" value={editingUnit.newName} onChange={e => setEditingUnit({...editingUnit, newName: e.target.value})} onKeyPress={e => e.key === 'Enter' && handleSaveEdit()} className="flex-grow bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white" autoFocus />
                                                            <button onClick={handleSaveEdit} className="p-1 text-green-400 hover:bg-gray-600 rounded"><Save size={18} /></button>
                                                            <button onClick={() => setEditingUnit(null)} className="p-1 text-gray-400 hover:bg-gray-600 rounded"><X size={18} /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="truncate">{unit}</span>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setEditingUnit({ tier, name: unit, newName: unit })} className="p-1 text-blue-400 hover:bg-gray-600 rounded" title="Edit Unit">
                                                                    <Pencil size={18} />
                                                                </button>
                                                                <button onClick={() => handleDeleteUnit(unit)} className="p-1 text-red-500 hover:bg-gray-600 rounded" title="Delete Unit">
                                                                    <Trash2 size={18} />
                                                                </button>
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