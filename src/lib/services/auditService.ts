/**
 * Audit Service
 * 
 * Centralizes all audit logging operations.
 * Tracks user actions for compliance and review.
 */

import {
    executeQuery,
    getBigQueryClient,
    TABLES,
    SchemeType,
} from '@/lib/bigquery';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEntry {
    audit_id: string;
    beneficiary_id: string;  // For LPG: beneficiary_id, For MDM: school_id
    action: AuditAction;
    officer_id: string;
    officer_name: string;
    notes: string;
    previous_risk_level: string;
    new_status: string;
    scheme_type: SchemeType;
    created_at: string;
}

export type AuditAction =
    | 'REVIEWED'
    | 'FLAGGED'
    | 'CLEARED'
    | 'NOTE_ADDED'
    | 'EXPORTED'
    | 'VERIFIED'
    | 'PREDICTION_VIEWED';

export interface CreateAuditParams {
    beneficiaryId: string;
    action: AuditAction;
    officerId?: string;
    officerName?: string;
    notes?: string;
    newStatus?: string;
    schemeType?: SchemeType;
}

export class AuditService {
    /**
     * Log an audit action
     */
    async logAction(params: CreateAuditParams): Promise<AuditEntry> {
        const {
            beneficiaryId,
            action,
            officerId = 'SYSTEM',
            officerName = 'System User',
            notes = '',
            newStatus,
            schemeType = 'LPG',
        } = params;

        // Get current risk level
        const previousRiskLevel = await this.getCurrentRiskLevel(beneficiaryId, schemeType);

        const auditEntry: AuditEntry = {
            audit_id: uuidv4(),
            beneficiary_id: beneficiaryId,
            action,
            officer_id: officerId,
            officer_name: officerName,
            notes,
            previous_risk_level: previousRiskLevel,
            new_status: newStatus || this.deriveNewStatus(action, previousRiskLevel),
            scheme_type: schemeType,
            created_at: new Date().toISOString(),
        };

        // Insert into BigQuery
        await this.insertAuditEntry(auditEntry);

        return auditEntry;
    }

    /**
     * Log when a user views a prediction detail
     */
    async logPredictionView(
        entityId: string,
        schemeType: SchemeType = 'LPG',
        userId: string = 'ANONYMOUS'
    ): Promise<void> {
        await this.logAction({
            beneficiaryId: entityId,
            action: 'PREDICTION_VIEWED',
            officerId: userId,
            officerName: 'Dashboard User',
            notes: 'Viewed prediction details',
            schemeType,
        });
    }

    /**
     * Get audit trail for an entity
     */
    async getAuditTrail(
        entityId: string | null,
        schemeType: SchemeType = 'LPG',
        limit: number = 50
    ): Promise<AuditEntry[]> {
        const safeLimit = Math.min(limit, 200);

        let query: string;
        const params: Record<string, unknown> = {
            limit: safeLimit,
            scheme_type: schemeType
        };

        if (entityId) {
            query = `
        SELECT *
        FROM \`${TABLES.AUDIT_TRAIL}\`
        WHERE beneficiary_id = @beneficiary_id
        AND (scheme_type = @scheme_type OR scheme_type IS NULL)
        ORDER BY created_at DESC
        LIMIT @limit
      `;
            params.beneficiary_id = entityId;
        } else {
            query = `
        SELECT *
        FROM \`${TABLES.AUDIT_TRAIL}\`
        WHERE scheme_type = @scheme_type OR scheme_type IS NULL
        ORDER BY created_at DESC
        LIMIT @limit
      `;
        }

        try {
            const result = await executeQuery<AuditEntry>(query, params);

            return result.rows.map(row => ({
                audit_id: row.audit_id,
                beneficiary_id: row.beneficiary_id,
                action: row.action as AuditAction,
                officer_id: row.officer_id,
                officer_name: row.officer_name,
                notes: row.notes || '',
                previous_risk_level: row.previous_risk_level,
                new_status: row.new_status,
                scheme_type: (row.scheme_type || 'LPG') as SchemeType,
                created_at: typeof row.created_at === 'object' && 'value' in row.created_at
                    ? (row.created_at as { value: string }).value
                    : row.created_at,
            }));
        } catch {
            // Table might not exist yet
            console.log('[AuditService] Audit trail table not initialized');
            return [];
        }
    }

