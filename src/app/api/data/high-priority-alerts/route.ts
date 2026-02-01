import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scheme = searchParams.get('scheme') || 'lpg';
        const limit = parseInt(searchParams.get('limit') || '10');

        const bigquery = getBigQueryClient();

        // Get high-priority alerts (HIGH risk beneficiaries with recent activity)
        const query = `
            SELECT 
                beneficiary_id,
                risk_level,
                anomaly_score_mse as risk_score,
                detected_flags,
                transaction_dt as timestamp
            FROM \`subsidy-leakage-detection.lpg_analytics.flagged_beneficiaries\`
            WHERE scheme_type = @scheme
                AND risk_level = 'HIGH'
            ORDER BY anomaly_score_mse DESC, transaction_dt DESC
            LIMIT @limit
        `;

        const options = {
            query: query,
            params: {
                scheme: scheme.toUpperCase(),
                limit: limit
            }
        };

        const [rows] = await bigquery.query(options);

        // Transform the data for the frontend
        const alerts = rows.map((row: any) => ({
            beneficiary_id: row.beneficiary_id,
            risk_level: row.risk_level,
            risk_score: parseFloat(row.risk_score) || 0,
            alert_type: Array.isArray(row.detected_flags) && row.detected_flags.length > 0
                ? row.detected_flags[0]
                : 'Suspicious activity pattern detected',
            timestamp: row.timestamp || new Date().toISOString()
        }));

        return NextResponse.json({
            success: true,
            alerts: alerts,
            count: alerts.length
        });

    } catch (error) {
        console.error('Error fetching high-priority alerts:', error);

        // Return mock data on error for development
        const mockAlerts = [
            {
                beneficiary_id: 'fc743f63-6a17-401f-ab55-e578dd8544a',
                risk_level: 'HIGH',
                risk_score: 30.4811,
                alert_type: 'Multiple dealers detected',
                timestamp: new Date().toISOString()
            },
            {
                beneficiary_id: 'f042415d-cbda-4888-a082-0fc2b5ffd54a',
                risk_level: 'HIGH',
                risk_score: 13.2339,
                alert_type: 'Unusual transaction pattern',
                timestamp: new Date(Date.now() - 3600000).toISOString()
            },
            {
                beneficiary_id: 'a7ce74ae-b703-49e1-a08d-77a8fcedb223',
                risk_level: 'HIGH',
                risk_score: 12.4822,
                alert_type: 'Cross-district activity',
                timestamp: new Date(Date.now() - 7200000).toISOString()
            },
            {
                beneficiary_id: 'fdc66368-2a2e-4a0e-ad97-d97db6d2a07d',
                risk_level: 'HIGH',
                risk_score: 11.8909,
                alert_type: 'High lifetime usage anomaly',
                timestamp: new Date(Date.now() - 10800000).toISOString()
            },
            {
                beneficiary_id: 'afe4d8b0-1428-4a46-a3eb-61a8aa3fba7d',
                risk_level: 'HIGH',
                risk_score: 10.4219,
                alert_type: 'Refills from multiple dealers',
                timestamp: new Date(Date.now() - 14400000).toISOString()
            }
        ];

        return NextResponse.json({
            success: true,
            alerts: mockAlerts,
            count: mockAlerts.length,
            mock: true
        });
    }
}
