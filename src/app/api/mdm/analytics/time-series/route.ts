import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

interface TimeSeriesData {
  date: string;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_anomalies: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(Number(searchParams.get('days')) || 30, 90);

    const bigquery = getBigQueryClient();

    let results: TimeSeriesData[] = [];

    // Try primary query with fraud table first
    try {
      const query = `
        WITH daily_stats AS (
          SELECT
            d.date,
            f.risk_level,
            COUNT(*) as school_count
          FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
          JOIN \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          ON d.school_id = f.school_id
          WHERE d.date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
          GROUP BY d.date, f.risk_level
        )
        SELECT
          FORMAT_DATE('%Y-%m-%d', date) as date,
          SUM(CASE WHEN risk_level = 'HIGH' THEN school_count ELSE 0 END) as high_risk_count,
          SUM(CASE WHEN risk_level = 'MEDIUM' THEN school_count ELSE 0 END) as medium_risk_count,
          SUM(CASE WHEN risk_level = 'LOW' THEN school_count ELSE 0 END) as low_risk_count,
          SUM(CASE WHEN risk_level IN ('HIGH', 'MEDIUM') THEN school_count ELSE 0 END) as total_anomalies
        FROM daily_stats
        GROUP BY date
        ORDER BY date ASC
      `;

      const [job] = await bigquery.createQueryJob({
        query,
        params: { days }
      });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0) {
        results = rows.map((row) => ({
          date: row.date?.value || row.date,
          high_risk_count: Number(row.high_risk_count) || 0,
          medium_risk_count: Number(row.medium_risk_count) || 0,
          low_risk_count: Number(row.low_risk_count) || 0,
          total_anomalies: Number(row.total_anomalies) || 0,
        }));
        return NextResponse.json(results);
      }
    } catch (primaryError) {
      console.log('Primary MDM time series query failed, using fallback...');
    }

    // Fallback: Compute risk levels on the fly from mdm_daily_record only
    const fallbackQuery = `
      WITH school_base AS (
        SELECT 
          school_id,
          AVG(reported_students_served) as avg_meals,
          COALESCE(
            ABS(AVG(reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
            / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
            0
          ) AS anomaly_score
        FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`
        GROUP BY school_id
      ),
      school_risk AS (
        SELECT 
          school_id,
          CASE 
            WHEN anomaly_score > 2 THEN 'HIGH'
            WHEN anomaly_score > 1 THEN 'MEDIUM'
            ELSE 'LOW'
          END AS risk_level
        FROM school_base
      ),
      daily_stats AS (
        SELECT
          d.date,
          r.risk_level,
          COUNT(DISTINCT d.school_id) as school_count
        FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
        LEFT JOIN school_risk r ON d.school_id = r.school_id
        WHERE d.date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        GROUP BY d.date, r.risk_level
      )
      SELECT
        date,
        SUM(CASE WHEN risk_level = 'HIGH' THEN school_count ELSE 0 END) as high_risk_count,
        SUM(CASE WHEN risk_level = 'MEDIUM' THEN school_count ELSE 0 END) as medium_risk_count,
        SUM(CASE WHEN risk_level = 'LOW' THEN school_count ELSE 0 END) as low_risk_count,
        SUM(CASE WHEN risk_level IN ('HIGH', 'MEDIUM') THEN school_count ELSE 0 END) as total_anomalies
      FROM daily_stats
      GROUP BY date
      ORDER BY date ASC
    `;

    const [fallbackJob] = await bigquery.createQueryJob({
      query: fallbackQuery,
      params: { days }
    });
    const [fallbackRows] = await fallbackJob.getQueryResults();

    results = fallbackRows.map((row) => ({
      date: row.date?.value || row.date,
      high_risk_count: Number(row.high_risk_count) || 0,
      medium_risk_count: Number(row.medium_risk_count) || 0,
      low_risk_count: Number(row.low_risk_count) || 0,
      total_anomalies: Number(row.total_anomalies) || 0,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('MDM Time Series Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
