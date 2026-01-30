import { getBigQueryClient, HighRiskBeneficiary } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const riskLevel = searchParams.get('risk_level'); // Optional filter
    const threshold = Number(searchParams.get('threshold')) || 0;  // Dynamic threshold from slider
    const useDynamic = searchParams.get('dynamic') === 'true';  // Use dynamic risk calculation?

    const bigquery = getBigQueryClient();

    let query: string;
    const params: Record<string, unknown> = { limit };

    if (useDynamic && threshold > 0) {
      // DYNAMIC MODE: Calculate risk level on-the-fly based on slider threshold
      // This ignores the pre-computed risk_level and uses MSE threshold
      query = `
        SELECT
          beneficiary_id,
          -- Dynamic risk level based on threshold
          CASE 
            WHEN mean_squared_error > @threshold * 2 THEN 'HIGH'
            WHEN mean_squared_error > @threshold THEN 'MEDIUM'
            ELSE 'LOW'
          END AS risk_level,
          mean_squared_error,
          flag_high_recent_activity,
          flag_multiple_dealers,
          flag_cross_district,
          flag_high_lifetime_usage
        FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
        WHERE mean_squared_error >= @threshold
        ORDER BY mean_squared_error DESC
        LIMIT @limit
      `;
      params.threshold = threshold;
    } else {
      // STATIC MODE: Use pre-computed risk_level from table
      query = `
        SELECT
          beneficiary_id,
          risk_level,
          mean_squared_error,
          flag_high_recent_activity,
          flag_multiple_dealers,
          flag_cross_district,
          flag_high_lifetime_usage
        FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
      `;
      
      // Add filter if risk_level specified (for drill-down)
      if (riskLevel && ['HIGH', 'MEDIUM', 'LOW'].includes(riskLevel.toUpperCase())) {
        query += `WHERE risk_level = @riskLevel\n`;
        params.riskLevel = riskLevel.toUpperCase();
      }
      
      query += `ORDER BY mean_squared_error DESC
        LIMIT @limit`;
    }

    const [job] = await bigquery.createQueryJob({ query, params });
    const [rows] = await job.getQueryResults();

    const results: HighRiskBeneficiary[] = rows.map((row) => ({
      beneficiary_id: row.beneficiary_id,
      risk_level: row.risk_level || 'UNKNOWN',
      mean_squared_error: Number(row.mean_squared_error) || 0,
      flag_high_recent_activity: Boolean(row.flag_high_recent_activity),
      flag_multiple_dealers: Boolean(row.flag_multiple_dealers),
      flag_cross_district: Boolean(row.flag_cross_district),
      flag_high_lifetime_usage: Boolean(row.flag_high_lifetime_usage),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('High-Risk Beneficiaries Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
