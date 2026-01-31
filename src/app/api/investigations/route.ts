import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Investigation Management API
// Allows officers to:
// 1. Create investigations for beneficiaries
// 2. Update investigation status
// 3. Add notes and track progress
// 4. Close investigations with resolution

export interface Investigation {
  investigation_id: string;
  beneficiary_id: string;
  case_title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'CLOSED_FRAUD' | 'CLOSED_GENUINE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_officer: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution_notes?: string;
  estimated_loss?: number;
}

// GET: Fetch investigations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const beneficiaryId = searchParams.get('beneficiary_id');
    const status = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const bigquery = getBigQueryClient();

    // Check if investigations table exists
    // In production, create this table:
    /*
    CREATE TABLE `gfg-fot.lpg_fraud_detection.investigations` (
      investigation_id STRING NOT NULL,
      beneficiary_id STRING NOT NULL,
      case_title STRING,
      status STRING DEFAULT 'OPEN',
      priority STRING DEFAULT 'MEDIUM',
      assigned_officer STRING,
      created_by STRING,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolution_notes STRING,
      estimated_loss FLOAT64
    );
    */

    let query: string;
    const params: Record<string, unknown> = { limit };

    if (beneficiaryId) {
      query = `
        SELECT *
        FROM \`gfg-fot.lpg_fraud_detection.investigations\`
        WHERE beneficiary_id = @beneficiary_id
        ORDER BY created_at DESC
        LIMIT @limit
      `;
      params.beneficiary_id = beneficiaryId;
    } else if (status) {
      query = `
        SELECT *
        FROM \`gfg-fot.lpg_fraud_detection.investigations\`
        WHERE status = @status
        ORDER BY 
          CASE priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
          END,
          created_at DESC
        LIMIT @limit
      `;
      params.status = status;
    } else {
      query = `
        SELECT *
        FROM \`gfg-fot.lpg_fraud_detection.investigations\`
        ORDER BY 
          CASE status 
            WHEN 'OPEN' THEN 1 
            WHEN 'IN_PROGRESS' THEN 2 
            WHEN 'PENDING_REVIEW' THEN 3 
            ELSE 4 
          END,
          CASE priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
          END,
          created_at DESC
        LIMIT @limit
      `;
    }

    try {
      const [job] = await bigquery.createQueryJob({ query, params });
      const [rows] = await job.getQueryResults();

      const investigations: Investigation[] = rows.map((row) => ({
        investigation_id: row.investigation_id,
        beneficiary_id: row.beneficiary_id,
        case_title: row.case_title || `Case: ${row.beneficiary_id}`,
        status: row.status || 'OPEN',
        priority: row.priority || 'MEDIUM',
        assigned_officer: row.assigned_officer || '',
        created_by: row.created_by || '',
        created_at: row.created_at?.value || row.created_at,
        updated_at: row.updated_at?.value || row.updated_at,
        resolution_notes: row.resolution_notes || '',
        estimated_loss: Number(row.estimated_loss) || 0
      }));

      // Get summary stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNTIF(status = 'OPEN') as open_count,
          COUNTIF(status = 'IN_PROGRESS') as in_progress_count,
          COUNTIF(status LIKE 'CLOSED%') as closed_count,
          COUNTIF(priority = 'CRITICAL') as critical_count,
          SUM(CASE WHEN status = 'CLOSED_FRAUD' THEN estimated_loss ELSE 0 END) as total_recovered
        FROM \`gfg-fot.lpg_fraud_detection.investigations\`
      `;

      let stats = null;
      try {
        const [statsJob] = await bigquery.createQueryJob({ query: statsQuery });
        const [statsRows] = await statsJob.getQueryResults();
        if (statsRows[0]) {
          stats = {
            total: Number(statsRows[0].total) || 0,
            open: Number(statsRows[0].open_count) || 0,
            in_progress: Number(statsRows[0].in_progress_count) || 0,
            closed: Number(statsRows[0].closed_count) || 0,
            critical: Number(statsRows[0].critical_count) || 0,
            total_recovered: Number(statsRows[0].total_recovered) || 0
          };
        }
      } catch {
        // Stats query failed, continue without
      }

      return NextResponse.json({ 
        success: true, 
        investigations,
        stats
      });
    } catch {
      // Table doesn't exist
      return NextResponse.json({ 
        success: true, 
        investigations: [],
        stats: { total: 0, open: 0, in_progress: 0, closed: 0, critical: 0, total_recovered: 0 },
        message: 'Investigations table not initialized'
      });
    }
  } catch (error) {
    console.error('Investigation GET Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Create new investigation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      beneficiary_id, 
      case_title, 
      priority = 'MEDIUM', 
      assigned_officer,
      created_by 
    } = body;

    if (!beneficiary_id || !created_by) {
      return NextResponse.json(
        { success: false, error: 'beneficiary_id and created_by are required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();
    const investigation_id = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;

    const insertQuery = `
      INSERT INTO \`gfg-fot.lpg_fraud_detection.investigations\`
      (investigation_id, beneficiary_id, case_title, status, priority, assigned_officer, created_by, created_at, updated_at)
      VALUES
      (@investigation_id, @beneficiary_id, @case_title, 'OPEN', @priority, @assigned_officer, @created_by, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `;

    await bigquery.createQueryJob({
      query: insertQuery,
      params: {
        investigation_id,
        beneficiary_id,
        case_title: case_title || `Investigation: ${beneficiary_id}`,
        priority,
        assigned_officer: assigned_officer || created_by,
        created_by
      }
    });

    // Also log to audit trail
    await bigquery.createQueryJob({
      query: `
        INSERT INTO \`gfg-fot.lpg_fraud_detection.audit_trail\`
        (audit_id, beneficiary_id, officer_id, officer_name, action, previous_risk_level, new_status, notes, created_at)
        VALUES
        (@audit_id, @beneficiary_id, @officer_id, @officer_name, 'INVESTIGATION_OPENED', '', 'UNDER_INVESTIGATION', @notes, CURRENT_TIMESTAMP())
      `,
      params: {
        audit_id: uuidv4(),
        beneficiary_id,
        officer_id: created_by.replace(/\s+/g, '_').toUpperCase(),
        officer_name: created_by,
        notes: `Investigation ${investigation_id} opened with priority ${priority}`
      }
    });

    return NextResponse.json({ 
      success: true, 
      investigation_id,
      message: 'Investigation created successfully'
    });
  } catch (error) {
    console.error('Investigation POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PATCH: Update investigation status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      investigation_id, 
      status, 
      resolution_notes,
      estimated_loss,
      updated_by
    } = body;

    if (!investigation_id || !status) {
      return NextResponse.json(
        { success: false, error: 'investigation_id and status are required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();

    const updateQuery = `
      UPDATE \`gfg-fot.lpg_fraud_detection.investigations\`
      SET 
        status = @status,
        resolution_notes = COALESCE(@resolution_notes, resolution_notes),
        estimated_loss = COALESCE(@estimated_loss, estimated_loss),
        updated_at = CURRENT_TIMESTAMP()
      WHERE investigation_id = @investigation_id
    `;

    await bigquery.createQueryJob({
      query: updateQuery,
      params: {
        investigation_id,
        status,
        resolution_notes: resolution_notes || null,
        estimated_loss: estimated_loss || null
      }
    });

    // Log to audit trail
    if (updated_by) {
      // Get beneficiary_id first
      const [getJob] = await bigquery.createQueryJob({
        query: `SELECT beneficiary_id FROM \`gfg-fot.lpg_fraud_detection.investigations\` WHERE investigation_id = @investigation_id`,
        params: { investigation_id }
      });
      const [rows] = await getJob.getQueryResults();
      const beneficiary_id = rows[0]?.beneficiary_id;

      if (beneficiary_id) {
        await bigquery.createQueryJob({
          query: `
            INSERT INTO \`gfg-fot.lpg_fraud_detection.audit_trail\`
            (audit_id, beneficiary_id, officer_id, officer_name, action, previous_risk_level, new_status, notes, created_at)
            VALUES
            (@audit_id, @beneficiary_id, @officer_id, @officer_name, 'INVESTIGATION_UPDATED', '', @status, @notes, CURRENT_TIMESTAMP())
          `,
          params: {
            audit_id: uuidv4(),
            beneficiary_id,
            officer_id: updated_by.replace(/\s+/g, '_').toUpperCase(),
            officer_name: updated_by,
            notes: `Investigation ${investigation_id} status changed to ${status}. ${resolution_notes || ''}`
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Investigation updated to ${status}`
    });
  } catch (error) {
    console.error('Investigation PATCH Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
