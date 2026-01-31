import { getBigQueryClient, MDMDistrictRisk } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    let results: MDMDistrictRisk[] = [];

    // Try primary table first
    try {
      const query = `
        SELECT
          district,
          COUNT(*) AS anomaly_count,
          COUNT(*) AS total_schools,
          COUNTIF(risk_level = 'HIGH') AS high_risk_schools
        FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\`
        WHERE risk_level IN ('HIGH', 'MEDIUM')
        GROUP BY district
        ORDER BY anomaly_count DESC
      `;

      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0) {
        results = rows.map((row) => ({
          district: row.district || 'Unknown',
          anomaly_count: Number(row.anomaly_count),
          total_schools: Number(row.total_schools),
          high_risk_schools: Number(row.high_risk_schools),
        }));
      }
    } catch (primaryError) {
      console.log('Primary MDM table not found for geo, using fallback...');
    }

    // Fallback: Compute from raw tables
    if (results.length === 0) {
      const fallbackQuery = `
        WITH school_stats AS (
          SELECT 
            d.school_id,
            s.district,
            COALESCE(
              ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
              / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
              0
            ) AS anomaly_score
          FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
          LEFT JOIN \`gfg-fot.lpg_fraud_detection.mdm_school_master\` s ON d.school_id = s.school_id
          GROUP BY d.school_id, s.district
        ),
        school_risk AS (
          SELECT
            COALESCE(district, 'Unknown') AS district,
            school_id,
            CASE 
              WHEN anomaly_score > 2 THEN 'HIGH'
              WHEN anomaly_score > 1 THEN 'MEDIUM'
              ELSE 'LOW'
            END AS risk_level
          FROM school_stats
        )
        SELECT
          district,
          COUNT(*) AS anomaly_count,
          COUNT(*) AS total_schools,
          COUNTIF(risk_level = 'HIGH') AS high_risk_schools
        FROM school_risk
        WHERE risk_level IN ('HIGH', 'MEDIUM')
        GROUP BY district
        ORDER BY anomaly_count DESC
      `;

      const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
      const [fallbackRows] = await fallbackJob.getQueryResults();

      results = fallbackRows.map((row) => ({
        district: row.district || 'Unknown',
        anomaly_count: Number(row.anomaly_count),
        total_schools: Number(row.total_schools),
        high_risk_schools: Number(row.high_risk_schools),
      }));
    }

    // Return in format compatible with existing heatmap
    const heatmapFormat = results.map(r => ({
      residence_district: r.district,
      anomaly_count: r.anomaly_count,
    }));

    return NextResponse.json(heatmapFormat);
  } catch (error) {
    console.error('MDM District Risk Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
