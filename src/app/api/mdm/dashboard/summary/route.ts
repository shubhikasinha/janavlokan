import { getBigQueryClient, MDMDashboardSummary } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    // First try the preprocessed fraud table
    // If it doesn't exist, fallback to computing from raw tables
    let query = `
      SELECT
        COUNT(*) AS total_schools,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk,
        SUM(total_meals_reported) AS total_meals_reported
      FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\`
    `;

    try {
      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0 && rows[0].total_schools > 0) {
        const result: MDMDashboardSummary = {
          total_schools: Number(rows[0].total_schools),
          high_risk: Number(rows[0].high_risk),
          medium_risk: Number(rows[0].medium_risk),
          low_risk: Number(rows[0].low_risk),
          total_meals_reported: Number(rows[0].total_meals_reported) || 0,
        };
        return NextResponse.json(result);
      }
    } catch (primaryError) {
      console.log('Primary table not found, trying fallback query...');
    }

    // Fallback: Compute from raw tables (mdm_daily_record + mdm_school_master)
    const fallbackQuery = `
      WITH school_stats AS (
        SELECT 
          d.school_id,
          SUM(d.reported_students_served) AS total_meals,
          AVG(d.reported_students_served) AS avg_meals,
          STDDEV(d.reported_students_served) AS stddev_meals,
          COUNT(*) AS record_count,
          -- Simple anomaly detection based on deviation
          CASE 
            WHEN STDDEV(d.reported_students_served) > 0 
              AND ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
                  > 2 * (SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)
            THEN 'HIGH'
            WHEN STDDEV(d.reported_students_served) > 0 
              AND ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
                  > 1 * (SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)
            THEN 'MEDIUM'
            ELSE 'LOW'
          END AS risk_level
        FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
        GROUP BY d.school_id
      )
      SELECT
        COUNT(DISTINCT school_id) AS total_schools,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk,
        SUM(total_meals) AS total_meals_reported
      FROM school_stats
    `;

    const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
    const [fallbackRows] = await fallbackJob.getQueryResults();

    if (fallbackRows.length === 0) {
      return NextResponse.json({
        total_schools: 0,
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
        total_meals_reported: 0,
      } as MDMDashboardSummary);
    }

    const result: MDMDashboardSummary = {
      total_schools: Number(fallbackRows[0].total_schools) || 0,
      high_risk: Number(fallbackRows[0].high_risk) || 0,
      medium_risk: Number(fallbackRows[0].medium_risk) || 0,
      low_risk: Number(fallbackRows[0].low_risk) || 0,
      total_meals_reported: Number(fallbackRows[0].total_meals_reported) || 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('MDM Dashboard Summary Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
