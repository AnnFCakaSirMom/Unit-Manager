import { supabase } from './supabase';

export type LogActionType = 'SMALL_CHANGE' | 'MAJOR_CHANGE';

export interface AuditLog {
    id?: string;
    created_at?: string;
    actor_id: string;
    actor_nickname: string;
    action_type: LogActionType;
    action_detail: string;
    target_id?: string | null;
    target_name?: string | null;
    old_data?: any;
    new_data?: any;
    is_suspicious?: boolean;
}

export const auditService = {
    /**
     * Logs an action to Supabase.
     * Implements a 5-minute debounce for 'SMALL_CHANGE' actions
     * to avoid flooding the database with minor updates.
     */
    async logAction(log: AuditLog) {
        try {
            if (log.action_type === 'SMALL_CHANGE') {
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

                // Check if a similar small log exists for the same actor and target
                const { data: existingLog } = await supabase
                    .from('audit_logs')
                    .select('id, created_at')
                    .eq('actor_id', log.actor_id)
                    .eq('target_id', log.target_id)
                    .eq('action_type', 'SMALL_CHANGE')
                    .gt('created_at', fiveMinutesAgo)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingLog) {
                    // Update the timestamp of the existing log instead of creating a new one
                    const { error } = await supabase
                        .from('audit_logs')
                        .update({ created_at: new Date().toISOString() })
                        .eq('id', existingLog.id);
                    
                    if (error) {
                        console.warn('[auditService] Debounce update failed (likely RLS):', error.message);
                        // Fallback: create new log anyway if update fails
                    } else {
                        return;
                    }
                }
            }

            // Create new log entry
            const { error } = await supabase
                .from('audit_logs')
                .insert([log]);

            if (error) {
                console.error('[auditService] Supabase insert failed:', error.message);
                throw error;
            }
        } catch (error) {
            console.error('[auditService] Failed to log action:', error);
        }
    },

    async fetchLogs(filters?: {
        name?: string;
        actionType?: string;
        startDate?: string;
        endDate?: string;
    }) {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.name) {
            query = query.or(`actor_nickname.ilike.%${filters.name}%,target_name.ilike.%${filters.name}%`);
        }
        if (filters?.actionType) {
            query = query.eq('action_type', filters.actionType);
        }
        if (filters?.startDate) {
            query = query.gte('created_at', `${filters.startDate}T00:00:00`);
        }
        if (filters?.endDate) {
            query = query.lte('created_at', `${filters.endDate}T23:59:59`);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;
        return data as AuditLog[];
    },

    async checkNewSuspiciousActivity(lastCheckedTimestamp: string) {
        const { count, error } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('is_suspicious', true)
            .gt('created_at', lastCheckedTimestamp);
        
        if (error) return 0;
        return count || 0;
    },

    exportToCSV(logs: AuditLog[]) {
        if (logs.length === 0) return;

        const headers = ['Time', 'User', 'Action', 'Target', 'Type', 'Suspicious'];
        const rows = logs.map(log => [
            log.created_at ? new Date(log.created_at).toLocaleString('sv-SE') : '',
            log.actor_nickname,
            log.action_detail,
            log.target_name || '',
            log.action_type,
            log.is_suspicious ? 'YES' : 'NO'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    }
};
