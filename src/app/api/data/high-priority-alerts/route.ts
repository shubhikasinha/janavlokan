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

        return NextResponse.json({
            success: false,
            error: 'No high-priority alerts found',
            alerts: [],
            count: 0,
            scheme: scheme.toUpperCase()
        });

    } catch (error) {
        console.error('Error fetching high-priority alerts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alerts';

        return NextResponse.json({
            success: false,
            error: errorMessage,
            alerts: [],
            count: 0
        }, { status: 500 });
    }
}
