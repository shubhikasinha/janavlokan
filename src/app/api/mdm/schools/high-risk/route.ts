import { getBigQueryClient, MDMHighRiskSchool } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const riskLevel = searchParams.get('risk_level');
    const threshold = Number(searchParams.get('threshold')) || 0;
    const useDynamic = searchParams.get('dynamic') === 'true';

    const bigquery = getBigQueryClient();

    // Try primary table first, then fallback
    let results: MDMHighRiskSchool[] = [];
    
    try {
      let query: string;
      const params: Record<string, unknown> = { limit };

      if (useDynamic && threshold > 0) {
        query = `
          SELECT
            f.school_id,
            f.school_name,
            f.district,
            CASE 
              WHEN f.anomaly_score > @threshold * 2 THEN 'HIGH'
              WHEN f.anomaly_score > @threshold THEN 'MEDIUM'
              ELSE 'LOW'
            END AS risk_level,
            f.anomaly_score,
            f.flag_ghost_meals,
            f.flag_ingredient_inflation,
            f.flag_fund_overclaim,
            f.flag_cook_anomaly,
            f.total_meals_reported
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          WHERE f.anomaly_score >= @threshold
          ORDER BY f.anomaly_score DESC
          LIMIT @limit
        `;
        params.threshold = threshold;
      } else {
        query = `
          SELECT
            f.school_id,
            f.school_name,
            f.district,
            f.risk_level,
            f.anomaly_score,
            f.flag_ghost_meals,
            f.flag_ingredient_inflation,
            f.flag_fund_overclaim,
            f.flag_cook_anomaly,
            f.total_meals_reported
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
        `;

        if (riskLevel && ['HIGH', 'MEDIUM', 'LOW'].includes(riskLevel.toUpperCase())) {
          query += `WHERE f.risk_level = @riskLevel\n`;
          params.riskLevel = riskLevel.toUpperCase();
        }

        query += `ORDER BY f.anomaly_score DESC
          LIMIT @limit`;
      }

      const [job] = await bigquery.createQueryJob({ query, params });
      const [rows] = await job.getQueryResults();
      
      if (rows.length > 0) {
        results = rows.map((row) => ({
          school_id: Number(row.school_id),
          school_name: row.school_name || 'Unknown School',
          district: row.district || 'Unknown',
          risk_level: row.risk_level || 'UNKNOWN',
          anomaly_score: Number(row.anomaly_score) || 0,
          flag_ghost_meals: Boolean(row.flag_ghost_meals),
          flag_ingredient_inflation: Boolean(row.flag_ingredient_inflation),
          flag_fund_overclaim: Boolean(row.flag_fund_overclaim),
          flag_cook_anomaly: Boolean(row.flag_cook_anomaly),
          total_meals_reported: Number(row.total_meals_reported) || 0,
        }));
      }
    } catch (primaryError) {
      console.log('Primary MDM table not found, using fallback...');
    }

    // Fallback: Compute from raw tables
    if (results.length === 0) {
      const fallbackQuery = `
        WITH school_stats AS (
          SELECT 
            d.school_id,
            s.school_name,
            s.district,
            SUM(d.reported_students_served) AS total_meals_reported,
            AVG(d.reported_students_served) AS avg_meals,
            STDDEV(d.reported_students_served) AS stddev_meals,
            COUNT(*) AS record_count,
            -- Anomaly score based on deviation
            COALESCE(
              ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
              / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
              0
            ) AS anomaly_score,
            -- Basic flag detection: reported > attendance means ghost meals
            CASE WHEN AVG(d.reported_students_served) > AVG(d.actual_attendance) * 1.05 THEN TRUE ELSE FALSE END AS flag_ghost_meals,
            FALSE AS flag_ingredient_inflation,
            FALSE AS flag_fund_overclaim,
            FALSE AS flag_cook_anomaly
          FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
          LEFT JOIN \`gfg-fot.lpg_fraud_detection.mdm_school_master\` s ON d.school_id = s.school_id
          GROUP BY d.school_id, s.school_name, s.district
        )
        SELECT
          school_id,
          COALESCE(school_name, CONCAT('School ', CAST(school_id AS STRING))) AS school_name,
          COALESCE(district, 'Unknown') AS district,
          CASE 
            WHEN anomaly_score > 2 THEN 'HIGH'
            WHEN anomaly_score > 1 THEN 'MEDIUM'
            ELSE 'LOW'
          END AS risk_level,
          anomaly_score,
          flag_ghost_meals,
          flag_ingredient_inflation,
          flag_fund_overclaim,
          flag_cook_anomaly,
          total_meals_reported
        FROM school_stats
        ${riskLevel ? `WHERE CASE WHEN anomaly_score > 2 THEN 'HIGH' WHEN anomaly_score > 1 THEN 'MEDIUM' ELSE 'LOW' END = '${riskLevel.toUpperCase()}'` : ''}
        ORDER BY anomaly_score DESC
        LIMIT ${limit}
      `;

      const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
      const [fallbackRows] = await fallbackJob.getQueryResults();

      results = fallbackRows.map((row) => ({
        school_id: Number(row.school_id),
        school_name: row.school_name || 'Unknown School',
        district: row.district || 'Unknown',
        risk_level: row.risk_level || 'UNKNOWN',
        anomaly_score: Number(row.anomaly_score) || 0,
        flag_ghost_meals: Boolean(row.flag_ghost_meals),
        flag_ingredient_inflation: Boolean(row.flag_ingredient_inflation),
        flag_fund_overclaim: Boolean(row.flag_fund_overclaim),
        flag_cook_anomaly: Boolean(row.flag_cook_anomaly),
        total_meals_reported: Number(row.total_meals_reported) || 0,
      }));
    }

    // Calculate stats for debugging
    const scores = results.map(r => r.anomaly_score);
    if (scores.length > 0) {
      console.log(`MDM Anomaly Score Range: min=${Math.min(...scores).toFixed(6)}, max=${Math.max(...scores).toFixed(6)}, threshold=${threshold}`);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('MDM High-Risk Schools Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
