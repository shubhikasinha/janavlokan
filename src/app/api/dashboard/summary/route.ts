import { getDashboardService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/summary
 * Returns dashboard KPIs (total beneficiaries, risk counts)
 * Uses caching via DashboardService
 */
export async function GET() {
  try {
    const dashboardService = getDashboardService();
    const summary = await dashboardService.getSummary('LPG');

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
