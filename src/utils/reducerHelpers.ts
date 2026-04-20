import type { AppState, TWAttendancePlayer, Unit, TWPlayerRecord, TWRecordStatus, Player } from '../types';
import { AppStateSchema } from '../schema';
import { DEFAULT_UNIT_TIERS } from '../units';
import { washName } from '../utils';

export const findMatchedPlayer = (players: Player[], discordName: string) => {
    const washedDiscordName = washName(discordName);
    return players.find(p => {
        const washedPName = washName(p.name);
        if (washedPName === washedDiscordName || washedDiscordName.includes(washedPName) || washedPName.includes(washedDiscordName)) return true;
        if (p.aliases) {
            return p.aliases.some(alias => {
                const washedAlias = washName(alias);
                return washedAlias === washedDiscordName || washedDiscordName.includes(washedAlias) || washedAlias.includes(washedDiscordName);
            });
        }
        return false;
    });
};

export const handleParsePlayerUnitsForm = (
    state: AppState,
    payload: { playerId: string; formData: string; allUnitNames: string[] }
): AppState => {
    const { playerId, formData, allUnitNames } = payload;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    const allUnitNamesSet = new Set(allUnitNames);
    const parsedUnits: string[] = [];
    const parsedPreparedUnits: string[] = [];
    const parsedMasteryUnits: string[] = [];
    const parsedFavoriteUnits: string[] = [];

    const lines = formData.split('\n');
    const regex = /(.*?)\s+-\s+✅ Owned: \[(.*?)\].*🌟 Maxed: \[(.*?)\].*👑 Mastery: \[(.*?)\](?:.*❤️ Favorite: \[(.*?)\])?/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const [_, unitNameStr, ownedStr, maxedStr, masteryStr, favoriteStr] = match;
            const unitName = unitNameStr.trim();

            if (allUnitNamesSet.has(unitName)) {
                if (ownedStr.trim().toLowerCase() === 'x') parsedUnits.push(unitName);
                if (maxedStr.trim().toLowerCase() === 'x') parsedPreparedUnits.push(unitName);
                if (masteryStr.trim().toLowerCase() === 'x') parsedMasteryUnits.push(unitName);
                if (favoriteStr && favoriteStr.trim().toLowerCase() === 'x') parsedFavoriteUnits.push(unitName);
            }
        }
    }

    // Merge logic: Combine existing with parsed, preventing duplicates using Set
    const merge = (existing: string[] = [], parsed: string[]) => Array.from(new Set([...existing, ...parsed]));

    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId
                ? {
                    ...p,
                    units: merge(p.units, parsedUnits),
                    preparedUnits: merge(p.preparedUnits, parsedPreparedUnits),
                    masteryUnits: merge(p.masteryUnits, parsedMasteryUnits),
                    favoriteUnits: merge(p.favoriteUnits, parsedFavoriteUnits)
                }
                : p
        )
    };
};

export const handleTWAttendanceImport = (
    state: AppState,
    payload: { jsonString: string }
): AppState => {
    try {
        const data = JSON.parse(payload.jsonString);
        if (!data.signUps) throw new Error("Invalid Raid Helper format");

        const attendance: TWAttendancePlayer[] = [];
        const declinedPlayerIds = new Set<string>();

        data.signUps.forEach((signup: any) => {
            const match = findMatchedPlayer(state.players, signup.name);

            if (signup.className === 'Accepted' || signup.className === 'Maybe') {
                attendance.push({
                    discordName: signup.name,
                    status: signup.className as 'Accepted' | 'Maybe',
                    matchedPlayerId: match ? match.id : null
                });
            } else if (match) {
                declinedPlayerIds.add(match.id);
            }
        });

        attendance.sort((a, b) => {
            if (a.status === 'Accepted' && b.status === 'Maybe') return -1;
            if (a.status === 'Maybe' && b.status === 'Accepted') return 1;
            return a.discordName.localeCompare(b.discordName);
        });

        const newGroups = state.groups.map(group => {
            const newMembers = group.members.filter(m => !declinedPlayerIds.has(m.playerId));
            let newLeaderId = group.leaderId;
            if (newLeaderId && !newMembers.some(m => m.playerId === newLeaderId)) {
                newLeaderId = newMembers.length > 0 ? newMembers[0].playerId : null;
            }
            return { ...group, members: newMembers, leaderId: newLeaderId };
        });

        return { ...state, twAttendance: attendance, groups: newGroups };
    } catch (e) {
        console.error("Could not parse Raid Helper data", e);
        return state;
    }
};

export const handleTWStatisticsImport = (
    state: AppState,
    payload: { jsonString: string, eventId: string }
): AppState => {
    try {
        const data = JSON.parse(payload.jsonString);
        if (!data.signUps) throw new Error("Invalid Raid Helper format");

        const newRecords: TWPlayerRecord[] = [];
        const processedPlayerIds = new Set<string>();

        data.signUps.forEach((signup: any) => {
            const matchedPlayer = findMatchedPlayer(state.players, signup.name);
            if (matchedPlayer) {
                let status: TWRecordStatus = 'AWOL';
                if (signup.className === 'Accepted') status = 'Attended';
                else if (signup.className === 'Declined') status = 'Declined';
                else if (signup.className === 'Maybe') status = 'Not Attended';

                newRecords.push({
                    eventId: payload.eventId,
                    playerId: matchedPlayer.id,
                    status
                });
                processedPlayerIds.add(matchedPlayer.id);
            }
        });

        state.players.forEach(p => {
            if (!p.notInHouse && !processedPlayerIds.has(p.id)) {
                newRecords.push({
                    eventId: payload.eventId,
                    playerId: p.id,
                    status: 'AWOL'
                });
            }
        });

        const filteredOldRecords = state.twRecords.filter(r => r.eventId !== payload.eventId);

        return { ...state, twRecords: [...filteredOldRecords, ...newRecords] };
    } catch (e) {
        console.error("Could not parse Raid Helper data for TW Stats", e);
        return state;
    }
};

export const handleLoadState = (
    state: AppState,
    payload: any
): AppState => {
    try {
        const loadedData = AppStateSchema.parse(payload);
        const loadedUnitConfigTiers = loadedData.unitConfig?.tiers || {};
        const hasExistingConfig = Object.keys(loadedUnitConfigTiers).some(tier => loadedUnitConfigTiers[tier].length > 0);

        let mergedTiers: { [tier: string]: Unit[] } = {};

        if (hasExistingConfig) {
            // Use existing config as-is, just ensure sorting
            for (const tier in loadedUnitConfigTiers) {
                mergedTiers[tier] = [...loadedUnitConfigTiers[tier]].sort((a, b) => a.name.localeCompare(b.name));
            }
        } else {
            // Fallback to defaults if no config exists (legacy or first-time load)
            for (const tier in DEFAULT_UNIT_TIERS) {
                mergedTiers[tier] = [...DEFAULT_UNIT_TIERS[tier]].sort((a, b) => a.name.localeCompare(b.name));
            }
        }

        const migratedPlayers = loadedData.players.map(p => ({
            ...p,
            joinedDate: p.joinedDate || new Date().toISOString().split('T')[0]
        }));

        return {
            ...state,
            players: migratedPlayers,
            unitConfig: { tiers: mergedTiers },
            groups: loadedData.groups,
            twAttendance: loadedData.twAttendance,
            twSeasons: loadedData.twSeasons,
            twEvents: loadedData.twEvents,
            twRecords: loadedData.twRecords
        };
    } catch (error) {
        console.error("Failed to parse and load save file. JSON schema mismatch:", error);
        return state;
    }
};
