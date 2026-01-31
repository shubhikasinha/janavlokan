import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

interface AlertPayload {
  beneficiary_id: string;
  risk_score: number;
  reason: string;
}

interface AlertCandidate {
  beneficiary_id: string;
  risk_score: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: AlertPayload = await request.json();
    const { beneficiary_id, risk_score, reason } = body;

    if (!beneficiary_id || risk_score === undefined) {
      return NextResponse.json(
        { success: false, error: 'beneficiary_id and risk_score are required' },
        { status: 400 }
      );
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the alert and return success
    console.log('ALERT TRIGGERED:', {
      beneficiary_id,
      risk_score,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Simulate email sending
    const alertRecord = {
      beneficiary_id,
      risk_score,
      reason,
      alert_sent: true,
      sent_at: new Date().toISOString(),
      recipient: 'audit-team@example.gov.in', // Placeholder
    };

    return NextResponse.json({
      success: true,
      message: 'Alert sent successfully',
      alert: alertRecord,
    });
  } catch (error) {
    console.error('Alert Email Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// GET: Fetch alert candidates (beneficiaries with high mean_squared_error)
export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    const query = `
      SELECT
        beneficiary_id,
        mean_squared_error AS risk_score
      FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
      WHERE risk_level = 'HIGH'
      ORDER BY mean_squared_error DESC
      LIMIT 10
    `;

    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    const results: AlertCandidate[] = rows.map((row) => ({
      beneficiary_id: row.beneficiary_id,
      risk_score: Number(row.risk_score),
    }));

    return NextResponse.json({
      success: true,
      candidates: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Alert Candidates Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
