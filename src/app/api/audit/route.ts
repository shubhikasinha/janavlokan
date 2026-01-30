import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Audit trail types - matches BigQuery table schema
export interface AuditEntry {
  audit_id: string;
  beneficiary_id: string;
  action: 'REVIEWED' | 'FLAGGED' | 'CLEARED' | 'NOTE_ADDED' | 'EXPORTED' | 'VERIFIED';
  officer_id: string;
  officer_name: string;
  notes: string;
  previous_risk_level: string;  // Model ka original prediction
  new_status: string;           // Human ka final decision
  created_at: string;
}

export interface AuditRequest {
  beneficiary_id: string;
  action: 'REVIEWED' | 'FLAGGED' | 'CLEARED' | 'NOTE_ADDED' | 'VERIFIED';
  officer_id?: string;
  officer_name?: string;
  notes?: string;
  new_status?: string;
}

// GET: Fetch audit trail for a beneficiary or all recent audits
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const beneficiaryId = searchParams.get('beneficiary_id');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const bigquery = getBigQueryClient();

    // Check if audit_trail table exists, if not return empty
    // In production, this table would be created via migration
    let query: string;
    const params: Record<string, unknown> = { limit };

    if (beneficiaryId) {
      query = `
        SELECT *
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        WHERE beneficiary_id = @beneficiary_id
        ORDER BY created_at DESC
        LIMIT @limit
      `;
      params.beneficiary_id = beneficiaryId;
    } else {
      query = `
        SELECT *
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        ORDER BY created_at DESC
        LIMIT @limit
      `;
    }

    try {
      const [job] = await bigquery.createQueryJob({ query, params });
      const [rows] = await job.getQueryResults();

      const results: AuditEntry[] = rows.map((row) => ({
        audit_id: row.audit_id,
        beneficiary_id: row.beneficiary_id,
        action: row.action,
        officer_id: row.officer_id,
        officer_name: row.officer_name,
        notes: row.notes || '',
        previous_risk_level: row.previous_risk_level,  // Model's original prediction
        new_status: row.new_status,                    // Human's decision
        created_at: row.created_at?.value || row.created_at,
      }));

      return NextResponse.json({ success: true, audits: results });
    } catch {
      // Table doesn't exist yet - return empty array
      // In a real system, you'd create the table via migration
      return NextResponse.json({ success: true, audits: [], message: 'Audit trail not initialized' });
    }
  } catch (error) {
    console.error('Audit Trail GET Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Add audit entry
export async function POST(request: NextRequest) {
  try {
    const body: AuditRequest = await request.json();
    const { beneficiary_id, action, officer_id, officer_name, notes, new_status } = body;

    if (!beneficiary_id || !action) {
      return NextResponse.json(
        { success: false, error: 'beneficiary_id and action are required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();

    // Get current status of beneficiary
    const statusQuery = `
      SELECT risk_level
      FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
      WHERE beneficiary_id = @beneficiary_id
    `;

    const [statusJob] = await bigquery.createQueryJob({
      query: statusQuery,
      params: { beneficiary_id }
    });
    const [statusRows] = await statusJob.getQueryResults();
    const previousRiskLevel = statusRows[0]?.risk_level || 'UNKNOWN';

    // Create audit entry - matches BigQuery table schema
    const auditEntry: AuditEntry = {
      audit_id: uuidv4(),
      beneficiary_id,
      action,
      officer_id: officer_id || 'SYSTEM',
      officer_name: officer_name || 'System User',
      notes: notes || '',
      previous_risk_level: previousRiskLevel,                              // Model ka original risk level
      new_status: new_status || (action === 'CLEARED' ? 'GENUINE' : action === 'FLAGGED' ? 'CONFIRMED_FRAUD' : previousRiskLevel),  // Human decision
      created_at: new Date().toISOString(),
    };

    // Try to insert into audit_trail table
    // If table doesn't exist, we'll create it or return success with local data
    try {
      const insertQuery = `
        INSERT INTO \`gfg-fot.lpg_fraud_detection.audit_trail\`
        (audit_id, beneficiary_id, officer_id, officer_name, action, previous_risk_level, new_status, notes, created_at)
        VALUES
        (@audit_id, @beneficiary_id, @officer_id, @officer_name, @action, @previous_risk_level, @new_status, @notes, @created_at)
      `;

      await bigquery.createQueryJob({
        query: insertQuery,
        params: {
          audit_id: auditEntry.audit_id,
          beneficiary_id: auditEntry.beneficiary_id,
          officer_id: auditEntry.officer_id,
          officer_name: auditEntry.officer_name,
          action: auditEntry.action,
          previous_risk_level: auditEntry.previous_risk_level,
          new_status: auditEntry.new_status,
          notes: auditEntry.notes,
          created_at: auditEntry.created_at,
        },
      });
    } catch {
      // Table might not exist - log locally for demo
      console.log('AUDIT ENTRY (Table not created):', auditEntry);
    }

    return NextResponse.json({
      success: true,
      message: `Action '${action}' recorded for beneficiary ${beneficiary_id}`,
      audit: auditEntry,
    });
  } catch (error) {
    console.error('Audit Trail POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
