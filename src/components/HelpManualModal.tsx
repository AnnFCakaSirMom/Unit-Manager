import React, { useState } from 'react';
import { Button } from './Button';
import { Info, X, Book, Users, Star, Layout, BarChart, Shield, History, Lock, UserCheck } from './icons';
import { HELP_CONTENT } from '../helpContent';
import { usePermission } from '../hooks/usePermission';

interface HelpManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Section = 'getting-started' | 'members' | 'units' | 'groups' | 'statistics' | 'admin' | 'audit-logs' | 'roles' | 'approvals';

export const HelpManualModal: React.FC<HelpManualModalProps> = ({ isOpen, onClose }) => {
    const { isGatekeeperPlus } = usePermission();
    const [activeSection, setActiveSection] = useState<Section>('getting-started');

    if (!isOpen) return null;

    const sections = [
        { id: 'getting-started', label: 'Getting Started', icon: <Book size={18} /> },
        { id: 'members', label: 'Member Management', icon: <Users size={18} /> },
        { id: 'units', label: 'Unit Tracking', icon: <Star size={18} /> },
        { id: 'groups', label: 'Groups & Formations', icon: <Layout size={18} /> },
        { id: 'statistics', label: 'TW Statistics', icon: <BarChart size={18} /> },
        { id: 'admin', label: 'Admin Tools', icon: <Shield size={18} /> },
        // Protected Admin Manuals
        ...(isGatekeeperPlus ? [
            { id: 'audit-logs', label: 'Audit Log System', icon: <History size={18} /> },
            { id: 'roles', label: 'Roles & Permissions', icon: <Lock size={18} /> },
            { id: 'approvals', label: 'User Approvals', icon: <UserCheck size={18} /> },
        ] : [])
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                    <div className="flex items-center gap-3 text-blue-400">
                        <Info size={24} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Application Manual</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 border-r border-gray-700 bg-gray-800/30 overflow-y-auto">
                        <nav className="p-2 space-y-1">
                            {sections.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id as Section)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                        activeSection === s.id
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                                    }`}
                                >
                                    {s.icon}
                                    {s.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Content */}
                    <main className="flex-1 p-8 overflow-y-auto bg-gray-900/50 scrollbar-thin scrollbar-thumb-gray-700">
                        {activeSection === 'getting-started' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Getting Started</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <p className="text-lg text-blue-300">{HELP_CONTENT.app_overview.content}</p>
                                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                        <h4 className="text-white font-bold mb-2">Help Mode</h4>
                                        <p>{HELP_CONTENT.help_mode.content}</p>
                                    </div>
                                    <p>The Unit Manager interface is divided into two parts: the <strong>Sidebar</strong> for navigation and list management, and the <strong>Main View</strong> for viewing and editing data.</p>
                                </div>
                            </section>
                        )}

                        {activeSection === 'members' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Member Management</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <h4 className="text-white font-bold">{HELP_CONTENT.member_management.title}</h4>
                                    <p>{HELP_CONTENT.member_management.content}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-blue-300 font-bold mb-1">Adding Members</h5>
                                            <p>Type a name in the sidebar and click the <Users size={14} className="inline mx-1"/> button. New members are added to the 'Players' list.</p>
                                        </div>
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-blue-300 font-bold mb-1">Roster Roles</h5>
                                            <p>Use roles to filter and manage permissions. 'Pending' users must be approved by a Gatekeeper or higher.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'units' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Unit Tracking</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <h4 className="text-white font-bold">{HELP_CONTENT.unit_tracking.title}</h4>
                                    <p>{HELP_CONTENT.unit_tracking.content}</p>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg">
                                            <div className="w-4 h-4 mt-1 bg-blue-500 rounded-sm flex-shrink-0"></div>
                                            <div><strong>Owned:</strong> {HELP_CONTENT.unit_tracking.owned}</div>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg">
                                            <div className="w-4 h-4 mt-1 bg-green-500 rounded-full border-2 border-green-400 flex-shrink-0"></div>
                                            <div><strong>Maxed Unit:</strong> {HELP_CONTENT.unit_tracking.maxed}</div>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg">
                                            <div className="w-4 h-4 mt-1 bg-yellow-500 rounded-sm flex-shrink-0"></div>
                                            <div><strong>Full Mastery:</strong> {HELP_CONTENT.unit_tracking.mastery}</div>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg">
                                            <div className="w-4 h-4 mt-1 text-yellow-400"><Star size={16} className="fill-yellow-400"/></div>
                                            <div><strong>Favorite:</strong> {HELP_CONTENT.unit_tracking.favorite}</div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'groups' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Groups & Formations</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <h4 className="text-white font-bold">Two Ways to Manage Groups</h4>
                                    <p>You can organize your formations in two distinct areas depending on your current task:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-blue-300 font-bold mb-1">1. Sidebar Management</h5>
                                            <p>Best for general planning. Click 'Edit' to rename groups or use the 'Trash' icon to delete them. This view allows you to adjust <strong>Detailed Unit Ranks</strong> for each player.</p>
                                        </div>
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-blue-300 font-bold mb-1">2. TW Attendance View</h5>
                                            <p>Best for active house management. This view supports <strong>Drag and Drop</strong> movement of players between groups and includes the Raid Helper Import tool.</p>
                                        </div>
                                    </div>

                                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30 mt-4">
                                        <h5 className="text-purple-300 font-bold mb-2">Move Player Mode</h5>
                                        <p>{HELP_CONTENT.move_player_view.content}</p>
                                    </div>

                                    <ul className="list-disc pl-5 space-y-2 mt-4">
                                        <li><strong>Unit Ranks:</strong> {HELP_CONTENT.unit_rank.content}</li>
                                        <li><strong>Role Symbols:</strong> Mark a member as the Group Leader via the context menu.</li>
                                        <li><strong>Locking:</strong> Used when planning is finished for a player. Note: Locked players are still movable if needed.</li>
                                    </ul>
                                    <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-600 mt-4">
                                        <h5 className="text-gray-200 font-bold mb-2">Exporting for Discord</h5>
                                        <p>{HELP_CONTENT.discord_export.content}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'statistics' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">TW Statistics</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <h4 className="text-white font-bold">{HELP_CONTENT.tw_statistics.title}</h4>
                                    <p>{HELP_CONTENT.tw_statistics.content}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-red-300 font-bold mb-1">AWOL Status</h5>
                                            <p>{HELP_CONTENT.status_awol.content}</p>
                                        </div>
                                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <h5 className="text-blue-300 font-bold mb-1">Raid Helper Sync</h5>
                                            <p>{HELP_CONTENT.raid_helper_import.content}</p>
                                        </div>
                                    </div>
                                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                                        <h5 className="text-blue-300 font-bold mb-2">Nitro Mode 🚀</h5>
                                        <p>{HELP_CONTENT.nitro_mode.content}</p>
                                    </div>

                                    <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 mt-4">
                                        <h5 className="text-red-400 font-bold mb-1">⚠️ {HELP_CONTENT.date_selection_warning.title}</h5>
                                        <p>{HELP_CONTENT.date_selection_warning.content}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'admin' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Admin Tools</h3>
                                <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                    <h4 className="text-white font-bold">Profile Matcher</h4>
                                    <p>Used to link Discord accounts to the application profiles. This allows members to log in and manage their own units without admin intervention.</p>
                                    <h4 className="text-white font-bold mt-6">Authentication System</h4>
                                    <p>The system uses Supabase Auth via Discord. Each user is assigned a role that limits their access level (Guest → Pending → Member → Officer → Gatekeeper → Admin → Owner).</p>
                                    <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 mt-4">
                                        <h5 className="text-red-300 font-bold">Security Lock</h5>
                                        <p>Data access is strictly enforced server-side via Row-Level Security (RLS). You can only see or edit information that your role has been granted access to.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ADVANCED ADMIN MANUALS */}
                        {isGatekeeperPlus && (
                            <>
                                {activeSection === 'audit-logs' && (
                                    <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Audit Log System</h3>
                                        <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                            <h4 className="text-blue-300 font-bold">{HELP_CONTENT.audit_log_manual.title}</h4>
                                            <p>{HELP_CONTENT.audit_log_manual.content}</p>
                                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-3">
                                                <div className="flex gap-3">
                                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500"></div>
                                                    <p>
                                                        <strong>Major Changes (Security Highlight):</strong> Actions like player deletions, role upgrades, or changes to system settings are highlighted in red. This is designed for <strong>Security Auditing</strong>, allowing you to instantly spot high-risk or unauthorized activity within the app.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500"></div>
                                                    <p><strong>Small Changes:</strong> Unit updates, status changes, or routine group edits.</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-400 italic">Logs are automatically purged after 60 days to maintain performance.</p>
                                        </div>
                                    </section>
                                )}

                                {activeSection === 'roles' && (
                                    <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">Roles & Permissions</h3>
                                        <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                            <h4 className="text-blue-300 font-bold">{HELP_CONTENT.roles_manual.title}</h4>
                                            <p>{HELP_CONTENT.roles_manual.content}</p>
                                            <div className="space-y-2">
                                                {[
                                                    { r: 'Owner', d: 'System creator. Full uncontrolled access to all configuration and data.' },
                                                    { r: 'Admin', d: 'Full house management. Can delete players, edit seasons, and change system settings.' },
                                                    { r: 'Gatekeeper', d: 'Can manage the roster, approve new users, and match Discord profiles.' },
                                                    { r: 'Officer', d: 'Can manage battle groups, TW attendance, and view full roster units.' },
                                                    { r: 'Member', d: 'Can manage their own units and barracks only.' },
                                                    { r: 'Pending', d: 'New login awaiting approval by a Gatekeeper.' }
                                                ].map(item => (
                                                    <div key={item.r} className="flex gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                                        <span className={cn(
                                                            "w-24 font-bold shrink-0",
                                                            item.r === 'Owner' ? "text-yellow-500" : item.r === 'Admin' ? "text-red-400" : "text-white"
                                                        )}>{item.r}</span>
                                                        <span className="text-gray-400">{item.d}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {activeSection === 'approvals' && (
                                    <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <h3 className="text-2xl font-bold text-white mb-4 border-b border-blue-500/30 pb-2">User Approval Process</h3>
                                        <div className="space-y-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                                            <h4 className="text-blue-300 font-bold">{HELP_CONTENT.approval_manual.title}</h4>
                                            <p>{HELP_CONTENT.approval_manual.content}</p>
                                            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600/30">
                                                <h5 className="text-yellow-500 font-bold mb-2">Identification Guide</h5>
                                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                                    <li>Always check the <strong>In-Game Name Claim</strong> provided by the user.</li>
                                                    <li>The system uses <strong>Washed Matching</strong> (ignores case and special characters).</li>
                                                    <li>If no match is suggested, you can still select a profile manually from the dropdown.</li>
                                                    <li><strong>Deny:</strong> Use this to delete unauthorized requests. The user will be permanently removed from the approval queue and lose their pending status.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </main>
                </div>

                <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                    <p className="text-xs text-gray-500 italic">Unit Manager Help System • Version 1.1</p>
                    <Button variant="primary" onClick={onClose}>Close Manual</Button>
                </footer>
            </div>
        </div>
    );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
