import { getDashboardService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/mdm/dashboard/distribution
 * Returns MDM risk distribution for pie chart
 * Uses caching via DashboardService
 */
export async function GET() {
  try {
    const dashboardService = getDashboardService();
    const distribution = await dashboardService.getDistribution('MDM');

    return NextResponse.json(distribution);
  } catch (error) {
    console.error('MDM Dashboard Distribution Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
