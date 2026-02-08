import { getDashboardService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/distribution
 * Returns risk distribution for pie chart
 * Uses caching via DashboardService
 */
export async function GET() {
  try {
    const dashboardService = getDashboardService();
    const distribution = await dashboardService.getDistribution('LPG');

    return NextResponse.json(distribution);
  } catch (error) {
    console.error('Dashboard Distribution Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
