import React from 'react';
import { UserRole } from '../types';
import { Shield, Star, Lock, Info, UserCheck, Shield as AdminShield } from './icons';

interface RoleBadgeProps {
    role: UserRole;
    showLabel?: boolean;
    className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showLabel = true, className = "" }) => {
    const getRoleConfig = (role: UserRole) => {
        switch (role) {
            case 'Owner':
                return {
                    icon: "👑",
                    label: "Owner",
                    bg: "bg-yellow-500/15",
                    border: "border-yellow-500/30",
                    text: "text-yellow-400"
                };
            case 'Admin':
                return {
                    icon: "🛠️",
                    label: "Admin",
                    bg: "bg-red-500/15",
                    border: "border-red-500/30",
                    text: "text-red-400"
                };
            case 'Gatekeeper':
                return {
                    icon: "🗝️",
                    label: "Gatekeeper",
                    bg: "bg-purple-500/15",
                    border: "border-purple-500/30",
                    text: "text-purple-400"
                };
            case 'Officer':
                return {
                    icon: "⭐",
                    label: "Officer",
                    bg: "bg-blue-500/15",
                    border: "border-blue-500/30",
                    text: "text-blue-400"
                };
            case 'Member':
                return {
                    icon: "🛡️",
                    label: "Member",
                    bg: "bg-green-500/15",
                    border: "border-green-500/30",
                    text: "text-green-400"
                };
            case 'Pending':
                return {
                    icon: "⏳",
                    label: "Pending",
                    bg: "bg-gray-500/15",
                    border: "border-gray-500/30",
                    text: "text-gray-400"
                };
            case 'Guest':
                return {
                    icon: "👤",
                    label: "Guest",
                    bg: "bg-gray-700/30",
                    border: "border-gray-600/30",
                    text: "text-gray-500"
                };
            default:
                return null;
        }
    };

    const config = getRoleConfig(role);
    if (!config) return null;

    if (!showLabel) {
        return (
            <span className={className} title={config.label}>
                {config.icon}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.border} ${config.text} ${className}`}>
            <span className="text-xs">{config.icon}</span>
            {config.label}
        </span>
    );
};
