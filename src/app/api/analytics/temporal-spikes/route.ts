import { getBigQueryClient } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export interface TemporalSpike {
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

    // Detect district-level anomaly spikes

    const query = `
      WITH district_stats AS (
        SELECT
          b.residence_district,
          COUNT(*) AS anomaly_count,
          COUNTIF(f.risk_level = 'HIGH') AS high_count,
          COUNTIF(f.risk_level = 'MEDIUM') AS medium_count
        FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
        JOIN \`gfg-fot.lpg_fraud_detection.Beneficiaries\` b
        ON f.beneficiary_id = b.beneficiary_id
        WHERE f.risk_level IN ('HIGH', 'MEDIUM')
        GROUP BY b.residence_district
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
        [ds.residence_district] AS affected_districts
      FROM district_stats ds
      WHERE ds.anomaly_count > (SELECT avg_count + 1.5 * std_count FROM baseline)
      ORDER BY ds.anomaly_count DESC
      LIMIT 20
    `;

    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    const results: TemporalSpike[] = rows.map((row) => ({
      date: row.date,
      spike_type: row.spike_type,
      anomaly_count: Number(row.anomaly_count),
      avg_baseline: Number(row.avg_baseline),
      deviation_percentage: Number(row.deviation_percentage),
      affected_districts: row.affected_districts || [],
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Temporal Spikes Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
