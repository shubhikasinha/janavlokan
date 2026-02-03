import { getBigQueryClient, MDMDailyRecord } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school_id: string }> }
) {
  try {
    const { school_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100);
    const days = Number(searchParams.get('days')) || 30;

    if (!school_id) {
      return NextResponse.json(
        { success: false, error: 'school_id is required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();

    // Get daily records for the school
    const query = `
      SELECT
        record_id,
        school_id,
        date,
        actual_attendance,
        reported_students_served,
        menu_type,
        cook_present,
        meal_served_flag,
        rice_kg_used,
        dal_kg_used,
        vegetables_kg_used,
        oil_liters_used,
        eggs_count,
        fund_claimed_inr,
        fund_released_inr
      FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`
      WHERE school_id = @school_id
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ORDER BY date DESC
      LIMIT @limit
    `;

    const [job] = await bigquery.createQueryJob({
      query,
      params: {
        school_id: parseInt(school_id, 10),
        days,
        limit
      }
    });
    const [rows] = await job.getQueryResults();

    const results: MDMDailyRecord[] = rows.map((row) => ({
      record_id: row.record_id,
      school_id: Number(row.school_id),
      date: row.date?.value || row.date,
      actual_attendance: Number(row.actual_attendance) || 0,
      reported_students_served: Number(row.reported_students_served) || 0,
      menu_type: row.menu_type || 'Unknown',
      cook_present: Boolean(row.cook_present),
      meal_served_flag: Boolean(row.meal_served_flag),
      rice_kg_used: Number(row.rice_kg_used) || 0,
      dal_kg_used: Number(row.dal_kg_used) || 0,
      vegetables_kg_used: Number(row.vegetables_kg_used) || 0,
      oil_liters_used: Number(row.oil_liters_used) || 0,
      eggs_count: Number(row.eggs_count) || 0,
      fund_claimed_inr: Number(row.fund_claimed_inr) || 0,
      fund_released_inr: Number(row.fund_released_inr) || 0,
    }));

    const stats = {
      totalRecords: results.length,
      avgAttendance: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.actual_attendance, 0) / results.length)
        : 0,
      avgServed: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.reported_students_served, 0) / results.length)
        : 0,
      totalFundClaimed: results.reduce((sum, r) => sum + r.fund_claimed_inr, 0),
      daysWithGhostMeals: results.filter(r => r.reported_students_served > r.actual_attendance * 1.05).length,
      daysWithCookAbsent: results.filter(r => !r.cook_present && r.meal_served_flag).length,
    };

    return NextResponse.json({
      records: results,
      stats,
    });
  } catch (error) {
    console.error('MDM Daily Records Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
