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
    joinedDate: z.string().optional(),
    inactiveDate: z.string().nullable().optional(),
    aliases: z.array(z.string()).default([]),
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

export const TWSeasonSchema = z.object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
});

export const TWEventSchema = z.object({
    id: z.string(),
    seasonId: z.string(),
    date: z.string(),
    type: z.enum(['regular', 'extra']),
});

export const TWRecordStatusSchema = z.enum(['Attended', 'Not Attended', 'Declined', 'AWOL']);

export const TWPlayerRecordSchema = z.object({
    eventId: z.string(),
    playerId: z.string(),
    status: TWRecordStatusSchema,
});

export const AppStateSchema = z.object({
    players: z.array(PlayerSchema).default([]),
    unitConfig: UnitConfigSchema.optional().default({ tiers: {} }),
    groups: z.array(GroupSchema).default([]),
    twAttendance: z.array(TWAttendancePlayerSchema).optional().default([]),
    twSeasons: z.array(TWSeasonSchema).optional().default([]),
    twEvents: z.array(TWEventSchema).optional().default([]),
    twRecords: z.array(TWPlayerRecordSchema).optional().default([]),
    hasUnsavedChanges: z.boolean().optional().default(false), // Optional as we overwrite it on load anyway 
});
