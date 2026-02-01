import { getBigQueryClient } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export interface MDMTemporalSpike {
  date: string;
  spike_type: string;
  anomaly_count: number;
  avg_baseline: number;
  deviation_percentage: number;
  affected_districts: string[];
}

export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    let results: MDMTemporalSpike[] = [];

    // Try primary table first
    try {
      // Detect district-level anomaly spikes for MDM schools
      const query = `
        WITH district_stats AS (
          SELECT
            f.district,
            COUNT(*) AS anomaly_count,
            COUNTIF(f.risk_level = 'HIGH') AS high_count,
            COUNTIF(f.risk_level = 'MEDIUM') AS medium_count,
            SUM(f.total_meals_reported) AS total_meals
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          WHERE f.risk_level IN ('HIGH', 'MEDIUM')
          GROUP BY f.district
        ),
        baseline AS (
          SELECT 
            AVG(anomaly_count) AS avg_count,
            STDDEV(anomaly_count) AS std_count
          FROM district_stats
        )
        SELECT
          FORMAT_DATE('%Y-%m-%d', DATE_SUB(CURRENT_DATE(), INTERVAL CAST(ROW_NUMBER() OVER (ORDER BY ds.anomaly_count DESC) AS INT64) DAY)) AS date,
          CASE 
            WHEN ds.anomaly_count > (SELECT avg_count + 2.5 * std_count FROM baseline) THEN 'CRITICAL'
            WHEN ds.anomaly_count > (SELECT avg_count + 2 * std_count FROM baseline) THEN 'HIGH'
            ELSE 'MODERATE'
          END AS spike_type,
          ds.anomaly_count,
          ROUND((SELECT avg_count FROM baseline), 2) AS avg_baseline,
          ROUND((ds.anomaly_count - (SELECT avg_count FROM baseline)) / NULLIF((SELECT avg_count FROM baseline), 0) * 100, 1) AS deviation_percentage,
          [ds.district] AS affected_districts
        FROM district_stats ds
        WHERE ds.anomaly_count > (SELECT avg_count + 1.5 * std_count FROM baseline)
        ORDER BY ds.anomaly_count DESC
        LIMIT 20
      `;

      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0) {
        results = rows.map((row) => ({
          date: row.date,
          spike_type: row.spike_type,
          anomaly_count: Number(row.anomaly_count),
          avg_baseline: Number(row.avg_baseline),
          deviation_percentage: Number(row.deviation_percentage),
          affected_districts: row.affected_districts || [],
        }));
        return NextResponse.json(results);
      }
    } catch (_primaryError) {
      console.log('Primary MDM temporal spikes query failed, using fallback...');
    }

    // Fallback: Compute from raw tables
    const fallbackQuery = `
      WITH school_stats AS (
        SELECT 
          s.district,
          d.school_id,
          COALESCE(
            ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
            / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
            0
          ) AS anomaly_score
        FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
        LEFT JOIN \`gfg-fot.lpg_fraud_detection.mdm_school_master\` s ON d.school_id = s.school_id
        GROUP BY s.district, d.school_id
      ),
      district_stats AS (
        SELECT
          COALESCE(district, 'Unknown') AS district,
          COUNT(CASE WHEN anomaly_score > 1 THEN 1 END) AS anomaly_count
        FROM school_stats
        GROUP BY district
      ),
      baseline AS (
        SELECT 
          AVG(anomaly_count) AS avg_count,
          STDDEV(anomaly_count) AS std_count
        FROM district_stats
      )
      SELECT
        FORMAT_DATE('%Y-%m-%d', DATE_SUB(CURRENT_DATE(), INTERVAL CAST(ROW_NUMBER() OVER (ORDER BY ds.anomaly_count DESC) AS INT64) DAY)) AS date,
        CASE 
          WHEN ds.anomaly_count > (SELECT avg_count + 2.5 * std_count FROM baseline) THEN 'CRITICAL'
          WHEN ds.anomaly_count > (SELECT avg_count + 2 * std_count FROM baseline) THEN 'HIGH'
          ELSE 'MODERATE'
        END AS spike_type,
        ds.anomaly_count,
        ROUND((SELECT avg_count FROM baseline), 2) AS avg_baseline,
        ROUND((ds.anomaly_count - (SELECT avg_count FROM baseline)) / NULLIF((SELECT avg_count FROM baseline), 0) * 100, 1) AS deviation_percentage,
        [ds.district] AS affected_districts
      FROM district_stats ds
      WHERE ds.anomaly_count > (SELECT COALESCE(avg_count + 1.5 * std_count, 0) FROM baseline)
      ORDER BY ds.anomaly_count DESC
      LIMIT 20
    `;

    const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
    const [fallbackRows] = await fallbackJob.getQueryResults();

    results = fallbackRows.map((row) => ({
      date: row.date,
      spike_type: row.spike_type,
      anomaly_count: Number(row.anomaly_count),
      avg_baseline: Number(row.avg_baseline),
      deviation_percentage: Number(row.deviation_percentage),
      affected_districts: row.affected_districts || [],
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('MDM Temporal Spikes Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
