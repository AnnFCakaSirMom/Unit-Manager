import React from 'react';
import { X, Star, Shield, HelpCircle, Search, CheckSquare } from './icons';
import { Button } from './Button';

interface MemberHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MemberHelpModal: React.FC<MemberHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/40">
                    <div className="flex items-center gap-2 text-blue-400">
                        <HelpCircle size={20} />
                        <h2 className="text-lg font-bold text-white">How to use the Barrack</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                    {/* Status Definitions */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="mt-1 text-yellow-400"><Star size={18} className="fill-yellow-400" /></div>
                            <div>
                                <h4 className="font-bold text-gray-200 text-sm">Favorite ★</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Use this to highlight your absolute favorite units—the ones you enjoy using the most or consider your "go-to" units for your Warband.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 w-4 h-4 bg-yellow-500 rounded-sm flex-shrink-0"></div>
                            <div>
                                <h4 className="font-bold text-gray-200 text-sm">Mastery (Yellow Square)</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    This indicates the unit has its specific Mastery Tree fully unlocked.
                                </p>
                                <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-700 text-[11px]">
                                    <p className="text-gray-300 font-medium mb-1">How to check:</p>
                                    <p className="text-gray-400">
                                        Click on the unit in your Barracks, then click the "Leveling Up" button. If the unit has Mastery available, a dedicated Mastery box will appear here. If you don't see this box, the unit does not currently have a Mastery Tree in the game.
                                    </p>
                                    <p className="mt-1 text-blue-400/70 italic">Note: This is separate from Veterancy lines and Doctrines.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 w-4 h-4 bg-green-500 rounded-full border-2 border-green-400 flex-shrink-0"></div>
                            <div>
                                <h4 className="font-bold text-gray-200 text-sm">Max Level (Green Ring)</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    The unit has reached its maximum level. (You can verify this by checking if the level bar under the unit's name in the Barracks is completely filled and glowing.)
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 text-blue-500"><CheckSquare size={18} /></div>
                            <div>
                                <h4 className="font-bold text-gray-200 text-sm">Owned (Checked Square)</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Mark this if you have the unit unlocked in your Barracks.
                                </p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-800" />

                    {/* App Logic & Tips */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">App Logic & Tips</h4>
                        
                        <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50 space-y-3">
                            <div>
                                <h5 className="text-[11px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-2">
                                    <Shield size={12} className="text-blue-400" /> Smart Selection
                                </h5>
                                <ul className="list-disc pl-4 text-[11px] text-gray-400 space-y-1">
                                    <li>Marking a unit as Maxed, Mastery, or Favorite will automatically mark it as Owned.</li>
                                    <li>Marking a unit with Mastery will automatically set it to Maxed.</li>
                                    <li>If you uncheck Owned, all other statuses for that unit will be cleared.</li>
                                </ul>
                            </div>

                            <div>
                                <h5 className="text-[11px] font-bold text-gray-300 uppercase mb-1 flex items-center gap-2">
                                    <Search size={12} className="text-blue-400" /> Search
                                </h5>
                                <p className="text-[11px] text-gray-400">
                                    Use the search icon (🔍) to quickly filter units by name.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-800 bg-gray-800/20 flex justify-end">
                    <Button onClick={onClose} variant="primary">Got it!</Button>
                </footer>
            </div>
        </div>
    );
};
