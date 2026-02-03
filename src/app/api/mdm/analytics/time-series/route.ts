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

    const checkQuery = `
      SELECT 
        MIN(date) as min_date, 
        MAX(date) as max_date,
        COUNT(*) as total_rows
      FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_risk_summary\`
    `;

    const [checkJob] = await bigquery.createQueryJob({ query: checkQuery });
    const [checkRows] = await checkJob.getQueryResults();
    console.log('MDM Table Stats:', JSON.stringify(checkRows[0]));

    // Query from mdm_daily_risk_summary table
    // Using LIMIT instead of date filter if data is from different date range
    const query = `
      SELECT 
        FORMAT_DATE('%Y-%m-%d', date) as date,
        high_risk_count,
        medium_risk_count,
        low_risk_count,
        (high_risk_count + medium_risk_count) as total_anomalies
      FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_risk_summary\`
      ORDER BY date DESC
      LIMIT @days
    `;

    const [job] = await bigquery.createQueryJob({
      query,
      params: { days }
    });
    const [rows] = await job.getQueryResults();

    console.log('MDM Time Series - Found', rows.length, 'data points');
    if (rows.length > 0) {
      console.log('MDM First row:', JSON.stringify(rows[0]));
    }

    const results: TimeSeriesData[] = rows.map((row) => ({
      date: row.date,
      high_risk_count: Number(row.high_risk_count) || 0,
      medium_risk_count: Number(row.medium_risk_count) || 0,
      low_risk_count: Number(row.low_risk_count) || 0,
      total_anomalies: Number(row.total_anomalies) || 0,
    })).reverse(); // Reverse to get ascending order

    return NextResponse.json(results);
  } catch (error) {
    console.error('MDM Time Series Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
