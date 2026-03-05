import { z } from 'zod';


export const UnitSchema = z.object({
    name: z.string(),
    leadershipCost: z.number().optional(),
});

export const UnitSelectionSchema = z.object({
    unitName: z.string(),
    rank: z.number().default(0),
});

export const GroupMemberSchema = z.object({
    playerId: z.string(),
    selectedUnits: z.array(UnitSelectionSchema).default([]),
    isLocked: z.boolean().default(false),
});

export const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    leaderId: z.string().nullable().default(null),
    members: z.array(GroupMemberSchema).default([]),
});

export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    units: z.array(z.string()).default([]),
    preparedUnits: z.array(z.string()).default([]),
    masteryUnits: z.array(z.string()).default([]),
    favoriteUnits: z.array(z.string()).default([]),
    notInHouse: z.boolean().default(false),
    info: z.string().optional(),
    totalLeadership: z.number().optional(),
});

export const UnitTiersSchema = z.record(z.string(), z.array(UnitSchema));

export const UnitConfigSchema = z.object({
    tiers: UnitTiersSchema,
});

export const TWAttendancePlayerSchema = z.object({
    discordName: z.string(),
    status: z.enum(['Accepted', 'Maybe']),
    matchedPlayerId: z.string().nullable().default(null),
});

export const AppStateSchema = z.object({
    players: z.array(PlayerSchema).default([]),
    unitConfig: UnitConfigSchema,
    groups: z.array(GroupSchema).default([]),
    twAttendance: z.array(TWAttendancePlayerSchema).optional().default([]),
    hasUnsavedChanges: z.boolean().optional().default(false), // Optional as we overwrite it on load anyway 
});
