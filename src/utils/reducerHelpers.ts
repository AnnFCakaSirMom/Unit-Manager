import type { TWAttendancePlayer, Player, Group } from '../types';
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
        const acceptedIds = new Set<string>();
        const maybeIds = new Set<string>();

        data.signUps.forEach((signup: any) => {
            const match = findMatchedPlayer(state.players, signup.name);

            if (signup.className === 'Accepted' || signup.className === 'Maybe') {
                const status = signup.className as 'Accepted' | 'Maybe';
                attendance.push({
                    discordName: signup.name,
                    status: status,
                    matchedPlayerId: match ? match.id : null,
                    isDirty: true
                });
                
                if (match) {
                    if (status === 'Accepted') acceptedIds.add(match.id);
                    else maybeIds.add(match.id);
                }
            }
        });

        attendance.sort((a, b) => {
            if (a.status === 'Accepted' && b.status === 'Maybe') return -1;
            if (a.status === 'Maybe' && b.status === 'Accepted') return 1;
            return a.discordName.localeCompare(b.discordName);
        });

        // 1. Process existing groups: Remove those who are NOT 'Accepted' or 'Maybe'.
        // Collect those who are 'Maybe' but in a combat group to be parked.
        const membersToPark: any[] = [];
        
        let processedGroups: Group[] = state.groups.map(group => {
            const isParkingGroup = group.name.toUpperCase().includes('MAYBE');
            
            const newMembers = group.members.filter(m => {
                const isAccepted = acceptedIds.has(m.playerId);
                const isMaybe = maybeIds.has(m.playerId);
                
                if (isMaybe && !isParkingGroup) {
                    membersToPark.push(m);
                    return false;
                }
                
                // Only keep if they are Accepted or (if it's a parking group) still Maybe.
                return isAccepted || (isMaybe && isParkingGroup);
            });

            let newLeaderId = group.leaderId;
            if (newLeaderId && !newMembers.some(m => m.playerId === newLeaderId)) {
                newLeaderId = newMembers.length > 0 ? newMembers[0].playerId : null;
            }

            // FIX-1: Mark every group touched by the import as dirty so
            // useCloudSync persists the updated membership to Supabase.
            return { ...group, members: newMembers, leaderId: newLeaderId, isDirty: true };
        });

        // 2. Handle parking for collected members
        membersToPark.forEach(member => {
            let targetGroup = processedGroups.find(g => 
                g.name.toUpperCase().includes('MAYBE') && g.members.length < 5
            );
            
            if (!targetGroup) {
                const newGroup: Group = {
                    id: crypto.randomUUID(),
                    name: `MAYBE - Parking ${processedGroups.filter(g => g.name.toUpperCase().includes('MAYBE')).length + 1}`,
                    leaderId: member.playerId,
                    members: [member],
                    // FIX-1: New parking groups must be dirty so they are saved to Supabase.
                    isDirty: true
                };
                processedGroups.push(newGroup);
            } else {
                targetGroup.members.push(member);
                // Ensure the existing parking group is also marked dirty.
                targetGroup.isDirty = true;
            }
        });

        return { ...state, twAttendance: attendance, groups: processedGroups };
    } catch (e) {
        console.error("Could not parse Raid Helper data", e);
        return state;
    }
};
