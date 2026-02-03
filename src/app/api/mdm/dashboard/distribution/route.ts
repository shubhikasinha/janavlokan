import { getBigQueryClient, RiskDistribution } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    let results: RiskDistribution[] = [];

    try {
      const query = `
        SELECT
          risk_level,
          COUNT(*) AS count
        FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\`
        GROUP BY risk_level
        ORDER BY 
          CASE risk_level 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            WHEN 'LOW' THEN 3 
            ELSE 4 
          END
      `;

      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0) {
        results = rows.map((row) => ({
          risk_level: row.risk_level || 'UNKNOWN',
          count: Number(row.count),
        }));
        return NextResponse.json(results);
      }
    } catch (_primaryError) {
      console.log('Primary MDM table not found for distribution, using fallback...');
    }

    const fallbackQuery = `
      WITH school_stats AS (
        SELECT 
          d.school_id,
          COALESCE(
            ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
            / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
            0
          ) AS anomaly_score
        FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
        GROUP BY d.school_id
      )
      SELECT
        CASE 
          WHEN anomaly_score > 2 THEN 'HIGH'
          WHEN anomaly_score > 1 THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level,
        COUNT(*) AS count
      FROM school_stats
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level 
          WHEN 'HIGH' THEN 1 
          WHEN 'MEDIUM' THEN 2 
          WHEN 'LOW' THEN 3 
          ELSE 4 
        END
    `;

    const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
    const [fallbackRows] = await fallbackJob.getQueryResults();

    results = fallbackRows.map((row) => ({
      risk_level: row.risk_level || 'UNKNOWN',
      count: Number(row.count),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('MDM Distribution Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
