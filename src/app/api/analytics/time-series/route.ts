import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export interface TimeSeriesDataPoint {
  date: string;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_anomalies: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(Number(searchParams.get('days')) || 30, 90); // Max 90 days

    const bigquery = getBigQueryClient();

    // Query from lpg_daily_risk_summary table (populated via scheduled query)
    const query = `
      SELECT 
        FORMAT_DATE('%Y-%m-%d', date) as date,
        high_risk_count,
        medium_risk_count,
        low_risk_count,
        (high_risk_count + medium_risk_count) as total_anomalies
      FROM \`gfg-fot.lpg_fraud_detection.lpg_daily_risk_summary\`
      WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ORDER BY date ASC
    `;

    const [job] = await bigquery.createQueryJob({ query, params: { days } });
    const [rows] = await job.getQueryResults();

    console.log('LPG Time Series - Found', rows.length, 'data points from summary table');

    const results: TimeSeriesDataPoint[] = rows.map((row) => ({
      date: row.date,
      high_risk_count: Number(row.high_risk_count) || 0,
      medium_risk_count: Number(row.medium_risk_count) || 0,
      low_risk_count: Number(row.low_risk_count) || 0,
      total_anomalies: Number(row.total_anomalies) || 0,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Time Series Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
