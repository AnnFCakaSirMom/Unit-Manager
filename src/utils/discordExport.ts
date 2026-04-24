import { TWSeason, Player } from '../types';

interface StatData {
    player: Player;
    attended: number;
    possibleCount: number;
    percentage: number;
    declined: number;
    awol: number;
}

interface LeaderboardData {
    name: string;
    attended: number;
    possibleCount: number;
    percentage: number;
    declined: number;
    awol: number;
}

export const formatTWStatsToDiscord = (
    sortedStats: StatData[],
    activeSeason: TWSeason | undefined,
    showAttendance: boolean,
    showDeclined: boolean,
    showAwol: boolean
): string => {
    let text = `\`\`\`\n`;
    text += `--- TW Statistics: ${activeSeason?.name || 'Unknown'} ---\n\n`;

    // Format headers
    text += `Player`.padEnd(20, ' ');
    if (showAttendance) text += `Attended`.padEnd(12, ' ') + `%`.padEnd(6, ' ');
    if (showDeclined) text += `Declined`.padEnd(10, ' ');
    if (showAwol) text += `AWOL`.padEnd(6, ' ');
    text += `\n` + `-`.repeat(54) + `\n`;

    sortedStats.forEach(s => {
        text += s.player.name.padEnd(20, ' ');
        if (showAttendance) text += `${s.attended}/${s.possibleCount}`.padEnd(12, ' ') + `${s.percentage}%`.padEnd(6, ' ');
        if (showDeclined) text += `${s.declined}`.padEnd(10, ' ');
        if (showAwol) text += `${s.awol}`.padEnd(6, ' ');
        text += `\n`;
    });
    text += `\`\`\``;

    return text;
};

export const formatTWLeaderboardToDiscord = (
    leaderboardStats: LeaderboardData[],
    activeSeason: TWSeason | undefined,
    isNitroMode: boolean
): string => {
    let text = `🏆 --- TW LEADERBOARD: ${activeSeason?.name || 'Unknown'} --- 🏆\n`;
    text += `\`\`\`\n`;
    
    const splitLimit = isNitroMode ? 3800 : 1800;
    let lastSplitIndex = 0;

    let currentDisplayRank = 0;
    let lastPercentage = -1;

    leaderboardStats.forEach((s) => {
        let emoji = '';

        if (s.percentage > 0) {
            if (s.percentage !== lastPercentage) {
                currentDisplayRank++;
                lastPercentage = s.percentage;
            }
            
            // Emoji prioritization
            if (currentDisplayRank === 1) emoji = '🥇 ';
            else if (currentDisplayRank === 2) emoji = '🥈 ';
            else if (currentDisplayRank === 3) emoji = '🥉 ';
            else if (s.percentage >= 50) emoji = '✨ ';
            else emoji = '🔸 ';
        } else {
            // 0% attendance = sequential ranking
            currentDisplayRank++;
            emoji = '♦️ ';
        }

        const rankStr = `${currentDisplayRank}.`.padEnd(4, ' ');
        const nameStr = s.name.padEnd(20, ' ');
        const pctStr = `${s.percentage}%`.padStart(5, ' ');

        text += `${emoji}${rankStr}${nameStr}${pctStr}\n`;

        // Auto-split into multiple code blocks if the character limit is approached
        if (text.length - lastSplitIndex > splitLimit) {
            text += `\`\`\`\n\`\`\`\n`;
            lastSplitIndex = text.length;
        }
    });

    text += `\`\`\`\n`;
    text += `**Legend:** ✨ 50%+ | 🔸 <50% | ♦️ 0%\n`;

    return text;
};
