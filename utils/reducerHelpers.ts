import type { AppState, TWAttendancePlayer, Unit } from '../types';
import { AppStateSchema } from '../schema';
import { DEFAULT_UNIT_TIERS } from '../units';

export const handleParsePlayerUnitsForm = (
    state: AppState,
    payload: { playerId: string; formData: string; allUnitNames: string[] }
): AppState => {
    const { playerId, formData, allUnitNames } = payload;
    const allUnitNamesSet = new Set(allUnitNames);
    const newUnits: string[] = [];
    const newPreparedUnits: string[] = [];
    const newMasteryUnits: string[] = [];
    const newFavoriteUnits: string[] = [];

    const lines = formData.split('\n');
    const regex = /(.*?)\s+-\s+✅ Owned: \[(.*?)\].*🌟 Maxed: \[(.*?)\].*👑 Mastery: \[(.*?)\](?:.*❤️ Favorite: \[(.*?)\])?/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const [_, unitNameStr, ownedStr, maxedStr, masteryStr, favoriteStr] = match;
            const unitName = unitNameStr.trim();

            if (allUnitNamesSet.has(unitName)) {
                if (ownedStr.trim().toLowerCase() === 'x') newUnits.push(unitName);
                if (maxedStr.trim().toLowerCase() === 'x') newPreparedUnits.push(unitName);
                if (masteryStr.trim().toLowerCase() === 'x') newMasteryUnits.push(unitName);
                if (favoriteStr && favoriteStr.trim().toLowerCase() === 'x') newFavoriteUnits.push(unitName);
            }
        }
    }

    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId
                ? { ...p, units: newUnits, preparedUnits: newPreparedUnits, masteryUnits: newMasteryUnits, favoriteUnits: newFavoriteUnits }
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

        const washName = (name: string) => (name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\[.*?\]|\(.*?\)|\<.*?\>|['\s]/g, '')
            .toLowerCase();

        const attendance: TWAttendancePlayer[] = [];
        const declinedPlayerIds = new Set<string>();

        const washedUMPlayers = state.players.map(p => ({
            id: p.id,
            washedName: washName(p.name)
        }));

        data.signUps.forEach((signup: any) => {
            const washedDiscordName = washName(signup.name);
            const match = washedUMPlayers.find(p =>
                p.washedName === washedDiscordName ||
                washedDiscordName.includes(p.washedName) ||
                p.washedName.includes(washedDiscordName)
            );

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

export const handleLoadState = (
    state: AppState,
    payload: any
): AppState => {
    try {
        const loadedData = AppStateSchema.parse(payload);
        const mergedTiers: { [tier: string]: Unit[] } = {};

        if (loadedData.unitConfig && loadedData.unitConfig.tiers) {
            for (const tier in loadedData.unitConfig.tiers) {
                mergedTiers[tier] = [...loadedData.unitConfig.tiers[tier]];
            }
        }

        const loadedUnitNames = new Set<string>();

        for (const tier in mergedTiers) {
            mergedTiers[tier].forEach(u => loadedUnitNames.add(u.name));
        }

        for (const tier in DEFAULT_UNIT_TIERS) {
            if (!mergedTiers[tier]) {
                mergedTiers[tier] = [];
            }
            DEFAULT_UNIT_TIERS[tier].forEach(defaultUnit => {
                if (!loadedUnitNames.has(defaultUnit.name)) {
                    mergedTiers[tier].push(defaultUnit);
                    loadedUnitNames.add(defaultUnit.name);
                }
            });
            mergedTiers[tier].sort((a, b) => a.name.localeCompare(b.name));
        }

        return {
            ...state,
            players: loadedData.players,
            unitConfig: { tiers: mergedTiers },
            groups: loadedData.groups,
            twAttendance: loadedData.twAttendance
        };
    } catch (error) {
        console.error("Failed to parse and load save file. JSON schema mismatch:", error);
        return state;
    }
};
