import { getBigQueryClient } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

// GET: Fetch feedback statistics from audit_trail
// This data will be used to:
// 1. Show model accuracy on dashboard
// 2. Train future supervised models
export async function GET() {
  try {
    const bigquery = getBigQueryClient();

    // Query to get feedback statistics
    // new_status values: 'TRUE_POSITIVE', 'FALSE_POSITIVE' are for feedback
    const query = `
      WITH feedback_data AS (
        SELECT 
          new_status,
          previous_risk_level,
          COUNT(*) as count
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        WHERE action = 'FEEDBACK'
          AND new_status IN ('TRUE_POSITIVE', 'FALSE_POSITIVE')
        GROUP BY new_status, previous_risk_level
      ),
      totals AS (
        SELECT
          COUNT(*) as total_feedback,
          COUNTIF(new_status = 'TRUE_POSITIVE') as true_positives,
          COUNTIF(new_status = 'FALSE_POSITIVE') as false_positives
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        WHERE action = 'FEEDBACK'
          AND new_status IN ('TRUE_POSITIVE', 'FALSE_POSITIVE')
      ),
      by_risk_level AS (
        SELECT 
          previous_risk_level,
          COUNTIF(new_status = 'TRUE_POSITIVE') as tp,
          COUNTIF(new_status = 'FALSE_POSITIVE') as fp
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        WHERE action = 'FEEDBACK'
          AND new_status IN ('TRUE_POSITIVE', 'FALSE_POSITIVE')
        GROUP BY previous_risk_level
      )
      SELECT 
        t.total_feedback,
        t.true_positives,
        t.false_positives,
        SAFE_DIVIDE(t.true_positives, t.total_feedback) * 100 as accuracy_rate
      FROM totals t
    `;

    try {
      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      // If no feedback yet, return zeros
      if (!rows || rows.length === 0 || !rows[0].total_feedback) {
        return NextResponse.json({
          success: true,
          stats: {
            total_feedback: 0,
            true_positives: 0,
            false_positives: 0,
            accuracy_rate: 0,
            by_risk_level: []
          },
          message: 'No feedback data yet. Start labeling to train future models!'
        });
      }

      const stats = {
        total_feedback: Number(rows[0].total_feedback) || 0,
        true_positives: Number(rows[0].true_positives) || 0,
        false_positives: Number(rows[0].false_positives) || 0,
        accuracy_rate: Number(rows[0].accuracy_rate) || 0,
      };

      // Get breakdown by risk level
      const breakdownQuery = `
        SELECT 
          previous_risk_level,
          COUNTIF(new_status = 'TRUE_POSITIVE') as true_positives,
          COUNTIF(new_status = 'FALSE_POSITIVE') as false_positives,
          COUNT(*) as total
        FROM \`gfg-fot.lpg_fraud_detection.audit_trail\`
        WHERE action = 'FEEDBACK'
          AND new_status IN ('TRUE_POSITIVE', 'FALSE_POSITIVE')
        GROUP BY previous_risk_level
        ORDER BY total DESC
      `;

      const [breakdownJob] = await bigquery.createQueryJob({ query: breakdownQuery });
      const [breakdownRows] = await breakdownJob.getQueryResults();

      const byRiskLevel = breakdownRows.map((row) => ({
        risk_level: row.previous_risk_level,
        true_positives: Number(row.true_positives) || 0,
        false_positives: Number(row.false_positives) || 0,
        total: Number(row.total) || 0,
        accuracy: row.total > 0 ? (Number(row.true_positives) / Number(row.total) * 100) : 0
      }));

      return NextResponse.json({
        success: true,
        stats: {
          ...stats,
          by_risk_level: byRiskLevel
        }
      });

    } catch (queryError) {
      // Table might not exist or no data yet
      console.log('Feedback stats query error (might be empty table):', queryError);
      return NextResponse.json({
        success: true,
        stats: {
          total_feedback: 0,
          true_positives: 0,
          false_positives: 0,
          accuracy_rate: 0,
          by_risk_level: []
        },
        message: 'No feedback data yet'
      });
    }

  } catch (error) {
    console.error('Feedback Stats Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
