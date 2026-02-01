import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scheme = (searchParams.get('scheme') || 'lpg').toLowerCase();
        const limit = parseInt(searchParams.get('limit') || '10');

        const bigquery = getBigQueryClient();

        let alerts: any[] = [];

        if (scheme === 'mdm') {
            // MDM: Get high-priority alerts from mdm_fraud_with_explanations
            try {
                const mdmQuery = `
                    SELECT 
                        CAST(school_id AS STRING) as entity_id,
                        school_name,
                        district,
                        risk_level,
                        anomaly_score as risk_score,
                        flag_ghost_meals,
                        flag_ingredient_inflation,
                        flag_fund_overclaim,
                        flag_cook_anomaly
                    FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\`
                    WHERE risk_level = 'HIGH'
                    ORDER BY anomaly_score DESC
                    LIMIT @limit
                `;

                const [rows] = await bigquery.query({ query: mdmQuery, params: { limit } });

                alerts = rows.map((row: any) => {
                    // Determine primary alert type from flags
                    let alertType = 'MDM anomaly detected';
                    if (row.flag_ghost_meals) alertType = 'Ghost meals detected';
                    else if (row.flag_fund_overclaim) alertType = 'Fund overclaim detected';
                    else if (row.flag_ingredient_inflation) alertType = 'Ingredient inflation detected';
                    else if (row.flag_cook_anomaly) alertType = 'Cook anomaly detected';

                    return {
                        beneficiary_id: row.entity_id,
                        entity_name: row.school_name || 'Unknown School',
                        district: row.district || 'Unknown',
                        risk_level: row.risk_level,
                        risk_score: parseFloat(row.risk_score) || 0,
                        alert_type: alertType,
                        timestamp: new Date().toISOString(),
                        scheme: 'MDM'
                    };
                });
            } catch (mdmError) {
                console.log('MDM high-priority alerts query failed:', mdmError);
            }
        } else {
            // LPG: Original query
            try {
                const lpgQuery = `
                    SELECT 
                        beneficiary_id,
                        risk_level,
                        mean_squared_error as risk_score,
                        flag_high_recent_activity,
                        flag_multiple_dealers,
                        flag_cross_district,
                        flag_high_lifetime_usage
                    FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
                    WHERE risk_level = 'HIGH'
                    ORDER BY mean_squared_error DESC
                    LIMIT @limit
                `;

                const [rows] = await bigquery.query({ query: lpgQuery, params: { limit } });

                alerts = rows.map((row: any) => {
                    // Determine primary alert type from flags
                    let alertType = 'Suspicious activity pattern detected';
                    if (row.flag_multiple_dealers) alertType = 'Multiple dealers detected';
                    else if (row.flag_cross_district) alertType = 'Cross-district activity';
                    else if (row.flag_high_recent_activity) alertType = 'High recent activity';
                    else if (row.flag_high_lifetime_usage) alertType = 'High lifetime usage anomaly';

                    return {
                        beneficiary_id: row.beneficiary_id,
                        risk_level: row.risk_level,
                        risk_score: parseFloat(row.risk_score) || 0,
                        alert_type: alertType,
                        timestamp: new Date().toISOString(),
                        scheme: 'LPG'
                    };
                });
            } catch (lpgError) {
                console.log('LPG high-priority alerts query failed:', lpgError);
            }
        }

        if (alerts.length > 0) {
            return NextResponse.json({
                success: true,
                alerts: alerts,
                count: alerts.length,
                scheme: scheme.toUpperCase()
            });
        }

        // Fallback mock data if query fails
        throw new Error('No data returned from BigQuery');

    } catch (error) {
        console.error('Error fetching high-priority alerts:', error);

        const searchParams = request.nextUrl.searchParams;
        const scheme = (searchParams.get('scheme') || 'lpg').toLowerCase();

        // Return scheme-appropriate mock data on error for development
        if (scheme === 'mdm') {
            const mockMDMAlerts = [
                {
                    beneficiary_id: '1001',
                    entity_name: 'Government Primary School',
                    district: 'Patna',
                    risk_level: 'HIGH',
                    risk_score: 0.85,
                    alert_type: 'Ghost meals detected',
                    timestamp: new Date().toISOString(),
                    scheme: 'MDM'
                },
                {
                    beneficiary_id: '1002',
                    entity_name: 'Middle School Gaya',
                    district: 'Gaya',
                    risk_level: 'HIGH',
                    risk_score: 0.78,
                    alert_type: 'Fund overclaim detected',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    scheme: 'MDM'
                }
            ];
            return NextResponse.json({
                success: true,
                alerts: mockMDMAlerts,
                count: mockMDMAlerts.length,
                mock: true,
                scheme: 'MDM'
            });
        }

        // Original LPG mock data
        const mockAlerts = [
            {
                beneficiary_id: 'fc743f63-6a17-401f-ab55-e578dd8544a',
                risk_level: 'HIGH',
                risk_score: 30.4811,
                alert_type: 'Multiple dealers detected',
                timestamp: new Date().toISOString(),
                scheme: 'LPG'
            },
            {
                beneficiary_id: 'f042415d-cbda-4888-a082-0fc2b5ffd54a',
                risk_level: 'HIGH',
                risk_score: 13.2339,
                alert_type: 'Unusual transaction pattern',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                scheme: 'LPG'
            },
            {
                beneficiary_id: 'a7ce74ae-b703-49e1-a08d-77a8fcedb223',
                risk_level: 'HIGH',
                risk_score: 12.4822,
                alert_type: 'Cross-district activity',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                scheme: 'LPG'
            }
        ];

        return NextResponse.json({
            success: true,
            alerts: mockAlerts,
            count: mockAlerts.length,
            mock: true,
            scheme: 'LPG'
        });
    }
}
