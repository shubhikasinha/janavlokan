import { getBigQueryClient, DistrictRisk } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    // District-wise anomaly count for heatmap
    // Using fraud_with_explanations joined with Beneficiaries
    // Counts HIGH and MEDIUM risk as anomalies
    const query = `
      SELECT
        b.residence_district,
        COUNT(*) AS anomaly_count
      FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
      JOIN \`gfg-fot.lpg_fraud_detection.Beneficiaries\` b
      ON f.beneficiary_id = b.beneficiary_id
      WHERE f.risk_level IN ('HIGH', 'MEDIUM')
      GROUP BY b.residence_district
      ORDER BY anomaly_count DESC
    `;

    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    const results: DistrictRisk[] = rows.map((row) => ({
      residence_district: row.residence_district || 'Unknown',
      anomaly_count: Number(row.anomaly_count),
    }));

    console.log('LPG District Risk - Districts found:', results.map(d => d.residence_district).join(', '));

    return NextResponse.json(results);
  } catch (error) {
    console.error('District Risk Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
