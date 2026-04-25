import { upsertPlayer } from './playerService';
import { saveTWAttendanceRecords, deleteTWAttendanceRecords } from './twAttendanceService';
import { auditService, AuditLog } from './auditService';
import type { Player, TWPlayerRecord } from '../types';

export const restoreService = {
    /**
     * Entry point for restoration logic.
     * Determines the type of restoration needed based on the log entry.
     */
    async restoreFromLog(log: AuditLog, actorId: string, actorNickname: string): Promise<{ success: boolean; message: string }> {
        try {
            let result = { success: false, message: 'This type of action cannot be restored automatically.' };

            if (log.action_detail.startsWith('Deleted player')) {
                result = await this.restoreDeletedPlayer(log);
            } else if (log.action_detail.startsWith('Updated profile') || 
                       log.action_detail.startsWith('Changed role') || 
                       log.action_detail.startsWith('Renamed')) {
                result = await this.restorePlayerProfile(log);
            } else if (log.action_detail.startsWith('Cleared statistics')) {
                result = await this.restoreClearedTWStats(log);
            } else if (log.action_detail.startsWith('Imported Raid Helper stats')) {
                result = await this.undoTWStatsImport(log);
            }

            if (result.success) {
                // Log the restoration itself
                await auditService.logAction({
                    actor_id: actorId,
                    actor_nickname: actorNickname,
                    action_type: 'MAJOR_CHANGE',
                    action_detail: `RESTORED: ${log.action_detail}`,
                    target_id: log.target_id,
                    target_name: log.target_name,
                    new_data: { restored_from_log_id: log.id }
                });
            }

            return result;
        } catch (error: any) {
            console.error('[restoreService] Restoration failed:', error);
            return { success: false, message: `Restoration failed: ${error.message || 'Unknown error'}` };
        }
    },

    /**
     * Restores a deleted player using the old_data (full Player object).
     */
    async restoreDeletedPlayer(log: AuditLog): Promise<{ success: boolean; message: string }> {
        const playerData = log.old_data as Player;
        if (!playerData || !playerData.id) {
            return { success: false, message: 'No player data found in log to restore.' };
        }

        const success = await upsertPlayer(playerData);
        if (success) {
            return { success: true, message: `Player "${playerData.name}" has been restored.` };
        }
        return { success: false, message: 'Failed to restore player in database.' };
    },

    /**
     * Reverts changes to a player profile using old_data.
     */
    async restorePlayerProfile(log: AuditLog): Promise<{ success: boolean; message: string }> {
        const oldPlayerData = log.old_data as Player;
        if (!oldPlayerData || !oldPlayerData.id) {
            return { success: false, message: 'No previous player state found in log.' };
        }

        const success = await upsertPlayer(oldPlayerData);
        if (success) {
            return { success: true, message: `Changes to "${oldPlayerData.name}" have been reverted.` };
        }
        return { success: false, message: 'Failed to revert player changes in database.' };
    },

    /**
     * Restores cleared TW statistics.
     */
    async restoreClearedTWStats(log: AuditLog): Promise<{ success: boolean; message: string }> {
        const records = log.old_data as TWPlayerRecord[];
        if (!records || !Array.isArray(records) || records.length === 0) {
            return { success: false, message: 'No attendance records found in log to restore.' };
        }

        try {
            await saveTWAttendanceRecords(records);
            return { success: true, message: `Restored ${records.length} attendance records.` };
        } catch (error) {
            return { success: false, message: 'Failed to save restored records to database.' };
        }
    },

    /**
     * Undoes a TW stats import by deleting the records that were added.
     */
    async undoTWStatsImport(log: AuditLog): Promise<{ success: boolean; message: string }> {
        const records = log.new_data as TWPlayerRecord[];
        if (!records || !Array.isArray(records) || records.length === 0) {
            return { success: false, message: 'No imported records found in log to remove.' };
        }

        try {
            await deleteTWAttendanceRecords(records);
            return { success: true, message: `Removed ${records.length} imported attendance records.` };
        } catch (error) {
            return { success: false, message: 'Failed to remove imported records from database.' };
        }
    }
};
