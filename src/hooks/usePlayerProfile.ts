import { useState, useEffect, useCallback } from 'react';
import { Player, UserRole } from '../types';
import { updatePlayerInfo, updatePlayerLeadership, updatePlayerName, updatePlayerProfile } from '../state/slices/playerSlice';
import { AppDispatch } from '../state/store';

export const usePlayerProfile = (
    player: Player | undefined,
    dispatch: AppDispatch,
    setStatusMessage: (msg: string) => void
) => {
    const [infoText, setInfoText] = useState("");
    const [leadership, setLeadership] = useState("");
    const [joinedDate, setJoinedDate] = useState("");
    const [inactiveDate, setInactiveDate] = useState("");
    const [aliasesText, setAliasesText] = useState("");
    const [playerNameText, setPlayerNameText] = useState("");

    // Sync local state when the selected player changes
    useEffect(() => {
        if (player) {
            setInfoText(player.player_info?.[0]?.internal_notes || "");
            setLeadership(String(player.totalLeadership || ''));
            setJoinedDate(player.joinedDate || "");
            setInactiveDate(player.inactiveDate || "");
            setAliasesText((player.aliases || []).join(', '));
            setPlayerNameText(player.name || "");
        } else {
            setInfoText("");
            setLeadership("");
            setJoinedDate("");
            setInactiveDate("");
            setAliasesText("");
            setPlayerNameText("");
        }
    }, [player]);

    const handleInfoSave = useCallback(() => {
        if (!player) return;
        const currentNote = player.player_info?.[0]?.internal_notes || "";
        if (infoText !== currentNote) {
            // UX-5 FIX: Dispatch to Redux (sets isDirty = true) so useCloudSync
            // handles persistence — consistent with all other profile fields.
            dispatch(updatePlayerInfo({ playerId: player.id, info: infoText }));
            setStatusMessage("Internal notes saved.");
        }
    }, [infoText, player, dispatch, setStatusMessage]);

    const handleLeadershipSave = useCallback(() => {
        if (!player) return;
        const leadershipValue = parseInt(leadership, 10);
        const newLeadership = isNaN(leadershipValue) ? 0 : leadershipValue;

        if (newLeadership !== (player.totalLeadership || 0)) {
            dispatch(updatePlayerLeadership({ playerId: player.id, leadership: newLeadership }));
            setStatusMessage("Player leadership saved.");
        }
    }, [leadership, player, dispatch, setStatusMessage]);

    const handlePlayerNameSave = useCallback(() => {
        if (!player) return;
        if (playerNameText.trim() && playerNameText.trim() !== player.name) {
            dispatch(updatePlayerName({ playerId: player.id, name: playerNameText.trim() }));
            setStatusMessage("In-game name updated.");
        }
    }, [playerNameText, player, dispatch, setStatusMessage]);

    const handleProfileSave = useCallback((newRole?: UserRole) => {
        if (!player) return;
        const newAliases = aliasesText.split(',').map(s => s.trim()).filter(s => s);
        dispatch(updatePlayerProfile({
            playerId: player.id,
            joinedDate: joinedDate || undefined,
            inactiveDate: inactiveDate || null,
            aliases: newAliases,
            role: newRole || player.role
        }));
        setStatusMessage("Player profile updated.");
    }, [joinedDate, inactiveDate, aliasesText, player, dispatch, setStatusMessage]);

    return {
        infoText, setInfoText,
        leadership, setLeadership,
        joinedDate, setJoinedDate,
        inactiveDate, setInactiveDate,
        aliasesText, setAliasesText,
        playerNameText, setPlayerNameText,
        handleInfoSave,
        handleLeadershipSave,
        handlePlayerNameSave,
        handleProfileSave
    };
};
