import type { TWAttendancePlayer, TWPlayerRecord, TWRecordStatus, Player, Group } from '../types';
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

export const handleTWAttendanceImport = (
    state: { players: Player[], groups: Group[], twAttendance: TWAttendancePlayer[] },
    payload: { jsonString: string }
): { players: Player[], groups: Group[], twAttendance: TWAttendancePlayer[] } => {
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
    state: { players: Player[], twRecords: TWPlayerRecord[] },
    payload: { jsonString: string, eventId: string }
): { players: Player[], twRecords: TWPlayerRecord[] } => {
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


