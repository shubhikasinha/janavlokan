import { getAuditService, type AuditAction, type CreateAuditParams } from '@/lib/services';
import { SchemeType } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/audit
 * Fetch audit trail for an entity or all recent audits
 * 
 * Query params:
 * - beneficiary_id: string (optional, filter by entity)
 * - scheme_type: 'LPG' | 'MDM' (default 'LPG')
 * - limit: number (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const beneficiaryId = searchParams.get('beneficiary_id');
    const schemeType = (searchParams.get('scheme_type') || 'LPG') as SchemeType;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const auditService = getAuditService();
    const audits = await auditService.getAuditTrail(beneficiaryId, schemeType, limit);

    return NextResponse.json({ success: true, audits });
  } catch (error) {
    console.error('Audit Trail GET Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export interface AuditRequest {
  beneficiary_id: string;
  action: AuditAction;
  officer_id?: string;
  officer_name?: string;
  notes?: string;
  new_status?: string;
  scheme_type?: SchemeType;
}

/**
 * POST /api/audit
 * Add an audit entry
 */
export async function POST(request: NextRequest) {
  try {
    const body: AuditRequest = await request.json();
    const { beneficiary_id, action, officer_id, officer_name, notes, new_status, scheme_type = 'LPG' } = body;

    if (!beneficiary_id || !action) {
      return NextResponse.json(
        { success: false, error: 'beneficiary_id and action are required' },
        { status: 400 }
      );
    }

    const auditService = getAuditService();

    const params: CreateAuditParams = {
      beneficiaryId: beneficiary_id,
      action,
      officerId: officer_id,
      officerName: officer_name,
      notes,
      newStatus: new_status,
      schemeType: scheme_type,
    };

    const auditEntry = await auditService.logAction(params);

    return NextResponse.json({
      success: true,
      message: `Action '${action}' recorded for ${scheme_type === 'MDM' ? 'school' : 'beneficiary'} ${beneficiary_id}`,
      audit: auditEntry,
    });
  } catch (error) {
    console.error('Audit Trail POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