    /**
     * Get feedback statistics
     */
    async getFeedbackStats(schemeType: SchemeType = 'LPG'): Promise<{
        total: number;
        flagged: number;
        cleared: number;
        reviewed: number;
    }> {
        const query = `
      SELECT
        COUNT(*) AS total,
        COUNTIF(action = 'FLAGGED') AS flagged,
        COUNTIF(action = 'CLEARED') AS cleared,
        COUNTIF(action = 'REVIEWED') AS reviewed
      FROM \`${TABLES.AUDIT_TRAIL}\`
      WHERE scheme_type = @scheme_type OR scheme_type IS NULL
    `;

        try {
            const result = await executeQuery<{
                total: number;
                flagged: number;
                cleared: number;
                reviewed: number;
            }>(query, { scheme_type: schemeType });

            if (result.rows.length === 0) {
                return { total: 0, flagged: 0, cleared: 0, reviewed: 0 };
            }

            return {
                total: Number(result.rows[0].total),
                flagged: Number(result.rows[0].flagged),
                cleared: Number(result.rows[0].cleared),
                reviewed: Number(result.rows[0].reviewed),
            };
        } catch {
            return { total: 0, flagged: 0, cleared: 0, reviewed: 0 };
        }
    }

    private async getCurrentRiskLevel(
        entityId: string,
        schemeType: SchemeType
    ): Promise<string> {
        const table = schemeType === 'MDM' ? TABLES.MDM_FRAUD : TABLES.LPG_FRAUD;
        const idField = schemeType === 'MDM' ? 'school_id' : 'beneficiary_id';

        const query = `
      SELECT risk_level
      FROM \`${table}\`
      WHERE ${idField} = ${schemeType === 'MDM' ? 'CAST(@entity_id AS INT64)' : '@entity_id'}
    `;

        try {
            const result = await executeQuery<{ risk_level: string }>(query, {
                entity_id: entityId
            });
            return result.rows[0]?.risk_level || 'UNKNOWN';
        } catch {
            return 'UNKNOWN';
        }
    }

    private deriveNewStatus(action: AuditAction, previousRiskLevel: string): string {
        switch (action) {
            case 'CLEARED':
                return 'GENUINE';
            case 'FLAGGED':
                return 'CONFIRMED_FRAUD';
            case 'VERIFIED':
                return 'VERIFIED';
            default:
                return previousRiskLevel;
        }
    }

    private async insertAuditEntry(entry: AuditEntry): Promise<void> {
        const bigquery = getBigQueryClient();

        const insertQuery = `
      INSERT INTO \`${TABLES.AUDIT_TRAIL}\`
      (audit_id, beneficiary_id, officer_id, officer_name, action, 
       previous_risk_level, new_status, scheme_type, notes, created_at)
      VALUES
      (@audit_id, @beneficiary_id, @officer_id, @officer_name, @action,
       @previous_risk_level, @new_status, @scheme_type, @notes, @created_at)
    `;

        try {
            await bigquery.createQueryJob({
                query: insertQuery,
                params: {
                    audit_id: entry.audit_id,
                    beneficiary_id: entry.beneficiary_id,
                    officer_id: entry.officer_id,
                    officer_name: entry.officer_name,
                    action: entry.action,
                    previous_risk_level: entry.previous_risk_level,
                    new_status: entry.new_status,
                    scheme_type: entry.scheme_type,
                    notes: entry.notes,
                    created_at: entry.created_at,
                },
            });
        } catch (error) {
            // Log but don't fail - audit table might not be created yet
            console.log('[AuditService] AUDIT ENTRY (Table not created):', entry);
            console.log('[AuditService] Error:', error instanceof Error ? error.message : 'Unknown');
        }
    }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
    if (!auditServiceInstance) {
        auditServiceInstance = new AuditService();
    }
    return auditServiceInstance;
}
