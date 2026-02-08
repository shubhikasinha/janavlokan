import { getDashboardService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/mdm/dashboard/summary
 * Returns MDM dashboard KPIs (total schools, risk counts, meals)
 * Uses caching via DashboardService
 */
export async function GET() {
  try {
    const dashboardService = getDashboardService();
    const summary = await dashboardService.getSummary('MDM');

    return NextResponse.json(summary);
  } catch (error) {
    console.error('MDM Dashboard Summary Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
